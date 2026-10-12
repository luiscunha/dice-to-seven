// @vitest-environment jsdom

/**
 * O Desafio do Dia, no ecrã.
 *
 * O núcleo está em `desafio.test.ts`. Aqui protege-se o que o jogador vê e
 * toca: o cartão da Home em cada estado, o texto que se partilha, e os dois
 * ecrãs de corrida quando a corrida é o desafio — a mesma seed dá os mesmos
 * tabuleiros, o fim oferece partilhar e treinar, e o Survival do dia não deixa
 * trocar de seed a meio.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Level } from "@dicetoseven/engine";

import { emptyProfile } from "../src/session/progress";
import type { Profile } from "../src/session/progress";
import type { SurvivalState } from "../src/session/SurvivalSession";
import { DEFAULT_SURVIVAL, startSurvival } from "../src/session/SurvivalSession";
import type { CartaoDoDesafio } from "../src/ui/HomeScreen";
import { HomeScreen } from "../src/ui/HomeScreen";
import {
  botaoPartilhar,
  dataCurta,
  partilhar,
  textoDoDesafio,
} from "../src/ui/partilha";
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

  it("diz o número e o dia, e os dois resultados", () => {
    expect(textoDoDesafio("2026-10-14", { tempo: TEMPO, survival: SURVIVAL }, 3)).toBe(
      [
        "DiceToSeven · Desafio #3 · 14 out",
        "⏱️ Contra-Relógio: 1240 pontos · 14 tabuleiros",
        "🧱 Survival: 3:42.1 · 18 linhas",
        "🔥 3 dias seguidos",
      ].join("\n"),
    );
  });

  it("só leva o que foi feito, e a sequência só a partir de dois dias", () => {
    expect(textoDoDesafio("2026-10-12", { tempo: TEMPO, survival: { estado: "a-jogar" } }, 1)).toBe(
      "DiceToSeven · Desafio #1 · 12 out\n⏱️ Contra-Relógio: 1240 pontos · 14 tabuleiros",
    );
  });

  it("um Survival limpo di-lo", () => {
    const limpo = { estado: "feito", resultado: { tempoMs: 95_000, limpou: true, linhas: 9 } } as const;
    expect(textoDoDesafio("2026-10-12", { survival: limpo }, 0)).toContain(
      "🧱 Survival: limpo em 1:35.0",
    );
  });

  it("os meses em português, abreviados", () => {
    expect(dataCurta("2026-01-05")).toBe("5 jan");
    expect(dataCurta("2026-12-31")).toBe("31 dez");
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

describe("o cartão do Desafio do Dia", () => {
  /** Quem já fez um nível: o desafio vem por cima dos modos. */
  const jogador: Profile = {
    ...emptyProfile(),
    levels: { "inicio-000001": { seal: "completed", bestTimeMs: 9_000 } },
  };

  const abrir = (d: Partial<CartaoDoDesafio> = {}, perfil: Profile = jogador): HomeScreen =>
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
        dados: [1, 2, 3, 4, 5, 6],
        tempo: { tipo: "por-jogar" },
        survival: { tipo: "por-jogar" },
        aoJogarTempo: () => undefined,
        aoJogarSurvival: () => undefined,
        ...d,
      },
    });

  const estado = (modo: string): string | undefined =>
    host.querySelector(`.home-desafio-modo[data-modo="${modo}"] .home-desafio-modo-estado`)
      ?.textContent ?? undefined;

  const ordem = (): string[] =>
    [...host.querySelectorAll(".ecra.home > *")].map((e) => e.className);

  it("para quem chega, os Puzzles vêm primeiro — a campanha é a porta de entrada", () => {
    const ecra = abrir({}, emptyProfile());
    expect(ordem().indexOf("home-modos")).toBeLessThan(ordem().indexOf("home-desafio"));
    ecra.destruir();
  });

  it("**para quem já joga, fica por cima dos modos**, com o número e o dia", () => {
    const ecra = abrir();
    expect(ordem().indexOf("home-desafio")).toBeLessThan(ordem().indexOf("home-modos"));
    expect(host.querySelector(".home-modos .home-seccao")?.textContent).toBe("Modos de jogo");
    expect(host.querySelector(".home-desafio-cardinal")?.textContent).toBe("#3");
    expect(host.querySelector(".home-desafio-data")?.textContent).toBe("14 out");
    // Os dados do dia, como peças a sério.
    const dados = [...host.querySelectorAll<HTMLElement>(".home-desafio-dados .peca")];
    expect(dados.map((p) => p.dataset["valor"])).toEqual(["1", "2", "3", "4", "5", "6"]);
    ecra.destruir();
  });

  it("cada desafio diz o seu estado", () => {
    const ecra = abrir({
      tempo: { tipo: "feito", texto: "1240 pontos" },
      survival: { tipo: "a-meio", texto: "1:20.0" },
    });
    expect(estado("tempo")).toBe("✓ 1240 pontos");
    expect(estado("survival")).toBe("Continuar · 1:20.0");
    ecra.destruir();

    const outro = abrir({ tempo: { tipo: "interrompido" } });
    expect(estado("tempo")).toBe("Interrompido");
    expect(estado("survival")).toBe("Jogar");
    outro.destruir();
  });

  it("tocar num desafio joga-o", () => {
    const aoJogarSurvival = vi.fn();
    const ecra = abrir({ aoJogarSurvival });
    host.querySelector<HTMLElement>('.home-desafio-modo[data-modo="survival"]')?.click();
    expect(aoJogarSurvival).toHaveBeenCalledOnce();
    ecra.destruir();
  });

  it("a sequência e o partilhar só aparecem quando há o que mostrar", () => {
    const vazio = abrir();
    expect(host.querySelector(".home-desafio-sequencia")).toBeNull();
    expect(host.querySelector(".home-desafio-partilhar")).toBeNull();
    vazio.destruir();

    const cheio = abrir({ sequencia: 4, aoPartilhar: () => Promise.resolve("copiado") });
    expect(host.querySelector(".home-desafio-sequencia")?.textContent).toBe("🔥 4");
    expect(host.querySelector(".home-desafio-partilhar")).not.toBeNull();
    cheio.destruir();
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
