/**
 * Formato de nível (spec §8).
 *
 * `board` é literalmente o tipo `Board`, portanto o ficheiro não precisa de
 * serializador. `solution` usa coordenadas empacotadas.
 *
 * Guarda-se a `seed` **e** o tabuleiro explícito: a seed é identidade estável e
 * rastreio, o tabuleiro explícito protege contra alterações futuras no gerador
 * que mudariam o que a mesma seed produz.
 */

import type { Board, Group } from "./types";
import type { GeneratedLevel } from "./generator";
import type { Soldas } from "./soldas";

export interface LevelMetrics {
  readonly pieces: number;
  readonly survivalRate: number;
  readonly avgBranching: number;
  readonly avgMoveDensity: number;
  readonly avgGroupSize: number;
  /** `null` quando nenhum playout falhou — não há profundidade fatal, e zero
   * seria mentira. */
  readonly firstFatalDepth: number | null;
  readonly solutionLength: number;
}

export interface Level {
  readonly id: string;
  readonly seed: number;
  readonly board: Board;

  /**
   * `at` é `[coluna, linha]`, com a linha contada **a partir da base**, como
   * todas as coordenadas do motor (spec §2.2).
   */
  readonly joker?: {
    readonly at: readonly [number, number];
    readonly trueValue: number;
  };

  /**
   * Pares soldados: a coordenada empacotada da célula **de baixo** de cada par.
   * Ausente quando o nível não tem soldas, que é o caso da esmagadora maioria.
   *
   * Não precisa de mais nada. A solda é sempre vertical — a de cima é a célula
   * imediatamente acima — e nunca se parte, portanto uma coordenada por par
   * chega e sobra. Ver `soldas.ts`.
   */
  readonly soldas?: Soldas;

  readonly solution: readonly Group[];

  /** Preenchidas pelo pipeline de medição (fase 5). */
  readonly metrics?: LevelMetrics;
  readonly band?: string;
}

/** Um level pack é um array destes objetos, servido como ficheiro estático. */
export type LevelPack = readonly Level[];

/** Junta identidade a um nível gerado. As métricas entram depois. */
export function toLevel(
  id: string,
  seed: number,
  gerado: GeneratedLevel,
  soldas?: Soldas,
): Level {
  const base = {
    id,
    seed,
    board: gerado.board,
    solution: gerado.solution,
  };

  const comJoker =
    gerado.joker === undefined ? base : { ...base, joker: gerado.joker };

  // `exactOptionalPropertyTypes`: omite-se a chave, não se atribui `undefined`.
  return soldas === undefined || soldas.length === 0
    ? comJoker
    : { ...comJoker, soldas };
}
