/**
 * A peça: uma face de dado em DOM.
 *
 * Pintas por omissão — é a identidade que dá nome ao jogo. Os dígitos são uma
 * definição, não o padrão: ajudam quem tem dificuldade em subitizar, e é
 * provável que os jogadores rápidos os prefiram no modo tempo (desenho §7).
 *
 * A cor é **redundante**: as pintas carregam sempre o valor completo. Se a
 * paleta falhar para alguém, o jogo continua jogável — perde-se velocidade de
 * leitura, não informação.
 */

import type { Cell } from "@dicetoseven/engine";
import { JOKER } from "@dicetoseven/engine";

export type ModoFace = "pintas" | "digitos";

/**
 * Posições das pintas na grelha 3x3, na disposição de um dado a sério.
 *
 * O 6 são duas colunas de três, e não duas linhas — é como as faces de dado
 * reais se leem, e trocá-lo torna o 6 estranho sem que se perceba porquê.
 */
const PINTAS: Readonly<Record<number, readonly string[]>> = {
  1: ["c"],
  2: ["te", "bd"],
  3: ["te", "c", "bd"],
  4: ["te", "td", "be", "bd"],
  5: ["te", "td", "c", "be", "bd"],
  6: ["te", "td", "me", "md", "be", "bd"],
};

/** Área de grelha de cada posição, em `linha / coluna`. */
const AREA: Readonly<Record<string, string>> = {
  te: "1 / 1",
  td: "1 / 3",
  me: "2 / 1",
  c: "2 / 2",
  md: "2 / 3",
  be: "3 / 1",
  bd: "3 / 3",
};

export function criarPeca(valor: Cell, modo: ModoFace): HTMLElement {
  const el = document.createElement("div");
  el.className = "peca";
  el.dataset["valor"] = String(valor);
  el.setAttribute("role", "gridcell");
  el.setAttribute(
    "aria-label",
    valor === JOKER ? "joker" : `face ${String(valor)}`,
  );

  desenharFace(el, valor, modo);
  return el;
}

/** Redesenha a face sem substituir o elemento — a identidade tem de sobreviver. */
export function desenharFace(
  el: HTMLElement,
  valor: Cell,
  modo: ModoFace,
): void {
  el.replaceChildren();

  if (valor === JOKER) {
    el.appendChild(glifo("✳"));
    return;
  }

  if (modo === "digitos") {
    el.appendChild(glifo(String(valor)));
    return;
  }

  for (const posicao of PINTAS[valor] ?? []) {
    const pinta = document.createElement("span");
    pinta.className = "pinta";
    pinta.style.gridArea = AREA[posicao] ?? "2 / 2";
    el.appendChild(pinta);
  }
}

/**
 * Uma peça **fora do tabuleiro**: na Home e no ecrã das regras.
 *
 * É a mesma peça — a mesma cor, as mesmas pintas, o mesmo rebordo — e não um
 * desenho parecido. Uma ilustração de uma peça diverge da peça no dia em que a
 * paleta mudar, e o sítio onde isso se nota é justamente o ecrã que promete
 * explicar o jogo.
 *
 * Muda duas coisas, ambas por serem mentira fora da grelha: perde o
 * `role="gridcell"`, que anunciava uma célula de uma tabela que não existe, e
 * passa a `aria-hidden` — quem ouve o ecrã recebe a explicação pelo texto ao
 * lado, que diz a mesma coisa em palavras.
 */
export function pecaDeAmostra(valor: Cell, modo: ModoFace = "pintas"): HTMLElement {
  const el = criarPeca(valor, modo);
  el.classList.add("amostra");
  el.removeAttribute("role");
  el.removeAttribute("aria-label");
  el.setAttribute("aria-hidden", "true");
  return el;
}

/**
 * O sinal pequeno que fica no canto de um joker **com valor escolhido**.
 *
 * A peça passa a mostrar as pintas do valor — é a face que ela vale nesta
 * jogada, e tem de se ler como as outras. Mas sem esta marca o jogador perdia
 * de vista qual das peças é o joker, que é a informação de que precisa para
 * saber que ainda pode mudar de ideias.
 */
export function marcaDeJoker(): HTMLElement {
  const el = document.createElement("span");
  el.className = "marca-joker";
  el.textContent = "✳";
  el.setAttribute("aria-hidden", "true");
  return el;
}

function glifo(texto: string): HTMLElement {
  const el = document.createElement("span");
  el.className = "glifo";
  el.textContent = texto;
  return el;
}
