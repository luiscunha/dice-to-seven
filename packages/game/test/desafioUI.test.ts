// @vitest-environment jsdom

/**
 * O Desafio do Dia, no ecrã.
 *
 * O núcleo está em `desafio.test.ts`. Aqui protege-se o que o jogador vê e
 * toca: o cartão da Home em cada estado, o caminho de cada mês e a linha dos
 * meses, o texto que se partilha, e os ecrãs de cada modo quando são o desafio — a mesma seed dá os
 * mesmos tabuleiros, o fim oferece partilhar e treinar, e o Survival do dia não
 * deixa trocar de seed a meio.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Level } from "@dicetoseven/engine";

import { emptyProfile } from "../src/session/progress";
import type { Profile } from "../src/session/progress";
import type { SurvivalState } from "../src/session/SurvivalSession";
import { DEFAULT_SURVIVAL, startSurvival } from "../src/session/SurvivalSession";
import { DEFAULT_TIME_ATTACK } from "../src/session/TimeAttackSession";
import { diasDoMes, modoDoDia, numeroDoDia } from "../src/session/desafio";
import type { DiaNoTrilho, EstadoNoCartao, TrilhoDoDesafio } from "../src/ui/DesafioScreen";
import { DesafioScreen } from "../src/ui/DesafioScreen";
import type { ResumoDoDesafio } from "../src/ui/HomeScreen";
import { HomeScreen } from "../src/ui/HomeScreen";
import type { DesafioNoEcra } from "../src/ui/partilha";
import {
  botaoPartilhar,
  dataCurta,
  dataPorExtenso,
  mesCurto,
  mesPorExtenso,
  partilhar,
  textoDoDesafio,
} from "../src/ui/partilha";
import { PuzzleScreen } from "../src/ui/PuzzleScreen";
import { SurvivalScreen } from "../src/ui/SurvivalScreen";
import { TimeAttackScreen } from "../src/ui/TimeAttackScreen";

let host: HTMLElement;

beforeEach(() => {
  document.body.replaceChildren();
  host = document.createElement("div");
  document.body.appendChild(host);
});

/* ─── O texto ─────────────────────────────────────────────────────────────── */

describe("o texto que se partilha", () => {
  const TEMPO = {
    estado: "feito",
    resultado: { pontos: 1240, tabuleiros: 14, saltados: 1 },
  } as const;
  const SURVIVAL = {
    estado: "feito",
    resultado: { tempoMs: 222_100, limpou: true, linhas: 18 },
  } as const;

  const PUZZLE = { estado: "feito", resultado: { tempoMs: 83_400, selo: "perfect" } } as const;

  it("diz o número e o dia, **só o desafio do dia**, e a sequência", () => {
    // O #3, 14 out, é um Survival: os outros dois, guardados de quando havia
    // três por dia, não entram.
    expect(
      textoDoDesafio("2026-10-14", { puzzle: PUZZLE, tempo: TEMPO, survival: SURVIVAL }, 3),
    ).toBe(
      [
        "DiceToSeven · Desafio #3 · 14 out",
        "🧱 Survival: limpo em 3:42.1",
        "🔥 3 dias seguidos",
      ].join("\n"),
    );
  });

  it("cada modo no seu dia", () => {
    expect(textoDoDesafio("2026-10-12", { puzzle: PUZZLE }, 0)).toBe(
      "DiceToSeven · Desafio #1 · 12 out\n🧩 Puzzle: 1:23.4 · ★ perfeito",
    );
    expect(textoDoDesafio("2026-10-13", { tempo: TEMPO }, 0)).toBe(
      "DiceToSeven · Desafio #2 · 13 out\n⏱️ Contra-Relógio: 1240 pontos · 14 tabuleiros",
    );
  });

  it("sem resultado, só o dia; e a sequência só a partir de dois dias", () => {
    expect(textoDoDesafio("2026-10-13", { tempo: { estado: "a-jogar" } }, 1)).toBe(
      "DiceToSeven · Desafio #2 · 13 out",
    );
  });

  it("os meses em português, abreviados", () => {
    expect(dataCurta("2026-01-05")).toBe("5 jan");
    expect(dataCurta("2026-12-31")).toBe("31 dez");
    expect(dataPorExtenso("2026-03-07")).toBe("7 de março");
    expect(mesPorExtenso("2026-09")).toBe("setembro de 2026");
    expect(mesCurto("2026-09")).toBe("set");
  });
});

/* ─── Partilhar ───────────────────────────────────────────────────────────── */

describe("partilhar", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("usa a folha do sistema, quando há", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { share });

    expect(await partilhar("olá")).toBe("partilhado");
    expect(share).toHaveBeenCalledWith({ text: "olá" });
  });

  it("cancelar a folha não é falhar — e não copia sem ser pedido", async () => {
    const writeText = vi.fn();
    vi.stubGlobal("navigator", {
      share: vi.fn().mockRejectedValue(new DOMException("não", "AbortError")),
      clipboard: { writeText },
    });

    expect(await partilhar("olá")).toBe("cancelado");
    expect(writeText).not.toHaveBeenCalled();
  });

  it("sem folha, copia", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });

    expect(await partilhar("olá")).toBe("copiado");
    expect(writeText).toHaveBeenCalledWith("olá");
  });

  it("o botão diz que copiou, e volta ao que era", async () => {
    vi.useFakeTimers();
    const b = botaoPartilhar(() => Promise.resolve("copiado"));
    expect(b.textContent).toBe("Partilhar");

    b.click();
    await vi.advanceTimersByTimeAsync(0);
    expect(b.textContent).toBe("Copiado ✓");

    await vi.advanceTimersByTimeAsync(2_600);
    expect(b.textContent).toBe("Partilhar");
  });
});

/* ─── O cartão da Home ────────────────────────────────────────────────────── */

describe("o cartão do Desafio do Dia, na Home", () => {
  /** Quem já fez um nível: o desafio vem por cima dos modos. */
  const jogador: Profile = {
    ...emptyProfile(),
    levels: { "inicio-000001": { seal: "completed", bestTimeMs: 9_000 } },
  };

  const abrir = (d: Partial<ResumoDoDesafio> = {}, perfil: Profile = jogador): HomeScreen =>
    new HomeScreen(host, {
      perfil,
      totalNiveis: 143,
      melhorTempoSurvival: "0:00.0",
      aoEscolherNiveis: () => undefined,
      aoEscolherTempo: () => undefined,
      aoEscolherSurvival: () => undefined,
      aoEscolherDefinicoes: () => undefined,
      desafio: {
        numero: 3,
        data: "14 out",
        sequencia: 0,
        chaves: 0,
        modo: "survival",
        estado: { tipo: "por-jogar" },
        aoAbrir: () => undefined,
        ...d,
      },
    });

  const ordem = (): string[] =>
    [...host.querySelectorAll(".ecra.home > *")].map((e) => e.className);

  it("**é um cartão só, que se toca inteiro**, com o desafio de hoje", () => {
    const aoAbrir = vi.fn();
    const ecra = abrir({ aoAbrir });

    const cartao = host.querySelector<HTMLButtonElement>("button.home-desafio");
    expect(cartao?.dataset["modo"]).toBe("survival");
    // Nada para escolher dentro do cartão: o calendário está no ecrã do desafio.
    expect(cartao?.querySelectorAll("button")).toHaveLength(0);
    expect(host.querySelector(".home-desafio-nome")?.textContent).toBe("Survival");
    expect(host.querySelector(".home-desafio-data")?.textContent).toBe("#3 · 14 out");

    cartao?.click();
    expect(aoAbrir).toHaveBeenCalledOnce();
    ecra.destruir();
  });

  it("o estado diz se há alguma coisa a fazer hoje", () => {
    const estado = (): string | null | undefined =>
      host.querySelector(".home-desafio .desafio-modo-estado")?.textContent;

    const casos: [ResumoDoDesafio["estado"], string][] = [
      [{ tipo: "por-jogar" }, "Jogar"],
      [{ tipo: "a-meio", texto: "1:20.0" }, "Continuar"],
      [{ tipo: "feito", texto: "3:42.1" }, "✓ 3:42.1"],
      [{ tipo: "interrompido" }, "Interrompido"],
    ];

    for (const [e, texto] of casos) {
      const ecra = abrir({ estado: e });
      expect(estado()).toBe(texto);
      expect(host.querySelector<HTMLElement>(".home-desafio")?.dataset["estado"]).toBe(e.tipo);
      ecra.destruir();
    }
  });

  it("a sequência só aparece quando há", () => {
    let ecra = abrir();
    expect(host.querySelector(".home-desafio .desafio-sequencia")).toBeNull();
    ecra.destruir();

    ecra = abrir({ sequencia: 4 });
    expect(host.querySelector(".home-desafio .desafio-sequencia")?.textContent).toBe("🔥 4");
    ecra.destruir();
  });

  it("as chaves aparecem quando há, ao lado da série", () => {
    let ecra = abrir({ sequencia: 4, chaves: 2 });
    const sinais = [...host.querySelectorAll(".home-desafio-sinais > *")].map((e) => e.textContent);
    expect(sinais).toEqual(["🔥 4", "🔑 2"]);
    ecra.destruir();

    ecra = abrir();
    expect(host.querySelector(".home-desafio .desafio-chaves")).toBeNull();
    ecra.destruir();
  });

  it("**a sequência em risco avisa no cartão**, no lugar da série", () => {
    const ecra = abrir({ emRisco: 5, chaves: 1 });
    const risco = host.querySelector<HTMLElement>(".home-desafio .desafio-sequencia");
    expect(risco?.textContent).toBe("🔥 5 em risco");
    expect(risco?.hasAttribute("data-risco")).toBe(true);
    expect(host.querySelector(".home-desafio")?.getAttribute("aria-label")).toContain(
      "Sequência de 5 em risco",
    );
    ecra.destruir();
  });

  it("fica por baixo dos modos, para quem chega e para quem já joga", () => {
    // A ordem não depende do perfil: dois telemóveis lado a lado mostram a mesma Home.
    for (const perfil of [emptyProfile(), jogador]) {
      const ecra = abrir({}, perfil);
      expect(ordem().indexOf("home-modos")).toBeLessThan(ordem().indexOf("home-desafio"));
      ecra.destruir();
    }
  });

  it("sem desafio, a Home é a de sempre", () => {
    const ecra = new HomeScreen(host, {
      perfil: emptyProfile(),
      totalNiveis: 143,
      melhorTempoSurvival: "0:00.0",
      aoEscolherNiveis: () => undefined,
      aoEscolherTempo: () => undefined,
      aoEscolherSurvival: () => undefined,
      aoEscolherDefinicoes: () => undefined,
    });
    expect(host.querySelector(".home-desafio")).toBeNull();
    ecra.destruir();
  });
});

/* ─── O ecrã do Desafio do Dia ────────────────────────────────────────────── */

describe("o ecrã do Desafio do Dia: um caminho por mês", () => {
  /** O #55, um sábado de dezembro: um Puzzle. */
  const HOJE = "2026-12-05";

  /**
   * Um histórico: tudo feito menos os dias 7 de cada mês — outubro, que começa
   * no #1 a 12, fica completo. Hoje como se pedir, e o resto por vir.
   */
  const abrir = (
    t: Partial<TrilhoDoDesafio> = {},
    deHoje: EstadoNoCartao = { tipo: "por-jogar" },
    hoje = HOJE,
    aoVoltar = (): void => undefined,
  ): DesafioScreen =>
    new DesafioScreen(host, {
      aoVoltar,
      trilho: {
        hoje,
        sequencia: 5,
        chaves: 1,
        aoJogar: () => undefined,
        diasDoMes: (mes) =>
          diasDoMes(mes).map((data) => ({
            data,
            numero: numeroDoDia(data),
            modo: modoDoDia(data),
            estado:
              data > hoje
                ? { tipo: "futuro" }
                : data === hoje
                  ? deHoje
                  : data.endsWith("-07")
                    ? { tipo: "perdido" }
                    : { tipo: "feito", texto: "ok" },
          })),
        primeiroMes: "2026-10",
        ...t,
      },
    });

  /** O caminho de cima para baixo: os marcos e as casas, pelo rótulo. */
  const caminho = (): string[] =>
    [...host.querySelectorAll(".trilho-dias > li .trilho-rotulo")].map((r) => r.textContent ?? "");

  /** A casa do dia `dia` do mês à vista. */
  const casa = (dia: number): HTMLElement | undefined =>
    [...host.querySelectorAll<HTMLElement>(".trilho-dia")].find((li) =>
      li.querySelector(".trilho-rotulo")?.textContent?.startsWith(`${String(dia)} `),
    );

  const balao = (classe: string): string | null | undefined =>
    host.querySelector(`.trilho-balao .${classe}`)?.textContent;

  const botoes = (): (string | null)[] =>
    [...host.querySelectorAll(".trilho-balao .btn")].map((b) => b.textContent);

  const mes = (nome: string): HTMLButtonElement | undefined =>
    [...host.querySelectorAll<HTMLButtonElement>(".desafio-meses-botao")].find(
      (b) => b.querySelector(".desafio-meses-nome")?.textContent === nome,
    );

  it("**o mês de hoje é um caminho com início e fim**: a taça em cima, a bandeira em baixo", () => {
    const ecra = abrir();

    expect(host.querySelector(".desafio-mes-nome")?.textContent).toBe("Dezembro de 2026");
    expect(host.querySelector(".desafio-mes-conta")?.textContent).toBe("4 de 5 feitos");

    const c = caminho();
    expect(c[0]).toBe("Fim de dezembro · faltam 26 dias");
    expect(c[1]).toBe("31 dez · Survival");
    expect(c.at(-2)).toBe("1 dez · Survival");
    expect(c.at(-1)).toBe("Início");
    expect(host.querySelectorAll(".trilho-dia")).toHaveLength(31);

    // A taça só se acende quando o mês acaba; a bandeira, essa, já foi.
    expect(host.querySelector<HTMLElement>('[data-marco="fim"]')?.dataset["aceso"]).toBe("false");
    expect(host.querySelector<HTMLElement>('[data-marco="inicio"]')?.dataset["aceso"]).toBe("true");

    expect(casa(6)?.querySelector(".trilho-cadeado")).not.toBeNull();
    expect(casa(4)?.querySelector(".icone-visto")).not.toBeNull();
    expect(casa(5)?.hasAttribute("data-hoje")).toBe(true);
    ecra.destruir();
  });

  it("**o balão abre em hoje**, com o que a série ganha — e joga-se por lá", () => {
    const aoJogar = vi.fn();
    const ecra = abrir({ aoJogar });

    expect(casa(5)?.querySelector(".trilho-balao")).not.toBeNull();
    expect(balao("trilho-balao-quando")).toBe("Hoje · por jogar");
    expect(balao("trilho-balao-premio")).toBe("🔥 +1");
    expect(balao("desafio-modo-nome")).toBe("Puzzle");

    expect(botoes()).toEqual(["Jogar"]);
    host.querySelector<HTMLElement>(".trilho-balao .btn")?.click();
    expect(aoJogar).toHaveBeenCalledOnce();
    ecra.destruir();
  });

  it("tocar noutra casa leva-lhe o balão — e essa não se joga", () => {
    const ecra = abrir();
    const tocar = (dia: number): void => {
      casa(dia)?.querySelector<HTMLElement>(".trilho-no")?.click();
    };

    tocar(3);
    expect(casa(3)?.querySelector(".trilho-balao")).not.toBeNull();
    expect(balao("trilho-balao-quando")).toBe("Há 2 dias · #53");
    expect(balao("desafio-resultado")).toBe("✓ ok");
    expect(botoes()).toEqual([]);

    tocar(6);
    expect(balao("trilho-balao-quando")).toBe("Amanhã · #56");
    expect(balao("desafio-resultado")).toBe("Abre à meia-noite.");

    tocar(20);
    expect(balao("desafio-resultado")).toBe("Abre no dia 20.");

    expect(host.querySelectorAll(".trilho-balao")).toHaveLength(1);
    expect(host.querySelectorAll('.trilho-no[aria-expanded="true"]')).toHaveLength(1);
    ecra.destruir();
  });

  it("feito hoje: o resultado, treinar e partilhar; a meio continua-se; interrompido, treina-se", () => {
    let ecra = abrir({ aoPartilhar: () => Promise.resolve("copiado") }, { tipo: "feito", texto: "3:42.1" });
    expect(balao("trilho-balao-quando")).toBe("Hoje · feito");
    expect(balao("trilho-balao-premio")).toBeUndefined();
    expect(balao("desafio-resultado")).toBe("✓ 3:42.1");
    expect(botoes()).toEqual(["Treinar", "Partilhar"]);
    ecra.destruir();

    ecra = abrir({}, { tipo: "a-meio", texto: "1:20.0" });
    expect(balao("trilho-balao-quando")).toBe("Hoje · a meio · 1:20.0");
    expect(botoes()).toEqual(["Continuar"]);
    ecra.destruir();

    ecra = abrir({}, { tipo: "interrompido" });
    expect(botoes()).toEqual(["Treinar"]);
    ecra.destruir();
  });

  it("a série fica no topo, sempre à vista — e a seta volta", () => {
    const aoVoltar = vi.fn();
    let ecra = abrir({}, { tipo: "por-jogar" }, HOJE, aoVoltar);
    expect(host.querySelector(".topo .desafio-sequencia")?.textContent).toBe("🔥 5");
    host.querySelector<HTMLElement>(".topo .btn")?.click();
    expect(aoVoltar).toHaveBeenCalledOnce();
    ecra.destruir();

    ecra = abrir({ sequencia: 0 });
    expect(host.querySelector(".desafio-sequencia")).toBeNull();
    ecra.destruir();
  });

  it("**a linha dos meses**: os doze do ano, com o que passou, o de agora, e o que vem", () => {
    const ecra = abrir();

    const itens = [...host.querySelectorAll<HTMLElement>(".desafio-meses-item")];
    expect(itens).toHaveLength(12);
    expect(host.querySelector(".desafio-meses-ano")?.textContent).toBe("2026");

    // Antes de outubro não houve desafio: os meses estão lá, e não se tocam.
    expect(itens.slice(0, 9).every((i) => i.dataset["estado"] === "sem-desafio")).toBe(true);
    expect(mes("set")?.disabled).toBe(true);

    // Outubro ficou completo, e ganha a estrela; novembro perdeu o dia 7.
    expect(itens[9]?.dataset["completo"]).toBe("true");
    expect(mes("out")?.querySelector(".desafio-meses-no")?.textContent).toBe("★");
    expect(mes("out")?.querySelector(".desafio-meses-conta")?.textContent).toBe("20/20");
    expect(mes("nov")?.querySelector(".icone-visto")).not.toBeNull();
    expect(mes("nov")?.querySelector(".desafio-meses-conta")?.textContent).toBe("29/30");

    // Dezembro é o de agora, e o que está à vista.
    expect(mes("dez")?.getAttribute("aria-current")).toBe("date");
    expect(mes("dez")?.getAttribute("aria-pressed")).toBe("true");
    expect(mes("dez")?.querySelector(".desafio-meses-conta")?.textContent).toBe("4/5");
    ecra.destruir();
  });

  it("**tocar num mês mostra o caminho dele**: fechado, com a taça acesa, e sem balão", () => {
    const ecra = abrir();

    mes("nov")?.click();
    expect(host.querySelector(".desafio-mes-nome")?.textContent).toBe("Novembro de 2026");
    expect(caminho()[0]).toBe("Fim de novembro");
    expect(caminho().at(-1)).toBe("Início");
    expect(host.querySelector<HTMLElement>('[data-marco="fim"]')?.dataset["aceso"]).toBe("true");
    expect(host.querySelector(".trilho-balao")).toBeNull();
    expect(mes("nov")?.getAttribute("aria-pressed")).toBe("true");
    expect(mes("dez")?.getAttribute("aria-pressed")).toBe("false");

    // O mês do #1 começa no primeiro desafio de todos.
    mes("out")?.click();
    expect(caminho().at(-1)).toBe("Início do desafio");
    expect(caminho().at(-2)).toBe("12 out · Puzzle");
    expect(host.querySelectorAll(".trilho-dia")).toHaveLength(20);

    // Voltar ao mês de agora volta a abrir o balão em hoje.
    mes("dez")?.click();
    expect(casa(5)?.querySelector(".trilho-balao")).not.toBeNull();
    ecra.destruir();
  });

  it("os meses que vêm estão fechados", () => {
    const ecra = abrir({}, { tipo: "por-jogar" }, "2026-10-20");
    expect(mes("nov")?.disabled).toBe(true);
    expect(mes("nov")?.querySelector(".icone-cadeado")).not.toBeNull();
    expect(caminho()[0]).toBe("Fim de outubro · faltam 11 dias");
    ecra.destruir();
  });

  it("**as setas mudam de ano**, quando há outro ano para ver", () => {
    let ecra = abrir();
    expect(host.querySelector(".desafio-meses-cabeca button")).toBeNull();
    ecra.destruir();

    ecra = abrir({}, { tipo: "por-jogar" }, "2027-02-10");
    const seta = (nome: string): HTMLButtonElement | null =>
      host.querySelector<HTMLButtonElement>(`.desafio-meses-cabeca button[aria-label="${nome}"]`);

    expect(host.querySelector(".desafio-meses-ano")?.textContent).toBe("2027");
    expect(seta("ano seguinte")?.disabled).toBe(true);

    seta("ano anterior")?.click();
    expect(host.querySelector(".desafio-meses-ano")?.textContent).toBe("2026");
    expect(seta("ano anterior")?.disabled).toBe(true);
    expect(mes("dez")?.closest<HTMLElement>(".desafio-meses-item")?.dataset["estado"]).toBe("passado");

    // Mudar de ano não muda o mês à vista: só tocar num mês.
    expect(host.querySelector(".desafio-mes-nome")?.textContent).toBe("Fevereiro de 2027");
    mes("dez")?.click();
    expect(host.querySelector(".desafio-mes-nome")?.textContent).toBe("Dezembro de 2026");
    ecra.destruir();
  });
});

/* ─── As chaves, no caminho ───────────────────────────────────────────────── */

describe("as chaves, no caminho", () => {
  /** O #55, um Puzzle. Ontem, o 4, é o dia que a fixture deixa por jogar. */
  const HOJE = "2026-12-05";
  const ONTEM = "2026-12-04";
  /** Um dia de novembro que ficou por jogar: o #27, um Puzzle. */
  const PERDIDO = "2026-11-07";

  /**
   * Tudo feito, menos `ONTEM` e os dias 7, que ficaram por jogar — e se abrem
   * com uma chave. `marcas` acrescenta o que se quiser a um dia.
   */
  const abrir = (
    t: Partial<TrilhoDoDesafio> = {},
    marcas: Readonly<Record<string, Partial<DiaNoTrilho>>> = {},
  ): DesafioScreen =>
    new DesafioScreen(host, {
      aoVoltar: () => undefined,
      trilho: {
        hoje: HOJE,
        sequencia: 0,
        chaves: 1,
        aoJogar: () => undefined,
        aoDesbloquear: () => undefined,
        diasDoMes: (mes) =>
          diasDoMes(mes).map((data): DiaNoTrilho => {
            const perdido = data === ONTEM || data.endsWith("-07");
            return {
              data,
              numero: numeroDoDia(data),
              modo: modoDoDia(data),
              estado:
                data > HOJE
                  ? { tipo: "futuro" }
                  : data === HOJE
                    ? { tipo: "por-jogar" }
                    : perdido
                      ? { tipo: "perdido" }
                      : { tipo: "feito", texto: "ok" },
              ...(perdido && data < HOJE ? { desbloqueavel: true } : {}),
              ...marcas[data],
            };
          }),
        primeiroMes: "2026-10",
        ...t,
      },
    });

  const casa = (data: string): HTMLElement | undefined =>
    [...host.querySelectorAll<HTMLElement>(".trilho-dia")].find(
      (li) => li.querySelector(".trilho-rotulo")?.textContent?.startsWith(`${String(Number(data.slice(8)))} `),
    );

  const tocar = (data: string): void => {
    casa(data)?.querySelector<HTMLElement>(".trilho-no")?.click();
  };

  const mes = (nome: string): HTMLButtonElement | undefined =>
    [...host.querySelectorAll<HTMLButtonElement>(".desafio-meses-botao")].find(
      (b) => b.querySelector(".desafio-meses-nome")?.textContent === nome,
    );

  const botoesDo = (seletor: string): HTMLButtonElement[] => [
    ...host.querySelectorAll<HTMLButtonElement>(`${seletor} .btn`),
  ];

  const botao = (seletor: string, rotulo: string): HTMLButtonElement | undefined =>
    botoesDo(seletor).find((b) => b.textContent === rotulo);

  const PROTECAO = {
    data: ONTEM,
    sequencia: 5,
    perguntar: true,
    aoProteger: () => undefined,
    aoRecusar: () => undefined,
  };

  it("**a carteira fica no topo**, e tocar-lhe explica as chaves e a próxima", () => {
    const ecra = abrir({ chaves: 2, sequencia: 5 });

    expect(host.querySelector(".topo .desafio-chaves")?.textContent).toBe("🔑 2");
    host.querySelector<HTMLElement>(".desafio-chaves-botao")?.click();

    const caixa = host.querySelector(".chaves-explicacao");
    expect(caixa?.querySelector(".popup-titulo")?.textContent).toBe("As chaves · 🔑 2");
    expect([...(caixa?.querySelectorAll(".chaves-patamares li") ?? [])].map((li) => li.textContent)).toEqual([
      "3 dias seguidos+1 🔑",
      "7 dias seguidos+2 🔑",
      "14 dias seguidos+3 🔑",
      "30 dias seguidos+5 🔑",
    ]);
    expect(caixa?.textContent).toContain("A próxima: aos 7 dias, +2 🔑 — faltam 2 dias.");

    botao(".chaves-explicacao", "Percebi")?.click();
    expect(host.querySelector(".chaves-explicacao")).toBeNull();
    ecra.destruir();
  });

  it("**ontem por jogar: pergunta logo ao abrir**, e a série no topo diz que está em risco", () => {
    const aoProteger = vi.fn();
    // Hoje já feito: a série é 1, mas o que está em jogo são os cinco de antes.
    const ecra = abrir({ sequencia: 1, protecao: { ...PROTECAO, aoProteger } });

    expect(host.querySelector(".topo .desafio-sequencia")?.textContent).toBe("🔥 5 em risco");

    const caixa = host.querySelector("dialog.confirmacao");
    expect(caixa?.querySelector(".popup-titulo")?.textContent).toBe("A tua sequência está em risco");
    expect(caixa?.textContent).toContain("a tua sequência de 5 dias acaba aí");
    // Salvar é o que se oferece: o realce é dele, e não da saída.
    expect(botao("dialog.confirmacao", "Usar 🔑 1")?.classList.contains("primario")).toBe(true);

    botao("dialog.confirmacao", "Usar 🔑 1")?.click();
    expect(aoProteger).toHaveBeenCalledOnce();
    expect(host.querySelector("dialog.confirmacao")).toBeNull();
    ecra.destruir();
  });

  it("«agora não» fica dito — e a oferta continua no balão de ontem", () => {
    const aoRecusar = vi.fn();
    const aoProteger = vi.fn();
    let ecra = abrir({ protecao: { ...PROTECAO, aoRecusar } });
    botao("dialog.confirmacao", "Agora não")?.click();
    expect(aoRecusar).toHaveBeenCalledOnce();
    ecra.destruir();

    // Depois de recusar, abrir já não pergunta.
    ecra = abrir({ protecao: { ...PROTECAO, perguntar: false, aoProteger } });
    expect(host.querySelector("dialog")).toBeNull();

    tocar(ONTEM);
    expect(botoesDo(".trilho-balao").map((b) => b.textContent)).toEqual([
      "Salvar a sequência",
      "Desbloquear · 🔑 1",
    ]);
    botao(".trilho-balao", "Salvar a sequência")?.click();
    botao("dialog.confirmacao", "Usar 🔑 1")?.click();
    expect(aoProteger).toHaveBeenCalledOnce();
    ecra.destruir();
  });

  it("**um dia por jogar abre-se com uma chave** — confirmado, joga-se", () => {
    const aoDesbloquear = vi.fn();
    const ecra = abrir({ aoDesbloquear });

    mes("nov")?.click();
    tocar(PERDIDO);
    expect(host.querySelector(".trilho-balao .desafio-resultado")?.textContent).toBe("Ficou por jogar.");

    botao(".trilho-balao", "Desbloquear · 🔑 1")?.click();
    const caixa = host.querySelector("dialog.confirmacao");
    expect(caixa?.querySelector(".popup-titulo")?.textContent).toBe("Desbloquear o desafio #27?");
    expect(caixa?.textContent).toContain("não para a sequência");

    // Cancelar não gasta nada.
    botao("dialog.confirmacao", "Cancelar")?.click();
    expect(aoDesbloquear).not.toHaveBeenCalled();

    botao(".trilho-balao", "Desbloquear · 🔑 1")?.click();
    botao("dialog.confirmacao", "Desbloquear e jogar")?.click();
    expect(aoDesbloquear).toHaveBeenCalledWith(PERDIDO);
    ecra.destruir();
  });

  it("sem chaves, o botão fica apagado, e diz quando chega a próxima", () => {
    const ecra = abrir({ chaves: 0, sequencia: 5 });
    mes("nov")?.click();
    tocar(PERDIDO);

    expect(botao(".trilho-balao", "Desbloquear · 🔑 1")?.disabled).toBe(true);
    expect(host.querySelector(".trilho-balao .desafio-nota-chave")?.textContent).toBe(
      "Sem chaves. A próxima chega aos 7 dias seguidos.",
    );
    ecra.destruir();
  });

  it("**um dia aberto joga-se como hoje** — e, feito, treina-se mas não se partilha", () => {
    const aoJogar = vi.fn();
    let ecra = abrir(
      { aoJogar },
      { [PERDIDO]: { desbloqueado: true, desbloqueavel: false, estado: { tipo: "por-jogar" } } },
    );
    mes("nov")?.click();
    tocar(PERDIDO);
    expect(botoesDo(".trilho-balao").map((b) => b.textContent)).toEqual(["Jogar"]);
    botao(".trilho-balao", "Jogar")?.click();
    expect(aoJogar).toHaveBeenCalledWith(PERDIDO);
    ecra.destruir();

    ecra = abrir(
      { aoPartilhar: () => Promise.resolve("copiado") },
      { [PERDIDO]: { desbloqueado: true, desbloqueavel: false, estado: { tipo: "feito", texto: "1:02.3" } } },
    );
    mes("nov")?.click();
    tocar(PERDIDO);
    expect(botoesDo(".trilho-balao").map((b) => b.textContent)).toEqual(["Treinar"]);
    expect(host.querySelector(".trilho-balao .desafio-nota-chave")?.textContent).toBe(
      "Jogado depois, com uma chave: conta para o mês, não para a sequência.",
    );
    ecra.destruir();
  });

  it("as casas mostram onde se gastou uma chave, e onde a série deu chaves", () => {
    const ecra = abrir(
      {},
      {
        "2026-12-01": { premio: 2 },
        [ONTEM]: { protegido: true, desbloqueavel: true },
      },
    );

    expect(casa("2026-12-01")?.querySelector(".trilho-premio")?.textContent).toBe("+2 🔑");
    expect(casa("2026-12-01")?.querySelector(".trilho-no")?.getAttribute("aria-label")).toContain(
      "ganhou 2 chaves",
    );
    expect(casa(ONTEM)?.querySelector(".trilho-chave")).not.toBeNull();
    expect(casa("2026-12-02")?.querySelector(".trilho-chave")).toBeNull();

    tocar(ONTEM);
    expect(host.querySelector(".trilho-balao .desafio-nota-chave")?.textContent).toBe(
      "🔑 Uma chave salvou a sequência.",
    );
    ecra.destruir();
  });

  it("**o balão de hoje diz as chaves que hoje dá**, quando a série chega a um patamar", () => {
    let ecra = abrir({ sequencia: 6, premioDeHoje: 2 });
    expect(host.querySelector(".trilho-balao-premio")?.textContent).toBe("🔥 +1 · 🔑 +2");
    ecra.destruir();

    ecra = abrir({ sequencia: 4, premioDeHoje: 0 });
    expect(host.querySelector(".trilho-balao-premio")?.textContent).toBe("🔥 +1");
    ecra.destruir();
  });

  it("**as chaves que acabaram de chegar celebram-se ao abrir** — e passam à frente do risco", () => {
    const ecra = abrir({ premio: { chaves: 1, dias: 3 }, protecao: PROTECAO });

    const caixas = host.querySelectorAll("dialog");
    expect(caixas).toHaveLength(1);
    expect(host.querySelector(".chaves-premio .popup-titulo")?.textContent).toBe("🔑 +1");
    expect(host.querySelector(".chaves-premio")?.textContent).toContain("3 dias seguidos! Ganhaste 1 chave");
    ecra.destruir();
  });

  it("**o regresso de um dia passado abre nesse dia**, e não em hoje", () => {
    const ecra = abrir({ foco: PERDIDO });
    expect(host.querySelector(".desafio-mes-nome")?.textContent).toBe("Novembro de 2026");
    expect(casa(PERDIDO)?.querySelector(".trilho-balao")).not.toBeNull();
    ecra.destruir();
  });
});

/* ─── O Contra-Relógio do Dia ─────────────────────────────────────────────── */

describe("o Contra-Relógio do Dia", () => {
  /** Doze tabuleiros diferentes de duas colunas, para a seed ter por onde escolher. */
  const NIVEIS: readonly Level[] = Array.from({ length: 12 }, (_, i) => ({
    id: `tempo-${String(i)}`,
    seed: i,
    board: [[1 + (i % 6)], [6 - (i % 6)]] as Level["board"],
    solution: [],
  }));

  const tabuleiro = (): string =>
    [...host.querySelectorAll<HTMLElement>(".tabuleiro .peca")]
      .map((p) => `${p.dataset["pos"] ?? ""}:${p.dataset["valor"] ?? ""}`)
      .join(" ");

  const abrir = (seed: number, extra: Partial<ConstructorParameters<typeof TimeAttackScreen>[1]> = {}) =>
    new TimeAttackScreen(host, {
      niveis: NIVEIS,
      melhorPontuacao: 0,
      tempoInicial: 30,
      aoTerminar: () => undefined,
      aoSair: () => undefined,
      seed,
      ...extra,
    });

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("**a mesma seed dá o mesmo tabuleiro** — e outras seeds dão outros", () => {
    const vistos = new Set<string>();

    for (const seed of [11, 22, 33, 44, 55, 66]) {
      const a = abrir(seed);
      const primeiro = tabuleiro();
      a.destruir();

      const b = abrir(seed);
      expect(tabuleiro()).toBe(primeiro);
      b.destruir();

      vistos.add(primeiro);
    }

    expect(vistos.size).toBeGreaterThan(1);
  });

  it("o fim diz o desafio, oferece partilhar, e jogar outra vez é treinar", async () => {
    const aoRecomecar = vi.fn();
    const ecra = abrir(7, {
      aoRecomecar,
      desafio: { etiqueta: "Desafio #3", aoPartilhar: () => Promise.resolve("copiado") },
    });

    await vi.advanceTimersByTimeAsync(31_000);

    const fim = host.querySelector(".fim:not(.preso)");
    expect(fim?.querySelector(".selo")?.textContent).toBe("Desafio #3");
    const botoes = [...(fim?.querySelectorAll(".btn") ?? [])].map((b) => b.textContent);
    expect(botoes).toEqual(["Sair", "Treinar outra vez", "Partilhar"]);

    [...(fim?.querySelectorAll<HTMLElement>(".btn") ?? [])][1]?.click();
    expect(aoRecomecar).toHaveBeenCalledOnce();
    ecra.destruir();
  });

  /*
   * O defeito que isto fecha: a tentativa marcava-se ao entrar, e quem abria o
   * desafio e saía pela seta gravava 0 pontos como resultado do dia. A corrida
   * a sério, a seguir, já era treino — e não ficava registada.
   */
  describe("a tentativa oficial espera pelo «Começar»", () => {
    const painel = (): HTMLElement | null => host.querySelector<HTMLElement>(".fim:not(.preso)");
    const botao = (texto: string): HTMLElement | undefined =>
      [...(painel()?.querySelectorAll<HTMLElement>(".btn") ?? [])].find(
        (b) => b.textContent === texto,
      );

    it("**entrar e voltar não gasta nada**: o relógio está parado e o tabuleiro escondido", async () => {
      const aoComecar = vi.fn();
      const aoSair = vi.fn();
      const aoTerminar = vi.fn();
      const ecra = abrir(7, { aoComecar, aoSair, aoTerminar, desafio: { etiqueta: "Desafio #3" } });

      expect(painel()?.hidden).toBe(false);
      expect(painel()?.querySelector(".selo")?.textContent).toBe("Desafio #3");
      expect(painel()?.querySelector(".fim-tempo")?.textContent).toBe("30 segundos");
      expect(host.querySelector(".palco")?.classList.contains("a-espera")).toBe(true);

      // O tempo passa — também com a aplicação em segundo plano — e nada acaba.
      await vi.advanceTimersByTimeAsync(60_000);
      document.dispatchEvent(new Event("visibilitychange"));
      expect(aoTerminar).not.toHaveBeenCalled();
      expect(host.querySelector(".relogio")?.textContent).toBe("30");

      // O botão para trás do Android navega sem perguntar: não há corrida.
      expect(ecra.interceptarVoltar()).toBe(false);

      botao("Voltar")?.click();
      expect(aoSair).toHaveBeenCalledOnce();
      expect(aoComecar).not.toHaveBeenCalled();
      expect(aoTerminar).not.toHaveBeenCalled();
      ecra.destruir();
    });

    it("no «Começar» a tentativa marca-se, o tabuleiro aparece, e o relógio arranca dali", async () => {
      const aoComecar = vi.fn();
      const aoTerminar = vi.fn();
      const ecra = abrir(7, { aoComecar, aoTerminar, desafio: { etiqueta: "Desafio #3" } });

      // Ficar a ler o painel não gasta tempo da corrida.
      await vi.advanceTimersByTimeAsync(20_000);
      botao("Começar")?.click();

      expect(aoComecar).toHaveBeenCalledOnce();
      expect(host.querySelector(".palco")?.classList.contains("a-espera")).toBe(false);
      expect(painel()?.hidden).toBe(true);

      await vi.advanceTimersByTimeAsync(29_000);
      expect(aoTerminar).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(2_000);
      expect(aoTerminar).toHaveBeenCalledOnce();
      ecra.destruir();
    });

    it("depois de começar, sair pergunta — e diz que é esta a que conta", () => {
      const ecra = abrir(7, { aoComecar: () => undefined });
      botao("Começar")?.click();

      expect(ecra.interceptarVoltar()).toBe(true);
      expect(document.querySelector("dialog")?.textContent).toContain("é esta a que conta");
      ecra.destruir();
    });

    it("**com e sem painel, a mesma corrida** — o treino é a tentativa oficial outra vez", () => {
      // Uma bomba logo no primeiro tabuleiro: é o primeiro sorteio da seed.
      const afinacao = {
        bomba: { ...DEFAULT_TIME_ATTACK.bomba, desdeTabuleiro: 0, probabilidade: 1 },
      };
      const bomba = (): string | undefined =>
        host.querySelector<HTMLElement>(".peca.bomba")?.dataset["pos"];

      for (const seed of [11, 22, 33, 44]) {
        const treino = abrir(seed, { afinacao });
        const esperado = `${tabuleiro()} bomba:${bomba() ?? "-"}`;
        treino.destruir();

        const oficial = abrir(seed, { afinacao, aoComecar: () => undefined });
        botao("Começar")?.click();
        expect(bomba()).toBeDefined();
        expect(`${tabuleiro()} bomba:${bomba() ?? "-"}`).toBe(esperado);
        oficial.destruir();
      }
    });
  });
});

/* ─── O Survival do Dia ───────────────────────────────────────────────────── */

describe("o Survival do Dia", () => {
  /** À altura do teto: a próxima linha transborda. */
  const noTeto = (): SurvivalState => {
    const base = startSurvival(5);
    const cheio = Array.from({ length: DEFAULT_SURVIVAL.largura }, () =>
      Array.from({ length: DEFAULT_SURVIVAL.alturaMaxima }, () => 1 as const),
    );
    return { ...base, game: { ...base.game, board: cheio }, proximaLinhaMs: 1_500 };
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /** Duas peças que somam 7: um toque em cada e o tabuleiro fica limpo. */
  const quaseLimpo = (): SurvivalState => {
    const base = startSurvival(5);
    return { ...base, game: { ...base.game, board: [[3], [4]] } };
  };

  const OFICIAL: DesafioNoEcra = {
    etiqueta: "Desafio #3",
    oficial: true,
    aoPartilhar: () => Promise.resolve("copiado"),
  };

  const correr = (
    estado: SurvivalState,
    desafio: DesafioNoEcra,
    aoTerminar: () => void = () => undefined,
    aoRecomecar: (seed: number) => void = () => undefined,
  ): SurvivalScreen =>
    new SurvivalScreen(host, {
      seed: 5,
      retomar: { estado, decorridoMs: 1_000 },
      melhorTempo: Number.POSITIVE_INFINITY,
      aoGuardar: () => undefined,
      aoTerminar,
      aoSair: () => undefined,
      aoRecomecar,
      desafio,
    });

  const fim = (): HTMLElement | null => host.querySelector<HTMLElement>("dialog.popup");
  const botoesDoFim = (): HTMLElement[] => [...(fim()?.querySelectorAll<HTMLElement>(".btn") ?? [])];

  it("**não deixa recomeçar com outra seed**, e transbordar a oficial é tentar outra vez", async () => {
    const aoRecomecar = vi.fn();
    const aoTerminar = vi.fn();
    const ecra = correr(noTeto(), OFICIAL, aoTerminar, aoRecomecar);

    const recomecar = [...host.querySelectorAll<HTMLButtonElement>(".rodape .btn")].find(
      (b) => b.textContent === "Recomeçar",
    );
    expect(recomecar?.hidden).toBe(true);

    await vi.advanceTimersByTimeAsync(4_000);

    expect(aoTerminar).toHaveBeenCalledWith(
      expect.objectContaining({ limpou: false, linhas: expect.any(Number) as number }),
    );

    // Transbordar não fecha o desafio: não há nada para partilhar, e a próxima ainda conta.
    expect(fim()?.querySelector(".popup-etiqueta")?.textContent).toBe("Desafio #3");
    expect(fim()?.textContent).toContain("O desafio fica feito quando limpares o tabuleiro");
    expect(botoesDoFim().map((b) => b.textContent)).toEqual(["Tentar outra vez", "Sair"]);

    botoesDoFim()[0]?.click();
    expect(aoRecomecar).toHaveBeenCalledWith(5);
    ecra.destruir();
  });

  it("no treino, transbordar é treinar outra vez", async () => {
    const ecra = correr(noTeto(), { etiqueta: "Desafio #3 · treino" });
    await vi.advanceTimersByTimeAsync(4_000);

    expect(fim()?.textContent).not.toContain("limpares");
    expect(botoesDoFim().map((b) => b.textContent)).toEqual(["Treinar outra vez", "Sair"]);
    ecra.destruir();
  });

  it("limpar o tabuleiro acaba o desafio: partilhar, e o resto é treino", async () => {
    const aoTerminar = vi.fn();
    const ecra = correr(quaseLimpo(), OFICIAL, aoTerminar);

    for (const p of [0, 64]) {
      host
        .querySelector(`.tabuleiro .peca[data-pos="${String(p)}"]`)
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    }
    await vi.advanceTimersByTimeAsync(1_000);

    expect(aoTerminar).toHaveBeenCalledWith(expect.objectContaining({ limpou: true }));
    expect(fim()?.textContent).toContain("Tabuleiro limpo");
    expect(botoesDoFim().map((b) => b.textContent)).toEqual([
      "Partilhar",
      "Treinar outra vez",
      "Sair",
    ]);
    ecra.destruir();
  });
});

/* ─── O Puzzle do Dia ─────────────────────────────────────────────────────── */

describe("o Puzzle do Dia", () => {
  /** Uma jogada: 3+4. */
  const NIVEL: Level = { id: "denso-000099", seed: 99, board: [[3], [4]], solution: [] };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("o fim diz o desafio em vez do recorde, oferece partilhar, e repetir é treinar", async () => {
    const aoTerminar = vi.fn();
    const ecra = new PuzzleScreen(host, NIVEL, {
      titulo: "Desafio #3",
      desafio: { etiqueta: "Desafio #3", aoPartilhar: () => Promise.resolve("copiado") },
      aoTerminar,
    });

    for (const p of [0, 64]) {
      host
        .querySelector(`.tabuleiro .peca[data-pos="${String(p)}"]`)
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    }
    await vi.advanceTimersByTimeAsync(2_000);

    expect(aoTerminar).toHaveBeenCalledWith(expect.objectContaining({ selo: "perfect" }));

    const fim = host.querySelector(".fim");
    expect(fim?.querySelector(".fim-desafio")?.textContent).toBe("Desafio #3");
    const botoes = [...(fim?.querySelectorAll(".btn") ?? [])].map((b) => b.textContent);
    expect(botoes).toEqual(["Treinar outra vez", "Partilhar"]);
    ecra.destruir();
  });
});
