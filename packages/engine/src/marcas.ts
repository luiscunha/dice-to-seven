/**
 * Marcas — as regras que um nível pode pôr por cima das regras do jogo.
 *
 * Hoje são duas: **soldas** (peças que saem juntas ou não saem) e **gelo**
 * (peças que só saem a par). Ambas são a mesma espécie de coisa: um conjunto de
 * coordenadas que viaja com o tabuleiro e que estreita o que é jogada legal.
 *
 * ── Porque existe este ficheiro ──
 *
 * A primeira versão passou as soldas ao solver como parâmetro solto. Funcionou,
 * e com a segunda mecânica ficou claro para onde ia: `isSolvable(b, limits,
 * soldas, gelo)`, e mais um por cada regra que se inventasse. Havia âncoras e
 * contagens decrescentes na fila.
 *
 * Um objeto só resolve isso de vez. E resolve mais: a chave de memoização passa
 * a ser composta num sítio só, e um nível sem marcas nenhumas continua a dar
 * **exatamente** a chave de sempre, byte a byte — que é o que garante que os
 * milhares de tabuleiros sem marcas não pagam nada por isto.
 *
 * ── A invariante que as liga ──
 *
 * **Uma peça tem no máximo uma marca.** Uma peça soldada sai em par com a
 * companheira soldada; uma gelada sai em par com quem completa 7. Numa peça com
 * as duas marcas, ou as regras se contradizem — e a peça nunca sai — ou uma
 * delas é a outra disfarçada. `checkMarcas` recusa-o.
 */

import type { Board, Group, Packed } from "./types";
import { isValidGroup, findAllGroups } from "./groups";
import type { Soldas } from "./soldas";
import {
  SEM_SOLDAS,
  aplicarSoldas,
  celulasSoldadas,
  checkSoldas,
  respeitaSoldas,
} from "./soldas";
import type { Gelo } from "./gelo";
import { SEM_GELO, aplicarGelo, checkGelo, respeitaGelo } from "./gelo";

export interface Marcas {
  readonly soldas: Soldas;
  readonly gelo: Gelo;
}

/** O caso normal, e o que todo o código que não conhece marcas vê. */
export const SEM_MARCAS: Marcas = { soldas: SEM_SOLDAS, gelo: SEM_GELO };

export const temMarcas = (m: Marcas): boolean =>
  m.soldas.length > 0 || m.gelo.length > 0;

/** Marcas a partir do que um nível traz, com omissões para o que não traz. */
export const marcasDe = (
  soldas?: Soldas,
  gelo?: Gelo,
): Marcas => ({ soldas: soldas ?? SEM_SOLDAS, gelo: gelo ?? SEM_GELO });

/** Todas as células marcadas, seja de que maneira for. Para a interface. */
export function celulasMarcadas(m: Marcas): ReadonlySet<Packed> {
  const out = new Set<Packed>(celulasSoldadas(m.soldas));
  for (const p of m.gelo) out.add(p);
  return out;
}

export const respeitaMarcas = (g: Group, m: Marcas): boolean =>
  respeitaSoldas(g, m.soldas) && respeitaGelo(g, m.gelo);

/** `isValidGroup` mais as marcas. É o que a interface tem de perguntar. */
export const jogadaLegal = (b: Board, g: Group, m: Marcas): boolean =>
  isValidGroup(b, g) && respeitaMarcas(g, m);

export function aplicarMarcas(b: Board, m: Marcas, g: Group): Marcas {
  if (!temMarcas(m)) return SEM_MARCAS;

  return {
    soldas: aplicarSoldas(b, m.soldas, g),
    gelo: aplicarGelo(b, m.gelo, g),
  };
}

export function checkMarcas(b: Board, m: Marcas): string[] {
  const problemas = [...checkSoldas(b, m.soldas), ...checkGelo(b, m.gelo)];

  // Ver a nota no topo: as duas marcas na mesma peça ou contradizem-se ou são a
  // mesma regra duas vezes.
  const soldadas = celulasSoldadas(m.soldas);
  for (const p of m.gelo) {
    if (soldadas.has(p)) {
      problemas.push(`peça ${p} está soldada e gelada ao mesmo tempo`);
    }
  }

  return problemas;
}

/*
 * ── O filtro é posterior à enumeração, de propósito ──
 *
 * A enumeração por célula mínima de `groups.ts` garante que cada grupo sai
 * exatamente uma vez, e essa garantia assenta em duas estruturas cuja correção é
 * subtil. Tecer as marcas lá para dentro pouparia alguns ramos e arriscaria a
 * propriedade de que dependem o branching factor e a contagem de estados.
 *
 * O custo é desprezável: um nível tem meia dúzia de marcas.
 */

/** Os grupos válidos que também respeitam as marcas. */
export function* gruposMarcados(b: Board, m: Marcas): Generator<Group> {
  for (const g of findAllGroups(b)) {
    if (respeitaMarcas(g, m)) yield g;
  }
}

/** Há jogada? Para no primeiro grupo legal — é o caminho quente do pipeline. */
export function temGrupoMarcado(b: Board, m: Marcas): boolean {
  for (const _ of gruposMarcados(b, m)) return true;
  return false;
}

/**
 * A parte da chave de memoização que as marcas acrescentam.
 *
 * **Sem marcas é a string vazia**, e a chave do solver fica byte a byte a de
 * sempre. Com marcas, o estado não é só o tabuleiro: dois tabuleiros com as
 * mesmas peças e marcas em sítios diferentes têm jogadas diferentes, e
 * confundi-los daria por falhado um estado que afinal tem solução — um nível
 * recusado, ou pior, um nível aceite que o jogador não consegue acabar.
 */
export function chaveMarcas(m: Marcas): string {
  if (!temMarcas(m)) return "";
  return `#${m.soldas.join(",")}/${m.gelo.join(",")}`;
}
