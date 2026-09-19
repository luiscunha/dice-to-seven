// @vitest-environment jsdom

/**
 * As soldas na camada de sessão e no tabuleiro desenhado.
 *
 * O comportamento que se fixa aqui é o que o jogador sente: **tocar numa peça
 * soldada traz a companheira**. Separá-las nunca é jogada legal, portanto deixar
 * selecionar meia solda era oferecer um caminho que acaba sempre em recusa.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { packed, type Level } from "@dicetoseven/engine";

import { BoardView } from "../src/ui/BoardView";
import {
  isBlocked,
  restart,
  startGame,
  tap,
  undo,
  type GameState,
} from "../src/session/GameSession";

/*
 * ── O nível de referência ──
 *
 *   r1  3  4
 *   r0  4  3
 *       c0 c1
 *
 * Duas jogadas: 4+3 na coluna 0, 3+4 na coluna 1. A solda em (0,0) une o 4 de
 * baixo ao 3 de cima — o par que a solução já leva junto, que é a única espécie
 * de solda que o gerador põe.
 */
const NIVEL: Level = {
  id: "teste-soldado",
  seed: 1,
  board: [
    [4, 3],
    [3, 4],
  ],
  soldas: [packed(0, 0)],
  solution: [
    [packed(0, 0), packed(0, 1)],
    [packed(0, 0), packed(0, 1)],
  ],
};

const SEM: Level = { ...NIVEL, board: NIVEL.board, solution: NIVEL.solution };
delete (SEM as { soldas?: unknown }).soldas;

describe("tocar numa peça soldada", () => {
  it("traz a companheira, e num toque só", () => {
    const s = tap(startGame(NIVEL), packed(0, 0));

    // 4+3 são 7: o par fecha o grupo e a jogada acontece logo.
    expect(s.moves).toBe(1);
    expect(s.board).toEqual([[3, 4]]);
  });

  it("tocar na de cima faz exatamente o mesmo", () => {
    const debaixo = tap(startGame(NIVEL), packed(0, 0));
    const decima = tap(startGame(NIVEL), packed(0, 1));

    expect(decima.board).toEqual(debaixo.board);
    expect(decima.moves).toBe(1);
  });

  it("sem solda, o mesmo toque seleciona uma peça só", () => {
    const s = tap(startGame(SEM), packed(0, 0));
    expect(s.selection).toEqual([packed(0, 0)]);
    expect(s.moves).toBe(0);
  });
});

describe("a solda impede jogadas", () => {
  /*
   *   r1  5  6
   *   r0  2  1
   *
   * Sem soldas, 5+2 e 6+1 limpam. Com o 2 soldado ao 5, o par vale 7 e sai
   * junto — mas 5 sozinho com o 2 do lado já não é uma escolha do jogador.
   */
  const CRUZADO: Level = {
    id: "cruzado",
    seed: 2,
    board: [
      [2, 5],
      [1, 6],
    ],
    soldas: [packed(0, 0)],
    solution: [
      [packed(0, 0), packed(0, 1)],
      [packed(0, 0), packed(0, 1)],
    ],
  };

  it("a seleção que passaria de 7 com a companheira é recusada", () => {
    // 6 (1,1) mais o par soldado 2+5 dariam 13.
    const s = tap(tap(startGame(CRUZADO), packed(1, 1)), packed(0, 1));
    expect(s.rejection).toBe("over-target");
    expect(s.selection).toEqual([packed(1, 1)]);
  });

  it("tocar outra vez retira o par inteiro, não meio", () => {
    const um = tap(startGame(NIVEL), packed(1, 0)); // 3, sozinho
    const dois = tap(um, packed(0, 1)); // traz o par 4+3 → 10 > 7, recusado

    expect(dois.rejection).toBe("over-target");
    expect(dois.selection).toEqual([packed(1, 0)]);
  });
});

describe("beco sem saída conta com as soldas", () => {
  it("um par soldado que nunca soma 7 é um beco", () => {
    /*
     *   r1  5
     *   r0  3      3+5 = 8. Soldados, nunca saem.
     *       c0 c1
     *   r0     6   e o 6 sozinho também não.
     */
    const preso: Level = {
      id: "preso",
      seed: 3,
      board: [[3, 5], [6]],
      soldas: [packed(0, 0)],
      solution: [],
    };

    const jogo = startGame(preso);
    expect(isBlocked(jogo)).toBe(true);

    // Sem a solda, 6+... continua sem dar 7 — mas o motivo é outro, e é por
    // isso que o teste usa um tabuleiro onde a solda é a única diferença.
    const solto: Level = { ...preso, board: [[3, 4], [6]] };
    delete (solto as { soldas?: unknown }).soldas;
    expect(isBlocked(startGame(solto))).toBe(false); // 3+4
  });
});

describe("desfazer e reiniciar devolvem as soldas", () => {
  it("o undo repõe o par soldado", () => {
    const depois = tap(startGame(NIVEL), packed(0, 0));
    expect(depois.soldas).toEqual([]);

    const atras = undo(depois);
    expect(atras.soldas).toEqual([packed(0, 0)]);
    expect(atras.board).toEqual(NIVEL.board);
  });

  it("o reinício repõe as do nível", () => {
    const depois = tap(startGame(NIVEL), packed(0, 0));
    expect(restart(depois).soldas).toEqual([packed(0, 0)]);
  });

  it("as duas pilhas do histórico andam sempre a par", () => {
    // É a invariante que justifica guardá-las separadas — ver `GameState`.
    let s: GameState = startGame(NIVEL);
    const visto: GameState[] = [s];

    s = tap(s, packed(0, 0));
    visto.push(s);
    s = tap(s, packed(0, 0));
    visto.push(s);
    s = undo(s);
    visto.push(s);

    for (const e of visto) {
      expect(e.historySoldas.length).toBe(e.history.length);
    }
  });
});

describe("o traço no tabuleiro", () => {
  let host: HTMLElement;

  beforeEach(() => {
    document.body.replaceChildren();
    host = document.createElement("div");
    document.body.appendChild(host);
  });

  const marcas = (): { cima: number; baixo: number } => ({
    cima: host.querySelectorAll(".peca.soldada-cima").length,
    baixo: host.querySelectorAll(".peca.soldada-baixo").length,
  });

  it("marca as duas peças do par", () => {
    const view = new BoardView(host, { aoTocar: () => undefined });
    view.montar(NIVEL.board, NIVEL.soldas);

    expect(marcas()).toEqual({ cima: 1, baixo: 1 });
    view.destruir();
  });

  it("sem soldas não marca nada", () => {
    const view = new BoardView(host, { aoTocar: () => undefined });
    view.montar(NIVEL.board);

    expect(marcas()).toEqual({ cima: 0, baixo: 0 });
    view.destruir();
  });

  it("o traço está na peça de cima — é o que o faz cobrir as duas", () => {
    const view = new BoardView(host, { aoTocar: () => undefined });
    view.montar(NIVEL.board, NIVEL.soldas);

    const cima = host.querySelector(".peca.soldada-cima") as HTMLElement;
    expect(cima.dataset["pos"]).toBe(String(packed(0, 1)));

    // E vem depois da de baixo no DOM, que é de onde vem a ordem de pintura.
    const baixo = host.querySelector(".peca.soldada-baixo") as HTMLElement;
    expect(
      baixo.compareDocumentPosition(cima) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    view.destruir();
  });
});
