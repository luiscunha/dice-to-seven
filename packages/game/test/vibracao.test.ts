// @vitest-environment jsdom

/**
 * A vibração de um toque, nos três modos.
 *
 * A regra vive em `vibrarPeloToque`, e o que se protege aqui é que **todos os
 * ecrãs a chamam**. Foi precisamente isso que falhou: só a campanha vibrava a
 * cada toque, e no Survival um toque que passava de 7 não vibrava — com a
 * vibração ligada.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Board, Level, Packed } from "@dicetoseven/engine";
import { packed } from "@dicetoseven/engine";

import type * as Nativo from "../src/plataforma/nativo";
import { vibrarPeloToque } from "../src/plataforma/nativo";
import type { SurvivalState } from "../src/session/SurvivalSession";
import { startSurvival } from "../src/session/SurvivalSession";
import { PuzzleScreen } from "../src/ui/PuzzleScreen";
import { SurvivalScreen } from "../src/ui/SurvivalScreen";
import { TimeAttackScreen } from "../src/ui/TimeAttackScreen";

vi.mock("../src/plataforma/nativo", async (original) => ({
  ...(await original<typeof Nativo>()),
  vibrarPeloToque: vi.fn(),
}));

/** 3+4 e 4+3: o 4 de cima à esquerda seguido do 4 de baixo à direita passa de 7. */
const BOARD: Board = [
  [3, 4],
  [4, 3],
];
const NIVEL: Level = { id: "vibra-1", seed: 0, board: BOARD, solution: [] };

let host: HTMLElement;
let destruir: (() => void) | undefined;

const clicar = (p: Packed): void => {
  host
    .querySelector(`.tabuleiro .peca[data-pos="${String(p)}"]`)
    ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
};

const ultima = (): unknown => vi.mocked(vibrarPeloToque).mock.lastCall?.[0];

/** O Survival retomado a meio, com este tabuleiro e a linha longe. */
const survivalCom = (board: Board): SurvivalScreen => {
  const base = startSurvival(1);
  const estado: SurvivalState = {
    ...base,
    game: { ...base.game, board },
    bomba: undefined,
    proximaLinhaMs: 60_000,
  };
  return new SurvivalScreen(host, {
    seed: 1,
    retomar: { estado, decorridoMs: 1_000 },
    melhorTempo: 0,
    aoGuardar: () => undefined,
    aoTerminar: () => undefined,
    aoSair: () => undefined,
    aoRecomecar: () => undefined,
  });
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  vi.mocked(vibrarPeloToque).mockClear();
  document.body.replaceChildren();
  host = document.createElement("div");
  document.body.appendChild(host);
});

afterEach(() => {
  destruir?.();
  destruir = undefined;
  vi.useRealTimers();
});

/** Toca o primeiro 4, e depois o outro: um toque normal, e um que passa de 7. */
const tocarDoisQuatros = async (): Promise<void> => {
  clicar(packed(0, 1));
  await vi.advanceTimersByTimeAsync(0);
  expect(ultima()).toMatchObject({ recusado: false, jogou: false });

  clicar(packed(1, 0));
  await vi.advanceTimersByTimeAsync(0);
  expect(ultima()).toMatchObject({ recusado: true });
};

describe("um toque que passa de 7 vibra em todos os modos", () => {
  it("na campanha", async () => {
    const ecra = new PuzzleScreen(host, NIVEL, {});
    destruir = () => {
      ecra.destruir();
    };
    await tocarDoisQuatros();
  });

  it("no Contra-Relógio", async () => {
    const ecra = new TimeAttackScreen(host, {
      niveis: [NIVEL],
      melhorPontuacao: 0,
      tempoInicial: 30,
      aoTerminar: () => undefined,
      aoSair: () => undefined,
    });
    destruir = () => {
      ecra.destruir();
    };
    await tocarDoisQuatros();
  });

  it("**no Survival**", async () => {
    const ecra = survivalCom(BOARD);
    destruir = () => {
      ecra.destruir();
    };
    await tocarDoisQuatros();
  });
});

it("fechar um grupo vibra como jogada, no Survival", async () => {
  const ecra = survivalCom([
    [3, 4],
    [1, 1],
  ]);
  destruir = () => {
    ecra.destruir();
  };

  clicar(packed(0, 0));
  clicar(packed(0, 1));
  await vi.advanceTimersByTimeAsync(0);

  expect(ultima()).toMatchObject({ recusado: false, jogou: true });
});
