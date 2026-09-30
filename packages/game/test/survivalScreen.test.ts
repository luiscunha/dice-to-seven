// @vitest-environment jsdom

/**
 * O ecrã do Survival.
 *
 * O que se protege aqui não é o desenho — é o **travão**. O ecrã bloqueia toques
 * enquanto a jogada anima, e um travão que fique preso mata o jogo em silêncio:
 * sem toques, sem botão, e sem nada no ecrã a dizer porquê. Foi exatamente o que
 * aconteceu a testar no browser.
 */

import { beforeEach, describe, expect, it } from "vitest";

import type { Board } from "@dicetoseven/engine";
import { findAllGroups } from "@dicetoseven/engine";

import type { CorridaGuardada } from "../src/session/corridaSurvival";
import { DEFAULT_SURVIVAL, startSurvival } from "../src/session/SurvivalSession";
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

  it("mostra o resto para limpar, e só o realça quando é acionável", () => {
    const resto = host.querySelector(".resto");
    expect(resto?.textContent).toMatch(/limpar/);
    // A seed de teste não arranca em múltiplo de 7 — o realce fica reservado.
    expect(resto?.getAttribute("data-pronto")).toBe("nao");
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
