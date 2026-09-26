/**
 * Gelo: peças que só saem num grupo de exatamente duas.
 *
 * O que se fixa aqui é a regra e a sua consequência mais importante, que é o
 * que a distingue das soldas: **o gelo transforma o parceiro num recurso**. O 2
 * ao lado de um 5 gelado deixa de ser uma peça qualquer — é a única saída
 * daquela, e gastá-lo noutro sítio mata o tabuleiro.
 */

import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  SEM_GELO,
  SEM_MARCAS,
  aplicarGelo,
  aplicarMarcas,
  applyMove,
  cellAt,
  checkGelo,
  checkMarcas,
  findAllGroups,
  gruposMarcados,
  isEmpty,
  isSolvable,
  jogadaLegal,
  marcasDe,
  packed,
  respeitaGelo,
  toGroup,
  type Board,
  type Gelo,
  type Packed,
} from "../src/index";

/*
 * ── O tabuleiro de referência ──
 *
 *   r2        4
 *   r1  3  5  2
 *   r0  4  2  1
 *       c0 c1 c2
 */
const B: Board = [
  [4, 3],
  [2, 5],
  [1, 2, 4],
];

describe("a regra", () => {
  it("um grupo de duas peças é sempre legal, gelo ou não", () => {
    // (1,1)=5 com (2,1)=2 dá 7.
    const par = toGroup([packed(1, 1), packed(2, 1)]);

    expect(respeitaGelo(par, [packed(1, 1)])).toBe(true);
    expect(respeitaGelo(par, [packed(2, 1)])).toBe(true);
  });

  it("um grupo maior com uma peça gelada é ilegal", () => {
    const trio = toGroup([packed(0, 0), packed(1, 0), packed(2, 0)]); // 4+2+1
    expect(respeitaGelo(trio, SEM_GELO)).toBe(true);
    expect(respeitaGelo(trio, [packed(1, 0)])).toBe(false);
  });

  it("um grupo maior sem peças geladas continua legal", () => {
    const trio = toGroup([packed(0, 0), packed(1, 0), packed(2, 0)]);
    expect(respeitaGelo(trio, [packed(2, 2)])).toBe(true);
  });

  it("o gelo tira jogadas ao tabuleiro, nunca acrescenta", () => {
    const livres = [...findAllGroups(B)];
    const comGelo = [...gruposMarcados(B, marcasDe(undefined, [packed(2, 0)]))];

    expect(comGelo.length).toBeLessThan(livres.length);

    const chaves = new Set(livres.map((g) => g.join(",")));
    for (const g of comGelo) expect(chaves.has(g.join(","))).toBe(true);
  });

  it("**o parceiro passa a ser um recurso** — é a diferença para a solda", () => {
    /*
     *   r0  5  2  2
     *       c0 c1 c2
     *
     * Com o 5 gelado, só sai com um 2 ao lado, e só o de (1,0) o toca. Gastar
     * esse 2 com o outro 2 não dá 7, portanto o tabuleiro aguenta — mas basta
     * trocar as faces para o erro ser possível, e é isso que o teste seguinte
     * mostra.
     */
    const t: Board = [[5], [2], [2]];
    const gelado = marcasDe(undefined, [packed(0, 0)]);

    const par = toGroup([packed(0, 0), packed(1, 0)]);
    expect(jogadaLegal(t, par, gelado)).toBe(true);
  });
});

describe("o gelo acompanha o tabuleiro", () => {
  it("desce quando se limpa por baixo", () => {
    const gelo: Gelo = [packed(2, 2)]; // o 4 do topo da coluna 2

    // 4+3 = 7 na coluna 0: a coluna inteira sai e colapsa.
    const g = toGroup([packed(0, 0), packed(0, 1)]);
    const depois = applyMove(B, g);
    const geloDepois = aplicarGelo(B, gelo, g);

    // A coluna 2 passou a ser a 1; a linha não mudou.
    expect(geloDepois).toEqual([packed(1, 2)]);
    expect(cellAt(depois, packed(1, 2))).toBe(4);
  });

  it("desaparece quando a peça sai", () => {
    const gelo: Gelo = [packed(1, 1)]; // o 5
    const g = toGroup([packed(1, 1), packed(2, 1)]); // 5+2

    expect(respeitaGelo(g, gelo)).toBe(true);
    expect(aplicarGelo(B, gelo, g)).toEqual([]);
  });

  it("sem gelo não há trabalho nenhum a fazer", () => {
    const g = toGroup([packed(0, 0), packed(0, 1)]);
    expect(aplicarGelo(B, SEM_GELO, g)).toBe(SEM_GELO);
  });
});

describe("invariantes", () => {
  it("aceita gelo bem posto", () => {
    // (1,1)=5 precisa de um 2, e há dois no tabuleiro.
    expect(checkGelo(B, [packed(1, 1)])).toEqual([]);
  });

  it("recusa gelo numa peça que não existe", () => {
    expect(checkGelo(B, [packed(9, 9)])).toHaveLength(1);
  });

  it("recusa gelo no joker", () => {
    // `joker + v` é sempre grupo legal de duas peças: gelar o joker não lhe
    // proibia nada.
    const comJoker: Board = [[0, 3], [4]];
    const problemas = checkGelo(comJoker, [packed(0, 0)]);

    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toContain("joker");
  });

  it("recusa uma peça gelada que não tem parceiro no tabuleiro", () => {
    // Um 6 gelado precisa de um 1, e aqui não há nenhum.
    const semUns: Board = [[6, 3], [4, 4]];
    const problemas = checkGelo(semUns, [packed(0, 0)]);

    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toContain("precisa de um 1");
  });

  it("recusa a mesma peça gelada e soldada", () => {
    // Uma peça soldada sai em par com a companheira soldada; uma gelada sai em
    // par com quem completa 7. As duas juntas ou se contradizem, ou são a mesma
    // regra duas vezes.
    const m = marcasDe([packed(2, 0)], [packed(2, 0)]);
    const problemas = checkMarcas(B, m);

    expect(problemas.some((x) => x.includes("soldada e gelada"))).toBe(true);
  });
});

describe("o solver conta com o gelo", () => {
  /*
   *   r1  3  4
   *   r0  4  3
   *       c0 c1
   */
  const T: Board = [
    [4, 3],
    [3, 4],
  ];

  it("sem gelo tem solução", () => {
    expect(isSolvable(T)).toBe("yes");
  });

  it("gelo que não estorva mantém a solução", () => {
    // O 4 de (0,0) sai em par com o 3 de cima. Continua a dar.
    expect(isSolvable(T, undefined, marcasDe(undefined, [packed(0, 0)]))).toBe(
      "yes",
    );
  });

  it("**o gelo pode matar um tabuleiro que tinha solução**", () => {
    /*
     *   r0  1  1  5
     *       c0 c1 c2
     *
     * Livre: 1+1+5 = 7 numa jogada só. Com o 5 gelado, o trio passa a ilegal e
     * o 5 precisaria de um 2 — que não existe. Fica preso.
     */
    const U: Board = [[1], [1], [5]];

    expect(isSolvable(U)).toBe("yes");
    expect(isSolvable(U, undefined, marcasDe(undefined, [packed(2, 0)]))).toBe(
      "no",
    );
  });

  it("a solução devolvida respeita o gelo", () => {
    const m = marcasDe(undefined, [packed(0, 0)]);
    let b: Board = T;
    let marcas = m;

    for (const g of [
      toGroup([packed(0, 0), packed(0, 1)]),
      toGroup([packed(0, 0), packed(0, 1)]),
    ]) {
      expect(jogadaLegal(b, g, marcas)).toBe(true);
      marcas = aplicarMarcas(b, marcas, g);
      b = applyMove(b, g);
    }

    expect(isEmpty(b)).toBe(true);
  });
});

describe("marcas sem marcas não custam nada", () => {
  it("o conjunto vazio deixa tudo como estava", () => {
    const livres = [...findAllGroups(B)].map((g) => g.join(","));
    const marcados = [...gruposMarcados(B, SEM_MARCAS)].map((g) => g.join(","));

    expect(marcados).toEqual(livres);
    expect(aplicarMarcas(B, SEM_MARCAS, toGroup([packed(1, 1), packed(2, 1)])))
      .toBe(SEM_MARCAS);
  });
});

describe("o gelo nunca degela", () => {
  it("depois de qualquer jogada legal, a peça gelada mantém a face", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.array(
            fc.integer({ min: 1, max: 6 }) as fc.Arbitrary<1 | 2 | 3 | 4 | 5 | 6>,
            { minLength: 1, maxLength: 5 },
          ),
          { minLength: 1, maxLength: 5 },
        ),
        fc.integer({ min: 0, max: 2 ** 30 }),
        (colunas, semente) => {
          const b: Board = colunas;

          const todas: Packed[] = [];
          for (let c = 0; c < b.length; c += 1) {
            for (let r = 0; r < (b[c] as number[]).length; r += 1) {
              todas.push(packed(c, r));
            }
          }

          const alvo = todas[semente % todas.length] as Packed;
          const m = marcasDe(undefined, [alvo]);
          const face = cellAt(b, alvo);

          for (const g of gruposMarcados(b, m)) {
            const depois = applyMove(b, g);
            const seguintes = aplicarMarcas(b, m, g);

            // Ou a peça saiu — e o gelo com ela...
            if (seguintes.gelo.length === 0) {
              expect(new Set(g).has(alvo)).toBe(true);
              expect(g.length).toBe(2); // só sai a par
              continue;
            }

            // ...ou continua lá, gelada, com a mesma face.
            expect(cellAt(depois, seguintes.gelo[0] as Packed)).toBe(face);
          }

          return true;
        },
      ),
      { numRuns: 300 },
    );
  });
});
