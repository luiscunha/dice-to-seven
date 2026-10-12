// @vitest-environment jsdom

/**
 * O Desafio do Dia, no ecrã.
 *
 * O núcleo está em `desafio.test.ts`. Aqui protege-se o que o jogador vê e
 * toca: o cartão da Home em cada estado, o calendário do mês, o texto que se
 * partilha, e os ecrãs de cada modo quando são o desafio — a mesma seed dá os
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
import type {
  CalendarioDoDesafio,
  EstadoNoCalendario,
  EstadoNoCartao,
} from "../src/ui/DesafioScreen";
import { DesafioScreen } from "../src/ui/DesafioScreen";
import type { ResumoDoDesafio } from "../src/ui/HomeScreen";
import { HomeScreen } from "../src/ui/HomeScreen";
import {
  botaoPartilhar,
  dataCurta,
  dataPorExtenso,
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
    resultado: { tempoMs: 222_100, limpou: false, linhas: 18 },
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
        "🧱 Survival: 3:42.1 · 18 linhas",
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

  it("um Survival limpo di-lo", () => {
    const limpo = { estado: "feito", resultado: { tempoMs: 95_000, limpou: true, linhas: 9 } } as const;
    expect(textoDoDesafio("2026-10-14", { survival: limpo }, 0)).toContain(
      "🧱 Survival: limpo em 1:35.0",
    );
  });

  it("os meses em português, abreviados", () => {
    expect(dataCurta("2026-01-05")).toBe("5 jan");
    expect(dataCurta("2026-12-31")).toBe("31 dez");
    expect(dataPorExtenso("2026-03-07")).toBe("7 de março");
    expect(mesPorExtenso("2026-10-12")).toBe("outubro de 2026");
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

  it("para quem chega, os Puzzles vêm primeiro — a campanha é a porta de entrada", () => {
    const ecra = abrir({}, emptyProfile());
    expect(ordem().indexOf("home-modos")).toBeLessThan(ordem().indexOf("home-desafio"));
    ecra.destruir();
  });

  it("para quem já joga, fica por cima dos modos", () => {
    const ecra = abrir();
    expect(ordem().indexOf("home-desafio")).toBeLessThan(ordem().indexOf("home-modos"));
    expect(host.querySelector(".home-modos .home-seccao")?.textContent).toBe("Modos de jogo");
    ecra.destruir();
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

describe("o ecrã do Desafio do Dia", () => {
  /** Uma quarta-feira, o #3: um Survival. */
  const HOJE = "2026-10-14";

  /** O #1 feito, o #2 perdido, hoje por jogar, e o resto do mês por vir. */
  const estadoDe = (data: string, hoje: EstadoNoCartao): EstadoNoCalendario =>
    data < "2026-10-12"
      ? { tipo: "sem-desafio" }
      : data === "2026-10-12"
        ? { tipo: "feito", texto: "1:23.4 ★" }
        : data < HOJE
          ? { tipo: "perdido" }
          : data === HOJE
            ? hoje
            : { tipo: "futuro" };

  const abrir = (
    c: Partial<CalendarioDoDesafio> = {},
    hoje: EstadoNoCartao = { tipo: "por-jogar" },
    aoVoltar = (): void => undefined,
  ): DesafioScreen =>
    new DesafioScreen(host, {
      aoVoltar,
      calendario: {
        mes: "outubro de 2026",
        hoje: HOJE,
        dias: diasDoMes(HOJE).map((data) => ({
          data,
          numero: numeroDoDia(data),
          modo: modoDoDia(data),
          estado: estadoDe(data, hoje),
        })),
        sequencia: 0,
        aoJogar: () => undefined,
        ...c,
      },
    });

  const celula = (dia: number): HTMLButtonElement | undefined =>
    [...host.querySelectorAll<HTMLButtonElement>(".desafio-dia")].find(
      (b) => b.querySelector(".desafio-dia-numero")?.textContent === String(dia),
    );

  const bilhete = (classe: string): string | null | undefined =>
    host.querySelector(`.desafio-bilhete .${classe}`)?.textContent;

  const botoes = (): (string | null)[] =>
    [...host.querySelectorAll(".desafio-bilhete .btn")].map((b) => b.textContent);

  it("**o mês inteiro, a começar na segunda**, com o modo de cada dia", () => {
    const ecra = abrir();

    expect(host.querySelector(".desafio-mes-nome")?.textContent).toBe("Outubro de 2026");
    expect(host.querySelectorAll(".desafio-dia")).toHaveLength(31);
    // O dia 1 foi uma quinta: três casas vazias antes dele.
    expect(host.querySelectorAll(".desafio-dias > .desafio-dia-vazio")).toHaveLength(3);

    expect([12, 13, 14, 15].map((d) => celula(d)?.dataset["modo"])).toEqual([
      "puzzle",
      "tempo",
      "survival",
      "puzzle",
    ]);

    // Antes do #1 não houve desafio: os dias estão lá, sem modo, e não se tocam.
    expect(celula(11)?.disabled).toBe(true);
    expect(celula(11)?.querySelector(".desafio-dia-icone")).toBeNull();
    ecra.destruir();
  });

  it("**hoje abre selecionado**, e joga-se pelo bilhete", () => {
    const aoJogar = vi.fn();
    const ecra = abrir({ aoJogar });

    expect(celula(14)?.hasAttribute("data-hoje")).toBe(true);
    expect(celula(14)?.getAttribute("aria-pressed")).toBe("true");
    expect(bilhete("desafio-cardinal")).toBe("#3");
    expect(bilhete("desafio-data")).toBe("14 out");
    expect(bilhete("desafio-quando")).toBe("Hoje");
    expect(bilhete("desafio-modo-nome")).toBe("Survival");

    expect(botoes()).toEqual(["Jogar"]);
    host.querySelector<HTMLElement>(".desafio-bilhete .btn")?.click();
    expect(aoJogar).toHaveBeenCalledOnce();
    ecra.destruir();
  });

  it("tocar noutro dia mostra-o no bilhete — e esse não se joga", () => {
    const ecra = abrir();

    expect(celula(12)?.dataset["estado"]).toBe("feito");
    celula(12)?.click();
    expect(bilhete("desafio-quando")).toBe("Há 2 dias");
    expect(bilhete("desafio-modo-nome")).toBe("Puzzle");
    expect(bilhete("desafio-resultado")).toBe("✓ 1:23.4 ★");
    expect(botoes()).toEqual([]);

    celula(13)?.click();
    expect(bilhete("desafio-quando")).toBe("Ontem");
    expect(bilhete("desafio-resultado")).toBe("Ficou por jogar.");

    celula(15)?.click();
    expect(bilhete("desafio-quando")).toBe("Amanhã");
    expect(bilhete("desafio-resultado")).toBe("Abre à meia-noite.");

    celula(20)?.click();
    expect(bilhete("desafio-quando")).toBe("Daqui a 6 dias");
    expect(bilhete("desafio-resultado")).toBe("Abre no dia 20.");
    expect(botoes()).toEqual([]);

    // Um dia selecionado de cada vez.
    expect(host.querySelectorAll('.desafio-dia[aria-pressed="true"]')).toHaveLength(1);
    expect(celula(20)?.getAttribute("aria-pressed")).toBe("true");
    ecra.destruir();
  });

  it("feito hoje: o resultado, treinar e partilhar", () => {
    const aoJogar = vi.fn();
    const ecra = abrir(
      { aoJogar, aoPartilhar: () => Promise.resolve("copiado") },
      { tipo: "feito", texto: "3:42.1" },
    );

    expect(bilhete("desafio-resultado")).toBe("✓ 3:42.1");
    expect(botoes()).toEqual(["Treinar", "Partilhar"]);
    host.querySelector<HTMLElement>(".desafio-bilhete .btn")?.click();
    expect(aoJogar).toHaveBeenCalledOnce();
    ecra.destruir();
  });

  it("a meio continua-se; interrompido, o resto do dia é treino", () => {
    let ecra = abrir({}, { tipo: "a-meio", texto: "1:20.0" });
    expect(bilhete("desafio-resultado")).toBe("A meio · 1:20.0");
    expect(botoes()).toEqual(["Continuar"]);
    ecra.destruir();

    ecra = abrir({}, { tipo: "interrompido" });
    expect(botoes()).toEqual(["Treinar"]);
    ecra.destruir();
  });

  it("a seta volta, e a sequência só aparece quando há", () => {
    const aoVoltar = vi.fn();
    let ecra = abrir({}, { tipo: "por-jogar" }, aoVoltar);
    expect(host.querySelector(".desafio-sequencia")).toBeNull();
    host.querySelector<HTMLElement>(".topo .btn")?.click();
    expect(aoVoltar).toHaveBeenCalledOnce();
    ecra.destruir();

    ecra = abrir({ sequencia: 2 });
    expect(host.querySelector(".desafio-mes .desafio-sequencia")?.textContent).toBe("🔥 2");
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

  it("**não deixa recomeçar com outra seed**, e o fim oferece partilhar e treinar", async () => {
    const aoRecomecar = vi.fn();
    const aoTerminar = vi.fn();
    const ecra = new SurvivalScreen(host, {
      seed: 5,
      retomar: { estado: noTeto(), decorridoMs: 1_000 },
      melhorTempo: Number.POSITIVE_INFINITY,
      aoGuardar: () => undefined,
      aoTerminar,
      aoSair: () => undefined,
      aoRecomecar,
      desafio: { etiqueta: "Desafio #3", aoPartilhar: () => Promise.resolve("copiado") },
    });

    const recomecar = [...host.querySelectorAll<HTMLButtonElement>(".rodape .btn")].find(
      (b) => b.textContent === "Recomeçar",
    );
    expect(recomecar?.hidden).toBe(true);

    await vi.advanceTimersByTimeAsync(4_000);

    expect(aoTerminar).toHaveBeenCalledWith(
      expect.objectContaining({ limpou: false, linhas: expect.any(Number) as number }),
    );

    const popup = host.querySelector("dialog.popup");
    expect(popup?.querySelector(".popup-etiqueta")?.textContent).toBe("Desafio #3");
    const botoes = [...(popup?.querySelectorAll(".btn") ?? [])].map((b) => b.textContent);
    expect(botoes).toEqual(["Partilhar", "Treinar outra vez", "Sair"]);

    [...(popup?.querySelectorAll<HTMLElement>(".btn") ?? [])][1]?.click();
    expect(aoRecomecar).toHaveBeenCalledWith(5);
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
