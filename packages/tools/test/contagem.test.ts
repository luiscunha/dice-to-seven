/**
 * Contagem decrescente — o protótipo de medição.
 *
 * Não protege nada publicado: a contagem ainda não entrou no motor. Protege a
 * medição, que só vale o que valer a regra que ela simula. Tabuleiros de uma
 * coluna, legíveis à mão.
 */

import { describe, expect, it } from "vitest";

import type { Level } from "@dicetoseven/engine";
import { packed } from "@dicetoseven/engine";

import {
  estadoDe,
  jogar,
  medirPlayouts,
  passoDeCadaPeca,
  pisoComContagem,
  resolveComContagem,
  resolvel,
} from "../src/contagem";

/*
 * Uma coluna, de baixo para cima: 1, 5, 2, 6. A única jogada é o 5+2 do meio;
 * depois dela o 6 cai sobre o 1, e 1+6 fecha o nível. O 1 da base **não pode
 * sair primeiro** — é o caso que a contagem existe para apertar.
 */
const enterrado: Level = {
  id: "teste-enterrado",
  seed: 1,
  board: [[1, 5, 2, 6]],
  solution: [
    [packed(0, 1), packed(0, 2)],
    [packed(0, 0), packed(0, 1)],
  ],
};

/** Duas colunas que saem cada uma por si: 1+6 à esquerda, 3+4 à direita. */
const duasColunas: Level = {
  id: "teste-duas",
  seed: 2,
  board: [
    [1, 6],
    [3, 4],
  ],
  solution: [
    [packed(0, 0), packed(0, 1)],
    [packed(0, 0), packed(0, 1)],
  ],
};

describe("jogar com contagem", () => {
  it("a contagem a zero com a peça no tabuleiro perde o nível", () => {
    const e = estadoDe(duasColunas, { peca: packed(1, 1), restantes: 1 });
    expect(jogar(e, [packed(0, 0), packed(0, 1)])).toBeUndefined();
  });

  it("tirar a peça acaba com a contagem", () => {
    const e = estadoDe(duasColunas, { peca: packed(1, 1), restantes: 1 });
    expect(jogar(e, [packed(1, 0), packed(1, 1)])?.c).toBeUndefined();
  });

  it("a peça viaja com o colapso de colunas, e a contagem desce", () => {
    // A coluna da esquerda sai inteira: a da direita passa a ser a 0.
    const e = estadoDe(duasColunas, { peca: packed(1, 1), restantes: 2 });
    expect(jogar(e, [packed(0, 0), packed(0, 1)])?.c).toEqual({
      peca: packed(0, 1),
      restantes: 1,
    });
  });

  it("e com a gravidade", () => {
    const e = estadoDe(enterrado, { peca: packed(0, 3), restantes: 3 });
    expect(jogar(e, [packed(0, 1), packed(0, 2)])?.c).toEqual({
      peca: packed(0, 1),
      restantes: 2,
    });
  });
});

describe("o solver conta a contagem", () => {
  it("uma peça enterrada não sai na próxima jogada", () => {
    expect(resolvel(estadoDe(enterrado, { peca: packed(0, 0), restantes: 1 }), 1000)).toBe("no");
  });

  it("e sai na seguinte", () => {
    expect(resolvel(estadoDe(enterrado, { peca: packed(0, 0), restantes: 2 }), 1000)).toBe("yes");
  });

  it("encontra a ordem certa quando há escolha", () => {
    // Tirar primeiro a coluna da direita, onde está a peça.
    expect(resolvel(estadoDe(duasColunas, { peca: packed(1, 1), restantes: 1 }), 1000)).toBe("yes");
  });

  it("um estado perdido é perdido", () => {
    expect(resolvel(undefined, 1000)).toBe("no");
  });
});

describe("a solução guardada e a contagem", () => {
  it("diz em que jogada sai cada peça, pela coordenada inicial", () => {
    expect([...passoDeCadaPeca(enterrado)].sort((a, b) => a[0] - b[0])).toEqual([
      [packed(0, 0), 2],
      [packed(0, 1), 1],
      [packed(0, 2), 1],
      [packed(0, 3), 2],
    ]);
  });

  it("uma contagem igual à jogada da solução é cumprida; uma a menos não", () => {
    expect(resolveComContagem(enterrado, { peca: packed(0, 0), restantes: 2 })).toBe(true);
    expect(resolveComContagem(enterrado, { peca: packed(0, 0), restantes: 1 })).toBe(false);
  });
});

describe("o piso de justiça com contagem", () => {
  it("recusa uma contagem que a primeira jogada já perde", () => {
    expect(pisoComContagem(estadoDe(enterrado, { peca: packed(0, 0), restantes: 1 }), 1, 1000)).toBe("no");
  });

  it("aceita a que ainda deixa saída", () => {
    expect(pisoComContagem(estadoDe(enterrado, { peca: packed(0, 0), restantes: 2 }), 1, 1000)).toBe("yes");
  });
});

describe("medirPlayouts", () => {
  it("um nível sem becos sobrevive sempre", () => {
    const m = medirPlayouts(duasColunas, undefined, 20, 1000);
    expect(m.sobreviveram).toBe(20);
    expect(m.erros).toEqual([]);
  });

  it("com a contagem a apertar, o erro é a primeira jogada errada, e dá-se por ele logo", () => {
    // Com a contagem a 1 na coluna da direita, tirar a da esquerda perde.
    const m = medirPlayouts(duasColunas, { peca: packed(1, 1), restantes: 1 }, 40, 1000);
    expect(m.sobreviveram).toBeGreaterThan(0);
    expect(m.sobreviveram).toBeLessThan(40);
    for (const x of m.erros) expect(x).toBe(0.5);
    for (const x of m.revelacoes) expect(x).toBe(0.5);
  });

  it("o jogador atento tira a peça da contagem logo que pode", () => {
    const m = medirPlayouts(
      duasColunas,
      { peca: packed(1, 1), restantes: 1 },
      40,
      1000,
      new Set(),
      "atento",
    );
    expect(m.sobreviveram).toBe(40);
  });

  it("sem contagem, o atento joga exatamente como o jogo ao calhas", () => {
    // É o que permite medir a linha de base uma vez só.
    const calhas = medirPlayouts(enterrado, undefined, 10, 1000, new Set(), "calhas");
    const atento = medirPlayouts(enterrado, undefined, 10, 1000, new Set(), "atento");
    expect(atento).toEqual(calhas);
  });
});
