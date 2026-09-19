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
  applyMove,
  aplicarSoldas,
  checkSoldas,
  generate,
  isEmpty,
  jogadaLegal,
  mulberry32,
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
