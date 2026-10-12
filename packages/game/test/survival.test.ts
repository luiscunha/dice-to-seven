/**
 * Modo Survival.
 *
 * Três coisas para proteger, e nenhuma é a aritmética da pontuação:
 *
 * 1. **A fila que se vê é a que se recebe.** Sem isto a previsão é decoração, e
 *    a previsão é a razão de ser do modo.
 * 2. **A mesma seed dá a mesma corrida.** Sem isto não há pontuação comparável.
 * 3. **A largura repõe-se.** Sem isto limpar uma coluna estreita o tabuleiro
 *    para sempre e jogar bem passa a ser um erro.
 */

import { describe, expect, it } from "vitest";

import {
  boardKey,
  cellAt,
  findAllGroups,
  packed,
  pieceCount,
  tallestColumn,
  totalSum,
  width,
} from "@dicetoseven/engine";

import type { Board, Group, Packed } from "@dicetoseven/engine";

import { pecasJogaveis } from "../src/session/bomba";
import {
  DEFAULT_SURVIVAL,
  aquecer,
  avancarRelogio,
  bombaEnterradaNaFila,
  bombaNaFila,
  cadencia,
  colunaDaBomba,
  injectRow,
  larguraAtual,
  larguraNoIndice,
  linhaDe,
  multiplicadorAoPuxar,
  proximaLinha,
  puxarLinha,
  restoParaLimpar,
  semJogadas,
  startSurvival,
  survivalTap,
  trazBomba,
  trazJoker,
  vizinhasDe,
} from "../src/session/SurvivalSession";
import type { SurvivalState } from "../src/session/SurvivalSession";

const SEED = 20260822;

/** Um grupo qualquer que sirva, ou nada. Chega para fazer jogadas a sério. */
const primeiroGrupo = (b: Board): Group | undefined =>
  [...findAllGroups(b)][0];

describe("a fila", () => {
  it("é determinística na seed e no índice", () => {
    expect(linhaDe(SEED, 0)).toEqual(linhaDe(SEED, 0));
    expect(linhaDe(SEED, 0)).not.toEqual(linhaDe(SEED, 1));
    expect(linhaDe(SEED, 0)).not.toEqual(linhaDe(SEED + 1, 0));
  });

  it("tem a largura daquele ponto da corrida e só faces jogáveis", () => {
    const linha = linhaDe(SEED, 3);
    expect(linha).toHaveLength(DEFAULT_SURVIVAL.larguraInicial);
    for (const v of linha) expect(v).toBeGreaterThanOrEqual(1);
    for (const v of linha) expect(v).toBeLessThanOrEqual(6);
  });

  it("**a linha que se vê é a que entra** — a promessa do modo", () => {
    const s = startSurvival(SEED);
    const primeira = proximaLinha(s);

    const depois = injectRow(s, false);
    // O topo de cada coluna passou a ser exatamente a linha que estava à frente.
    const topos = depois.game.board.map((col) => col[col.length - 1]);
    expect(topos).toEqual([...primeira]);

    // E a linha seguinte já é outra.
    expect(proximaLinha(depois)).not.toEqual(primeira);
  });

  it("o tabuleiro não muda o que está na fila", () => {
    const s = startSurvival(SEED);
    const antes = proximaLinha(s);

    // Jogar não pode reescrever o futuro que já foi mostrado.
    let depois: SurvivalState = s;
    for (const p of [0, 64, 128]) depois = survivalTap(depois, p).state;

    expect(proximaLinha(depois)).toEqual(antes);
  });
});

describe("o arranque", () => {
  it("a mesma seed dá a mesma corrida", () => {
    expect(boardKey(startSurvival(SEED).game.board)).toBe(
      boardKey(startSurvival(SEED).game.board),
    );
    expect(boardKey(startSurvival(SEED).game.board)).not.toBe(
      boardKey(startSurvival(SEED + 1).game.board),
    );
  });

  it("começa com folga e sem joker", () => {
    const s = startSurvival(SEED);
    expect(tallestColumn(s.game.board)).toBe(DEFAULT_SURVIVAL.alturaInicial);
    expect(width(s.game.board)).toBe(DEFAULT_SURVIVAL.larguraInicial);
    expect(s.game.board.flat()).not.toContain(0);
    expect(s.morto).toBe(false);
  });
});

/*
 * A largura é seis, do primeiro instante ao último.
 *
 * Cresceu, em tempos: arrancava em cinco e ganhava uma coluna a cada quatro
 * linhas caídas, para a peça poder começar grande. Custava a área de jogo mudar
 * de tamanho por baixo das mãos, e trocou-se o tamanho da peça pela
 * estabilidade do tabuleiro.
 *
 * O teto ficou primeiro em sete, e desceu a seis por causa do dedo: a 320px,
 * sete colunas davam peças de 38px, abaixo do piso de toque de 44 — seis dão 45.
 * A tabela está no topo de `SurvivalSession.ts`.
 *
 * **Estes testes não fixam o número**, e é de propósito: lêem-no da config, e o
 * que protegem é a forma — arranca no teto, e nada durante a corrida o muda. O
 * mecanismo de crescer ficou montado, portanto voltar atrás é uma linha.
 */
describe("a largura é constante durante a corrida", () => {
  const { alturaInicial, larguraInicial, linhasPorColuna, largura } =
    DEFAULT_SURVIVAL;

  it("arranca no máximo, e é lá que fica", () => {
    expect(larguraInicial).toBe(largura);
  });

  it("as linhas do arranque são todas à largura inicial", () => {
    for (let i = 0; i < alturaInicial; i++) {
      expect(linhaDe(SEED, i)).toHaveLength(larguraInicial);
    }
  });

  /* Com o arranque no teto, nenhum degrau tem para onde subir. */
  it("nenhuma linha entra mais larga do que a primeira", () => {
    const em = (caidas: number): number =>
      larguraNoIndice(alturaInicial + caidas);

    expect(em(0)).toBe(largura);
    expect(em(linhasPorColuna)).toBe(largura);
    expect(em(linhasPorColuna * 2)).toBe(largura);
    expect(em(9999)).toBe(largura);
  });

  it("nunca encolhe", () => {
    let anterior = 0;
    for (let i = 0; i < 200; i++) {
      const w = larguraNoIndice(i);
      expect(w).toBeGreaterThanOrEqual(anterior);
      anterior = w;
    }
  });

  /*
   * A largura sai do **índice da fila**, não do tabuleiro. Se saísse do
   * tabuleiro, a linha vista na previsão podia entrar com outra largura, e a
   * promessa do modo — o que se vê é o que se recebe — deixava de valer.
   */
  it("**a linha que se vê tem a largura com que entra**, seja qual for o tabuleiro", () => {
    const i = alturaInicial + linhasPorColuna;
    const base = startSurvival(SEED);

    const antes = proximaLinha({ ...base, linhasInjetadas: i });
    const noitrocado = proximaLinha({
      ...base,
      linhasInjetadas: i,
      game: { ...base.game, board: [[3]] },
    });

    expect(antes).toEqual(noitrocado);
    expect(antes).toHaveLength(largura);
  });

  /*
   * **Limpar colunas não estreita a corrida.** O colapso empurra as colunas
   * para a esquerda e o tabuleiro fica mais estreito do que sete; a linha
   * seguinte entra à largura cheia na mesma, e repõe-no. Sem isto, jogar bem
   * encolhia a área de jogo para sempre — o jogador era punido por limpar.
   */
  it("a linha repõe a largura cheia num tabuleiro que colapsou", () => {
    const base = startSurvival(SEED);
    const estreito: SurvivalState = {
      ...base,
      linhasInjetadas: alturaInicial + linhasPorColuna,
      game: { ...base.game, board: [[1], [2], [3]] },
    };

    expect(width(estreito.game.board)).toBe(3);
    expect(larguraAtual(estreito)).toBe(largura);

    expect(width(injectRow(estreito, false).game.board)).toBe(largura);
  });
});

describe("a injeção", () => {
  it("empilha por cima e sobe a coluna mais alta", () => {
    const s = startSurvival(SEED);
    const depois = injectRow(s, false);

    expect(tallestColumn(depois.game.board)).toBe(
      tallestColumn(s.game.board) + 1,
    );
    expect(pieceCount(depois.game.board)).toBe(
      pieceCount(s.game.board) + larguraNoIndice(s.linhasInjetadas),
    );
  });

  it("**repõe a largura** depois de o colapso a ter encolhido", () => {
    /*
     * O caso que impede a espiral de morte. Um tabuleiro estreito recebe a linha
     * à largura cheia e volta ao normal — as peças sobre o vazio caem à base.
     */
    const s: SurvivalState = { ...startSurvival(SEED), linhasInjetadas: 0 };
    const estreito: SurvivalState = {
      ...s,
      game: { ...s.game, board: [[3]] },
    };

    expect(width(estreito.game.board)).toBe(1);
    const depois = injectRow(estreito, false);
    expect(width(depois.game.board)).toBe(larguraNoIndice(0));

    // As colunas novas têm uma célula só: caíram até à base.
    expect(depois.game.board.slice(1).every((col) => col.length === 1)).toBe(true);
  });

  it("passar do teto é morrer", () => {
    let s = startSurvival(SEED);
    for (let i = 0; i < 20 && !s.morto; i++) s = injectRow(s, false);

    expect(s.morto).toBe(true);
    expect(tallestColumn(s.game.board)).toBeGreaterThan(
      DEFAULT_SURVIVAL.alturaMaxima,
    );
  });

  it("depois de morto nada mais conta", () => {
    let s = startSurvival(SEED);
    for (let i = 0; i < 20 && !s.morto; i++) s = injectRow(s, false);

    const congelado = injectRow(s, true);
    expect(congelado).toBe(s);
    expect(survivalTap(s, 0).moved).toBe(false);
  });
});

describe("puxar a linha", () => {
  it("dá multiplicador e não pontos — a automática não dá nada", () => {
    /*
     * A forma do prémio é o que aqui interessa. Um prémio fixo foi medido e é
     * uma armadilha: puxar custa espaço, o espaço gera todos os pontos futuros,
     * e nenhuma soma fixa compete com um valor que compõe.
     */
    const s = startSurvival(SEED);

    const puxada = puxarLinha(s);
    expect(puxada.score).toBe(s.score);
    expect(puxada.multiplicador).toBeGreaterThan(1);
    expect(puxada.jogadasComBonus).toBe(DEFAULT_SURVIVAL.jogadasComBonus);

    const automatica = injectRow(s, false);
    expect(automatica.multiplicador).toBe(1);
    expect(automatica.jogadasComBonus).toBe(0);
  });

  it("vale mais com folga — é o prémio a ensinar a estratégia", () => {
    let s = startSurvival(SEED);
    const cedo = multiplicadorAoPuxar(s);

    for (let i = 0; i < 3; i++) s = injectRow(s, false);
    expect(multiplicadorAoPuxar(s)).toBeLessThan(cedo);
  });

  it("o multiplicador aplica-se às jogadas seguintes e expira", () => {
    const base: SurvivalState = { ...startSurvival(SEED), jogadasComBonus: 0, multiplicador: 1 };
    const comBonus: SurvivalState = { ...base, multiplicador: 2, jogadasComBonus: 1 };

    // O mesmo toque, com e sem multiplicador em vigor.
    const grupo = [...findAllGroups(base.game.board)][0];
    expect(grupo).toBeDefined();

    const jogar = (s: SurvivalState): SurvivalState => {
      for (const p of grupo ?? []) s = survivalTap(s, p).state;
      return s;
    };

    const semGanho = jogar(base).score;
    const comGanho = jogar(comBonus).score;

    expect(comGanho).toBe(semGanho * 2);
    // E expira: uma jogada só é o que ele durava.
    expect(jogar(comBonus).jogadasComBonus).toBe(0);
    expect(jogar(comBonus).multiplicador).toBe(1);
  });

  it("**compra tempo**: o prazo da automática reinicia por inteiro", () => {
    const s = startSurvival(SEED);

    // Faltavam três segundos para a linha cair; puxar devolve o intervalo todo.
    const apertado: SurvivalState = {
      ...s,
      proximaLinhaMs: DEFAULT_SURVIVAL.msPorLinha,
    };
    const agora = DEFAULT_SURVIVAL.msPorLinha - 3000;

    const depois = puxarLinha(apertado, DEFAULT_SURVIVAL, agora);
    expect(depois.proximaLinhaMs - agora).toBe(cadencia(depois));
  });
});

describe("a cadência", () => {
  it("aperta com a corrida, até ao piso", () => {
    const em = (caidas: number): number =>
      cadencia({
        ...startSurvival(SEED),
        linhasInjetadas: DEFAULT_SURVIVAL.alturaInicial + caidas,
      });

    expect(em(0)).toBe(DEFAULT_SURVIVAL.msPorLinha);
    expect(em(DEFAULT_SURVIVAL.linhasPorDegrau)).toBe(
      DEFAULT_SURVIVAL.msPorLinha - DEFAULT_SURVIVAL.msPorDegrau,
    );
    expect(em(500)).toBe(DEFAULT_SURVIVAL.minMsPorLinha);
  });

  /*
   * O degrau conta **linhas caídas**, não linhas injetadas.
   *
   * `linhasInjetadas` arranca em `alturaInicial` porque é o índice da fila. Com
   * ele a contar para o degrau, as cinco linhas do arranque gastavam o primeiro
   * patamar e a corrida começava já acelerada — o valor configurado para o
   * arranque nunca valia para ninguém.
   */
  it("o tabuleiro inicial não gasta degraus: a corrida começa no valor configurado", () => {
    expect(cadencia(startSurvival(SEED))).toBe(DEFAULT_SURVIVAL.msPorLinha);
  });
});

describe("o relógio é que faz cair", () => {
  it("nada cai antes do prazo, e cai quando ele chega", () => {
    const s = startSurvival(SEED);
    const prazo = s.proximaLinhaMs;

    expect(avancarRelogio(s, prazo - 1).caiu).toBe(false);
    expect(avancarRelogio(s, prazo - 1).state).toBe(s);

    const caiu = avancarRelogio(s, prazo);
    expect(caiu.caiu).toBe(true);
    expect(caiu.state.linhasInjetadas).toBe(s.linhasInjetadas + 1);
  });

  /*
   * O prazo conta a partir de **agora** e não do prazo vencido. Sem isto, uma
   * injeção atrasada — o ecrã a animar, a app em segundo plano — descontava o
   * atraso ao intervalo seguinte e duas linhas caíam quase coladas.
   */
  it("o prazo seguinte conta a partir de agora, não do prazo que passou", () => {
    const s = startSurvival(SEED);
    const atrasado = s.proximaLinhaMs + 9000;

    const r = avancarRelogio(s, atrasado);
    expect(r.state.proximaLinhaMs - atrasado).toBe(cadencia(r.state));
  });

  it("**jogar já não faz cair nada** — só o relógio faz", () => {
    let s = startSurvival(SEED);
    const antes = s.linhasInjetadas;

    // Jogadas a sério, muitas mais do que a cadência antiga de cinco.
    for (let i = 0; i < 20 && !s.morto && !s.limpo; i++) {
      const grupo = primeiroGrupo(s.game.board);
      if (grupo === undefined) break;
      for (const p of grupo) s = survivalTap(s, p).state;
    }

    expect(s.linhasInjetadas).toBe(antes);
  });

  /*
   * O atraso perdoa-se, e é a propriedade que protege quem volta de longe.
   * Uma hora fora não são cento e vinte linhas em dívida: é uma linha, e um
   * intervalo inteiro para jogar antes da seguinte.
   */
  it("**uma hora de atraso faz cair uma linha, não cento e vinte**", () => {
    const s = startSurvival(SEED);
    const tarde = s.proximaLinhaMs + 60 * 60 * 1000;

    const r = avancarRelogio(s, tarde);

    expect(r.caiu).toBe(true);
    expect(r.state.linhasInjetadas).toBe(s.linhasInjetadas + 1);
    expect(r.state.morto).toBe(false);
    expect(r.state.proximaLinhaMs - tarde).toBe(cadencia(r.state));
  });

  it("depois de limpo ou morto o relógio não injeta mais nada", () => {
    const s = startSurvival(SEED);
    const tarde = s.proximaLinhaMs + 10 * 60 * 1000;

    for (const fim of [{ limpo: true }, { morto: true }]) {
      const parado = { ...s, ...fim };
      expect(avancarRelogio(parado, tarde).caiu).toBe(false);
      expect(avancarRelogio(parado, tarde).state).toBe(parado);
    }
  });
});

describe("o resto para limpar", () => {
  it("é a condição necessária para o tabuleiro poder esvaziar", () => {
    const s = startSurvival(SEED);
    expect(restoParaLimpar(s)).toBe(totalSum(s.game.board) % 7);

    // Uma jogada tira exatamente 7, portanto o resto nunca muda por jogar.
    const board = [[1, 2], [4]] as const;
    const fixo: SurvivalState = { ...s, game: { ...s.game, board } };
    expect(restoParaLimpar(fixo)).toBe(0);
  });
});

describe("o joker", () => {
  it("entra ao fim das peças configuradas, e a fila mostra-o antes de cair", () => {
    const base = startSurvival(SEED);
    const quase: SurvivalState = {
      ...base,
      pecasDesdeJoker: DEFAULT_SURVIVAL.pecasPorJoker,
    };

    expect(trazJoker(quase)).toBe(true);
    // A promessa: o que se vê é o que entra.
    expect(proximaLinha(quase)).toContain(0);

    const depois = injectRow(quase, false);
    expect(depois.game.board.flat()).toContain(0);
    expect(depois.pecasDesdeJoker).toBe(0);
  });

  it("nunca entra um segundo — a invariante 3 não admite dois", () => {
    const base = startSurvival(SEED);
    const comJokerNoTabuleiro: SurvivalState = {
      ...base,
      pecasDesdeJoker: DEFAULT_SURVIVAL.pecasPorJoker * 3,
      game: { ...base.game, board: [[0], [3], [4]] },
    };

    expect(trazJoker(comJokerNoTabuleiro)).toBe(false);
    expect(proximaLinha(comJokerNoTabuleiro)).not.toContain(0);
    // E `pushRow` também recusaria, portanto isto não rebenta.
    expect(injectRow(comJokerNoTabuleiro, false).game.board.flat().filter((v) => v === 0)).toHaveLength(1);
  });

  it("desligado na configuração, não aparece nunca", () => {
    const config = { ...DEFAULT_SURVIVAL, comJoker: false };
    const s: SurvivalState = {
      ...startSurvival(SEED, config),
      pecasDesdeJoker: 999,
    };

    expect(trazJoker(s, config)).toBe(false);
    expect(proximaLinha(s, config)).not.toContain(0);
  });
});

describe("limpar o tabuleiro acaba a corrida", () => {
  it("e não deixa cair mais nenhuma linha por cima", () => {
    // `[[3],[4]]` some 7: uma jogada limpa tudo.
    const base = startSurvival(SEED);
    const quase: SurvivalState = {
      ...base,
      game: { ...base.game, board: [[3], [4]] },
    };

    let s = quase;
    for (const p of [0, 64]) s = survivalTap(s, p).state;

    expect(s.limpo).toBe(true);
    expect(s.game.board).toEqual([]);
    // Sem isto, a vitória era imediatamente soterrada pela linha automática.
    expect(s.linhasInjetadas).toBe(quase.linhasInjetadas);
    // E depois de limpo nada mais conta.
    expect(injectRow(s, true)).toBe(s);
  });
});

describe("a bomba", () => {
  /** Seis colunas de uma peça: espaço para várias linhas sem transbordar. */
  const BAIXO: Board = [[1], [1], [1], [1], [1], [1]];

  const baixo = (extra: Partial<SurvivalState> = {}): SurvivalState => {
    const base = startSurvival(SEED);
    return { ...base, game: { ...base.game, board: BAIXO }, ...extra };
  };

  const semBomba = { ...DEFAULT_SURVIVAL, comBomba: false };

  it("**chega numa linha, uma em cada quatro**", () => {
    let s = baixo();

    for (let i = 0; i < DEFAULT_SURVIVAL.linhasEntreBombas; i++) {
      expect(bombaNaFila(s)).toBeUndefined();
      s = injectRow(s, false, DEFAULT_SURVIVAL, i * 1000);
      expect(s.bomba).toBeUndefined();
    }

    expect(bombaNaFila(s)).toBeDefined();
    s = injectRow(s, false, DEFAULT_SURVIVAL, 9_000);

    expect(s.bomba).toBeDefined();
    expect(s.bomba?.rebentaEm).toBe(9_000 + DEFAULT_SURVIVAL.pavioBombaMs);
    expect(s.linhasDesdeBomba).toBe(0);
  });

  /*
   * A promessa do modo, outra vez: o que se vê é o que se recebe. A fila diz a
   * coluna, e a bomba aterra no topo dessa coluna, na peça que a fila mostrava.
   */
  it("**a fila mostra-a antes de cair**, na peça onde ela aterra", () => {
    const s = baixo({ linhasDesdeBomba: DEFAULT_SURVIVAL.linhasEntreBombas });
    const coluna = bombaNaFila(s);
    const linha = proximaLinha(s);
    if (coluna === undefined) throw new Error("a linha devia trazer bomba");

    const depois = injectRow(s, false);
    const at = depois.bomba?.at;

    expect(at).toBe(packed(coluna, 1));
    expect(cellAt(depois.game.board, at as Packed)).toBe(linha[coluna]);
  });

  it("nunca vai no joker", () => {
    const comJoker = linhaDe(SEED, 7, DEFAULT_SURVIVAL, true);
    const joker = comJoker.indexOf(0);

    for (let i = 0; i < 200; i++) {
      expect(colunaDaBomba(SEED + i, i, comJoker)).not.toBe(joker);
    }
  });

  it("a mesma seed põe a bomba na mesma coluna", () => {
    const linha = linhaDe(SEED, 12);
    expect(colunaDaBomba(SEED, 12, linha)).toBe(colunaDaBomba(SEED, 12, linha));
  });

  it("**uma de cada vez**: com bomba armada, nenhuma linha traz outra", () => {
    const armada = { at: packed(0, 0), rebentaEm: 50_000 };
    const s = baixo({ bomba: armada, linhasDesdeBomba: 10 });

    expect(trazBomba(s)).toBe(false);
    expect(bombaNaFila(s)).toBeUndefined();

    const depois = injectRow(s, false);
    // Entrar por cima não mexe na peça armada.
    expect(depois.bomba).toEqual(armada);
    expect(depois.linhasDesdeBomba).toBe(11);
  });

  it("desligada na configuração, não aparece nunca", () => {
    const s = baixo({ linhasDesdeBomba: 99 });
    expect(trazBomba(s, semBomba)).toBe(false);
    expect(injectRow(s, false, semBomba).bomba).toBeUndefined();
  });

  /*
   * O castigo. Uma linha **a mais**: o prazo da linha marcada fica onde estava.
   * Se a explosão só antecipasse a próxima, rebentar a um segundo dela não
   * custava nada.
   */
  it("**rebentar faz cair uma linha a mais**, e o prazo da marcada não se mexe", () => {
    const s = baixo({
      bomba: { at: packed(2, 0), rebentaEm: 5_000 },
      proximaLinhaMs: 30_000,
    });

    const r = avancarRelogio(s, 5_000, semBomba);

    expect(r.caiu).toBe(true);
    expect(r.rebentou).toBe(packed(2, 0));
    expect(r.state.bomba).toBeUndefined();
    expect(r.state.linhasInjetadas).toBe(s.linhasInjetadas + 1);
    expect(r.state.proximaLinhaMs).toBe(30_000);
    // A peça fica: tirá-la seria um alívio, e não um castigo.
    expect(cellAt(r.state.game.board, packed(2, 0))).toBe(1);
  });

  it("antes do fim do pavio não rebenta", () => {
    // Com um 3+4 à esquerda: sem jogadas, a linha caía de qualquer maneira.
    const base = baixo();
    const s = baixo({
      game: { ...base.game, board: [[3], [4], [1], [1], [1], [1]] },
      bomba: { at: packed(2, 0), rebentaEm: 5_000 },
      proximaLinhaMs: 30_000,
    });

    const r = avancarRelogio(s, 4_999);
    expect(r.caiu).toBe(false);
    expect(r.state).toBe(s);
  });

  it("se a bomba e a linha marcada vencerem juntas, caem as duas — uma de cada vez", () => {
    const s = baixo({
      bomba: { at: packed(2, 0), rebentaEm: 5_000 },
      proximaLinhaMs: 5_000,
    });

    const primeira = avancarRelogio(s, 6_000, semBomba);
    expect(primeira.rebentou).toBe(packed(2, 0));
    expect(primeira.state.linhasInjetadas).toBe(s.linhasInjetadas + 1);

    const segunda = avancarRelogio(primeira.state, 6_000, semBomba);
    expect(segunda.caiu).toBe(true);
    expect(segunda.rebentou).toBeUndefined();
    expect(segunda.state.linhasInjetadas).toBe(s.linhasInjetadas + 2);
  });

  it("a linha da explosão pode ser a que transborda", () => {
    const cheio: Board = Array.from({ length: 6 }, () =>
      Array.from({ length: DEFAULT_SURVIVAL.alturaMaxima }, () => 1 as const),
    );
    const base = startSurvival(SEED);
    const s: SurvivalState = {
      ...base,
      game: { ...base.game, board: cheio },
      bomba: { at: packed(0, 0), rebentaEm: 1_000 },
    };

    expect(avancarRelogio(s, 1_000).state.morto).toBe(true);
  });

  it("**jogá-la desarma-a**, e depois já não rebenta", () => {
    const base = startSurvival(SEED);
    const s: SurvivalState = {
      ...base,
      // Sobra um 3+4: sem jogadas, a linha caía de qualquer maneira.
      game: { ...base.game, board: [[3], [4], [3], [4]] },
      bomba: { at: packed(0, 0), rebentaEm: 5_000 },
      proximaLinhaMs: 30_000,
    };

    let r = survivalTap(s, packed(0, 0));
    r = survivalTap(r.state, packed(1, 0));

    expect(r.desarmou).toBe(true);
    expect(r.state.bomba).toBeUndefined();
    expect(avancarRelogio(r.state, 5_000).caiu).toBe(false);
  });

  it("**acompanha a peça na gravidade**", () => {
    const base = startSurvival(SEED);
    const s: SurvivalState = {
      ...base,
      game: { ...base.game, board: [[3, 5], [4]] },
      bomba: { at: packed(0, 1), rebentaEm: 5_000 },
    };

    let r = survivalTap(s, packed(0, 0));
    r = survivalTap(r.state, packed(1, 0));

    expect(r.desarmou).toBe(false);
    expect(r.state.bomba?.at).toBe(packed(0, 0));
    expect(cellAt(r.state.game.board, packed(0, 0))).toBe(5);
  });
});

describe("a bomba enterrada", () => {
  /** Sempre enterrada, quando pode: para os testes não dependerem da sorte. */
  const sempre = { ...DEFAULT_SURVIVAL, probabilidadeEnterrada: 1 };
  const nunca = { ...DEFAULT_SURVIVAL, probabilidadeEnterrada: 0 };

  /** Uma corrida com a bomba a vir na próxima linha, depois de `caidas` linhas. */
  const aVir = (seed: number, caidas: number, board?: Board): SurvivalState => {
    const base = startSurvival(seed);
    return {
      ...base,
      game: board === undefined ? base.game : { ...base.game, board },
      linhasInjetadas: DEFAULT_SURVIVAL.alturaInicial + caidas,
      linhasDesdeBomba: DEFAULT_SURVIVAL.linhasEntreBombas,
    };
  };

  /** Quantas peças tem por cima. */
  const porCima = (b: Board, p: Packed): number =>
    (b[Math.floor(p / 64)]?.length ?? 0) - 1 - (p % 64);

  it("**a primeira bomba da corrida é sempre na linha**", () => {
    const s = aVir(SEED, DEFAULT_SURVIVAL.bombaEnterradaDesde - 1);
    expect(bombaEnterradaNaFila(s, sempre)).toBe(false);
    expect(bombaNaFila(s, sempre)).toBeDefined();
  });

  it("a fila anuncia-a, e não a põe em nenhuma peça da linha", () => {
    const s = aVir(SEED, DEFAULT_SURVIVAL.bombaEnterradaDesde);
    expect(bombaEnterradaNaFila(s, sempre)).toBe(true);
    expect(bombaNaFila(s, sempre)).toBeUndefined();
    // A linha é a mesma, com bomba ou sem ela.
    expect(proximaLinha(s, sempre)).toEqual(proximaLinha(s, nunca));
  });

  /*
   * O coração da mecânica. Numa peça da pilha — não na linha que caiu —, com
   * poucas peças por cima, nunca no joker, e com o mesmo pavio da outra.
   */
  it("**acende-se numa peça da pilha**, a poucas peças do topo", () => {
    for (let i = 0; i < 60; i++) {
      const s = aVir(SEED + i, DEFAULT_SURVIVAL.bombaEnterradaDesde + (i % 5));
      const depois = injectRow(s, false, sempre, 4_000);
      const bomba = depois.bomba;
      if (bomba === undefined) throw new Error("devia ter acendido uma bomba");

      expect(bomba.enterrada).toBe(true);
      expect(bomba.rebentaEm).toBe(4_000 + sempre.pavioBombaMs);
      expect(cellAt(s.game.board, bomba.at)).toBeDefined();
      expect(cellAt(depois.game.board, bomba.at)).not.toBe(0);
      expect(porCima(depois.game.board, bomba.at)).toBeGreaterThanOrEqual(1);
      expect(porCima(depois.game.board, bomba.at)).toBeLessThanOrEqual(sempre.profundidadeEnterrada);
      expect(depois.linhasDesdeBomba).toBe(0);
    }
  });

  /*
   * Seis em baixo, 1s por cima: um 6 só sai com um 1, e os da base só têm 6s
   * à volta. A bomba tem de escolher uma das que é preciso destapar.
   */
  it("**prefere uma peça presa** — sem grupo quando a linha cai", () => {
    const seis: Board = Array.from({ length: 6 }, () => [6, 6] as const);

    for (let i = 0; i < 30; i++) {
      const depois = injectRow(aVir(SEED + i, 8, seis), false, sempre);
      const at = depois.bomba?.at as Packed;
      expect(pecasJogaveis(depois.game.board)).not.toContain(at);
    }
  });

  it("é pura na seed: a mesma corrida acende a mesma peça", () => {
    const s = aVir(SEED, 9);
    expect(injectRow(s, false, sempre).bomba).toEqual(injectRow(s, false, sempre).bomba);
  });

  it("com a configuração por omissão, cerca de metade vêm enterradas", () => {
    let enterradas = 0;
    for (let i = 0; i < 400; i++) {
      if (bombaEnterradaNaFila(aVir(SEED + i, 10))) enterradas++;
    }
    expect(enterradas).toBeGreaterThan(150);
    expect(enterradas).toBeLessThan(250);
  });

  it("com probabilidade zero, nunca", () => {
    const s = aVir(SEED, 10);
    expect(bombaEnterradaNaFila(s, nunca)).toBe(false);
    expect(injectRow(s, false, nunca).bomba?.enterrada).toBeUndefined();
  });

  it("sem peça que sirva na pilha — só o joker —, cai na linha", () => {
    const depois = injectRow(aVir(SEED, 10, [[0]]), false, sempre);
    const bomba = depois.bomba;
    if (bomba === undefined) throw new Error("a bomba devia ter caído na linha");

    expect(bomba.enterrada).toBeUndefined();
    expect(porCima(depois.game.board, bomba.at)).toBe(0);
    expect(depois.linhasDesdeBomba).toBe(0);
  });

  it("acompanha a peça na gravidade, e continua a ser enterrada", () => {
    const base = startSurvival(SEED);
    const s: SurvivalState = {
      ...base,
      game: { ...base.game, board: [[3, 5], [4]] },
      bomba: { at: packed(0, 1), rebentaEm: 5_000, enterrada: true },
    };

    let r = survivalTap(s, packed(0, 0));
    r = survivalTap(r.state, packed(1, 0));

    expect(r.state.bomba).toEqual({ at: packed(0, 0), rebentaEm: 5_000, enterrada: true });
  });
});

describe("a explosão aquece as peças à volta", () => {
  it("**cada vizinha sobe um ponto**, lados e diagonais, e o 6 fica 6", () => {
    // A bomba no 5 do meio.
    const b: Board = [
      [1, 2, 3],
      [4, 5, 6],
      [1, 1, 1],
    ];

    const { board, aquecidas } = aquecer(b, packed(1, 1));

    expect(board).toEqual([
      [2, 3, 4],
      [5, 5, 6],
      [2, 2, 2],
    ]);
    // O 6 não mudou, e por isso não se anima.
    expect(aquecidas).toHaveLength(7);
    expect(aquecidas).not.toContain(packed(1, 2));
  });

  it("só as que existem: ao lado de uma coluna mais baixa não há peça", () => {
    const b: Board = [[1], [1, 1, 1], [1]];
    expect(vizinhasDe(b, packed(1, 2))).toEqual([packed(1, 1)]);
  });

  it("o joker não aquece", () => {
    const b: Board = [[0, 1], [2]];
    const { board, aquecidas } = aquecer(b, packed(0, 1));
    expect(board).toEqual([[0, 1], [3]]);
    expect(aquecidas).toEqual([packed(1, 0)]);
  });

  it("**ao rebentar, aquece antes de a linha cair** — a linha nova fica como veio", () => {
    const base = startSurvival(SEED);
    const s: SurvivalState = {
      ...base,
      game: { ...base.game, board: [[1], [1], [1], [1], [1], [1]] },
      bomba: { at: packed(2, 0), rebentaEm: 5_000 },
      proximaLinhaMs: 30_000,
    };
    const linha = proximaLinha(s);

    const r = avancarRelogio(s, 5_000);
    const depois = r.state.game.board;

    expect(r.aquecidas).toEqual([packed(1, 0), packed(3, 0)]);
    expect(cellAt(depois, packed(1, 0))).toBe(2);
    expect(cellAt(depois, packed(3, 0))).toBe(2);
    // A bomba fica como estava, e a linha nova não é aquecida.
    expect(cellAt(depois, packed(2, 0))).toBe(1);
    expect(depois.map((col) => col[1])).toEqual(linha);
  });

  it("desligado na configuração, só cai a linha", () => {
    const base = startSurvival(SEED);
    const s: SurvivalState = {
      ...base,
      game: { ...base.game, board: [[1], [1], [1]] },
      bomba: { at: packed(1, 0), rebentaEm: 5_000 },
    };

    const r = avancarRelogio(s, 5_000, { ...DEFAULT_SURVIVAL, aqueceVizinhas: false });
    expect(r.aquecidas).toEqual([]);
    // A linha entra à largura cheia: as três primeiras colunas são as de antes.
    expect(r.state.game.board.slice(0, 3).map((col) => col[0])).toEqual([1, 1, 1]);
  });

  it("sem bomba a rebentar, nada aquece", () => {
    expect(avancarRelogio(startSurvival(SEED), 30_000).aquecidas).toEqual([]);
  });
});

describe("sem jogadas, a linha cai já", () => {
  /** 1, 2, 1, 2: peças a mais e nenhum 7. */
  const PRESO: Board = [[1], [2], [1], [2]];

  const preso = (extra: Partial<SurvivalState> = {}): SurvivalState => {
    const base = startSurvival(SEED);
    return {
      ...base,
      game: { ...base.game, board: PRESO },
      proximaLinhaMs: 30_000,
      ...extra,
    };
  };

  it("sabe quando não há jogadas — e um tabuleiro vazio não conta", () => {
    expect(semJogadas(preso())).toBe(true);
    expect(semJogadas(startSurvival(SEED))).toBe(false);

    const base = startSurvival(SEED);
    expect(semJogadas({ ...base, game: { ...base.game, board: [] } })).toBe(false);
  });

  it("**cai antes do prazo**, e o prazo da seguinte recomeça a contar daqui", () => {
    const s = preso();
    const r = avancarRelogio(s, 4_000);

    expect(r.caiu).toBe(true);
    expect(r.forcada).toBe(true);
    expect(r.state.linhasInjetadas).toBe(s.linhasInjetadas + 1);
    expect(r.state.proximaLinhaMs).toBe(4_000 + cadencia(r.state));
  });

  it("não paga o multiplicador de puxar: não foi uma escolha", () => {
    const r = avancarRelogio(preso(), 4_000);
    expect(r.state.multiplicador).toBe(1);
    expect(r.state.jogadasComBonus).toBe(0);
  });

  it("com jogadas, espera pelo prazo como sempre", () => {
    const s: SurvivalState = { ...startSurvival(SEED), proximaLinhaMs: 30_000 };
    const r = avancarRelogio(s, 4_000);
    expect(r.caiu).toBe(false);
    expect(r.forcada).toBe(false);
  });
});

describe("passar de 7 adianta a próxima linha", () => {
  /** 3+4 e 4+3: o 4 de cima à esquerda e o 4 de baixo à direita passam de 7. */
  const com = (proximaLinhaMs = 20_000): SurvivalState => {
    const base = startSurvival(SEED);
    return {
      ...base,
      game: { ...base.game, board: [[3, 4], [4, 3]] },
      proximaLinhaMs,
    };
  };

  it("**o toque que passa de 7 tira 3 s ao prazo**, e a seleção fica", () => {
    let r = survivalTap(com(), packed(0, 1));
    r = survivalTap(r.state, packed(1, 0));

    expect(r.penalizado).toBe(true);
    expect(r.state.proximaLinhaMs).toBe(20_000 - DEFAULT_SURVIVAL.penalizacaoSomaMs);
    expect(r.state.game.selection).toEqual([packed(0, 1)]);
  });

  it("só a soma errada paga — selecionar, tirar da seleção e jogar não", () => {
    let r = survivalTap(com(), packed(0, 1));
    expect(r.penalizado).toBe(false);

    r = survivalTap(r.state, packed(0, 1));
    expect(r.penalizado).toBe(false);

    r = survivalTap(r.state, packed(0, 0));
    r = survivalTap(r.state, packed(0, 1));
    expect(r.moved).toBe(true);
    expect(r.penalizado).toBe(false);
    expect(r.state.proximaLinhaMs).toBe(20_000);
  });

  it("se o prazo ficar para trás, a linha cai no tique seguinte", () => {
    let r = survivalTap(com(2_000), packed(0, 1));
    r = survivalTap(r.state, packed(1, 0));

    const t = avancarRelogio(r.state, 1_500);
    expect(t.caiu).toBe(true);
    expect(t.forcada).toBe(false);
    expect(t.state.proximaLinhaMs).toBe(1_500 + cadencia(t.state));
  });
});
