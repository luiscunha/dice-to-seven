/**
 * Os textos do jogo, no idioma escolhido.
 *
 * **Um idioma de cada vez, para o jogo inteiro.** `t()` devolve o dicionário em
 * vigor, e os ecrãs leem dele quando se desenham. Mudar de idioma não traduz
 * nada no sítio: o `main.ts` monta o ecrã outra vez, e o ecrã lê os textos
 * novos. É o mesmo princípio do resto do jogo — o ecrã é função do estado —, e
 * poupa a cada ecrã ter de saber retraduzir-se.
 *
 * `t()` e não um objeto importado: o dicionário troca-se em tempo de execução,
 * e uma função lê sempre o de agora.
 *
 * Arranca em português, o idioma de referência. Os testes contam com isso: um
 * ecrã montado num teste fala português sem ninguém o pedir.
 */

import type { Idioma } from "./idioma";
import { PT } from "./pt";
import type { Textos } from "./pt";

export type { Textos } from "./pt";
export type { Idioma, PreferenciaDeIdioma } from "./idioma";
export { IDIOMAS, eIdioma, idiomaDoSistema, resolverIdioma } from "./idioma";

const DICIONARIOS: Readonly<Record<Idioma, Textos>> = {
  "pt-PT": PT,
  "en-GB": PT,
  "es-ES": PT,
  "fr-FR": PT,
};

let idiomaAtual: Idioma = "pt-PT";
let atual: Textos = PT;

/** Os textos do idioma em vigor. */
export const t = (): Textos => atual;

/** O idioma em vigor. */
export const idioma = (): Idioma => idiomaAtual;

/** Troca o idioma do jogo. Quem chama remonta o ecrã. */
export function definirIdioma(novo: Idioma): void {
  idiomaAtual = novo;
  atual = DICIONARIOS[novo];
}

/** Os textos de um idioma qualquer, sem mudar o do jogo — para os testes. */
export const textosDe = (i: Idioma): Textos => DICIONARIOS[i];
