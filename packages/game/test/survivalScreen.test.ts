// @vitest-environment jsdom

/**
 * O ecrã do Survival.
 *
 * O que se protege aqui não é o desenho — é o **travão**. O ecrã bloqueia toques
 * enquanto a jogada anima, e um travão que fique preso mata o jogo em silêncio:
 * sem toques, sem botão, e sem nada no ecrã a dizer porquê. Foi exatamente o que
 * aconteceu a testar no browser.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Board } from "@dicetoseven/engine";
import { findAllGroups, packed } from "@dicetoseven/engine";

import type { CorridaGuardada } from "../src/session/corridaSurvival";
import type { SurvivalState } from "../src/session/SurvivalSession";
import {
  DEFAULT_SURVIVAL,
  bombaEnterradaNaFila,
  bombaNaFila,
  startSurvival,
} from "../src/session/SurvivalSession";
import { SurvivalScreen } from "../src/ui/SurvivalScreen";

const SEED = 424242;

describe("SurvivalScreen", () => {
  let host: HTMLElement;
  let ecra: SurvivalScreen;

  /** Só as do tabuleiro: a fila também tem `.peca`, e não conta. */
  const pecas = (): number =>
    host.querySelectorAll(".tabuleiro .peca").length;
  const botaoPuxar = (): HTMLButtonElement | null =>
    host.querySelector(".rodape .acoes .btn");
  const relogio = (): string =>
    host.querySelector(".relogio")?.textContent ?? "";
  /** As faces da próxima linha, lidas das peças a sério. */
  const fila = (): string[] =>
    [...host.querySelectorAll(".fila .peca")].map(
      (p) => (p as HTMLElement).dataset["valor"] ?? "",
    );

  const clicar = (p: number): void => {
    host
      .querySelector(`.peca[data-pos="${String(p)}"]`)
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  };

  const assentar = async (): Promise<void> => {
    // As animações do BoardView são `setTimeout`, e somam ~620ms.
    await new Promise((r) => {
      setTimeout(r, 900);
    });
  };

  beforeEach(() => {
    document.body.replaceChildren();
    host = document.createElement("div");
    document.body.appendChild(host);
    ecra = new SurvivalScreen(host, {
      seed: SEED,
      melhorTempo: 0,
      aoGuardar: () => undefined,
      aoTerminar: () => undefined,
      aoSair: () => undefined,
      aoRecomecar: () => undefined,
    });
  });

  it("arranca com o tabuleiro da seed e a fila à frente", () => {
    expect(pecas()).toBe(
      DEFAULT_SURVIVAL.larguraInicial * DEFAULT_SURVIVAL.alturaInicial,
    );
    expect(fila()).toHaveLength(DEFAULT_SURVIVAL.larguraInicial);
    // O cronómetro só arranca ao primeiro toque.
    expect(relogio()).toBe("0:00.0");
    ecra.destruir();
  });

  it("puxar uma linha faz o tabuleiro crescer e a fila andar", async () => {
    const antes = fila();
    const contagem = pecas();

    botaoPuxar()?.click();
    // A queda é animada, portanto a fila só anda quando ela assenta.
    await assentar();

    expect(pecas()).toBe(contagem + DEFAULT_SURVIVAL.larguraInicial);
    // A linha que estava à frente entrou, e a fila mostra outra.
    expect(fila()).not.toEqual(antes);
    ecra.destruir();
  });

  it("**o travão solta-se depois da jogada** — o ecrã não fica morto", async () => {
    const s = startSurvival(SEED);
    const grupo = [...findAllGroups(s.game.board)][0];
    expect(grupo).toBeDefined();

    for (const p of grupo ?? []) clicar(p);
    await assentar();

    // Se o `ocupado` tivesse ficado preso, isto não fazia nada.
    const contagem = pecas();
    botaoPuxar()?.click();
    expect(pecas()).toBeGreaterThan(contagem);

    ecra.destruir();
  });

  it("o rodapé só tem os botões — sem o resto para limpar", () => {
    expect(host.querySelector(".resto")).toBeNull();
    expect(host.querySelector(".rodape .linha-selecao")).toBeNull();
    expect(botaoPuxar()?.textContent).toBe("Puxar linha");
    ecra.destruir();
  });

  /*
   * Duas leituras que saíram, e cada uma por sua razão.
   *
   * A soma corrente — «Toca nas peças para somar 7», depois «4 / 7» — é o
   * andaime do Tutorial, e num modo contra o relógio é a conta a ser lida duas
   * vezes: uma nas peças acesas, outra em texto no fundo do ecrã.
   *
   * A folga dizia o mesmo que a linha de fogo, e dizia-o no cabeçalho — longe
   * do limite onde ela acontece. A linha fica, e continua a mudar de grau; é
   * isso que o teste ao lado protege.
   */
  it("não repete no texto o que o tabuleiro já diz", () => {
    expect(host.querySelector(".ecra.survival .soma")).toBeNull();

    expect(host.querySelector(".survival-topo .meta")).toBeNull();
    expect(host.querySelector(".survival-topo")?.children.length).toBe(2);
    ecra.destruir();
  });

  it("sair não deixa o modal de fim para trás", () => {
    const d = host.querySelector("dialog.confirmacao");
    ecra.destruir();
    expect((d as HTMLDialogElement | null)?.open ?? false).toBe(false);
    expect(host.querySelector(".ecra.survival")).toBeNull();
  });
});

describe("o joker no Survival", () => {
  /** Um estado com joker no tabuleiro, para o ecrã retomar. */
  const comJoker = (): { estado: ReturnType<typeof startSurvival>; decorridoMs: number } => {
    const base = startSurvival(SEED);
    return {
      estado: {
        ...base,
        // `✳ + 5` fecha em 7 assim que o joker valer 2.
        game: { ...base.game, board: [[0], [5]] },
      },
      decorridoMs: 0,
    };
  };

  it("tocar-lhe abre a escolha do valor", () => {
    document.body.replaceChildren();
    const host = document.createElement("div");
    document.body.appendChild(host);

    const ecra = new SurvivalScreen(host, {
      seed: SEED,
      retomar: comJoker(),
      aoGuardar: () => undefined,
      melhorTempo: 0,
      aoTerminar: () => undefined,
      aoSair: () => undefined,
      aoRecomecar: () => undefined,
    });

    // Antes: o seletor não existe no ecrã.
    expect(host.querySelector(".joker-opcao")).toBeNull();

    host
      .querySelector('.tabuleiro .peca[data-valor="0"]')
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    // Sem isto, tocar no joker não fazia rigorosamente nada.
    expect(host.querySelectorAll(".joker-opcao").length).toBeGreaterThan(0);

    ecra.destruir();
  });

  it("escolher o valor faz a jogada", async () => {
    document.body.replaceChildren();
    const host = document.createElement("div");
    document.body.appendChild(host);

    const ecra = new SurvivalScreen(host, {
      seed: SEED,
      retomar: comJoker(),
      aoGuardar: () => undefined,
      melhorTempo: 0,
      aoTerminar: () => undefined,
      aoSair: () => undefined,
      aoRecomecar: () => undefined,
    });

    host
      .querySelector('.tabuleiro .peca[data-valor="0"]')
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    host
      .querySelector('.joker-opcao[aria-label="2"]')
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await new Promise((r) => {
      setTimeout(r, 0);
    });

    // O joker entrou na seleção com o valor 2; falta o 5 para fechar em 7.
    host
      .querySelector('.tabuleiro .peca[data-valor="5"]')
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await new Promise((r) => {
      setTimeout(r, 900);
    });

    expect(host.querySelectorAll(".tabuleiro .peca").length).toBe(0);
    ecra.destruir();
  });
});

describe("sair não perde a corrida", () => {
  it("guarda o estado e o tempo, e retoma no mesmo sítio", async () => {
    document.body.replaceChildren();
    const host = document.createElement("div");
    document.body.appendChild(host);

    let guardado: { estado: ReturnType<typeof startSurvival>; decorridoMs: number } | undefined;

    const abrir = (
      retomar?: { estado: ReturnType<typeof startSurvival>; decorridoMs: number },
    ): SurvivalScreen =>
      new SurvivalScreen(host, {
        seed: SEED,
        ...(retomar === undefined ? {} : { retomar }),
        aoGuardar: (c) => {
          guardado = c as typeof guardado;
        },
        melhorTempo: 0,
        aoTerminar: () => undefined,
        aoSair: () => undefined,
        aoRecomecar: () => undefined,
      });

    let ecra = abrir();

    // Uma linha puxada, para o estado deixar de ser o inicial.
    host.querySelector<HTMLElement>(".rodape .acoes .btn")?.click();
    await new Promise((r) => {
      setTimeout(r, 900);
    });

    const pecasAntes = host.querySelectorAll(".tabuleiro .peca").length;
    const filaAntes = [...host.querySelectorAll(".fila .peca")].map(
      (p) => (p as HTMLElement).dataset["valor"],
    );

    ecra.destruir();
    expect(guardado).toBeDefined();

    // Voltar ao modo: o tabuleiro e a fila são os mesmos.
    ecra = abrir(guardado);
    expect(host.querySelectorAll(".tabuleiro .peca").length).toBe(pecasAntes);
    expect(
      [...host.querySelectorAll(".fila .peca")].map(
        (p) => (p as HTMLElement).dataset["valor"],
      ),
    ).toEqual(filaAntes);

    ecra.destruir();
  });
});

describe("recomeçar pergunta antes", () => {
  it("um toque por engano não deita a corrida fora", async () => {
    document.body.replaceChildren();
    const host = document.createElement("div");
    document.body.appendChild(host);

    let recomecou = 0;
    const ecra = new SurvivalScreen(host, {
      seed: SEED,
      aoGuardar: () => undefined,
      melhorTempo: 0,
      aoTerminar: () => undefined,
      aoSair: () => undefined,
      aoRecomecar: () => {
        recomecou++;
      },
    });

    const btRecomecar = [
      ...host.querySelectorAll<HTMLButtonElement>(".rodape .acoes .btn"),
    ].find((b) => b.textContent === "Recomeçar");
    expect(btRecomecar).toBeDefined();

    btRecomecar?.click();
    expect(recomecou).toBe(0);

    const caixa = host.querySelector("dialog.confirmacao");
    expect(caixa?.textContent).toContain("Recomeçar?");

    // Cancelar deixa tudo como estava.
    [...(caixa?.querySelectorAll("button") ?? [])]
      .find((b) => b.textContent === "Cancelar")
      ?.click();
    expect(recomecou).toBe(0);
    expect(host.querySelector("dialog.confirmacao")).toBeNull();

    // E confirmar recomeça mesmo.
    btRecomecar?.click();
    [...(host.querySelector("dialog.confirmacao")?.querySelectorAll("button") ?? [])]
      .find((b) => b.textContent === "Recomeçar")
      ?.click();
    expect(recomecou).toBe(1);

    ecra.destruir();
  });
});

/*
 * ── A linha de fogo, e a queda que se vê ──
 *
 * Os dois vêm do mesmo relato de playtest, e são a mesma queixa vista de dois
 * lados: *o tabuleiro transbordava sem aviso, e a linha nova aparecia do nada*.
 *
 * A causa da segunda metade era medível: as peças novas nasciam **três** linhas
 * acima do topo, e no Survival a caixa do tabuleiro tem a altura máxima desde o
 * primeiro instante — a queda inteira acontecia fora do palco.
 */
describe("a queda da linha injetada", () => {
  let host: HTMLElement;
  let ecra: SurvivalScreen;

  const puxar = (): void => {
    host.querySelector<HTMLButtonElement>(".rodape .acoes .btn")?.click();
  };

  const assentar = async (): Promise<void> => {
    await new Promise((r) => {
      setTimeout(r, 900);
    });
  };

  beforeEach(() => {
    document.body.replaceChildren();
    host = document.createElement("div");
    document.body.appendChild(host);
    ecra = new SurvivalScreen(host, {
      seed: SEED,
      melhorTempo: 0,
      aoGuardar: () => undefined,
      aoTerminar: () => undefined,
      aoSair: () => undefined,
      aoRecomecar: () => undefined,
    });
  });

  it("a peça em queda tem transição própria e atraso por coluna", () => {
    puxar();

    // Lido **antes** de assentar: a classe é o que dá à peça a transição lenta,
    // e é ela que se perde se alguém voltar a usar a da gravidade.
    const aCair = [...host.querySelectorAll<HTMLElement>(".tabuleiro .a-cair")];
    expect(aCair).toHaveLength(DEFAULT_SURVIVAL.larguraInicial);

    const atrasos = aCair.map((p) => p.style.getPropertyValue("--atraso"));
    // Uma onda da esquerda para a direita: sete impactos ao mesmo instante
    // lêem-se como um corte de imagem, não como uma queda.
    expect(new Set(atrasos).size).toBe(DEFAULT_SURVIVAL.larguraInicial);
    expect(atrasos[0]).toBe("0ms");

    ecra.destruir();
  });

  it("a classe sai quando a peça assenta — o atraso não fica para sempre", async () => {
    puxar();
    await assentar();

    /*
     * Se ficasse, a coluna 6 arrastava 168 ms de atraso em **todas** as jogadas
     * seguintes, e metade do tabuleiro passava a cair com desfasamento sem que
     * nada no ecrã explicasse porquê.
     */
    expect(host.querySelectorAll(".tabuleiro .a-cair")).toHaveLength(0);
    expect(
      [...host.querySelectorAll<HTMLElement>(".tabuleiro .peca")].every(
        (p) => p.style.getPropertyValue("--atraso") === "",
      ),
    ).toBe(true);

    ecra.destruir();
  });
});

describe("a linha de fogo", () => {
  let host: HTMLElement;
  let ecra: SurvivalScreen;

  const fogo = (): HTMLElement | null =>
    host.querySelector(".tabuleiro .linha-fogo");

  beforeEach(() => {
    document.body.replaceChildren();
    host = document.createElement("div");
    document.body.appendChild(host);
    ecra = new SurvivalScreen(host, {
      seed: SEED,
      melhorTempo: 0,
      aoGuardar: () => undefined,
      aoTerminar: () => undefined,
      aoSair: () => undefined,
      aoRecomecar: () => undefined,
    });
  });

  it("**está lá desde o princípio**, dentro do tabuleiro", () => {
    /*
     * É esta a correção. Antes, a única notícia do teto era a caixa de fim a
     * dizer que ele tinha sido ultrapassado — um aviso que chega quando já não
     * há nada a fazer não é um aviso.
     *
     * Dentro do tabuleiro e não do palco: a caixa do tabuleiro é dimensionada
     * para `alturaMaxima` linhas, portanto o topo dela **é** o limite. No palco
     * a linha ficaria num sítio que não quer dizer nada.
     */
    expect(fogo()).not.toBeNull();
    expect(fogo()?.getAttribute("aria-hidden")).toBe("true");
    ecra.destruir();
  });

  it("arranca em «aviso» — duas linhas de folga já é pouco", () => {
    // 5 de altura inicial contra 7 de máximo.
    expect(fogo()?.dataset["grau"]).toBe("aviso");
    ecra.destruir();
  });

  it("passa a «crítico» quando falta uma linha", async () => {
    host.querySelector<HTMLButtonElement>(".rodape .acoes .btn")?.click();
    await new Promise((r) => {
      setTimeout(r, 900);
    });

    expect(fogo()?.dataset["grau"]).toBe("critico");
    ecra.destruir();
  });

  it("sobrevive à remontagem do tabuleiro", async () => {
    // O `montar` limpa a grelha inteira. A linha é do tabuleiro, não da
    // montagem: tem de voltar, e voltar por cima das peças.
    host.querySelector<HTMLButtonElement>(".rodape .acoes .btn")?.click();
    await new Promise((r) => {
      setTimeout(r, 900);
    });

    expect(fogo()).not.toBeNull();
    expect(fogo()).toBe(host.querySelector(".tabuleiro")?.lastElementChild);
    ecra.destruir();
  });
});

/*
 * ── A caixa de fim de corrida ──
 *
 * Duas coisas que vieram do jogo a sério e que só um teste impede de voltarem:
 *
 * - **«Repetir esta» só existe para quem perdeu.** É um botão de segunda
 *   tentativa; a quem acabou de limpar o tabuleiro, refazer a mesma partida é a
 *   única coisa que já se sabe fazer.
 * - **A seed não se imprime aqui.** Está no endereço, que é onde serve para
 *   alguma coisa — copiar o link partilha a corrida. No fim de uma partida era
 *   um número sem uso à frente de quem quer é jogar outra.
 */
describe("a caixa de fim de corrida", () => {
  let host: HTMLElement;

  /** O estado de partida com outro tabuleiro, para chegar ao fim em um toque. */
  const corridaCom = (board: Board): CorridaGuardada => {
    const s = startSurvival(SEED);
    return {
      estado: { ...s, game: { ...s.game, board } },
      decorridoMs: 1_000,
    };
  };

  const montar = (
    board: Board,
    aoRecomecar: (seed: number) => void = () => undefined,
  ): SurvivalScreen =>
    new SurvivalScreen(host, {
      seed: SEED,
      retomar: corridaCom(board),
      melhorTempo: 0,
      aoGuardar: () => undefined,
      aoTerminar: () => undefined,
      aoSair: () => undefined,
      aoRecomecar,
    });

  const caixa = (): HTMLElement | null =>
    host.querySelector<HTMLElement>("dialog:not(.confirmacao) .popup-corpo");

  const acoes = (): string[] =>
    [...(caixa()?.querySelectorAll(".acoes .btn") ?? [])].map(
      (b) => b.textContent ?? "",
    );

  const assentar = async (): Promise<void> => {
    await new Promise((r) => {
      setTimeout(r, 900);
    });
  };

  beforeEach(() => {
    document.body.replaceChildren();
    host = document.createElement("div");
    document.body.appendChild(host);
  });

  /* Duas peças que somam 7: um toque em cada e o tabuleiro fica vazio. */
  it("quem limpa o tabuleiro não vê «Repetir esta»", async () => {
    const ecra = montar([[3], [4]]);

    host
      .querySelector('.peca[data-pos="0"]')
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    host
      .querySelector('.peca[data-pos="64"]')
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await assentar();

    expect(caixa()?.textContent).toContain("Tabuleiro limpo");
    expect(acoes()).toEqual(["Outra corrida", "Sair"]);

    ecra.destruir();
  });

  /* Uma coluna já na altura máxima: a linha seguinte transborda. */
  it("quem transborda vê «Repetir esta», e ela devolve a mesma seed", async () => {
    let repetida = 0;
    const ecra = montar([[2, 2, 2, 2, 3, 3, 3]], (s) => {
      if (s === SEED) repetida++;
    });

    host.querySelector<HTMLButtonElement>(".rodape .acoes .btn")?.click();
    await assentar();
    // Antes do painel, a peça que passou o teto queima — ver «passar o teto».
    await new Promise((r) => {
      setTimeout(r, 1_200);
    });

    expect(caixa()?.textContent).toContain("transbordou");
    expect(acoes()).toEqual(["Outra corrida", "Repetir esta", "Sair"]);

    [...(caixa()?.querySelectorAll<HTMLButtonElement>(".acoes .btn") ?? [])]
      .find((b) => b.textContent === "Repetir esta")
      ?.click();
    expect(repetida).toBe(1);

    ecra.destruir();
  });

  it("não imprime a seed: ela vive no endereço", async () => {
    const ecra = montar([[3], [4]]);

    host
      .querySelector('.peca[data-pos="0"]')
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    host
      .querySelector('.peca[data-pos="64"]')
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await assentar();

    expect(caixa()?.textContent).not.toContain("Seed");

    ecra.destruir();
  });
});

describe("a bomba no ecrã do Survival", () => {
  let host: HTMLElement;
  let ecra: SurvivalScreen | undefined;

  const pecas = (): number => host.querySelectorAll(".tabuleiro .peca").length;
  const pavio = (): string | null | undefined =>
    host.querySelector(".tabuleiro .peca.bomba .pavio")?.textContent;

  /** Retoma uma corrida a meio, para o cronómetro já estar a andar. */
  const abrir = (estado: SurvivalState, decorridoMs = 1_000): SurvivalScreen =>
    new SurvivalScreen(host, {
      seed: SEED,
      retomar: { estado, decorridoMs },
      melhorTempo: 0,
      aoGuardar: () => undefined,
      aoTerminar: () => undefined,
      aoSair: () => undefined,
      aoRecomecar: () => undefined,
    });

  /** O tabuleiro da seed, com uma bomba no canto e a linha marcada longe. */
  const comBomba = (rebentaEm: number): SurvivalState => ({
    ...startSurvival(SEED),
    bomba: { at: packed(0, 0), rebentaEm },
    proximaLinhaMs: 60_000,
  });

  const esconder = (estado: "hidden" | "visible"): void => {
    Object.defineProperty(document, "visibilityState", {
      value: estado,
      configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    document.body.replaceChildren();
    host = document.createElement("div");
    document.body.appendChild(host);
  });

  afterEach(() => {
    ecra?.destruir();
    ecra = undefined;
    esconder("visible");
    vi.useRealTimers();
  });

  it("a fila mostra a bomba antes de ela cair, na coluna onde vai aterrar", () => {
    const s: SurvivalState = {
      ...startSurvival(SEED),
      linhasDesdeBomba: DEFAULT_SURVIVAL.linhasEntreBombas,
    };
    ecra = abrir(s);

    const coluna = bombaNaFila(s);
    const naFila = host.querySelectorAll(".fila .peca");

    expect(host.querySelectorAll(".fila .peca.bomba")).toHaveLength(1);
    expect(naFila[coluna ?? -1]?.classList.contains("bomba")).toBe(true);
  });

  /**
   * Uma corrida em que a próxima linha acende uma bomba enterrada, com a
   * configuração do jogo. A sorte é da seed e do índice; procura-se um índice
   * em que calhe.
   */
  const comEnterradaAVir = (proximaLinhaMs: number): SurvivalState => {
    const base = startSurvival(SEED);
    for (let caidas = DEFAULT_SURVIVAL.bombaEnterradaDesde; caidas < 60; caidas++) {
      const s: SurvivalState = {
        ...base,
        linhasInjetadas: DEFAULT_SURVIVAL.alturaInicial + caidas,
        linhasDesdeBomba: DEFAULT_SURVIVAL.linhasEntreBombas,
        proximaLinhaMs,
      };
      if (bombaEnterradaNaFila(s)) return s;
    }
    throw new Error("nenhuma linha com bomba enterrada nesta seed");
  };

  it("**a fila anuncia a bomba enterrada ao lado**, e não em nenhuma peça", () => {
    ecra = abrir(comEnterradaAVir(60_000));

    expect(host.querySelector(".fila .bomba-pilha")?.textContent).toBe("na pilha");
    expect(host.querySelectorAll(".fila .peca.bomba")).toHaveLength(0);
    expect(host.querySelector(".fila")?.getAttribute("aria-label")).toContain(
      "bomba na pilha",
    );
  });

  it("**quando a linha cai, a enterrada acende-se com um clarão**, e com o pavio de sempre", async () => {
    ecra = abrir(comEnterradaAVir(1_500));

    await vi.advanceTimersByTimeAsync(1_200);

    const acesa = host.querySelector<HTMLElement>(".tabuleiro .peca.bomba.acesa");
    expect(acesa).not.toBeNull();
    // Acesa aos 1,5 s, vista aos 2,2 s: dos 10 s de pavio faltam 9,3.
    expect(acesa?.querySelector(".pavio")?.textContent).toBe("10");
    expect(Number(acesa?.style.getPropertyValue("--pavio"))).toBeCloseTo(0.93, 2);
    expect(host.querySelector(".fila .bomba-pilha")).toBeNull();
  });

  it("o pavio arde no tabuleiro, no tempo da corrida", () => {
    ecra = abrir(comBomba(11_000));
    expect(pavio()).toBe("10");

    vi.advanceTimersByTime(3_100);
    expect(pavio()).toBe("7");
  });

  it("**rebentar faz cair uma linha a mais**, e o «+1 linha» diz porquê", async () => {
    ecra = abrir(comBomba(2_000));
    const antes = pecas();

    await vi.advanceTimersByTimeAsync(1_100);

    expect(pecas()).toBe(antes + DEFAULT_SURVIVAL.largura);
    expect(host.querySelector(".ganho.perda.grande")?.textContent).toBe("+1 linha");
    expect(host.querySelector(".tabuleiro .peca.bomba")).toBeNull();
  });

  it("**rebentar aquece as peças à volta**", async () => {
    const estado = comBomba(2_000);
    const b = estado.game.board;
    // A bomba está no canto (0, 0): à volta, (0, 1), (1, 0) e (1, 1).
    const vizinhas = [packed(0, 1), packed(1, 0), packed(1, 1)];
    const esperado = vizinhas.map((p) =>
      String(Math.min(6, (b[p >> 6]?.[p & 63] ?? 0) + 1)),
    );
    const valorEm = (p: number): string | undefined =>
      host.querySelector<HTMLElement>(`.tabuleiro .peca[data-pos="${String(p)}"]`)
        ?.dataset["valor"];

    ecra = abrir(estado);

    // Antes da explosão, as faces de partida.
    await vi.advanceTimersByTimeAsync(900);
    expect(vizinhas.map(valorEm)).not.toEqual(esperado);

    /*
     * Depois dela, as novas — e continuam depois de a linha assentar. O clarão
     * não se vê aqui: sem layout, a linha entra sem animação e o tabuleiro
     * remonta-se logo. Testa-se no `BoardView`.
     */
    await vi.advanceTimersByTimeAsync(1_100);
    expect(vizinhas.map(valorEm)).toEqual(esperado);
  });

  /*
   * A razão de o pavio estar no tempo da corrida e não nas horas: sair da
   * aplicação a meio não pode deixar a bomba a arder sozinha.
   */
  it("**o pavio pára com a pausa**", () => {
    ecra = abrir(comBomba(11_000));
    vi.advanceTimersByTime(2_000);
    expect(pavio()).toBe("8");

    esconder("hidden");
    vi.advanceTimersByTime(60_000);
    esconder("visible");
    vi.advanceTimersByTime(100);

    expect(pavio()).toBe("8");
    expect(pecas()).toBe(DEFAULT_SURVIVAL.largura * DEFAULT_SURVIVAL.alturaInicial);
  });
});

describe("sem jogadas, no ecrã", () => {
  let host: HTMLElement;
  let ecra: SurvivalScreen | undefined;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    document.body.replaceChildren();
    host = document.createElement("div");
    document.body.appendChild(host);
  });

  afterEach(() => {
    ecra?.destruir();
    ecra = undefined;
    vi.useRealTimers();
  });

  it("**a linha cai logo**, e diz porquê", async () => {
    const base = startSurvival(SEED);
    const estado: SurvivalState = {
      ...base,
      game: { ...base.game, board: [[1], [2], [1], [2]] },
      proximaLinhaMs: 60_000,
    };

    ecra = new SurvivalScreen(host, {
      seed: SEED,
      retomar: { estado, decorridoMs: 1_000 },
      melhorTempo: 0,
      aoGuardar: () => undefined,
      aoTerminar: () => undefined,
      aoSair: () => undefined,
      aoRecomecar: () => undefined,
    });
    expect(host.querySelectorAll(".tabuleiro .peca")).toHaveLength(4);

    // Um tique, muito antes do prazo dos 60 s.
    await vi.advanceTimersByTimeAsync(200);

    expect(host.querySelectorAll(".tabuleiro .peca").length).toBeGreaterThan(4);
    expect(host.querySelector(".ganho.perda")?.textContent).toBe("sem jogadas");
  });
});

describe("passar o teto", () => {
  let host: HTMLElement;
  let ecra: SurvivalScreen | undefined;
  let fim: { limpou: boolean; tempoMs: number } | undefined;

  /** O tabuleiro à altura do teto, em todas as colunas: a próxima linha passa. */
  const noTeto = (): SurvivalState => {
    const base = startSurvival(SEED);
    const cheio = Array.from({ length: DEFAULT_SURVIVAL.largura }, () =>
      Array.from({ length: DEFAULT_SURVIVAL.alturaMaxima }, () => 1 as const),
    );
    return {
      ...base,
      game: { ...base.game, board: cheio },
      proximaLinhaMs: 2_000,
    };
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    document.body.replaceChildren();
    host = document.createElement("div");
    document.body.appendChild(host);
    fim = undefined;

    ecra = new SurvivalScreen(host, {
      seed: SEED,
      retomar: { estado: noTeto(), decorridoMs: 1_000 },
      melhorTempo: 0,
      aoGuardar: () => undefined,
      aoTerminar: (info) => {
        fim = { ...info };
      },
      aoSair: () => undefined,
      aoRecomecar: () => undefined,
    });
  });

  afterEach(() => {
    ecra?.destruir();
    ecra = undefined;
    vi.useRealTimers();
  });

  const painel = (): HTMLDialogElement | null =>
    host.querySelector<HTMLDialogElement>("dialog.popup");

  it("**as peças que passam o laser queimam antes de a corrida acabar**", async () => {
    await vi.advanceTimersByTimeAsync(1_050);

    // Uma peça por coluna passou o teto, e cada uma queimou.
    expect(host.querySelectorAll(".tabuleiro .peca.queimada")).toHaveLength(
      DEFAULT_SURVIVAL.largura,
    );
    // E o painel ainda não abriu: primeiro vê-se a queimadura.
    expect(painel()?.open).toBe(false);
    expect(fim).toBeUndefined();

    await vi.advanceTimersByTimeAsync(1_200);

    expect(painel()?.open).toBe(true);
    expect(fim?.limpou).toBe(false);
  });

  /*
   * A marca do modo é o tempo aguentado. O jogador deixou de aguentar quando a
   * linha passou — o segundo da queimadura não é tempo que ele tenha jogado.
   */
  it("o tempo gravado é o do instante em que passou, e não o do fim da queimadura", async () => {
    await vi.advanceTimersByTimeAsync(2_500);

    expect(fim?.tempoMs).toBeGreaterThanOrEqual(2_000);
    expect(fim?.tempoMs).toBeLessThan(2_200);
  });
});
