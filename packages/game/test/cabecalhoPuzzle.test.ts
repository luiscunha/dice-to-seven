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
 * ── Sem Tutorial, e o andaime no Iniciado ──
 *
 * O Tutorial saiu da campanha: ninguém o jogava, e o Iniciado mais o Como jogar
 * ensinam o mesmo. A linha da soma, que era o andaime dele, passou para os
 * primeiros níveis do Iniciado — onde todo o jogador novo começa agora.
 */
describe("o primeiro capítulo", () => {
  const banda = (id: string, quantos: number): BandaNoIndice => ({
    id,
    label: id,
    niveis: Array.from({ length: quantos }, (_, i) => ({
      id: `${id}-${String(i)}`,
      pieces: 10,
      colunas: 4,
    })),
  });

  it("é o Iniciado, e nenhum capítulo é a banda do tutorial", () => {
    expect(CAPITULOS[0]?.id).toBe("iniciado");
    expect(CAPITULOS.some((c) => c.base === "tutorial")).toBe(false);
  });

  it("os três primeiros níveis do Iniciado mostram a soma, e mais nenhum", () => {
    expect(CAPITULOS[0]?.niveisComSoma).toBe(3);
    for (const c of CAPITULOS.slice(1)) {
      expect(c.niveisComSoma).toBeUndefined();
    }
  });

  it("o Iniciado mostra a banda inteira, sem corte", () => {
    const iniciado = CAPITULOS[0]!;
    expect(montarCapitulo(iniciado, [banda("inicio", 30)])).toHaveLength(30);
  });
});
