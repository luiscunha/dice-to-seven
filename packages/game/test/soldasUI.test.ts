// @vitest-environment jsdom

/**
 * As soldas na camada de sessão e no tabuleiro desenhado.
 *
 * O comportamento que se fixa aqui é o que o jogador sente: **tocar numa peça
 * soldada traz a companheira**. Separá-las nunca é jogada legal, portanto deixar
 * selecionar meia solda era oferecer um caminho que acaba sempre em recusa.
 *
 * E fixa-se a consequência disso que rebentou o jogo à primeira: o grupo que a
 * animação recebe tem de vir da sessão (`lastMove`), porque um toque já não
 * corresponde a uma peça.
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
 *   r1  2  3
 *   r0  1  4  4
 *       c0 c1 c2
 *
 * A solda em (0,0) une o 1 ao 2: **somam 3, não 7**. É o que a torna uma solda
 * a sério — um par que já fosse 7 sozinho não proibiria jogada nenhuma, e o
 * gerador deixou de os produzir.
 *
 * Solução: `1+2+4` leva a coluna 0 inteira e o 4 do lado; a coluna 0 colapsa e
 * sobram `3` e `4`, que somam 7.
 */
const NIVEL: Level = {
  id: "teste-soldado",
  seed: 1,
  board: [[1, 2], [4, 3], [4]],
  soldas: [packed(0, 0)],
  solution: [
    [packed(0, 0), packed(0, 1), packed(1, 0)],
    [packed(0, 0), packed(1, 0)],
  ],
};

const semSolda = (n: Level): Level => {
  const copia = { ...n };
  delete (copia as { soldas?: unknown }).soldas;
  return copia;
};

describe("tocar numa peça soldada", () => {
  it("traz a companheira, e num toque só", () => {
    const s = tap(startGame(NIVEL), packed(0, 0));

    expect(s.selection).toEqual([packed(0, 0), packed(0, 1)]);
    expect(s.moves).toBe(0); // 1+2 = 3, ainda falta
  });

  it("tocar na de cima faz exatamente o mesmo", () => {
    const debaixo = tap(startGame(NIVEL), packed(0, 0));
    const decima = tap(startGame(NIVEL), packed(0, 1));

    expect(decima.selection).toEqual(debaixo.selection);
  });

  it("sem solda, o mesmo toque seleciona uma peça só", () => {
    const s = tap(startGame(semSolda(NIVEL)), packed(0, 0));
    expect(s.selection).toEqual([packed(0, 0)]);
  });

  it("o par mais a peça que fecha faz a jogada", () => {
    const s = tap(tap(startGame(NIVEL), packed(0, 0)), packed(1, 0));

    expect(s.moves).toBe(1);
    expect(s.board).toEqual([[3], [4]]);
    expect(s.soldas).toEqual([]); // saiu com o par
  });
});

/*
 * ── A regressão que partiu o jogo ──
 *
 * O ecrã reconstruía o grupo a animar como «a seleção de antes mais a peça
 * tocada». Com soldas, um toque traz duas peças, portanto o grupo saía a meio e
 * o `applyMove` da animação rebentava com `InvalidMoveError` — reproduzido no
 * browser com `Grupo inválido ...: [194]`.
 */
describe("o grupo da jogada vem da sessão", () => {
  it("lastMove traz o grupo inteiro, com as duas peças soldadas", () => {
    const s = tap(tap(startGame(NIVEL), packed(0, 0)), packed(1, 0));

    expect(s.lastMove).toEqual([packed(0, 0), packed(0, 1), packed(1, 0)]);
  });

  it("um toque que não fecha jogada não deixa lastMove", () => {
    expect(tap(startGame(NIVEL), packed(0, 0)).lastMove).toBeUndefined();
  });

  it("uma recusa não traz a jogada anterior atrás", () => {
    const jogou = tap(tap(startGame(NIVEL), packed(0, 0)), packed(1, 0));
    expect(jogou.lastMove).toBeDefined();

    // Tocar fora da silhueta: recusa, e o `lastMove` da jogada anterior não
    // pode sobreviver — a interface animá-la-ia outra vez.
    const recusado = tap(jogou, packed(9, 9));
    expect(recusado.rejection).toBe("no-piece");
    expect(recusado.lastMove).toBeUndefined();
  });

  it("desfazer e reiniciar também o limpam", () => {
    const jogou = tap(tap(startGame(NIVEL), packed(0, 0)), packed(1, 0));

    expect(undo(jogou).lastMove).toBeUndefined();
    expect(restart(jogou).lastMove).toBeUndefined();
  });
});

describe("a solda impede jogadas", () => {
  it("a seleção que passaria de 7 com a companheira é recusada", () => {
    // O 4 de (2,0) mais o par soldado 1+2 dariam 7... mas não são vizinhos.
    // Usa-se o 3 de (1,1): 3 + 1 + 2 = 6, e depois o 4 levaria a 10.
    const comTres = tap(startGame(NIVEL), packed(1, 1));
    const comPar = tap(comTres, packed(0, 0));

    expect(comPar.selection).toHaveLength(3); // 3 + 1 + 2 = 6

    const demais = tap(comPar, packed(1, 0)); // + 4 = 10
    expect(demais.rejection).toBe("over-target");
  });

  it("tocar outra vez retira o par inteiro, não meio", () => {
    const comPar = tap(startGame(NIVEL), packed(0, 0));
    expect(comPar.selection).toHaveLength(2);

    // Tocar na de cima retira as duas, não só aquela.
    expect(tap(comPar, packed(0, 1)).selection).toEqual([]);
    expect(tap(comPar, packed(0, 0)).selection).toEqual([]);
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

    expect(isBlocked(startGame(preso))).toBe(true);

    // Sem a solda, o mesmo tabuleiro tem jogada: 3 + ... não, mas 5+... também
    // não. Usa-se um tabuleiro onde a solda é a única diferença.
    const solto: Level = { ...preso, board: [[3, 4], [6]] };
    expect(isBlocked(startGame(semSolda(solto)))).toBe(false); // 3+4
  });
});

describe("desfazer e reiniciar devolvem as soldas", () => {
  const jogado = (): GameState =>
    tap(tap(startGame(NIVEL), packed(0, 0)), packed(1, 0));

  it("o undo repõe o par soldado", () => {
    const atras = undo(jogado());

    expect(atras.soldas).toEqual([packed(0, 0)]);
    expect(atras.board).toEqual(NIVEL.board);
  });

  it("o reinício repõe as do nível", () => {
    expect(restart(jogado()).soldas).toEqual([packed(0, 0)]);
  });

  it("as duas pilhas do histórico andam sempre a par", () => {
    // É a invariante que justifica guardá-las separadas — ver `GameState`.
    let s: GameState = startGame(NIVEL);
    const visto: GameState[] = [s];

    s = tap(s, packed(0, 0));
    visto.push(s);
    s = tap(s, packed(1, 0));
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
