/**
 * O que o jogo diz de si próprio: a versão, o contacto e o site.
 *
 * **A versão é a do `mobile`**, a mesma que vai escrita nos projetos nativos
 * (`packages/mobile/versao.ts`). Quem reporta um defeito lê-a nas Definições, e
 * tem de ser a do pacote que instalou — não um número à parte que alguém se
 * esqueceu de subir.
 *
 * O import é nomeado para o Vite levar só a versão, e não o `package.json`
 * inteiro, para dentro do pacote.
 */

import { version } from "../../mobile/package.json";

export const VERSAO: string = version;

/** O e-mail do jogo: o mesmo das páginas do site e das fichas das lojas. */
export const CONTACTO = "dicetoseven@gmail.com";

export const AUTOR = "Luís Cunha";

/** O site público, num repositório à parte (`dicetoseven-site`). */
export const SITE = "https://luiscunha.github.io/dicetoseven-site/";

/**
 * Uma página do site, já no idioma do jogo: as páginas têm as quatro línguas,
 * e o `?lang=` escolhe a que abre.
 */
export const paginaDoSite = (pagina: "privacy.html" | "support.html", idioma: string): string =>
  `${SITE}${pagina}?lang=${idioma.slice(0, 2)}`;
