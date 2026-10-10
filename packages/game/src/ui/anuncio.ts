/**
 * O número que sobe do sítio onde aconteceu.
 *
 * O `+3s` de um tabuleiro limpo, o `−1.5s` de um toque errado, o `+1 linha` de
 * uma bomba no Survival. Ganhar e perder dizem-se no mesmo sítio e da mesma
 * maneira, mudando só a cor: o jogador só liga o efeito à causa se o número
 * nascer **na peça** que o causou. Um número no cabeçalho não se liga a nada.
 *
 * Partilhado pelos dois modos com relógio, que é o que garante que dizem a
 * mesma coisa da mesma maneira.
 */

import { elemento } from "./dom";

/**
 * Faz subir `texto` do centro das `caixas`, dentro do `palco`.
 *
 * As caixas leem-se **antes** de as peças saírem: depois já não há de onde o
 * número subir. O elemento sai sozinho quando a animação acaba.
 */
export function anunciar(
  palco: HTMLElement,
  caixas: readonly DOMRect[],
  texto: string,
  variante?: string,
): void {
  if (caixas.length === 0) return;

  const base = palco.getBoundingClientRect();
  const x =
    caixas.reduce((n, r) => n + r.left + r.width / 2, 0) / caixas.length -
    base.left;
  const y = caixas.reduce((n, r) => n + r.top, 0) / caixas.length - base.top;

  const el = elemento(
    "div",
    variante === undefined ? "ganho" : `ganho ${variante}`,
    texto,
  );
  el.style.left = `${String(Math.round(x))}px`;
  el.style.top = `${String(Math.round(y))}px`;

  palco.appendChild(el);
  el.addEventListener("animationend", () => {
    el.remove();
  });
}
