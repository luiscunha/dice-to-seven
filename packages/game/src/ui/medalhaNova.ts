/**
 * A linha «Nova medalha» do painel de fim.
 *
 * Partilhada pelos três modos, como o `anunciar`: a mesma notícia diz-se da
 * mesma maneira em todo o lado. Fica no painel e não num aviso por cima do
 * jogo — a medalha ganhou-se com esta partida, e é ao lado do resultado dela que
 * se lê; um aviso a meio da corrida tapava o tabuleiro no pior momento.
 */

import type { Medalha } from "../session/medalhas";
import { elemento } from "./dom";
import { iconeMedalha } from "./icones";

/** O que o painel precisa de saber de uma medalha acabada de ganhar. */
export type MedalhaGanha = Pick<Medalha, "nome" | "tipo">;

/** A linha, ou `undefined` se a partida não deu medalha nenhuma. */
export function linhaDeMedalhas(novas: readonly MedalhaGanha[]): HTMLElement | undefined {
  if (novas.length === 0) return undefined;

  const linha = elemento("p", "fim-medalhas");
  if (novas.some((m) => m.tipo === "premium")) linha.dataset["premium"] = "sim";

  const nomes = novas.map((m) => m.nome).join(", ");
  linha.append(
    iconeMedalha(),
    elemento("span", undefined, novas.length === 1 ? "Nova medalha: " : "Novas medalhas: "),
    elemento("b", undefined, nomes),
  );

  return linha;
}
