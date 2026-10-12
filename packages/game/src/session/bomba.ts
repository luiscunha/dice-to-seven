/**
 * A peça-bomba — uma peça do tabuleiro com pavio, que tem de sair numa jogada
 * antes de ele acabar.
 *
 * Existe em dois modos, com castigos diferentes: no Contra-Relógio rebentar
 * custa tempo, no Survival faz cair uma linha. O que é comum aos dois vive aqui
 * — a bomba seguir a peça, sair com ela, e saber quanto pavio lhe resta. O
 * castigo é de cada modo, porque cada modo tem a sua moeda de pressão.
 *
 * ── Porque não vive na engine nem passa pelo gerador ──
 *
 * As soldas e o gelo mudam **o que é jogada legal**, e por isso mudam os estados
 * alcançáveis: têm de ser verificadas pelo solver para a garantia central
 * sobreviver. A bomba não muda a legalidade de jogada nenhuma. O tabuleiro
 * joga-se exatamente como jogaria sem ela, e não há nada a verificar.
 *
 * ── Quando rebenta, a peça fica ──
 *
 * Nos dois modos, e por razões diferentes. No Contra-Relógio, tirá-la mudava a
 * soma do tabuleiro, que deixava de ser múltipla de 7 e de ter solução. No
 * Survival não há solução a proteger, mas tirar uma peça seria um **alívio** —
 * uma peça a menos num modo que se perde por excesso delas —, e um castigo que
 * alivia não é castigo.
 *
 * ── O relógio é de quem chama ──
 *
 * `rebentaEm` está no relógio do modo, seja ele qual for. O Contra-Relógio usa
 * as horas do sistema; o Survival usa o decorrido da corrida, que pára com a
 * pausa — e um pavio medido nele pára com ele. Nada aqui lê as horas.
 */

import type { Board, Group, Packed } from "@dicetoseven/engine";
import { findAllGroups, remapearCelula } from "@dicetoseven/engine";

export interface Bomba {
  /** Onde está a peça armada. Viaja com o tabuleiro, como as marcas. */
  readonly at: Packed;
  /** Instante em que rebenta, se não sair antes — no relógio do modo. */
  readonly rebentaEm: number;
}

/** Quanto falta para rebentar. `undefined` sem bomba armada. */
export const pavioDe = (
  bomba: Bomba | undefined,
  agora: number,
): number | undefined =>
  bomba === undefined ? undefined : Math.max(0, bomba.rebentaEm - agora);

/** O pavio acabou? */
export const pavioAcabou = (bomba: Bomba | undefined, agora: number): boolean =>
  bomba !== undefined && agora >= bomba.rebentaEm;

/** A jogada levou a peça da bomba consigo. */
export const saiNaJogada = (bomba: Bomba | undefined, jogada: Group): boolean =>
  bomba !== undefined && jogada.includes(bomba.at);

/**
 * A bomba acompanha a peça: cai com a gravidade e desliza com o colapso.
 *
 * É a mesma travessia que as soldas e o gelo fazem, e pela mesma função — uma
 * bomba que ficasse a apontar para a coordenada antiga passava a ameaçar a
 * peça que lá caiu, e o jogador desarmava a peça errada.
 *
 * Devolve `undefined` se a peça saiu na jogada: desarmada. O resto da bomba
 * viaja intacto, incluindo o que cada modo lhe acrescente.
 */
export function seguirBomba<B extends Bomba>(
  bomba: B | undefined,
  board: Board,
  jogada: Group,
): B | undefined {
  if (bomba === undefined) return undefined;

  const at = remapearCelula(board, jogada)(bomba.at);
  return at === undefined ? undefined : { ...bomba, at };
}

/** As peças que entram em pelo menos um grupo válido, por ordem crescente. */
export function pecasJogaveis(board: Board): Packed[] {
  const pecas = new Set<Packed>();
  for (const g of findAllGroups(board)) for (const p of g) pecas.add(p);
  return [...pecas].sort((a, b) => a - b);
}
