// @vitest-environment jsdom

/**
 * A experiência de jogo, fora das regras: sair, voltar, acabar, jogar por
 * teclado, e saber onde se ia.
 *
 * Nada disto muda o que o jogo é — muda o que custa um toque no sítio errado.
 * Cada caso aqui veio da auditoria de UX/UI, e cada um é um defeito que não se
 * via em nenhum teste de regras:
 *
 * - **Sair de um nível a meio não perguntava**, e o reiniciar ao lado, que
 *   perde exatamente o mesmo, perguntava.
 * - **O botão «para trás» do Android** saía do nível com o seletor do joker
 *   aberto, e saía do Contra-Relógio sem gravar a corrida.
 * - **O resultado aparecia no rodapé**, com o palco vazio por cima.
 * - **O placar do Contra-Relógio lia-se «0 pontos0 tabuleiros».**
 * - **O tabuleiro não se jogava por teclado.**
 * - **A grelha não dizia qual era o nível seguinte.**
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Board, Level } from "@dicetoseven/engine";
import { JOKER, packed } from "@dicetoseven/engine";

import { capituloPorId } from "../src/capitulos";
import { emptyProfile } from "../src/session/progress";
import type { Profile } from "../src/session/progress";
import { HomeScreen } from "../src/ui/HomeScreen";
import { NiveisScreen } from "../src/ui/NiveisScreen";
import { PuzzleScreen } from "../src/ui/PuzzleScreen";
import { TimeAttackScreen } from "../src/ui/TimeAttackScreen";

/** 3+4 e 2+5: duas jogadas, sem becos. */
const BOARD: Board = [[3], [4], [2], [5]];

const NIVEL: Level = { id: "meio-000001", seed: 0, board: BOARD, solution: [] };

/** O mesmo, com um joker no lugar do 2: o joker vale 2. */
const COM_JOKER: Level = {
  id: "meio-joker-000001",
  seed: 0,
  board: [[3], [4], [JOKER], [5]],
  solution: [],
  joker: { at: [2, 0], trueValue: 2 },
};

let host: HTMLElement;

beforeEach(() => {
  document.body.replaceChildren();
  host = document.createElement("div");
  document.body.appendChild(host);
});

const clicar = (p: number): void => {
  host
    .querySelector(`.peca[data-pos="${String(p)}"]`)
    ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
};

const assentar = (): Promise<void> =>
  new Promise((r) => {
    setTimeout(r, 0);
  });

const confirmacao = (): HTMLDialogElement | null =>
  host.querySelector("dialog.confirmacao");

const botaoComTexto = (
  raiz: ParentNode,
  texto: string,
): HTMLButtonElement | undefined =>
  [...raiz.querySelectorAll<HTMLButtonElement>("button")].find(
    (b) => b.textContent === texto,
  );

/* ─── Sair de um nível ──────────────────────────────────────────────────── */

describe("sair de um nível", () => {
  let saiu = 0;
  let ecra: PuzzleScreen | undefined;

  const abrir = (level: Level = NIVEL): PuzzleScreen =>
    new PuzzleScreen(host, level, {
      aoVoltar: () => {
        saiu++;
      },
    });

  const seta = (): HTMLElement | null =>
    host.querySelector('.topo [aria-label="voltar à lista"]');

  beforeEach(() => {
    saiu = 0;
  });

  afterEach(() => {
    ecra?.destruir();
    ecra = undefined;
  });

  it("sem jogadas feitas, a seta sai logo — não há nada a perder", () => {
    ecra = abrir();
    seta()?.click();

    expect(saiu).toBe(1);
    expect(confirmacao()).toBeNull();
  });

  it("com uma jogada feita, pergunta antes — como o reiniciar", async () => {
    ecra = abrir();
    clicar(packed(0, 0));
    clicar(packed(1, 0)); // 3 + 4
    await assentar();

    seta()?.click();
    expect(saiu).toBe(0);
    expect(confirmacao()?.textContent).toContain("Sair do nível?");

    const caixa = confirmacao();
    if (caixa !== null) botaoComTexto(caixa, "Sair")?.click();
    expect(saiu).toBe(1);
  });

  it("o botão «para trás» do Android faz a mesma pergunta", async () => {
    ecra = abrir();
    clicar(packed(0, 0));
    clicar(packed(1, 0));
    await assentar();

    // `true`: o ecrã tratou do gesto, e a navegação não acontece.
    expect(ecra.interceptarVoltar()).toBe(true);
    expect(saiu).toBe(0);
    expect(confirmacao()).not.toBeNull();
  });

  it("sem nada a perder, o «para trás» deixa navegar", () => {
    ecra = abrir();
    expect(ecra.interceptarVoltar()).toBe(false);
    expect(confirmacao()).toBeNull();
  });

  it("com o seletor do joker aberto, o «para trás» fecha-o e fica", () => {
    ecra = abrir(COM_JOKER);

    // jsdom não tem layout, mas a caixa da peça existe e o seletor abre.
    clicar(packed(2, 0));
    const seletor = host.querySelector<HTMLElement>(".joker-picker");
    expect(seletor?.hidden).toBe(false);

    expect(ecra.interceptarVoltar()).toBe(true);
    expect(seletor?.hidden).toBe(true);
    expect(saiu).toBe(0);
  });
});

/* ─── O fim do nível ────────────────────────────────────────────────────── */

describe("o fim do nível", () => {
  let ecra: PuzzleScreen | undefined;
  let seguinte = 0;

  const acabar = async (): Promise<void> => {
    clicar(packed(0, 0));
    clicar(packed(1, 0)); // 3 + 4 → sobram [[2], [5]]
    await assentar();
    clicar(packed(0, 0));
    clicar(packed(1, 0)); // 2 + 5
    await assentar();
  };

  beforeEach(() => {
    seguinte = 0;
    ecra = new PuzzleScreen(host, NIVEL, {
      aoPedirSeguinte: () => {
        seguinte++;
      },
      aoVoltar: () => undefined,
    });
  });

  afterEach(() => {
    ecra?.destruir();
    ecra = undefined;
  });

  it("aparece no palco, onde o olho está, e não no rodapé", async () => {
    await acabar();

    const fim = host.querySelector<HTMLElement>(".fim");
    expect(fim?.hidden).toBe(false);
    expect(fim?.parentElement?.classList.contains("palco")).toBe(true);
    expect(host.querySelector(".rodape .fim")).toBeNull();
  });

  it("leva o glifo do selo, o mesmo da grelha", async () => {
    await acabar();

    expect(host.querySelector(".fim .selo")?.textContent).toBe("Perfeito");
    expect(host.querySelector(".fim-glifo")?.textContent).toBe("★");
  });

  it("tem o seguinte como ação principal, e o repetir ao lado", async () => {
    await acabar();

    const fim = host.querySelector<HTMLElement>(".fim");
    const principal = fim?.querySelector<HTMLButtonElement>(".btn.primario");
    expect(principal?.textContent).toBe("Nível seguinte");

    principal?.click();
    expect(seguinte).toBe(1);
  });

  it("repetir recomeça sem perguntar — o resultado já está gravado", async () => {
    await acabar();

    const fim = host.querySelector<HTMLElement>(".fim");
    if (fim !== null) botaoComTexto(fim, "Repetir")?.click();

    expect(confirmacao()).toBeNull();
    expect(fim?.hidden).toBe(true);
    expect(host.querySelectorAll(".tabuleiro .peca").length).toBe(4);
  });

  it("repetir é uma tentativa nova: o «Perfeito» volta a estar em jogo", async () => {
    // Uma jogada desfeita tira o perfeito a esta tentativa.
    clicar(packed(0, 0));
    clicar(packed(1, 0));
    await assentar();
    host.querySelector<HTMLButtonElement>('[aria-label="Desfazer"]')?.click();
    await acabar();
    expect(host.querySelector(".fim .selo")?.textContent).toBe("Concluído");

    const fim = host.querySelector<HTMLElement>(".fim");
    if (fim !== null) botaoComTexto(fim, "Repetir")?.click();
    await acabar();

    // Era o defeito: repetir contava como reinício, e uma partida perfeita
    // voltava a dar «Concluído».
    expect(host.querySelector(".fim .selo")?.textContent).toBe("Perfeito");
  });

  it("o convite a tocar em peças sai quando o nível acaba", async () => {
    await acabar();
    expect(host.querySelector<HTMLElement>(".ecra")?.dataset["estado"]).toBe("fim");
    expect(host.querySelector(".palco")?.classList.contains("terminado")).toBe(true);
  });

  it("um nível acabado deixa sair sem perguntar", async () => {
    await acabar();
    expect(ecra?.interceptarVoltar()).toBe(false);
  });

  /*
   * O painel abre **no palco**, e os botões de corrigir ficam por baixo dele.
   * Vivos, davam para clicar por trás da caixa de resultado: desfazer desfazia
   * a vitória que o painel estava a anunciar, e reiniciar deitava fora a
   * partida que ele estava a mostrar.
   */
  it("com o nível ganho, os botões de corrigir ficam desativados", async () => {
    await acabar();

    const botoes = [
      ...host.querySelectorAll<HTMLButtonElement>(".acoes-jogo .btn"),
    ];

    expect(botoes.length).toBe(3);
    expect(botoes.map((b) => b.disabled)).toEqual([true, true, true]);
  });
});

/* ─── Contra-Relógio ────────────────────────────────────────────────────── */

describe("o Contra-Relógio", () => {
  let ecra: TimeAttackScreen | undefined;
  let recomecou = 0;

  const nivel: Level = {
    id: "tempo-1",
    seed: 0,
    board: [
      [3, 4],
      [4, 3],
    ],
    solution: [],
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    recomecou = 0;
    ecra = new TimeAttackScreen(host, {
      niveis: [nivel],
      melhorPontuacao: 0,
      tempoInicial: 30,
      aoTerminar: () => undefined,
      aoSair: () => undefined,
      aoRecomecar: () => {
        recomecou++;
      },
    });
  });

  afterEach(() => {
    ecra?.destruir();
    ecra = undefined;
    vi.useRealTimers();
  });

  it("o placar tem as duas contagens separadas, não «0 pontos0 tabuleiros»", () => {
    const entradas = [...(host.querySelector(".meta")?.children ?? [])].map(
      (e) => e.textContent,
    );
    expect(entradas).toEqual(["0 pontos", "0 tabuleiros"]);
  });

  it("o «para trás» do Android pergunta, como a seta", () => {
    expect(ecra?.interceptarVoltar()).toBe(true);
    expect(confirmacao()?.textContent).toContain("Sair da corrida?");
  });

  /*
   * O rodapé tinha uma coisa só — a soma corrente, «Toca nas peças para somar
   * 7» — e era andaime a mais num modo contra o relógio: a conta está nas peças
   * acesas. Sem ele o elemento ficava vazio a ocupar uma linha da grelha, e na
   * composição deitada uma calha inteira. Sai o rodapé, e o palco fica com o
   * espaço.
   */
  it("não tem rodapé: a soma corrente saiu, e o palco ficou com o espaço", () => {
    expect(host.querySelector(".ecra.tempo .rodape")).toBeNull();
    expect(host.querySelector(".ecra.tempo .soma")).toBeNull();
  });

  it("no fim oferece outra corrida, e deixa sair sem perguntar", () => {
    vi.advanceTimersByTime(31_000);

    const fim = host.querySelector<HTMLElement>(".fim");
    expect(fim?.parentElement?.classList.contains("palco")).toBe(true);

    if (fim !== null) botaoComTexto(fim, "Jogar outra vez")?.click();
    expect(recomecou).toBe(1);
    expect(ecra?.interceptarVoltar()).toBe(false);
  });
});

/* ─── Teclado ───────────────────────────────────────────────────────────── */

describe("o tabuleiro por teclado", () => {
  let ecra: PuzzleScreen | undefined;

  const grelha = (): HTMLElement | null => host.querySelector(".tabuleiro");

  const tecla = (key: string): void => {
    grelha()?.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  };

  const cursor = (): string | undefined =>
    host.querySelector<HTMLElement>(".peca.cursor")?.dataset["pos"];

  beforeEach(() => {
    ecra = new PuzzleScreen(host, NIVEL, {});
  });

  afterEach(() => {
    ecra?.destruir();
    ecra = undefined;
  });

  it("é um só ponto de tabulação, e o foco põe o cursor na primeira peça", () => {
    expect(grelha()?.tabIndex).toBe(0);
    grelha()?.focus();

    expect(cursor()).toBe(String(packed(0, 0)));
    expect(grelha()?.getAttribute("aria-activedescendant")).toBe(
      host.querySelector(".peca.cursor")?.id,
    );
  });

  it("as setas movem, e o Enter toca", async () => {
    grelha()?.focus();

    tecla("ArrowRight");
    expect(cursor()).toBe(String(packed(1, 0)));

    tecla("ArrowLeft");
    tecla("Enter"); // o 3
    tecla("ArrowRight");
    tecla(" "); // o 4 — fecha 7

    await assentar();
    expect(host.querySelectorAll(".tabuleiro .peca").length).toBe(2);
  });

  it("a seta para o lado pára na última coluna", () => {
    grelha()?.focus();
    for (let i = 0; i < 5; i++) tecla("ArrowRight");
    expect(cursor()).toBe(String(packed(3, 0)));
  });

  it("o cursor sobrevive a uma jogada que apaga a coluna onde estava", async () => {
    ecra?.destruir();
    // O par está nas duas últimas colunas: jogá-lo apaga a coluna do cursor.
    ecra = new PuzzleScreen(host, { ...NIVEL, board: [[2], [5], [3], [4]] }, {});

    grelha()?.focus();
    tecla("ArrowRight");
    tecla("ArrowRight");
    tecla("Enter"); // o 3
    tecla("ArrowRight");
    tecla("Enter"); // o 4 — e as colunas 2 e 3 desaparecem
    await assentar();

    // Recua para a peça mais próxima em vez de apontar para o vazio.
    expect(cursor()).toBe(String(packed(1, 0)));
  });
});

/* ─── A grelha e a Home ─────────────────────────────────────────────────── */

describe("onde é que eu ia", () => {
  const medio = capituloPorId("medio");

  const perfilCom = (ids: readonly string[]): Profile => ({
    ...emptyProfile(),
    levels: Object.fromEntries(
      ids.map((id) => [id, { seal: "clean" as const, bestTimeMs: 1000 }]),
    ),
  });

  const niveis = ["a", "b", "c", "d"].map((id, indice) => ({
    id,
    banda: "meio",
    indice,
  }));

  it("a grelha marca o primeiro nível por jogar, na ordem do capítulo", () => {
    if (medio === undefined) throw new Error("não há capítulo médio");

    const ecra = new NiveisScreen(host, {
      capitulo: medio,
      niveis,
      // O c está feito e o b não: o seguinte é o buraco que ficou para trás.
      perfil: perfilCom(["a", "c"]),
      aoEscolher: () => undefined,
      aoVoltar: () => undefined,
    });

    const marcadas = [...host.querySelectorAll<HTMLElement>('.nivel[data-seguinte="sim"]')];
    expect(marcadas.map((b) => b.getAttribute("aria-label"))).toEqual([
      "nível 2, a seguir",
    ]);

    ecra.destruir();
  });

  it("com tudo feito, nenhuma célula se diz a seguinte", () => {
    if (medio === undefined) throw new Error("não há capítulo médio");

    const ecra = new NiveisScreen(host, {
      capitulo: medio,
      niveis,
      perfil: perfilCom(["a", "b", "c", "d"]),
      aoEscolher: () => undefined,
      aoVoltar: () => undefined,
    });

    expect(host.querySelector('[data-seguinte="sim"]')).toBeNull();
    ecra.destruir();
  });

  const home = (perfil: Profile, corridaAMeio?: string): HomeScreen =>
    new HomeScreen(host, {
      perfil,
      totalNiveis: 143,
      ...(corridaAMeio === undefined ? {} : { corridaAMeio }),
      aoEscolherNiveis: () => undefined,
      aoEscolherTempo: () => undefined,
      aoEscolherSurvival: () => undefined,
      aoEscolherDefinicoes: () => undefined,
      aoEscolherComoJogar: () => undefined,
    });

  it("a Home não mostra zeros a quem ainda não jogou", () => {
    const ecra = home(emptyProfile());
    expect(host.querySelector(".home-modo-estado")).toBeNull();
    ecra.destruir();
  });

  it("o progresso fica dentro do cartão do modo a que pertence", () => {
    const ecra = home(perfilCom(["a", "b"]));

    const puzzles = host.querySelector(".home-modo.primario");
    expect(puzzles?.querySelector(".home-modo-estado")?.textContent).toBe("2/143");

    ecra.destruir();
  });

  it("uma corrida de Survival a meio diz-se no cartão", () => {
    const ecra = home(emptyProfile(), "1:02.3");

    const estado = host.querySelector<HTMLElement>('.home-modo-estado[data-a-meio="sim"]');
    expect(estado?.textContent).toBe("A meio · 1:02.3");

    ecra.destruir();
  });

  it("as definições estão no canto, com nome para quem ouve o ecrã", () => {
    const ecra = home(emptyProfile());
    expect(host.querySelector('.home-barra [aria-label="Definições"]')).not.toBeNull();
    ecra.destruir();
  });
});
