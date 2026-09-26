/**
 * Aplicação de jogada (spec §4).
 *
 * O algoritmo inteiro cabe em quatro passos, e dois deles saem de graça da
 * representação por colunas: remover células de uma lista *é* a gravidade,
 * remover listas vazias *é* o colapso de colunas.
 */

import type { Board, Column, Group, Packed } from "./types";
import { colOf, packed, rowOf } from "./types";
import { isValidGroup } from "./groups";

/**
 * As linhas removidas, por coluna.
 *
 * Exportado porque as **soldas** têm de sofrer exatamente a mesma gravidade e o
 * mesmo colapso que o tabuleiro. Uma segunda implementação da travessia seria
 * uma segunda oportunidade de divergir — e uma solda que ficasse a apontar para
 * a célula errada seria um nível corrompido em silêncio.
 */
export function linhasRemovidas(g: Group): Map<number, Set<number>> {
  const removidas = new Map<number, Set<number>>();
  for (const p of g) {
    const c = colOf(p);
    let linhas = removidas.get(c);
    if (linhas === undefined) {
      linhas = new Set<number>();
      removidas.set(c, linhas);
    }
    linhas.add(rowOf(p));
  }
  return removidas;
}

/**
 * Para onde vai cada célula que sobrevive à jogada. `undefined` = saiu com ela.
 *
 * É a gravidade e o colapso expressos em coordenadas em vez de listas, e existe
 * para as **marcas** — soldas, gelo — acompanharem o tabuleiro sem recalcular
 * nada. Uma marca é uma coordenada, e uma coordenada que ficasse a apontar para
 * a célula errada seria um nível corrompido em silêncio.
 *
 * Devolve-se um fecho e não um `Map` de todas as células: as marcas são duas ou
 * três por nível, e o solver chama isto uma vez por estado visitado.
 */
export function remapearCelula(
  b: Board,
  g: Group,
): (p: Packed) => Packed | undefined {
  const removidas = linhasRemovidas(g);

  // Uma coluna some quando a jogada lhe levou todas as células; as que ficam à
  // direita andam para a esquerda.
  const destinoDaColuna = new Map<number, number>();
  let destino = 0;
  for (let c = 0; c < b.length; c++) {
    const col = b[c];
    if (col === undefined) continue;

    const fora = removidas.get(c);
    if (fora !== undefined && fora.size === col.length) continue;

    destinoDaColuna.set(c, destino);
    destino += 1;
  }

  return (p) => {
    const c = colOf(p);
    const r = rowOf(p);

    const fora = removidas.get(c);
    if (fora?.has(r) === true) return undefined; // saiu

    const cNovo = destinoDaColuna.get(c);
    if (cNovo === undefined) return undefined; // a coluna colapsou

    let abaixo = 0;
    if (fora !== undefined) for (const linha of fora) if (linha < r) abaixo += 1;

    return packed(cNovo, r - abaixo);
  };
}

export class InvalidMoveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidMoveError";
  }
}

/**
 * Devolve um tabuleiro **novo** com o grupo eliminado, a gravidade aplicada e as
 * colunas vazias colapsadas.
 *
 * As colunas não afetadas são partilhadas por referência — são imutáveis, e uma
 * jogada toca em 1–4 colunas, portanto o custo é proporcional ao grupo e não ao
 * tabuleiro.
 *
 * **Cascatas não eliminam automaticamente** (spec §4.3). Se novos grupos se
 * formarem, ficam disponíveis, mas só desaparecem se o jogador os escolher: uma
 * eliminação automática seguiria um caminho que o jogador não escolheu e podia
 * levar o tabuleiro a um estado bloqueado, destruindo a garantia de
 * terminabilidade. "Cascata" e "combo" pertencem à `GameSession`.
 *
 * @throws {InvalidMoveError} se o grupo não for uma jogada legal (spec §3.1).
 */
export function applyMove(b: Board, g: Group): Board {
  if (!isValidGroup(b, g)) {
    throw new InvalidMoveError(
      `Grupo inválido em ${JSON.stringify(b)}: [${g.join(", ")}]`,
    );
  }

  const removidas = linhasRemovidas(g);

  const saida: Column[] = [];

  for (let c = 0; c < b.length; c++) {
    const col = b[c] as Column;
    const linhas = removidas.get(c);

    if (linhas === undefined) {
      saida.push(col); // intacta: partilhada por referência
      continue;
    }

    // Gravidade: filtrar preserva a ordem, portanto o que estava acima desce.
    const nova = col.filter((_, r) => !linhas.has(r));

    // Colapso: a coluna que ficou vazia simplesmente não entra.
    if (nova.length > 0) saida.push(nova);
  }

  return saida;
}
