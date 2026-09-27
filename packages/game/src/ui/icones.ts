/**
 * Os ícones dos botões de ação.
 *
 * **SVG inline, e não uma fonte de ícones nem ficheiros.** São três desenhos de
 * vinte linhas: uma fonte seria um pedido de rede para os servir, e um `<img>`
 * um por ícone — e nenhum dos dois herda a cor do botão, que é o que faz o
 * ícone escurecer com o tema e esmorecer quando o botão fica desativado.
 *
 * Todos usam `currentColor` e o mesmo traço: desenhados à mesma grelha de 24,
 * para que um par de botões lado a lado não pareça ter pesos diferentes.
 *
 * `aria-hidden` em todos. O nome do botão vem do `aria-label` ou do texto ao
 * lado — um ícone que se anuncia a si próprio dá a um leitor de ecrã duas
 * leituras da mesma coisa.
 */

const NS = "http://www.w3.org/2000/svg";

/**
 * O invólucro comum.
 *
 * `d` é um ou mais caminhos; cada um entra como `<path>` próprio, porque um só
 * `d` com sub-caminhos partilharia o preenchimento e a seta do desfazer precisa
 * de ponta cheia sobre traço vazio.
 */
function icone(classe: string, caminhos: readonly string[]): SVGElement {
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("class", `icone ${classe}`);
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.9");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");

  for (const d of caminhos) {
    const p = document.createElementNS(NS, "path");
    p.setAttribute("d", d);
    svg.appendChild(p);
  }

  return svg;
}

/**
 * Desfazer: a seta que volta para trás.
 *
 * Aponta para a **esquerda**, que é o sentido em que se desanda — a mesma
 * convenção de todo o software que tem undo, e a razão para não a inventar de
 * novo aqui.
 */
export const iconeDesfazer = (): SVGElement =>
  icone("icone-desfazer", [
    "M4 9h11a4.5 4.5 0 0 1 0 9h-6",
    "M8 5 4 9l4 4",
  ]);

/**
 * Reiniciar: a volta completa.
 *
 * Um círculo quase fechado, e não a seta do desfazer duplicada: as duas ações
 * ficam lado a lado, e dois ícones parecidos num par de botões é pior do que
 * nenhum.
 */
export const iconeReiniciar = (): SVGElement =>
  icone("icone-reiniciar", [
    "M20 12a8 8 0 1 1-2.6-5.9",
    "M20 4v4h-4",
  ]);

/** A dica: a lâmpada, com o casquilho a fazer as duas linhas de baixo. */
export const iconeDica = (): SVGElement =>
  icone("icone-dica", [
    "M9 18h6",
    "M10 21h4",
    "M12 3a6 6 0 0 0-3.5 10.9c.5.4.8 1 .8 1.6v.5h5.4v-.5c0-.6.3-1.2.8-1.6A6 6 0 0 0 12 3Z",
  ]);
