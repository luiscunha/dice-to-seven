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
 * Um caminho com mais do que o traço: **cheio**, para as partes que só se leem
 * como massa — a lâmina e o pomo da espada do Survival —, e rodado, para
 * desenhar direito o que se mostra na diagonal.
 */
interface Caminho {
  readonly d: string;
  readonly cheio?: boolean;
  readonly transform?: string;
}

/**
 * O invólucro comum.
 *
 * `d` é um ou mais caminhos; cada um entra como `<path>` próprio, porque um só
 * `d` com sub-caminhos partilharia o preenchimento e a seta do desfazer precisa
 * de ponta cheia sobre traço vazio.
 */
function icone(classe: string, caminhos: readonly (string | Caminho)[]): SVGElement {
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("class", `icone ${classe}`);
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.9");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");

  for (const c of caminhos) {
    const { d, cheio = false, transform } = typeof c === "string" ? { d: c } : c;
    const p = document.createElementNS(NS, "path");
    p.setAttribute("d", d);
    // Cheio **e** com traço: o traço redondo arredonda-lhe as pontas, e a
    // massa fica com o mesmo peso de linha que o resto do desenho.
    if (cheio) p.setAttribute("fill", "currentColor");
    if (transform !== undefined) p.setAttribute("transform", transform);
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

/**
 * Saltar: as duas setas do seguir e a barra de fim de faixa.
 *
 * O desenho de «passar à frente» que qualquer leitor de música já ensinou. A
 * barra é o que o distingue do seguir — sem ela, saltar o tabuleiro lia-se
 * como ir para outro ecrã.
 */
export const iconeSaltar = (): SVGElement =>
  icone("icone-saltar", ["M5.5 6.5 11 12l-5.5 5.5", "M11 6.5l5.5 5.5-5.5 5.5", "M18.5 6v12"]);

/**
 * Um cadeado: o arco e o corpo. É o salto **antes** de existir — o botão está
 * lá, e diz que ainda não abre.
 */
export const iconeCadeado = (): SVGElement =>
  icone("icone-cadeado", [
    "M6.5 11h11a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1z",
    "M8.5 11V8a3.5 3.5 0 0 1 7 0v3",
  ]);

/** O visto: um desafio do dia feito, no trilho. */
export const iconeVisto = (): SVGElement => icone("icone-visto", ["M5 12.5l4.5 4.5L19 7.5"]);

/**
 * Partilhar: a seta a sair da caixa — o desenho que os dois sistemas de
 * telemóvel já ensinaram.
 */
export const iconePartilhar = (): SVGElement =>
  icone("icone-partilhar", ["M12 4v11", "M8 8l4-4 4 4", "M6.5 11.5H6a1.5 1.5 0 0 0-1.5 1.5v6A1.5 1.5 0 0 0 6 20.5h12a1.5 1.5 0 0 0 1.5-1.5v-6a1.5 1.5 0 0 0-1.5-1.5h-.5"]);

/**
 * O calendário: o Desafio do Dia. Uma folha com as duas argolas e o dia
 * marcado a meio.
 */
export const iconeCalendario = (): SVGElement =>
  icone("icone-calendario", ["M6 5.5h12a1.5 1.5 0 0 1 1.5 1.5v11.5A1.5 1.5 0 0 1 18 20H6a1.5 1.5 0 0 1-1.5-1.5V7A1.5 1.5 0 0 1 6 5.5z", "M4.5 10h15", "M8.5 3.5v4", "M15.5 3.5v4", "M11 14.5h2"]);

/**
 * Uma medalha: as duas fitas em V e o disco pendurado nelas. As fitas são o que
 * a separa de um círculo qualquer a 18px.
 */
export const iconeMedalha = (): SVGElement =>
  icone("icone-medalha", [
    "M8.5 3.5 11 10",
    "M15.5 3.5 13 10",
    "M7 15.5a5 5 0 1 0 10 0a5 5 0 1 0-10 0",
    "M12 13.6v3.8",
  ]);

/** Fechar uma caixa. */
export const iconeFechar = (): SVGElement =>
  icone("icone-fechar", ["M6.5 6.5l11 11", "M17.5 6.5l-11 11"]);

/**
 * Definições: a roda dentada.
 *
 * Foram dois cursores de regulação, que diziam o que o ecrã é — sítio de
 * afinar. Mas a roda é o sinal que toda a gente procura no canto de um jogo,
 * e um sinal que se reconhece sem se ler ganha a um que se explica.
 *
 * Oito dentes, curtos e largos: a 20px, dentes finos fechavam-se numa mancha.
 * Gera-se num círculo (dentes de 20° no topo e 32° na base), e não à mão, para
 * os oito saírem iguais.
 */
export const iconeDefinicoes = (): SVGElement =>
  icone("icone-definicoes", [
    "M10.18 5.66L10.47 3.33A8.8 8.8 0 0 1 13.53 3.33L13.82 5.66A6.6 6.6 0 0 1 15.2 6.23" +
      "L17.05 4.79A8.8 8.8 0 0 1 19.21 6.95L17.77 8.8A6.6 6.6 0 0 1 18.34 10.18" +
      "L20.67 10.47A8.8 8.8 0 0 1 20.67 13.53L18.34 13.82A6.6 6.6 0 0 1 17.77 15.2" +
      "L19.21 17.05A8.8 8.8 0 0 1 17.05 19.21L15.2 17.77A6.6 6.6 0 0 1 13.82 18.34" +
      "L13.53 20.67A8.8 8.8 0 0 1 10.47 20.67L10.18 18.34A6.6 6.6 0 0 1 8.8 17.77" +
      "L6.95 19.21A8.8 8.8 0 0 1 4.79 17.05L6.23 15.2A6.6 6.6 0 0 1 5.66 13.82" +
      "L3.33 13.53A8.8 8.8 0 0 1 3.33 10.47L5.66 10.18A6.6 6.6 0 0 1 6.23 8.8" +
      "L4.79 6.95A8.8 8.8 0 0 1 6.95 4.79L8.8 6.23A6.6 6.6 0 0 1 10.18 5.66Z",
    "M9.4 12a2.6 2.6 0 1 0 5.2 0a2.6 2.6 0 1 0-5.2 0",
  ]);

/**
 * As regras: o livro aberto.
 *
 * Aberto e não fechado — um livro fechado lê-se como «documentação», e o que
 * está do outro lado deste botão é curto e ilustrado. A lombada ao meio é o que
 * o torna reconhecível a 18px; sem ela ficam dois retângulos.
 */
export const iconeRegras = (): SVGElement =>
  icone("icone-regras", [
    "M12 6.8C10.6 5.5 8.7 4.8 6.2 4.8H4v12.6h2.2c2.5 0 4.4.7 5.8 2",
    "M12 6.8c1.4-1.3 3.3-2 5.8-2H20v12.6h-2.2c-2.5 0-4.4.7-5.8 2",
    "M12 6.8v12.6",
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

/**
 * Survival: a espada sobre o escudo — aguentar e lutar.
 *
 * Foi uma linha a descer sobre as que já lá estavam: dizia a mecânica, mas
 * não o modo, e ao lado do cronómetro e do dado lia-se como um botão de
 * descarregar.
 *
 * O escudo é um contorno em duas metades, aberto onde a espada passa — por
 * cima, onde sai a ponta, e por baixo, onde fica o pomo —, para a espada ficar
 * à frente sem o traço lhe passar por cima. A espada desenha-se direita e roda
 * 45°: a lâmina e o pomo cheios, a guarda e o punho em traço.
 */
const ESPADA = "rotate(45 12.7 11.15)";

export const iconeSurvival = (): SVGElement =>
  icone("icone-survival", [
    // O escudo: o ombro e o lado esquerdo; o lado direito e o fundo redondo.
    "M4.7 13.6C4.4 11.2 4.5 8.6 5.1 6.4C8 6.3 10.8 5.6 13.4 4",
    "M19.6 10.8c0 5.1-3.4 9.5-7.6 9.5c-.8 0-1.5-.2-2.2-.5",
    // A espada, desenhada direita: lâmina, guarda, punho e pomo.
    { d: "M12.7 3.6l1.4 2.9-.7 8.3h-1.4l-.7-8.3z", cheio: true, transform: ESPADA },
    { d: "M10.1 15.7h5.2", transform: ESPADA },
    { d: "M12.7 15.7v2", transform: ESPADA },
    { d: "M11.95 18.6a.75.75 0 1 0 1.5 0a.75.75 0 1 0-1.5 0", cheio: true, transform: ESPADA },
  ]);
