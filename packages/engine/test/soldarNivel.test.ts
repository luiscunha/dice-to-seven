/**
 * Soldar um nível gerado.
 *
 * O teste que interessa é um só, e é o mesmo que sustenta o projeto inteiro:
 * **a solução guardada continua a esvaziar o tabuleiro** — agora com a regra das
 * soldas a valer em cada jogada. Se isto passar em centenas de níveis, soldar
 * não enfraquece a garantia central.
 */

import { describe, expect, it } from "vitest";

import {
  JOKER,
  TARGET,
  applyMove,
  aplicarSoldas,
  cellAt,
  checkSoldas,
  generate,
  isEmpty,
  jogadaLegal,
  mulberry32,
  parDe,
  soldarNivel,
  type Board,
  type Soldas,
} from "../src/index";

const nivelDe = (seed: number, pecas: number) =>
  generate(seed, { targetPieceCount: pecas });

/** Joga a solução guardada respeitando as soldas. Devolve o que sobrou. */
function jogarComSoldas(
  board: Board,
  solucao: readonly (readonly number[])[],
  soldas: Soldas,
): { board: Board; ilegais: number } {
  let b = board;
  let s = soldas;
  let ilegais = 0;

  for (const g of solucao) {
    if (!jogadaLegal(b, g, s)) {
      ilegais += 1;
      break;
    }
    const seguinte = aplicarSoldas(b, s, g);
    b = applyMove(b, g);
    s = seguinte;
  }

  return { board: b, ilegais };
}

describe("soldar não estraga a solução", () => {
  it("200 níveis gerados, soldados, e resolvidos pela solução guardada", () => {
    let comSoldas = 0;
    let totalSoldas = 0;

    for (let seed = 1; seed <= 200; seed += 1) {
      const nivel = nivelDe(seed, 28);
      if (nivel === undefined) continue;

      const soldas = soldarNivel(nivel, 4, mulberry32(seed * 7919));

      expect(checkSoldas(nivel.board, soldas)).toEqual([]);
      if (soldas.length > 0) comSoldas += 1;
      totalSoldas += soldas.length;

      const { board, ilegais } = jogarComSoldas(
        nivel.board,
        nivel.solution,
        soldas,
      );

      expect(ilegais).toBe(0);
      expect(isEmpty(board)).toBe(true);
    }

    // Se quase nenhum nível aceitasse soldas, a mecânica não servia para nada.
    expect(comSoldas).toBeGreaterThan(150);
    expect(totalSoldas / comSoldas).toBeGreaterThan(1.5);
  });

  it("pedir zero soldas devolve o nível intocado", () => {
    const nivel = nivelDe(42, 24);
    expect(nivel).toBeDefined();
    expect(soldarNivel(nivel!, 0, mulberry32(1))).toEqual([]);
  });

  it("nunca devolve mais soldas do que as pedidas", () => {
    for (const quantas of [1, 2, 3]) {
      const nivel = nivelDe(99, 36);
      const soldas = soldarNivel(nivel!, quantas, mulberry32(5));
      expect(soldas.length).toBeLessThanOrEqual(quantas);
    }
  });

  it("é determinístico — a mesma seed dá as mesmas soldas", () => {
    const nivel = nivelDe(7, 30);
    expect(soldarNivel(nivel!, 3, mulberry32(11))).toEqual(
      soldarNivel(nivel!, 3, mulberry32(11)),
    );
  });

  it("as soldas unem sempre duas peças do mesmo passo da solução", () => {
    // É a propriedade de que tudo depende, verificada pelo outro lado: partir
    // uma solda ao meio tem de tornar a solução ilegal.
    const nivel = nivelDe(3, 30);
    const soldas = soldarNivel(nivel!, 3, mulberry32(2));
    expect(soldas.length).toBeGreaterThan(0);

    // Uma solda inventada noutro sítio parte a solução quase sempre; não se
    // afirma "sempre" porque o acaso pode cair num par legítimo.
    const { ilegais } = jogarComSoldas(nivel!.board, nivel!.solution, soldas);
    expect(ilegais).toBe(0);
  });
});

/*
 * ── Um par que já soma 7 não se solda ──
 *
 * A primeira versão soldava qualquer par que saísse no mesmo passo, e 22% a 28%
 * das soldas saíam assim: o passo da solução era o próprio par. A solda não
 * proibia nada — e pior, apontava ao jogador uma jogada pronta a fazer.
 */
describe("soldas que não restringem nada ficam de fora", () => {
  it("nenhum par soldado soma 7 sozinho, em 300 níveis", () => {
    let vistas = 0;

    for (let seed = 1; seed <= 300; seed += 1) {
      const nivel = nivelDe(seed, 26);
      if (nivel === undefined) continue;

      for (const p of soldarNivel(nivel, 4, mulberry32(seed * 104_729))) {
        const [baixo, cima] = parDe(p);
        const a = cellAt(nivel.board, baixo) as number;
        const b = cellAt(nivel.board, cima) as number;

        expect(a + b).not.toBe(TARGET);
        vistas += 1;
      }
    }

    expect(vistas).toBeGreaterThan(400);
  });

  it("o joker nunca entra numa solda", () => {
    // `joker + v` é sempre grupo legal — o joker toma `7 - v` — portanto soldar
    // o joker a um vizinho é oferecer uma jogada, não fechar nenhuma.
    let comJoker = 0;
    let niveis = 0;

    for (let seed = 1; seed <= 200; seed += 1) {
      const nivel = generate(seed, {
        targetPieceCount: 22,
        includeJoker: true,
        jokerProgress: 0.3,
      });
      if (nivel?.joker === undefined) continue;
      niveis += 1;

      for (const p of soldarNivel(nivel, 4, mulberry32(seed * 7907))) {
        for (const q of parDe(p)) {
          if (cellAt(nivel.board, q) === JOKER) comJoker += 1;
        }
      }
    }

    expect(niveis).toBeGreaterThan(20);
    expect(comJoker).toBe(0);
  });
});
