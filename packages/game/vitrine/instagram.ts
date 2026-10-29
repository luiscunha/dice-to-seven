/**
 * As imagens do Instagram: as capas dos destaques e as publicações.
 *
 *   instagram.html?peca=destaque&face=3
 *   instagram.html?peca=como-jogar&passo=2&lang=en
 *   instagram.html?peca=beta&lang=en
 *   instagram.html?peca=beta-story&lang=pt
 *
 * Como nas capturas das lojas, **não há desenhos parecidos com o jogo**: as
 * peças são as `pecaDeAmostra` do jogo, o tabuleiro é o `BoardView`, e o
 * telemóvel da beta mostra o ecrã de um nível verdadeiro (`ecra.html`). Quando
 * o jogo mudar de aspeto, as imagens refazem-se com ele.
 *
 * Os formatos e as razões de cada imagem estão em
 * `documentation/estrategia-instagram.md`. `capturas.mjs`, no `mobile`,
 * fotografa isto com `--so instagram`.
 */

import type { Board, Cell, Level, Packed } from "@dicetoseven/engine";
import { DEFAULT_LIMITS, applyMove, isSolvable, packed } from "@dicetoseven/engine";

import "../src/ui/theme.css";
import "../src/ui/app.css";
import "./instagram.css";

import { BoardView } from "../src/ui/BoardView";
import { pecaDeAmostra } from "../src/ui/dice";

declare global {
  interface Window {
    __pronto?: boolean;
    __instagram?: { readonly formatos: typeof FORMATOS; readonly pecas: typeof PECAS };
  }
}

/** O tamanho de cada imagem, em píxeis CSS; a escala do Chrome faz o resto. */
const FORMATOS = {
  /** Publicação e carrossel: 1080×1350 (4:5), o maior que o feed mostra. */
  publicacao: { largura: 360, altura: 450, escala: 3 },
  /** Capa de destaque: 1080×1080. O Instagram recorta-a num círculo. */
  capa: { largura: 360, altura: 360, escala: 3 },
  /**
   * Story: 1080×1920. O Instagram tapa em cima o nome da conta (os primeiros
   * ~250 px) e em baixo a barra de resposta (os últimos ~340 px): nada que
   * importe vive aí.
   */
  story: { largura: 360, altura: 640, escala: 3 },
} as const;

/**
 * As imagens que há, em que formato saem, e com que nome.
 *
 * **É a única lista**: o `capturas.mjs` lê-a de `window.__instagram` em vez de
 * ter a sua, para as duas nunca desacertarem. As capas não têm texto, e saem
 * uma vez só; as publicações saem em cada língua.
 */
const PECAS = [
  ...[1, 2, 3, 4, 5, 6].map((face) => ({
    peca: "destaque",
    formato: "capa",
    query: `face=${String(face)}`,
    ficheiro: `destaques/${String(face)}.png`,
    comLingua: false,
  })),
  ...[1, 2, 3, 4, 5].map((passo) => ({
    peca: "como-jogar",
    formato: "publicacao",
    query: `passo=${String(passo)}`,
    ficheiro: `02-como-jogar/${String(passo)}.png`,
    comLingua: true,
  })),
  { peca: "beta", formato: "publicacao", query: "", ficheiro: "03-beta.png", comLingua: true },
  { peca: "beta-story", formato: "story", query: "", ficheiro: "stories/beta.png", comLingua: true },
  ...[1, 2, 3, 4].map((passo) => ({
    peca: "puzzle",
    formato: "publicacao",
    query: `n=1&passo=${String(passo)}`,
    ficheiro: `05-puzzle-1/${String(passo)}.png`,
    comLingua: true,
  })),
] as const;

window.__instagram = { formatos: FORMATOS, pecas: PECAS };

type Lingua = "en" | "pt";

/** Os textos das imagens. As legendas vivem na estratégia, não aqui. */
const TEXTOS = {
  en: {
    passos: [
      "How to play DiceToSeven",
      "Tap dice that touch each other",
      "They must add up to exactly 7",
      "The pieces above fall. The columns slide together.",
      "Clear the board.",
    ],
    perfeito: "Perfect",
    semAjuda: "No undos, no restarts, no hints",
    beta: "Play it before anyone else",
    betaEtiqueta: "Free beta · play in your browser",
    storyTitulo: "Play the beta before anyone else",
    storyPedido: "Reply BETA to this story",
    storyNota: "I'll send you the link. Free, in your browser.",
    puzzle: (n: number) => `Puzzle #${String(n)}: can you clear this?`,
    puzzleNivel: (capitulo: string, nivel: number) => `${capitulo} · level ${String(nivel)}`,
    puzzlePresas: "of random attempts at this board get stuck.",
    puzzlePensa: "Think before you tap.",
    puzzlePrimeira: "Solution: the first move",
    puzzleResto: "And the rest, in order",
    capitulos: { inicio: "Beginner" } as Readonly<Record<string, string>>,
  },
  pt: {
    passos: [
      "Como jogar DiceToSeven",
      "Toca em dados encostados",
      "Têm de somar exatamente 7",
      "As de cima caem. As colunas encostam.",
      "Esvazia o tabuleiro.",
    ],
    perfeito: "Perfeito",
    semAjuda: "Sem desfazer, sem recomeçar, sem dicas",
    beta: "Joga antes de toda a gente",
    betaEtiqueta: "Beta grátis · joga no browser",
    storyTitulo: "Joga a beta antes de toda a gente",
    storyPedido: "Responde BETA a esta story",
    storyNota: "Envio-te a ligação. Grátis, no browser.",
    puzzle: (n: number) => `Puzzle #${String(n)}: consegues limpar isto?`,
    puzzleNivel: (capitulo: string, nivel: number) => `${capitulo} · nível ${String(nivel)}`,
    puzzlePresas: "das tentativas ao acaso neste tabuleiro ficam presas.",
    puzzlePensa: "Pensa antes de tocar.",
    puzzlePrimeira: "Solução: a primeira jogada",
    puzzleResto: "E o resto, por ordem",
    capitulos: { inicio: "Iniciado" } as Readonly<Record<string, string>>,
  },
} as const;

/*
 * ── O tabuleiro do «Como jogar» ──
 *
 * Feito à mão para a explicação, como os exemplos do ecrã «Como jogar»: as
 * seis faces à vista, e uma primeira jogada que mostra as duas regras do
 * tabuleiro de uma vez — o 2 e o 4 da coluna 1 e o 1 da coluna 2 somam 7, a
 * coluna 2 esvazia-se, o 1 de cima da coluna 1 cai, e a coluna 3 encosta.
 *
 * Nenhum nível da campanha tem uma jogada destas num tabuleiro deste tamanho:
 * procurou-se nos packs `tutorial`, `inicio` e `meio`, e só um tinha, com nove
 * peças desequilibradas. Por isso é um exemplo, e por isso é **verificado aqui
 * pelo solver**: um tabuleiro de demonstração sem solução seria a única
 * mentira possível num jogo que promete que todos os níveis a têm.
 */
const TABULEIRO: Board = [
  [6, 5, 1, 3],
  [2, 4, 1],
  [1],
  [6, 1, 1, 4],
];

/** O grupo, pela ordem em que se toca: o 2, o 4 de cima, e o 1 ao lado. */
const GRUPO: readonly Packed[] = [packed(1, 0), packed(1, 1), packed(2, 0)];

const DEPOIS = applyMove(TABULEIRO, [...GRUPO].sort((a, b) => a - b));

if (isSolvable(TABULEIRO, DEFAULT_LIMITS) !== "yes" || isSolvable(DEPOIS, DEFAULT_LIMITS) !== "yes") {
  throw new Error("o tabuleiro do «Como jogar» deixou de ter solução");
}

/*
 * ── Os puzzles da série «Consegues?» ──
 *
 * Níveis **verdadeiros** da campanha, e não exemplos: quem tiver a beta pode
 * ir jogá-los. O `nivel` é a posição dentro do capítulo, a que o jogo mostra
 * na grelha.
 *
 * O Puzzle #1 é o nível pequeno (16 peças) mais difícil do Iniciado: 44% das
 * tentativas ao acaso ficam presas, e o seguinte de 16 peças fica nos 26%.
 * Escolhido a 2026-10-29, a medir os níveis do Iniciado com até 20 peças.
 */
const PUZZLES = [{ numero: 1, banda: "inicio", id: "inicio-1002190", nivel: 21 }] as const;

/** Um nível dos packs do jogo, tal como o jogo o carrega. */
async function nivelDoPack(banda: string, id: string): Promise<Level> {
  const resposta = await fetch(new URL(`../public/levels/${banda}.json`, import.meta.url));
  const pack = (await resposta.json()) as readonly Level[];
  const nivel = pack.find((n) => n.id === id);
  if (nivel === undefined) throw new Error(`não há o nível ${id} na banda ${banda}`);
  return nivel;
}

/* ─── Montar ──────────────────────────────────────────────────────────────── */

const parametros = new URLSearchParams(location.search);
const peca = parametros.get("peca") ?? "destaque";
const lingua: Lingua = parametros.get("lang") === "pt" ? "pt" : "en";
const textos = TEXTOS[lingua];
const formato =
  peca === "destaque" ? FORMATOS.capa : peca === "beta-story" ? FORMATOS.story : FORMATOS.publicacao;

document.documentElement.lang = lingua === "pt" ? "pt-PT" : "en-GB";
document.documentElement.dataset["tema"] = "claro";

const tela = document.getElementById("tela") as HTMLElement;
tela.dataset["peca"] = peca;
tela.style.width = `${String(formato.largura)}px`;
tela.style.height = `${String(formato.altura)}px`;

const el = (tag: string, classe: string, texto?: string): HTMLElement => {
  const e = document.createElement(tag);
  e.className = classe;
  if (texto !== undefined) e.textContent = texto;
  return e;
};

/** O nome do jogo, como na Home: o «To» destacado, e uma peça no lugar do «o». */
function nome(): HTMLElement {
  const h = el("span", "nome");
  const liga = el("span", "nome-liga");
  liga.append("T", el("span", "nome-peca"), el("span", "nome-o", "o"));
  h.append("Dice", liga, "Seven");
  return h;
}

/** A assinatura no fundo de cada publicação: o ícone e o nome. */
function assinatura(): HTMLElement {
  const a = el("div", "insta-assinatura");
  const icone = document.createElement("img");
  icone.src = new URL("../public/marca/icone.svg", import.meta.url).href;
  icone.alt = "";
  a.append(icone, nome());
  return a;
}

/** Um tabuleiro do jogo, numa caixa do tamanho pedido, com as peças marcadas. */
function tabuleiro(
  board: Board,
  caixa: { largura: number; altura: number },
  marcadas: readonly Packed[] = [],
  medida: Board = board,
): HTMLElement {
  const host = el("div", "insta-palco");
  host.style.width = `${String(caixa.largura)}px`;
  host.style.height = `${String(caixa.altura)}px`;
  const vista = new BoardView(host, { aoTocar: () => undefined });
  /*
   * A peça mede-se pela `medida`, que por omissão é o próprio tabuleiro. Os
   * passos de uma solução medem-se todos pelo tabuleiro inicial, como no jogo:
   * a caixa não encolhe a meio do nível, e as peças não mudam de tamanho.
   */
  vista.dimensionarPara(medida);
  queueMicrotask(() => {
    vista.montar(board);
    vista.marcarSelecao(new Set(marcadas));
  });
  return host;
}

/** A soma em peças, como a linha da seleção do jogo: `2 + 4 = 6`. */
function soma(valores: readonly Cell[]): HTMLElement {
  const linha = el("div", "insta-conta");
  valores.forEach((v, i) => {
    if (i > 0) linha.appendChild(el("span", "insta-sinal", "+"));
    linha.appendChild(pecaDeAmostra(v));
  });
  const total = valores.reduce<number>((s, v) => s + v, 0);
  linha.append(el("span", "insta-sinal", "="), el("span", total === 7 ? "insta-total sete" : "insta-total", String(total)));
  return linha;
}

const valorEm = (p: Packed): Cell => TABULEIRO[p >> 6]?.[p & 63] ?? 0;

const PECAS_POR_PASSO: Readonly<Record<number, () => HTMLElement[]>> = {
  1: () => [tabuleiro(TABULEIRO, { largura: 300, altura: 260 })],
  2: () => [
    tabuleiro(TABULEIRO, { largura: 300, altura: 230 }, GRUPO.slice(0, 2)),
    soma(GRUPO.slice(0, 2).map(valorEm)),
  ],
  3: () => [tabuleiro(TABULEIRO, { largura: 300, altura: 230 }, GRUPO), soma(GRUPO.map(valorEm))],
  /*
   * O antes e o depois. As larguras são proporcionais às colunas (4 e 3), para
   * as peças terem o mesmo tamanho nos dois: com caixas iguais, as do depois
   * saíam maiores, e parecia que tinham mudado.
   */
  4: () => {
    const lado = el("div", "insta-antes-depois");
    lado.append(
      tabuleiro(TABULEIRO, { largura: 164, altura: 200 }, GRUPO),
      el("span", "insta-seta", "→"),
      tabuleiro(DEPOIS, { largura: 123, altura: 200 }),
    );
    return [lado];
  },
  5: () => {
    const selo = el("div", "insta-selo");
    selo.append(el("span", "insta-selo-glifo", "★"), el("span", "insta-selo-nome", textos.perfeito));
    return [selo, el("p", "insta-selo-texto", textos.semAjuda)];
  },
};

if (peca === "destaque") {
  /*
   * A capa de um destaque: uma face do dado, no centro, com folga para o
   * círculo. Os seis destaques são as seis faces — vistos lado a lado no
   * perfil, contam de 1 a 6.
   */
  const face = Math.min(6, Math.max(1, Number(parametros.get("face") ?? "1"))) as Cell;
  tela.appendChild(pecaDeAmostra(face));
} else if (peca === "como-jogar") {
  const passo = Math.min(5, Math.max(1, Number(parametros.get("passo") ?? "1")));
  tela.dataset["passo"] = String(passo);
  const titulo = el("h1", "insta-titulo", textos.passos[passo - 1]);
  const meio = el("div", "insta-meio");
  meio.append(...(PECAS_POR_PASSO[passo]?.() ?? []));
  tela.append(titulo, meio, assinatura());
} else if (peca === "beta") {
  /*
   * A chamada para a beta, que é a versão web: joga-se no browser, em qualquer
   * telemóvel ou computador. A frase, a etiqueta com o anel de luz do site, e
   * o telemóvel com a grelha de um capítulo.
   *
   * A grelha e não um nível: o telemóvel fica cortado pela margem de baixo, e
   * num nível o que se via era o espaço vazio por cima das peças, que assentam
   * no fundo do ecrã. A grelha enche o ecrã a partir de cima, e diz o que um
   * tabuleiro sozinho não diz: que há muitos níveis, e selos para ganhar. O
   * tabuleiro já está no carrossel ao lado.
   */
  const aparelho = el("div", "insta-aparelho");
  const quadro = document.createElement("iframe");
  quadro.className = "insta-ecra";
  quadro.width = "390";
  quadro.height = "844";
  quadro.src = `ecra.html?ecra=capitulo&lang=${lingua}&tema=claro`;
  aparelho.appendChild(quadro);
  tela.append(el("h1", "insta-titulo", textos.beta), el("div", "insta-etiqueta", textos.betaEtiqueta), aparelho);

  for (let i = 0; i < 300; i++) {
    if (quadro.contentWindow?.__pronto === true) break;
    await new Promise((r) => {
      setTimeout(r, 100);
    });
  }
} else if (peca === "puzzle") {
  /*
   * O pilar «Consegues?»: um nível verdadeiro da campanha, a pergunta, um
   * número em vez de uma dica, e a solução guardada no nível.
   *
   * A dica é a taxa de sobrevivência do próprio nível, a que o jogo mede (e não
   * «as primeiras jogadas que funcionam»): nos níveis do Iniciado e do Médio
   * todas as primeiras jogadas ainda têm saída, e os becos só aparecem mais à
   * frente. O número diz a verdade sobre isso sem desvendar nada.
   */
  const n = Number(parametros.get("n") ?? "1");
  const puzzle = PUZZLES.find((p) => p.numero === n);
  if (puzzle === undefined) throw new Error(`não há Puzzle #${String(n)}`);
  const nivel = await nivelDoPack(puzzle.banda, puzzle.id);

  // A solução guardada tem de esvaziar o tabuleiro, jogada a jogada.
  const estados: Board[] = [nivel.board];
  for (const g of nivel.solution) estados.push(applyMove(estados[estados.length - 1] ?? [], g));
  if ((estados[estados.length - 1] ?? [1]).length !== 0) {
    throw new Error(`a solução de ${nivel.id} não esvazia o tabuleiro`);
  }

  const passo = Math.min(4, Math.max(1, Number(parametros.get("passo") ?? "1")));
  tela.dataset["passo"] = String(passo);
  const meio = el("div", "insta-meio");
  const capitulo = textos.capitulos[puzzle.banda] ?? puzzle.banda;
  const presas = Math.round((1 - (nivel.metrics?.survivalRate ?? 1)) * 100);
  const valor = (b: Board, p: Packed): Cell => b[p >> 6]?.[p & 63] ?? 0;
  let titulo: string;

  if (passo === 1) {
    titulo = textos.puzzle(n);
    meio.append(
      tabuleiro(nivel.board, { largura: 300, altura: 250 }),
      el("p", "insta-nivel", textos.puzzleNivel(capitulo, puzzle.nivel)),
    );
  } else if (passo === 2) {
    titulo = "";
    meio.append(
      el("span", "insta-numero", `${String(presas)}%`),
      el("p", "insta-numero-texto", textos.puzzlePresas),
      el("p", "insta-numero-pensa", textos.puzzlePensa),
    );
  } else if (passo === 3) {
    titulo = textos.puzzlePrimeira;
    const primeira = nivel.solution[0] ?? [];
    meio.append(
      tabuleiro(nivel.board, { largura: 300, altura: 230 }, primeira),
      soma(primeira.map((p) => valor(nivel.board, p))),
    );
  } else {
    titulo = textos.puzzleResto;
    const grelha = el("div", "insta-passos-mini");
    nivel.solution.slice(1).forEach((g, i) => {
      const antes = estados[i + 1] ?? [];
      const item = el("div", "insta-mini");
      item.append(tabuleiro(antes, { largura: 90, altura: 90 }, g, nivel.board), el("span", "insta-mini-n", String(i + 2)));
      grelha.appendChild(item);
    });
    meio.appendChild(grelha);
  }

  if (titulo !== "") tela.appendChild(el("h1", "insta-titulo", titulo));
  tela.append(meio, assinatura());
} else if (peca === "beta-story") {
  /*
   * A Story da beta: o pedido é **responder**, e não comentar. A resposta a uma
   * Story é privada, e entre amigos comentar «BETA» à vista de todos pesava
   * mais do que o jogo valia. O ManyChat responde às respostas com a mesma
   * palavra, como responde aos comentários.
   *
   * Em fundo escuro, como o fim do Reel: na fila das Stories, que é quase toda
   * de fotografias, destaca-se. O tabuleiro é o do carrossel, com o grupo do 7
   * escolhido: a regra lê-se sem ler nada.
   */
  const meio = el("div", "insta-meio");
  meio.append(tabuleiro(TABULEIRO, { largura: 296, altura: 184 }, GRUPO), soma(GRUPO.map(valorEm)));
  const pedido = el("div", "insta-pedido");
  pedido.append(el("div", "insta-etiqueta", textos.storyPedido), el("p", "insta-nota", textos.storyNota));
  tela.append(el("h1", "insta-titulo", textos.storyTitulo), meio, pedido);
}

await document.fonts.ready;
// O tabuleiro monta-se numa microtarefa e mede-se no frame seguinte.
await new Promise((r) => {
  setTimeout(r, 400);
});
window.__pronto = true;
