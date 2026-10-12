// @vitest-environment jsdom

/**
 * O Contra-Relógio no ecrã: o que custa um erro, e a bomba.
 *
 * As regras estão testadas na sessão (`session.test.ts`). Aqui testa-se a
 * ligação — que o tique do ecrã faz a bomba rebentar, que o pavio segue a peça,
 * que uma perda se vê onde aconteceu. São as partes que nenhum teste de regras
 * apanha: a sessão podia estar certa e o ecrã nunca lhe perguntar nada.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Board, Level, Packed } from "@dicetoseven/engine";
import { findAllGroups, packed } from "@dicetoseven/engine";

import { DEFAULT_TIME_ATTACK } from "../src/session/TimeAttackSession";
import type { OpcoesTimeAttack } from "../src/ui/TimeAttackScreen";
import { TimeAttackScreen } from "../src/ui/TimeAttackScreen";

/** 3+4 e 4+3. Toda a peça entra num grupo, e o 4 seguido do outro 4 passa de 7. */
const BOARD: Board = [
  [3, 4],
  [4, 3],
];

const NIVEL: Level = { id: "tempo-1", seed: 0, board: BOARD, solution: [] };

let host: HTMLElement;
let ecra: TimeAttackScreen | undefined;

const abrir = (afinacao?: OpcoesTimeAttack["afinacao"]): TimeAttackScreen =>
  new TimeAttackScreen(host, {
    niveis: [NIVEL],
    melhorPontuacao: 0,
    tempoInicial: 30,
    aoTerminar: () => undefined,
    aoSair: () => undefined,
    ...(afinacao === undefined ? {} : { afinacao }),
  });

/** Uma bomba no primeiro tabuleiro, sempre, com 3s de pavio. */
const COM_BOMBA: OpcoesTimeAttack["afinacao"] = {
  bomba: {
    ...DEFAULT_TIME_ATTACK.bomba,
    desdeTabuleiro: 0,
    probabilidade: 1,
    pavioMs: 3_000,
  },
};

const clicar = (p: Packed): void => {
  host
    .querySelector(`.peca[data-pos="${String(p)}"]`)
    ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
};

const relogio = (): string => host.querySelector(".relogio")?.textContent ?? "";

const posDaBomba = (): Packed | undefined => {
  const el = host.querySelector<HTMLElement>(".peca.bomba");
  return el === null ? undefined : (Number(el.dataset["pos"]) as Packed);
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);

  document.body.replaceChildren();
  host = document.createElement("div");
  document.body.appendChild(host);
});

afterEach(() => {
  ecra?.destruir();
  ecra = undefined;
  vi.useRealTimers();
});

describe("passar de 7, no ecrã", () => {
  it("a perda sobe da peça tocada, a vermelho, e o relógio desce", () => {
    ecra = abrir();
    expect(relogio()).toBe("30");

    // O 4 de cima da primeira coluna, e depois o 4 de baixo da segunda: 8.
    clicar(1 as Packed);
    clicar(64 as Packed);

    const perda = host.querySelector(".ganho.perda");
    expect(perda?.textContent).toBe("−1.5s");
    expect(relogio()).toBe("29");
    expect(host.querySelector(".peca.recusada")).not.toBeNull();
  });
});

describe("a bomba, no ecrã", () => {
  it("aparece com o pavio a contar", () => {
    ecra = abrir(COM_BOMBA);

    const el = host.querySelector(".peca.bomba");
    expect(el).not.toBeNull();
    expect(el?.querySelector(".pavio")?.textContent).toBe("3");

    vi.advanceTimersByTime(1_100);
    expect(host.querySelector(".pavio")?.textContent).toBe("2");
  });

  it("**o tique do ecrã fá-la rebentar**: a peça fica, e o relógio perde 5s", () => {
    ecra = abrir(COM_BOMBA);
    const at = posDaBomba();

    vi.advanceTimersByTime(3_100);

    expect(posDaBomba()).toBeUndefined();
    expect(host.querySelector(".pavio")).toBeNull();
    // A peça continua lá: rebentar custa tempo, não peças.
    const peca = host.querySelector(`.peca[data-pos="${String(at)}"]`);
    expect(peca?.classList.contains("rebentou")).toBe(true);
    expect(host.querySelector(".ganho.perda.grande")?.textContent).toBe("−5.0s");
    // 30 − 3,1 − 5 = 21,9.
    expect(relogio()).toBe("22");
  });

  it("jogá-la a tempo desarma-a, e depois já não rebenta", async () => {
    ecra = abrir(COM_BOMBA);
    const at = posDaBomba();
    if (at === undefined) throw new Error("sem bomba");

    const grupo = [...findAllGroups(BOARD)].find((g) => g.includes(at));
    if (grupo === undefined) throw new Error("a bomba não está num grupo jogável");

    for (const p of grupo) clicar(p);
    await vi.runOnlyPendingTimersAsync();

    vi.advanceTimersByTime(5_000);

    expect(host.querySelector(".ganho.perda")).toBeNull();
    expect(host.querySelector(".peca.rebentou")).toBeNull();
  });
});

describe("o salto, no ecrã", () => {
  /** Uma jogada só: 3+4. Os tabuleiros com garantia. */
  const SEGURO: Level = { id: "tempo-x", seed: 0, board: [[3], [4]], solution: [] };
  /** Seis, para a escada com garantia ter os seus seis degraus. */
  const ESCADA: readonly Level[] = Array.from({ length: 6 }, (_, i) => ({
    ...SEGURO,
    id: `tempo-${String(i)}`,
  }));
  /** Com jogadas, sem garantia. */
  const LIVRE: Level = {
    id: "tempo-livre-x",
    seed: 1,
    board: [
      [3, 4],
      [4, 3],
    ],
    solution: [],
  };
  /** Sem jogada nenhuma: dois 6 não somam 7 com nada. */
  const PRESO: Level = { id: "tempo-livre-preso", seed: 2, board: [[6], [6]], solution: [] };

  /*
   * Sem níveis com garantia, a escada começa logo nos livres — e o salto existe
   * desde o primeiro tabuleiro. É o atalho dos testes que não são sobre a
   * fronteira.
   */
  const abrirCom = (
    niveis: readonly Level[],
    livres: readonly Level[],
  ): TimeAttackScreen =>
    new TimeAttackScreen(host, {
      niveis,
      livres,
      melhorPontuacao: 0,
      tempoInicial: 30,
      aoTerminar: () => undefined,
      aoSair: () => undefined,
    });

  const botaoSaltar = (): HTMLButtonElement | null =>
    host.querySelector<HTMLButtonElement>(".rodape .btn.saltar");

  /** Limpa um tabuleiro `[[3],[4]]` e espera que o seguinte entre. */
  const limparSeguro = async (): Promise<void> => {
    clicar(0 as Packed);
    clicar(64 as Packed);
    await vi.runOnlyPendingTimersAsync();
  };

  it("**está no rodapé desde o início, fechado a cadeado até ao sétimo**", async () => {
    ecra = abrirCom(ESCADA, [LIVRE]);

    for (let i = 0; i < ESCADA.length; i++) {
      const b = botaoSaltar();
      expect(b?.hidden).toBe(false);
      expect(b?.disabled).toBe(true);
      expect(b?.textContent).toBe("Saltar a partir do 7.º tabuleiro");
      expect(b?.querySelector(".icone-cadeado")).not.toBeNull();
      await limparSeguro();
    }

    // O sétimo: abre, com o custo, e pulsa ao abrir.
    const b = botaoSaltar();
    expect(b?.disabled).toBe(false);
    expect(b?.textContent).toBe("Saltar (−10s)");
    expect(b?.querySelector(".icone-saltar")).not.toBeNull();
    expect(b?.classList.contains("novo")).toBe(true);
    expect(host.querySelector(".meta")?.textContent).toContain("6 tabuleiros");
  });

  it("fechado, não salta nada", () => {
    ecra = abrirCom(ESCADA, [LIVRE]);
    botaoSaltar()?.click();
    expect(relogio()).toBe("30");
  });

  it("num pack sem tabuleiros livres não aparece — o cadeado nunca abria", () => {
    ecra = abrirCom(ESCADA, []);
    expect(botaoSaltar()?.hidden).toBe(true);
  });

  it("já não está no cabeçalho", () => {
    ecra = abrirCom([], [LIVRE]);
    expect(host.querySelector('.tempo-topo [aria-label^="saltar"]')).toBeNull();
  });

  it("saltar custa 10 s, e o tabuleiro seguinte entra já", () => {
    ecra = abrirCom([], [LIVRE]);
    expect(relogio()).toBe("30");

    botaoSaltar()?.click();

    expect(relogio()).toBe("20");
    expect(host.querySelector(".ganho.perda.grande")?.textContent).toBe("−10.0s");
    expect(host.querySelectorAll(".tabuleiro .peca")).toHaveLength(4);
  });

  it("**num beco sem saída, o painel oferece o salto**", () => {
    ecra = abrirCom([], [PRESO]);

    const painel = host.querySelector<HTMLElement>(".fim.preso");
    expect(painel?.hidden).toBe(false);
    expect(painel?.textContent).toContain("Sem jogadas");
    expect(host.querySelector(".palco")?.classList.contains("preso")).toBe(true);

    const saltar = painel?.querySelector<HTMLButtonElement>(".btn.primario");
    expect(saltar?.textContent).toContain("Saltar (−10s)");

    saltar?.click();
    expect(relogio()).toBe("20");
  });

  it("num beco, as peças já não custam tempo — nem pelo teclado", () => {
    ecra = abrirCom([], [PRESO]);

    // 6 + 6 passaria de 7, e num tabuleiro com jogadas custava 1,5s.
    clicar(0 as Packed);
    clicar(64 as Packed);
    vi.advanceTimersByTime(100);

    expect(relogio()).toBe("30");
  });

  /*
   * `1 5 1` com o 5 gelado: soma 7, e não sai — uma gelada só sai a par. O
   * terceiro toque é recusado pela regra do gelo, e não por passar de 7.
   */
  const GELADO: Level = {
    id: "tempo-livre-gelo",
    seed: 3,
    board: [[1], [5], [1], [3], [4]],
    gelo: [packed(1, 0)],
    solution: [],
  };

  it("**os tabuleiros livres trazem as peças geladas**", () => {
    ecra = abrirCom([], [GELADO]);
    const gelada = host.querySelector<HTMLElement>(".tabuleiro .peca.gelada");
    expect(gelada?.dataset["pos"]).toBe(String(packed(1, 0)));
  });

  it("o gelo recusa o toque, diz porquê — e não custa tempo", () => {
    ecra = abrirCom([], [GELADO]);

    clicar(packed(0, 0));
    clicar(packed(1, 0));
    clicar(packed(2, 0));

    expect(host.querySelector(".ganho.aviso")?.textContent).toBe("❄ só sai a par");
    expect(host.querySelector(".peca.recusada")).not.toBeNull();
    expect(relogio()).toBe("30");
  });

  it("o fim diz quantos foram saltados", () => {
    ecra = abrirCom([], [LIVRE]);
    botaoSaltar()?.click();

    vi.advanceTimersByTime(60_000);

    expect(host.querySelector(".fim .detalhe")?.textContent).toBe(
      "0 tabuleiros limpos · 1 saltado",
    );
    // Com a corrida acabada, o botão fica, mas não salta.
    expect(botaoSaltar()?.disabled).toBe(true);
  });
});
