/**
 * Os ícones dos botões de ação, da navegação e dos modos.
 *
 * **SVG inline, e não uma fonte de ícones nem ficheiros.** São uma dúzia de
 * desenhos de poucas linhas: uma fonte seria um pedido de rede para os servir,
 * e um `<img>` um por ícone — e nenhum dos dois herda a cor do botão, que é o
 * que faz o ícone escurecer com o tema e esmorecer quando o botão fica
 * desativado. Uma biblioteca de ícones seria a primeira dependência de runtime
 * do jogo, por doze traços.
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

/*
 * ── Navegação ──
 *
 * O `‹` e o `✕` eram caracteres de texto, e um carácter herda o tamanho, o peso
 * e o desenho da fonte do sistema: no Android saía um risco pequeno e fino no
 * meio de um botão de 44px, e o botão parecia vazio. Desenhados à mesma grelha
 * dos outros, pesam o mesmo que o desfazer ao lado.
 */

/** Voltar: a seta para a esquerda, sem haste. */
export const iconeVoltar = (): SVGElement =>
  icone("icone-voltar", ["M14.5 5.5 8 12l6.5 6.5"]);

/** Seguir: o mesmo desenho ao contrário. Diz que o cartão leva a outro ecrã. */
export const iconeSeguir = (): SVGElement =>
  icone("icone-seguir", ["M9.5 5.5 16 12l-6.5 6.5"]);

/** Fechar uma caixa. */
export const iconeFechar = (): SVGElement =>
  icone("icone-fechar", ["M6.5 6.5l11 11", "M17.5 6.5l-11 11"]);

/**
 * Definições: dois cursores de regulação.
 *
 * E não uma roda dentada: a roda a 18px é uma mancha com dentes, e os cursores
 * dizem o que o ecrã é — sítio de afinar, não de configurar uma máquina.
 */
export const iconeDefinicoes = (): SVGElement =>
  icone("icone-definicoes", [
    "M4 8h7",
    "M11 8a2.25 2.25 0 1 0 4.5 0a2.25 2.25 0 1 0-4.5 0",
    "M15.5 8H20",
    "M4 16h3",
    "M7 16a2.25 2.25 0 1 0 4.5 0a2.25 2.25 0 1 0-4.5 0",
    "M11.5 16H20",
  ]);

/*
 * ── Os três modos ──
 *
 * Um desenho por modo, na Home. Não são ilustração — a direção de arte recusa
 * ícones ilustrados — são o mesmo traço dos botões de ação, e servem para o
 * olho encontrar o modo antes de ler o nome.
 */

/** Puzzles: uma face de três, que é o jogo em si. */
export const iconePuzzles = (): SVGElement =>
  icone("icone-puzzles", [
    "M6 3.5h12A2.5 2.5 0 0 1 20.5 6v12a2.5 2.5 0 0 1-2.5 2.5H6A2.5 2.5 0 0 1 3.5 18V6A2.5 2.5 0 0 1 6 3.5Z",
    "M7.6 8.1a.9.9 0 1 0 1.8 0a.9.9 0 1 0-1.8 0",
    "M11.1 12a.9.9 0 1 0 1.8 0a.9.9 0 1 0-1.8 0",
    "M14.6 15.9a.9.9 0 1 0 1.8 0a.9.9 0 1 0-1.8 0",
  ]);

/** Contra-Relógio: o cronómetro, com o ponteiro a meio caminho. */
export const iconeCronometro = (): SVGElement =>
  icone("icone-cronometro", [
    "M5 13.5a7 7 0 1 0 14 0a7 7 0 1 0-14 0",
    "M12 13.5V10",
    "M10 3h4",
    "M12 3v3.5",
    "M18 6.5l1.3-1.3",
  ]);

/** Survival: uma linha a descer sobre as que já lá estão. */
export const iconeSurvival = (): SVGElement =>
  icone("icone-survival", [
    "M12 3v7",
    "M8.5 7 12 10.5 15.5 7",
    "M4.5 15h15",
    "M4.5 19.5h15",
  ]);
