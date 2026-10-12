// @vitest-environment jsdom

/**
 * `BoardView` — o tabuleiro em DOM.
 *
 * O que vale a pena testar aqui não é o aspeto: é a **identidade das peças** e o
 * que acontece quando uma jogada chega a meio de uma animação. Sem jsdom, as
 * durações do CSS não existem e resolvem a zero — o que dá exatamente o mesmo
 * caminho de código que `prefers-reduced-motion`.
 */

import { beforeEach, describe, expect, it } from "vitest";

import type { Board, Cell, Group, Packed } from "@dicetoseven/engine";
import { applyMove, boardKey, packed } from "@dicetoseven/engine";

import { BoardView } from "../src/ui/BoardView";

const TABULEIRO: Board = [
  [3, 4],
  [4, 3],
  [1, 6],
];

const grupo = (...ps: readonly Packed[]): Group =>
  [...ps].sort((a, b) => a - b) as Group;

/** O que o DOM diz que o tabuleiro é, lido só a partir dos elementos. */
function lerDoDom(host: HTMLElement): Board {
  const colunas = new Map<number, Map<number, number>>();

  for (const el of host.querySelectorAll<HTMLElement>(".peca")) {
    const c = Number(el.style.getPropertyValue("--c"));
    const r = Number(el.style.getPropertyValue("--r"));
    const v = Number(el.dataset["valor"]);

    let coluna = colunas.get(c);
    if (coluna === undefined) {
      coluna = new Map<number, number>();
      colunas.set(c, coluna);
    }
    coluna.set(r, v);
  }

  return [...colunas.keys()]
    .sort((a, b) => a - b)
    .map((c) => {
      const coluna = colunas.get(c);
      if (coluna === undefined) return [];
      return [...coluna.keys()].sort((a, b) => a - b).map((r) => {
        const v = coluna.get(r);
        return (v ?? 0) as never;
      });
    }) as Board;
}

let host: HTMLElement;
let tocadas: Packed[];

beforeEach(() => {
  document.body.replaceChildren();
  host = document.createElement("div");
  document.body.appendChild(host);
  tocadas = [];
});

const criar = (): BoardView =>
  new BoardView(host, {
    aoTocar: (p) => {
      tocadas.push(p);
    },
  });

describe("montagem", () => {
  it("cria uma peça por célula, com a face e a posição certas", () => {
    const view = criar();
    view.montar(TABULEIRO);

    expect(host.querySelectorAll(".peca")).toHaveLength(6);
    expect(boardKey(lerDoDom(host))).toBe(boardKey(TABULEIRO));

    view.destruir();
  });

  it("tocar numa peça devolve a coordenada empacotada", () => {
    const view = criar();
    view.montar(TABULEIRO);

    const alvo = host.querySelector<HTMLElement>(
      `.peca[data-pos="${String(packed(1, 1))}"]`,
    );
    expect(alvo).not.toBeNull();
    alvo?.click();

    expect(tocadas).toEqual([packed(1, 1)]);

    view.destruir();
  });
});

describe("a jogada", () => {
  it("deixa o DOM exatamente no estado de applyMove", async () => {
    const view = criar();
    view.montar(TABULEIRO);

    // a0 = 3 e b0 = 4, lado a lado na base.
    const g = grupo(packed(0, 0), packed(1, 0));
    await view.aplicarJogada(g);

    expect(boardKey(lerDoDom(host))).toBe(boardKey(applyMove(TABULEIRO, g)));
    expect(host.querySelectorAll(".peca")).toHaveLength(4);

    view.destruir();
  });

  /*
   * A propriedade que interessa: **a peça é o mesmo nó do DOM antes e depois**.
   * Se a jogada recriasse elementos, não haveria nada para animar — e o
   * tabuleiro passaria a piscar de um estado para o outro.
   */
  it("mantém o mesmo elemento para a peça que se moveu", async () => {
    const view = criar();
    view.montar(TABULEIRO);

    const antes = host.querySelector<HTMLElement>(
      `.peca[data-pos="${String(packed(0, 1))}"]`,
    );

    await view.aplicarJogada(grupo(packed(0, 0), packed(1, 0)));

    const depois = host.querySelector<HTMLElement>(
      `.peca[data-pos="${String(packed(0, 0))}"]`,
    );

    expect(antes).not.toBeNull();
    expect(depois).toBe(antes);

    view.destruir();
  });

  it("uma coluna inteira eliminada desaparece do DOM", async () => {
    const view = criar();
    view.montar(TABULEIRO);

    // A coluna c inteira: 1 + 6 = 7.
    await view.aplicarJogada(grupo(packed(2, 0), packed(2, 1)));

    expect(host.querySelectorAll(".peca")).toHaveLength(4);
    expect(
      host.querySelector(`.peca[data-pos="${String(packed(2, 0))}"]`),
    ).toBeNull();

    view.destruir();
  });

  /*
   * O defeito que esta estrutura existe para evitar: se o estado lógico só
   * avançasse no fim da animação, a jogada seguinte calcularia a transição
   * contra um tabuleiro que já não existe.
   */
  it("duas jogadas seguidas não se atropelam", async () => {
    const view = criar();
    view.montar(TABULEIRO);

    const primeira = grupo(packed(0, 0), packed(1, 0));
    const p1 = view.aplicarJogada(primeira);

    const meio = applyMove(TABULEIRO, primeira);
    expect(boardKey(view.tabuleiro)).toBe(boardKey(meio));

    // Sem esperar pela primeira: o tabuleiro já é o de depois dela.
    const segunda = grupo(packed(0, 0), packed(1, 0)); // 4 + 3 = 7
    const p2 = view.aplicarJogada(segunda);

    await Promise.all([p1, p2]);

    const fim = applyMove(meio, segunda);
    expect(boardKey(view.tabuleiro)).toBe(boardKey(fim));
    expect(boardKey(lerDoDom(host))).toBe(boardKey(fim));

    view.destruir();
  });
});

describe("seleção e sugestão", () => {
  it("marca e desmarca as peças selecionadas", () => {
    const view = criar();
    view.montar(TABULEIRO);

    view.marcarSelecao(new Set([packed(0, 0), packed(1, 0)]));
    expect(host.querySelectorAll(".peca.selecionada")).toHaveLength(2);

    view.marcarSelecao(new Set());
    expect(host.querySelectorAll(".peca.selecionada")).toHaveLength(0);

    view.destruir();
  });

  it("a sugestão da dica substitui a anterior", () => {
    const view = criar();
    view.montar(TABULEIRO);

    view.marcarSugestao([packed(0, 0)]);
    expect(host.querySelectorAll(".peca.sugerida")).toHaveLength(1);

    view.marcarSugestao([packed(1, 0), packed(1, 1)]);
    expect(host.querySelectorAll(".peca.sugerida")).toHaveLength(2);

    view.marcarSugestao(undefined);
    expect(host.querySelectorAll(".peca.sugerida")).toHaveLength(0);

    view.destruir();
  });
});

describe("faces", () => {
  it("as pintas são o padrão, e os dígitos uma alternativa", () => {
    const view = criar();
    view.montar([[6]] as Board);

    expect(host.querySelectorAll(".pinta")).toHaveLength(6);

    view.trocarModoFace("digitos");
    expect(host.querySelectorAll(".pinta")).toHaveLength(0);
    expect(host.querySelector(".glifo")?.textContent).toBe("6");

    view.destruir();
  });

  it("o joker tem glifo próprio e nunca pintas", () => {
    const view = criar();
    view.montar([[0]] as Board);

    expect(host.querySelectorAll(".pinta")).toHaveLength(0);
    expect(host.querySelector(".peca")?.getAttribute("aria-label")).toBe(
      "joker",
    );

    view.destruir();
  });
});

/* ─── Dimensionamento ───────────────────────────────────────────────────────
 *
 * O tabuleiro nunca pode sair da bandeja. É um defeito que só aparece em ecrãs
 * baixos — num 7×7 a 1080×610 o palco tem 394px de altura e só 354 de espaço
 * útil, e as peças transbordavam 19px por cima e por baixo.
 *
 * A causa era `getBoundingClientRect` devolver a caixa de **bordo**, com o
 * padding lá dentro, e o cálculo dividir o tabuleiro por ela.
 */

describe("dimensionamento", () => {
  /** jsdom não faz layout: a caixa e o padding entram à mão. */
  const palcoDe = (largura: number, altura: number, padding: number): HTMLElement => {
    const el = document.createElement("div");
    el.style.padding = `${String(padding)}px`;
    el.getBoundingClientRect = () =>
      ({ width: largura, height: altura, top: 0, left: 0, right: largura, bottom: altura, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;

    document.body.appendChild(el);
    return el;
  };

  const ladoDe = (view: BoardView, palco: HTMLElement): number => {
    view.redimensionar();
    const grelha = palco.querySelector<HTMLElement>(".tabuleiro");
    return Number.parseFloat(grelha?.style.getPropertyValue("--lado") ?? "0");
  };

  /** Um tabuleiro cheio de `n` colunas por `n` linhas — o caso do `perito` 7×7. */
  const quadrado = (n: number): Board =>
    Array.from({ length: n }, () => Array.from({ length: n }, () => 1 as const));

  it("o tabuleiro cabe no espaço útil, e não na caixa com padding", () => {
    const padding = 20;
    const palco = palcoDe(888, 394, padding);

    const view = new BoardView(palco, { aoTocar: () => undefined });
    view.dimensionarPara(quadrado(7));
    view.montar(quadrado(7));

    const lado = ladoDe(view, palco);
    const gap = 0; // sem folha de estilos, `--gap-peca` resolve a zero
    const alturaDaGrelha = 7 * (lado + gap) - gap;

    expect(alturaDaGrelha).toBeLessThanOrEqual(394 - padding * 2);

    view.destruir();
  });

  it("sem padding, aproveita a caixa toda", () => {
    const semPadding = palcoDe(888, 394, 0);
    const comPadding = palcoDe(888, 394, 20);

    const a = new BoardView(semPadding, { aoTocar: () => undefined });
    a.dimensionarPara(quadrado(7));
    a.montar(quadrado(7));

    const b = new BoardView(comPadding, { aoTocar: () => undefined });
    b.dimensionarPara(quadrado(7));
    b.montar(quadrado(7));

    // A diferença é exatamente o padding vertical repartido pelas sete linhas.
    expect(ladoDe(a, semPadding)).toBeGreaterThan(ladoDe(b, comPadding));

    a.destruir();
    b.destruir();
  });

  it("nunca passa do lado máximo, por muito espaço que haja", () => {
    const palco = palcoDe(2000, 2000, 20);

    const view = new BoardView(palco, { aoTocar: () => undefined });
    view.dimensionarPara(quadrado(3));
    view.montar(quadrado(3));

    expect(ladoDe(view, palco)).toBeLessThanOrEqual(72);

    view.destruir();
  });
});

/*
 * ── O joker com valor escolhido ──
 *
 * Mostrava o valor em **dígito**, posto por CSS com `content: attr(...)`. Num
 * jogo em que as pintas são a identidade e os dígitos são uma definição que o
 * jogador escolhe, o joker era a única peça que não respeitava nem uma coisa
 * nem outra: aparecia em número mesmo para quem joga com pintas.
 */
describe("o joker mostra a face do valor que toma", () => {
  /*
   *   r0  ✳  4
   *       c0 c1
   */
  const COM_JOKER: Board = [[0], [4]];
  const JOKER = packed(0, 0);

  let host: HTMLElement;

  beforeEach(() => {
    document.body.replaceChildren();
    host = document.createElement("div");
    document.body.appendChild(host);
  });

  const pecaDoJoker = (): HTMLElement =>
    host.querySelector(`.peca[data-pos="${String(JOKER)}"]`) as HTMLElement;

  it("sem valor escolhido é o ✳, e mais nada", () => {
    const view = new BoardView(host, { aoTocar: () => undefined });
    view.montar(COM_JOKER);

    const el = pecaDoJoker();
    expect(el.querySelectorAll(".glifo")).toHaveLength(1);
    expect(el.textContent).toBe("✳");
    expect(el.querySelectorAll(".pinta")).toHaveLength(0);

    view.destruir();
  });

  it("com valor escolhido são **pintas**, tantas quantas o valor", () => {
    const view = new BoardView(host, { aoTocar: () => undefined });
    view.montar(COM_JOKER);
    view.marcarJoker(JOKER, 3);

    const el = pecaDoJoker();
    expect(el.querySelectorAll(".pinta")).toHaveLength(3);
    expect(el.querySelectorAll(".glifo")).toHaveLength(0);

    // E continua a ser o joker: a cor da peça vem daqui.
    expect(el.dataset["valor"]).toBe("0");

    view.destruir();
  });

  it("fica um ✳ pequeno no canto — é o que diz qual das peças é o joker", () => {
    const view = new BoardView(host, { aoTocar: () => undefined });
    view.montar(COM_JOKER);
    view.marcarJoker(JOKER, 5);

    const marca = pecaDoJoker().querySelector(".marca-joker");
    expect(marca?.textContent).toBe("✳");

    view.destruir();
  });

  it("desfazer a escolha devolve o ✳ grande", () => {
    const view = new BoardView(host, { aoTocar: () => undefined });
    view.montar(COM_JOKER);

    view.marcarJoker(JOKER, 2);
    view.marcarJoker(undefined, undefined);

    const el = pecaDoJoker();
    expect(el.textContent).toBe("✳");
    expect(el.querySelectorAll(".pinta")).toHaveLength(0);
    expect(el.querySelectorAll(".marca-joker")).toHaveLength(0);

    view.destruir();
  });

  it("mudar de valor troca as pintas, e não as acumula", () => {
    const view = new BoardView(host, { aoTocar: () => undefined });
    view.montar(COM_JOKER);

    view.marcarJoker(JOKER, 6);
    view.marcarJoker(JOKER, 1);

    expect(pecaDoJoker().querySelectorAll(".pinta")).toHaveLength(1);

    view.destruir();
  });

  it("as outras peças não são redesenhadas", () => {
    const view = new BoardView(host, { aoTocar: () => undefined });
    view.montar(COM_JOKER);

    const quatro = host.querySelector(
      `.peca[data-pos="${String(packed(1, 0))}"]`,
    ) as HTMLElement;
    const antes = quatro.innerHTML;

    view.marcarJoker(JOKER, 3);
    view.marcarJoker(undefined, undefined);

    expect(quatro.innerHTML).toBe(antes);

    view.destruir();
  });
});

describe("a peça-bomba", () => {
  const peca = (p: Packed): HTMLElement =>
    host.querySelector(`.peca[data-pos="${String(p)}"]`) as HTMLElement;

  it("pendura o pavio na peça, com os segundos que faltam", () => {
    const view = criar();
    view.montar(TABULEIRO);

    view.marcarBomba(packed(1, 1), 0.5, 3);

    const el = peca(packed(1, 1));
    expect(el.classList.contains("bomba")).toBe(true);
    expect(el.querySelector(".pavio")?.textContent).toBe("3");
    expect(el.style.getPropertyValue("--pavio")).toBe("0.500");
    expect(el.getAttribute("aria-label")).toBe("face 3, bomba");

    view.destruir();
  });

  it("só há um pavio, e mudar de peça leva-o consigo", () => {
    const view = criar();
    view.montar(TABULEIRO);

    view.marcarBomba(packed(1, 1), 1, 6);
    view.marcarBomba(packed(0, 0), 1, 6);

    expect(host.querySelectorAll(".pavio")).toHaveLength(1);
    expect(host.querySelectorAll(".peca.bomba")).toHaveLength(1);
    expect(peca(packed(1, 1)).getAttribute("aria-label")).toBe("face 3");

    view.destruir();
  });

  /*
   * A bomba vive no elemento, e o elemento é o mesmo antes e depois da jogada.
   * Tirar o 3 e o 4 de baixo faz o 4 de cima descer — e o pavio desce com ele.
   */
  it("o pavio cai com a peça na gravidade", async () => {
    const view = criar();
    view.montar(TABULEIRO);
    view.marcarBomba(packed(0, 1), 1, 6);
    const el = peca(packed(0, 1));

    await view.aplicarJogada(grupo(packed(0, 0), packed(1, 0)));
    view.marcarBomba(packed(0, 0), 0.9, 6);

    expect(peca(packed(0, 0))).toBe(el);
    expect(el.classList.contains("bomba")).toBe(true);
    expect(host.querySelectorAll(".pavio")).toHaveLength(1);

    view.destruir();
  });

  it("no último terço do pavio, a peça avisa que vai já", () => {
    const view = criar();
    view.montar(TABULEIRO);

    view.marcarBomba(packed(0, 0), 0.5, 3);
    expect(peca(packed(0, 0)).classList.contains("a-rebentar")).toBe(false);

    view.marcarBomba(packed(0, 0), 0.3, 2);
    expect(peca(packed(0, 0)).classList.contains("a-rebentar")).toBe(true);

    view.destruir();
  });

  it("rebentar tira o pavio e deixa a peça, a estalar", () => {
    const view = criar();
    view.montar(TABULEIRO);
    view.marcarBomba(packed(2, 1), 0.1, 1);

    view.rebentarBomba(packed(2, 1));

    const el = peca(packed(2, 1));
    expect(el.dataset["valor"]).toBe("6");
    expect(el.classList.contains("bomba")).toBe(false);
    expect(el.classList.contains("rebentou")).toBe(true);
    expect(host.querySelector(".pavio")).toBeNull();
    expect(host.querySelector(".tabuleiro")?.classList.contains("abanao")).toBe(true);

    view.destruir();
  });

  it("aquecer muda a face das peças ali mesmo, com um clarão", () => {
    const view = criar();
    view.montar(TABULEIRO);
    const antes = peca(packed(0, 0));
    const valor = Number(antes.dataset["valor"]);
    const depois = TABULEIRO.map((col, c) =>
      col.map((v, r) => (c === 0 && r === 0 ? ((v + 1) as Cell) : v)),
    );

    view.aquecerPecas(depois, [packed(0, 0)]);

    const el = peca(packed(0, 0));
    // A mesma peça, e não uma nova: muda à vista, no sítio.
    expect(el).toBe(antes);
    expect(el.dataset["valor"]).toBe(String(valor + 1));
    expect(el.getAttribute("aria-label")).toBe(`face ${String(valor + 1)}`);
    expect(el.classList.contains("aquecida")).toBe(true);

    view.destruir();
  });

  it("um tabuleiro novo não herda a bomba do anterior", () => {
    const view = criar();
    view.montar(TABULEIRO);
    view.marcarBomba(packed(0, 0), 1, 6);

    view.montar(TABULEIRO);

    expect(host.querySelector(".peca.bomba")).toBeNull();

    view.destruir();
  });
});

describe("o laser do teto", () => {
  const laser = (): HTMLElement | null => host.querySelector(".tabuleiro .linha-fogo");

  it("tem os dois emissores, o feixe, os arcos e as faíscas", () => {
    const view = criar();
    view.montar(TABULEIRO);
    view.marcarTeto("critico");

    const el = laser();
    expect(el?.dataset["grau"]).toBe("critico");
    expect(el?.querySelectorAll(".laser-emissor")).toHaveLength(2);
    expect(el?.querySelector(".laser-emissor.esquerda")).not.toBeNull();
    expect(el?.querySelector(".laser-emissor.direita")).not.toBeNull();
    expect(el?.querySelectorAll(".laser-feixe")).toHaveLength(1);
    expect(el?.querySelectorAll(".laser-arcos path")).toHaveLength(3);
    expect(el?.querySelectorAll(".laser-faiscas i").length).toBeGreaterThan(0);

    view.destruir();
  });

  /*
   * O grau muda muitas vezes durante uma corrida — a cada linha que cai e a
   * cada jogada que abre espaço. Mudar de grau é mudar um atributo; montar o
   * laser outra vez a cada mudança era refazer o SVG a cada jogada.
   */
  it("monta-se uma vez: mudar de grau não o refaz", () => {
    const view = criar();
    view.montar(TABULEIRO);
    view.marcarTeto("folgado");
    const antes = laser();

    view.marcarTeto("aviso");
    view.marcarTeto("critico");
    view.montar(TABULEIRO);
    view.marcarTeto("critico");

    expect(laser()).toBe(antes);
    expect(host.querySelectorAll(".linha-fogo")).toHaveLength(1);

    view.destruir();
  });

  it("os arcos são sempre os mesmos desenhos", () => {
    const desenhos = (): string[] =>
      [...(laser()?.querySelectorAll(".laser-arcos path") ?? [])].map(
        (p) => p.getAttribute("d") ?? "",
      );

    const a = criar();
    a.montar(TABULEIRO);
    a.marcarTeto("critico");
    const primeiros = desenhos();
    a.destruir();

    const b = criar();
    b.montar(TABULEIRO);
    b.marcarTeto("critico");

    expect(desenhos()).toEqual(primeiros);
    // E três desenhos diferentes: um repetido não crepitava, piscava.
    expect(new Set(primeiros).size).toBe(3);

    b.destruir();
  });

  it("escondido, sai do tabuleiro", () => {
    const view = criar();
    view.montar(TABULEIRO);
    view.marcarTeto("aviso");
    view.marcarTeto("escondido");

    expect(laser()).toBeNull();

    view.destruir();
  });
});

describe("a caixa com teto (Survival)", () => {
  /** jsdom não faz layout: a caixa entra à mão, como em «dimensionamento». */
  const palcoDe = (largura: number, altura: number): HTMLElement => {
    const el = document.createElement("div");
    el.getBoundingClientRect = () =>
      ({ width: largura, height: altura, top: 0, left: 0, right: largura, bottom: altura, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
    document.body.appendChild(el);
    return el;
  };

  const colunas = (n: number, alturas: readonly number[]): Board =>
    Array.from({ length: n }, (_, c) =>
      Array.from({ length: alturas[c] ?? 1 }, () => 1 as const),
    );

  /** A caixa do Survival: duas colunas, sete linhas até ao teto. */
  const TETO = colunas(2, [7, 7]);
  /** Uma coluna passou o teto. */
  const PASSOU = colunas(2, [8, 7]);

  const altura = (palco: HTMLElement): string =>
    palco.querySelector<HTMLElement>(".tabuleiro")?.style.height ?? "";

  /*
   * Era o defeito: a linha que transbordava fazia a caixa crescer, o laser —
   * que vive no topo dela — subia, e só na pintura seguinte voltava ao sítio.
   */
  it("**a caixa não cresce quando uma linha passa o teto**", async () => {
    const palco = palcoDe(400, 800);
    const view = new BoardView(palco, { aoTocar: () => undefined });
    view.dimensionarPara(TETO, { teto: true });
    view.montar(colunas(2, [6, 7]));
    const antes = altura(palco);

    await view.injetarLinha(PASSOU);
    expect(altura(palco)).toBe(antes);

    view.montar(PASSOU);
    expect(altura(palco)).toBe(antes);

    view.destruir();
  });

  it("sem teto, a caixa cresce como sempre cresceu", () => {
    const palco = palcoDe(400, 800);
    const view = new BoardView(palco, { aoTocar: () => undefined });
    view.dimensionarPara(TETO);
    view.montar(TETO);
    const antes = altura(palco);

    view.montar(PASSOU);
    expect(altura(palco)).not.toBe(antes);

    view.destruir();
  });

  it("**queima só as peças que passaram o teto**, e o laser acusa o golpe", () => {
    const palco = palcoDe(400, 800);
    const view = new BoardView(palco, { aoTocar: () => undefined });
    view.dimensionarPara(TETO, { teto: true });
    view.montar(PASSOU);
    view.marcarTeto("critico");

    expect(view.queimarAcimaDoTeto()).toBe(1);

    const queimadas = [...palco.querySelectorAll<HTMLElement>(".peca.queimada")];
    expect(queimadas.map((el) => el.dataset["pos"])).toEqual([String(packed(0, 7))]);
    expect(palco.querySelector(".linha-fogo")?.classList.contains("atingido")).toBe(true);

    view.destruir();
  });

  it("sem nada acima do teto, não queima nada", () => {
    const palco = palcoDe(400, 800);
    const view = new BoardView(palco, { aoTocar: () => undefined });
    view.dimensionarPara(TETO, { teto: true });
    view.montar(TETO);
    view.marcarTeto("critico");

    expect(view.queimarAcimaDoTeto()).toBe(0);
    expect(palco.querySelector(".linha-fogo")?.classList.contains("atingido")).toBe(false);

    view.destruir();
  });
});
