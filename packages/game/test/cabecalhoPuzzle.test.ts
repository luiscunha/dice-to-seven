// @vitest-environment jsdom

/**
 * O cromado do ecrã de puzzle: o nome do nível, a contagem de peças, a linha da
 * soma e os três botões.
 *
 * Tudo aqui vem de playtest, e nada disto é decoração. As duas coisas que este
 * ficheiro impede de voltar:
 *
 * - **A linha da soma fora do Tutorial.** Fazia a conta que o jogo pede ao
 *   jogador. Voltar a ligá-la por omissão é desligar o puzzle.
 * - **O `id` do pack no cabeçalho.** `meio-joker-000072` não é nome de coisa, e
 *   pior, dizia ao jogador o nome de uma *banda* — que é uma receita de geração,
 *   não um sítio onde ele esteve.
 */

import { beforeEach, describe, expect, it } from "vitest";

import type { Board, Level } from "@dicetoseven/engine";
import { packed } from "@dicetoseven/engine";

import { PuzzleScreen } from "../src/ui/PuzzleScreen";
import { CAPITULOS, montarCapitulo } from "../src/capitulos";
import type { BandaNoIndice } from "../src/levels";

/** 3+4 e 2+5: duas jogadas, sem becos, e chega para tudo o que se mede aqui. */
const BOARD: Board = [[3], [4], [2], [5]];

const NIVEL: Level = {
  id: "meio-joker-000072",
  seed: 0,
  board: BOARD,
  solution: [] as never,
  metrics: {
    pieces: 4,
    survivalRate: 1,
    avgBranching: 2,
    firstFatalDepth: 0,
    solutionLength: 2,
    avgMoveDensity: 1,
    avgGroupSize: 2,
  },
};

describe("o cabeçalho do nível", () => {
  let host: HTMLElement;

  beforeEach(() => {
    host = document.createElement("div");
    document.body.replaceChildren(host);
  });

  const titulo = (): string | null =>
    host.querySelector(".topo h1")?.textContent ?? null;

  it("mostra o nome que o jogador conhece, não o id do pack", () => {
    new PuzzleScreen(host, NIVEL, { titulo: "Médio 23" });
    expect(titulo()).toBe("Médio 23");
    expect(host.textContent).not.toContain("meio-joker");
  });

  it("sem nome dado, cai no id — é melhor do que um cabeçalho vazio", () => {
    new PuzzleScreen(host, NIVEL, {});
    expect(titulo()).toBe("meio-joker-000072");
  });

  it("as peças ficam na meta, e as jogadas saíram", () => {
    new PuzzleScreen(host, NIVEL, {});
    const meta = host.querySelector(".meta");

    expect(meta?.textContent).toContain("4/4 peças");
    // A contagem de jogadas era `soma/7` outra vez: cada jogada tira exatamente
    // 7, portanto não dizia nada que as peças já não dissessem.
    expect(host.textContent).not.toContain("jogadas");
  });

  it("a contagem de peças é a última da meta — é o que a encosta à direita", () => {
    new PuzzleScreen(host, NIVEL, { mostrarSomaDasFaces: true });
    const meta = host.querySelector(".meta");
    expect(meta?.lastChild?.textContent).toContain("peças");
  });
});

describe("a linha da soma", () => {
  let host: HTMLElement;

  beforeEach(() => {
    host = document.createElement("div");
    document.body.replaceChildren(host);
  });

  const clicar = (p: number): void => {
    host
      .querySelector(`.peca[data-pos="${String(p)}"]`)
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  };

  const soma = (): HTMLElement | null => host.querySelector(".soma");

  it("no Tutorial faz a conta, que é o que um andaime serve para fazer", () => {
    new PuzzleScreen(host, NIVEL, { mostrarSoma: true });
    expect(soma()?.hidden).toBe(false);
    expect(soma()?.textContent).toContain("Toca nas peças");

    clicar(packed(0, 0));
    expect(soma()?.textContent).toContain("3");
    expect(host.querySelector(".aviso")?.textContent).toContain("faltam 4");
  });

  it("fora do Tutorial não existe — nem a conta, nem o «faltam»", () => {
    new PuzzleScreen(host, NIVEL, {});
    expect(soma()?.hidden).toBe(true);
    expect(soma()?.textContent).toBe("");

    clicar(packed(0, 0));
    expect(soma()?.textContent).toBe("");
    expect(host.querySelector(".aviso")?.textContent).toBe("");
  });

  it("**a recusa aparece sempre** — explicar não é fazer a conta", () => {
    new PuzzleScreen(host, NIVEL, {});

    // 3 + 4 = 7 fecha; para passar de 7 é preciso 4 + 5.
    clicar(packed(1, 0));
    clicar(packed(3, 0));

    expect(host.querySelector<HTMLElement>(".aviso")?.dataset["tipo"]).toBe("erro");
    expect(host.querySelector(".aviso")?.textContent).toContain("passava de 7");
  });
});

describe("os três botões", () => {
  let host: HTMLElement;

  beforeEach(() => {
    host = document.createElement("div");
    document.body.replaceChildren(host);
    new PuzzleScreen(host, NIVEL, {});
  });

  const acoes = (): HTMLElement | null => host.querySelector(".acoes-jogo");

  it("desfazer e reiniciar são ícones, e mantêm o nome onde se ouve", () => {
    const botoes = [...(host.querySelectorAll(".grupo-acoes .btn") ?? [])];
    expect(botoes.map((b) => b.getAttribute("aria-label"))).toEqual([
      "Desfazer",
      "Reiniciar",
    ]);

    for (const b of botoes) {
      // Um ícone sem nome é um botão que só quem já sabe consegue usar.
      expect(b.getAttribute("title")).toBe(b.getAttribute("aria-label"));
      expect(b.querySelector("svg.icone")).not.toBeNull();
      expect(b.textContent).toBe("");
    }
  });

  it("a dica tem lâmpada, nome e contador — é a única que gasta algo", () => {
    const dica = [...host.querySelectorAll(".btn")].find((b) =>
      b.textContent?.includes("Dica"),
    );

    expect(dica?.querySelector("svg.icone-dica")).not.toBeNull();
    expect(dica?.querySelector(".contador")?.textContent).toBe("3");
  });

  it("os dois de corrigir ficam separados da dica", () => {
    // Não é arranjo: com os três encostados, o dedo que ia ao desfazer acertava
    // na dica, que acaba.
    expect(acoes()?.children.length).toBe(2);
    expect(acoes()?.firstElementChild?.className).toBe("grupo-acoes");
  });

  it("os ícones herdam a cor, senão não seguiam o tema nem o desativado", () => {
    for (const svg of host.querySelectorAll("svg.icone")) {
      expect(svg.getAttribute("stroke")).toBe("currentColor");
      expect(svg.getAttribute("aria-hidden")).toBe("true");
    }
  });
});

/*
 * ── O Tutorial são dez níveis ──
 *
 * A banda tem 30, como todas — mas a regra aprende-se aos três, e os últimos 20
 * eram a mesma jogada repetida antes de o jogo começar. O corte é na
 * apresentação: os níveis continuam no pack, válidos, para o puzzle diário.
 */
describe("o corte do capítulo", () => {
  const banda = (id: string, quantos: number): BandaNoIndice => ({
    id,
    label: id,
    niveis: Array.from({ length: quantos }, (_, i) => ({
      id: `${id}-${String(i)}`,
      pieces: 10,
      colunas: 4,
    })),
  });

  const tutorial = CAPITULOS.find((c) => c.id === "tutorial");

  it("o Tutorial mostra dez, e a banda continua com trinta", () => {
    const bandas = [banda("tutorial", 30)];
    expect(tutorial?.maximo).toBe(10);
    expect(montarCapitulo(tutorial!, bandas)).toHaveLength(10);
  });

  it("os dez são os dez primeiros, por esta ordem", () => {
    const serie = montarCapitulo(tutorial!, [banda("tutorial", 30)]);
    expect(serie.map((n) => n.indice)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("nenhum outro capítulo corta", () => {
    for (const c of CAPITULOS.filter((c) => c.id !== "tutorial")) {
      expect(c.maximo).toBeUndefined();
    }
  });

  it("o corte é no fim, e não mexe na cadência do joker", () => {
    /*
     * Cortar a banda base antes de intercalar mudava a série: o mesmo nível
     * ficava na posição 9 num capítulo com corte e na 10 sem ele.
     */
    const bandas = [banda("meio", 30), banda("meio-joker", 30)];
    const medio = CAPITULOS.find((c) => c.id === "medio");
    const inteiro = montarCapitulo(medio!, bandas);
    const cortado = montarCapitulo({ ...medio!, maximo: 10 }, bandas);

    expect(cortado).toEqual(inteiro.slice(0, 10));
  });
});
