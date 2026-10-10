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
import { findAllGroups } from "@dicetoseven/engine";

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
