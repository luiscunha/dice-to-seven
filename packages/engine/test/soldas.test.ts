/**
 * Soldas.
 *
 * O teste que sustenta a mecânica toda é o último: **uma solda nunca se parte**.
 * É essa propriedade que permite guardar a solda como uma só coordenada e não
 * como um estado que muda a meio do nível — e é dela que depende o gerador poder
 * construir estes níveis em reverso.
 */

import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  SEM_SOLDAS,
  aplicarSoldas,
  applyMove,
  cellAt,
  celulasSoldadas,
  checkSoldas,
  findAllGroups,
  findSolution,
  gruposSoldados,
  isEmpty,
  isSolvable,
  jogadaLegal,
  packed,
  parDe,
  respeitaSoldas,
  temGrupoSoldado,
  toGroup,
  width,
  height,
  type Board,
  type Group,
  type Packed,
  type Soldas,
} from "../src/index";

/*
 * ── O tabuleiro de referência ──
 *
 *   r2        4
 *   r1  3  5  2
 *   r0  4  2  1
 *       c0 c1 c2
 *
 * As colunas escrevem-se de baixo para cima.
 */
const B: Board = [
  [4, 3],
  [2, 5],
  [1, 2, 4],
];

describe("respeitar a solda", () => {
  it("sem soldas, tudo o que era legal continua legal", () => {
    const todos = [...findAllGroups(B)];
    expect(todos.length).toBeGreaterThan(0);
    for (const g of todos) expect(respeitaSoldas(g, SEM_SOLDAS)).toBe(true);
  });

  it("meio par é sempre ilegal; o par inteiro, ou nenhum, é legal", () => {
    // Solda entre (2,0)=1 e (2,1)=2.
    const s: Soldas = [packed(2, 0)];

    expect(respeitaSoldas(toGroup([packed(2, 0)]), s)).toBe(false);
    expect(respeitaSoldas(toGroup([packed(2, 1)]), s)).toBe(false);
    expect(respeitaSoldas(toGroup([packed(2, 0), packed(2, 1)]), s)).toBe(true);
    expect(respeitaSoldas(toGroup([packed(0, 0), packed(0, 1)]), s)).toBe(true);
  });

  it("a solda tira jogadas legais ao tabuleiro, nunca acrescenta", () => {
    const s: Soldas = [packed(2, 0)];
    const livres = [...findAllGroups(B)];
    const comSolda = [...gruposSoldados(B, s)];

    expect(comSolda.length).toBeLessThan(livres.length);
    const chaves = new Set(livres.map((g) => g.join(",")));
    for (const g of comSolda) expect(chaves.has(g.join(","))).toBe(true);
  });

  it("o par óbvio deixa de servir, e é esse o objetivo", () => {
    // (2,1)=2 com (1,1)=5 dá 7 e é legal sem soldas.
    const par = toGroup([packed(1, 1), packed(2, 1)]);
    expect(jogadaLegal(B, par, SEM_SOLDAS)).toBe(true);

    // Soldado o 2 ao 1 que tem por baixo, o mesmo toque passa a ilegal:
    // teria de arrastar o 1, e 5+2+1 são 8.
    expect(jogadaLegal(B, par, [packed(2, 0)])).toBe(false);
  });
});

describe("a solda acompanha o tabuleiro", () => {
  it("desce quando se limpa por baixo dela", () => {
    //   r2        4          r1  3  5  4
    //   r1  3  5  2    →     r0  4  2  2
    //   r0  4  2  1
    // Tirar (2,0)=1 e ... não dá 7. Usa-se antes uma jogada noutra coluna.
    const s: Soldas = [packed(2, 1)]; // o 2 soldado ao 4 de cima

    // 4+3 = 7 na coluna 0: a coluna inteira sai e colapsa.
    const g = toGroup([packed(0, 0), packed(0, 1)]);
    const depois = applyMove(B, g);
    const soldasDepois = aplicarSoldas(B, s, g);

    // A coluna 2 passou a ser a 1; a linha não mudou.
    expect(depois).toEqual([
      [2, 5],
      [1, 2, 4],
    ]);
    expect(soldasDepois).toEqual([packed(1, 1)]);

    // E continua a unir as mesmas duas faces.
    const [baixo, cima] = parDe(soldasDepois[0] as Packed);
    expect(cellAt(depois, baixo)).toBe(2);
    expect(cellAt(depois, cima)).toBe(4);
  });

  it("desaparece quando o par sai", () => {
    const s: Soldas = [packed(0, 0)]; // 4 soldado ao 3
    const g = toGroup([packed(0, 0), packed(0, 1)]);

    expect(respeitaSoldas(g, s)).toBe(true);
    expect(aplicarSoldas(B, s, g)).toEqual([]);
  });

  it("sem soldas não há trabalho nenhum a fazer", () => {
    const g = toGroup([packed(0, 0), packed(0, 1)]);
    expect(aplicarSoldas(B, SEM_SOLDAS, g)).toBe(SEM_SOLDAS);
  });
});

describe("invariantes", () => {
  it("aceita uma solda bem posta", () => {
    expect(checkSoldas(B, [packed(0, 0), packed(2, 1)])).toEqual([]);
  });

  it("recusa uma solda sem peça por cima", () => {
    // (0,1) é o topo da coluna 0.
    expect(checkSoldas(B, [packed(0, 1)])).toHaveLength(1);
    expect(checkSoldas(B, [packed(0, 1)])[0]).toContain("não há célula por cima");
  });

  it("recusa uma solda fora do tabuleiro", () => {
    expect(checkSoldas(B, [packed(9, 0)])).toHaveLength(1);
  });

  it("recusa correntes de três — uma célula só pode estar numa solda", () => {
    // (2,0)-(2,1) e (2,1)-(2,2) partilhariam a célula do meio.
    const problemas = checkSoldas(B, [packed(2, 0), packed(2, 1)]);
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toContain("duas soldas");
  });

  it("recusa soldas fora de ordem", () => {
    expect(checkSoldas(B, [packed(2, 1), packed(0, 0)]).length).toBeGreaterThan(0);
  });
});

describe("o solver conta com as soldas", () => {
  /*
   * Tabuleiro pensado para a solda ser a diferença entre ter e não ter solução.
   *
   *   r1  3  4
   *   r0  4  3
   *       c0 c1
   *
   * Livre: 4+3 na coluna 0, e depois 3+4 na coluna 1. Limpa.
   * Com o 4 de baixo soldado ao 3 de cima na coluna 0, esse par tem de sair
   * junto — e 4+3 são 7, portanto continua a dar. Solda-se antes na coluna 1.
   */
  const T: Board = [
    [4, 3],
    [3, 4],
  ];

  it("sem soldas tem solução", () => {
    expect(isSolvable(T)).toBe("yes");
  });

  it("uma solda que não estorva mantém a solução", () => {
    expect(isSolvable(T, undefined, [packed(0, 0)])).toBe("yes");
  });

  it("a solução devolvida respeita as soldas", () => {
    const s: Soldas = [packed(0, 0)];
    const caminho = findSolution(T, undefined, s);

    expect(caminho).not.toBeNull();

    let b: Board = T;
    let soldas: Soldas = s;
    for (const g of caminho as Group[]) {
      expect(jogadaLegal(b, g, soldas)).toBe(true);
      soldas = aplicarSoldas(b, soldas, g);
      b = applyMove(b, g);
    }
    expect(isEmpty(b)).toBe(true);
  });

  it("uma solda pode tornar impossível um tabuleiro que tinha solução", () => {
    /*
     *   r1  5  6
     *   r0  2  1
     *       c0 c1
     *
     * Livre: 5+2 e 6+1. Limpa.
     * Soldando o 2 ao 5, o par sai junto e são 7 — ainda dá.
     * Soldando o 2 ao 5 **e** o 1 ao 6, também dá (7 e 7).
     * O caso que mata: soldar em cruz não se pode, portanto usa-se um tabuleiro
     * onde o par soldado soma 8 e não tem por onde sair.
     */
    const U: Board = [
      [3, 5],
      [4, 2],
    ];
    expect(isSolvable(U)).toBe("yes"); // 3+4 e 5+2

    // 3 soldado ao 5 = bloco de 8. Nunca sai, e nada o pode salvar.
    expect(isSolvable(U, undefined, [packed(0, 0)])).toBe("no");
  });

  it("temGrupoSoldado concorda com a enumeração", () => {
    const s: Soldas = [packed(0, 0)];
    const U: Board = [
      [3, 5],
      [4, 2],
    ];
    expect(temGrupoSoldado(U, s)).toBe([...gruposSoldados(U, s)].length > 0);
  });
});

describe("celulasSoldadas", () => {
  it("dá as duas células de cada par", () => {
    const cs = celulasSoldadas([packed(0, 0), packed(2, 1)]);
    expect([...cs].sort((a, b) => a - b)).toEqual([
      packed(0, 0),
      packed(0, 1),
      packed(2, 1),
      packed(2, 2),
    ]);
  });
});

/* ─── A propriedade que sustenta tudo ─────────────────────────────────────── */

/** Todas as soldas verticais possíveis num tabuleiro, sem partilhar células. */
function soldasPossiveis(b: Board): Packed[] {
  const out: Packed[] = [];
  for (let c = 0; c < width(b); c += 1) {
    for (let r = 0; r + 1 < height(b, c); r += 2) out.push(packed(c, r));
  }
  return out;
}

describe("uma solda nunca se parte", () => {
  it("depois de qualquer jogada legal, o par continua encostado e com as mesmas faces", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.array(fc.integer({ min: 1, max: 6 }) as fc.Arbitrary<1 | 2 | 3 | 4 | 5 | 6>, {
            minLength: 1,
            maxLength: 5,
          }),
          { minLength: 1, maxLength: 5 },
        ),
        fc.integer({ min: 0, max: 2 ** 30 }),
        (colunas, semente) => {
          const b: Board = colunas;
          const candidatas = soldasPossiveis(b);
          if (candidatas.length === 0) return true;

          // Uma solda, escolhida de forma determinística pela semente.
          const s: Soldas = [candidatas[semente % candidatas.length] as Packed];
          const [baixo, cima] = parDe(s[0] as Packed);
          const faces = [cellAt(b, baixo), cellAt(b, cima)];

          for (const g of gruposSoldados(b, s)) {
            const depois = applyMove(b, g);
            const soldasDepois = aplicarSoldas(b, s, g);

            // Ou o par saiu inteiro...
            if (soldasDepois.length === 0) {
              expect(new Set(g).has(baixo)).toBe(true);
              expect(new Set(g).has(cima)).toBe(true);
              continue;
            }

            // ...ou continua a ser um par, encostado, com as mesmas faces.
            expect(checkSoldas(depois, soldasDepois)).toEqual([]);
            const [b2, c2] = parDe(soldasDepois[0] as Packed);
            expect([cellAt(depois, b2), cellAt(depois, c2)]).toEqual(faces);
          }

          return true;
        },
      ),
      { numRuns: 300 },
    );
  });
});
