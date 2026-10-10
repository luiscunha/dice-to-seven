/**
 * Camada de sessão (plano, fase 7).
 *
 * O que se testa aqui não é a engine — é o que a engine deliberadamente não
 * sabe: undo, selos, relógio, combos e progressão. Nada nestes testes toca no
 * DOM nem no relógio do sistema, e isso não é comodidade: é a propriedade que a
 * fase tinha de entregar.
 */

import { describe, expect, it } from "vitest";

import type { Board, Cell, Group, Level } from "@dicetoseven/engine";
import { boardKey, mulberry32, packed } from "@dicetoseven/engine";

import {
  clearSelection,
  hint,
  isBlocked,
  isFinished,
  remainingToTarget,
  selectionTotal,
  restart,
  startGame,
  tap,
  undo,
} from "../src/session/GameSession";
import {
  restartPuzzle,
  seal,
  startPuzzle,
  undoPuzzle,
  usePuzzleHint,
} from "../src/session/PuzzleSession";
import type { TimeAttackState } from "../src/session/TimeAttackSession";
import {
  DEFAULT_TIME_ATTACK,
  DEGRAUS,
  JokerInTimeAttackError,
  armarBomba,
  boardReward,
  escadaDeTamanho,
  jogadasDe,
  nivelDoTabuleiro,
  isOver,
  nextBoard,
  pavioRestante,
  remainingMs,
  resolverBomba,
  ritmoExigido,
  startTimeAttack,
  tapTimeAttack,
} from "../src/session/TimeAttackSession";
import { breakCombo, registerMove, startCombo } from "../src/session/combos";
import { comboMultiplier, moveScore } from "../src/session/scoring";
import {
  PROFILE_KEY,
  PROFILE_VERSION,
  emptyProfile,
  load,
  recordLevel,
  recordSurvival,
  recordTimeAttack,
  save,
} from "../src/session/progress";
import type { ProfileStorage } from "../src/session/progress";

/*
 * 1 + 2 + 4 em L: a coluna a leva o 1 e o 2, a coluna b leva o 4. Some 7 e é
 * conexo, portanto é o grupo mais pequeno que exercita as três condições de
 * §3.1 de uma vez.
 */
const BOARD: Board = [
  [1, 2],
  [4],
];

const L_GROUP: Group = [packed(0, 0), packed(0, 1), packed(1, 0)] as Group;

const level = (board: Board, solution: readonly Group[] = []): Level => ({
  id: "teste-000000",
  seed: 0,
  board,
  solution: solution as never,
});

const memoryStorage = (): ProfileStorage => {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
  };
};

describe("GameSession", () => {
  it("tocar acumula, e o grupo válido sem joker elimina sozinho", () => {
    let s = startGame(level(BOARD));

    s = tap(s, packed(0, 0));
    expect(s.moves).toBe(0);

    s = tap(s, packed(0, 1));
    expect(s.moves).toBe(0);

    s = tap(s, packed(1, 0));
    expect(s.moves).toBe(1);
    expect(isFinished(s)).toBe(true);
  });

  it("tocar outra vez na mesma peça retira-a da seleção", () => {
    let s = startGame(level(BOARD));

    s = tap(s, packed(0, 0));
    s = tap(s, packed(0, 0));

    expect(s.selection).toEqual([]);
  });

  it("recusa a peça que passaria do alvo, em vez de atolar a seleção", () => {
    let s = startGame(level([[4, 5]] as Board));

    s = tap(s, packed(0, 0));
    s = tap(s, packed(0, 1));

    expect(s.selection).toHaveLength(1);
    expect(s.rejection).toBe("over-target");
  });

  it("não deixa tocar onde não há peça", () => {
    expect(tap(startGame(level(BOARD)), packed(1, 5)).rejection).toBe("no-piece");
  });

  /*
   * A lição da fase 6, agora na camada que a UI vai consumir. Com joker, várias
   * seleções diferentes são todas válidas, e eliminar à primeira rouba ao
   * jogador a única decisão que o joker oferece.
   */
  /*
   * O joker não precisa de tratamento especial na interação, e é isso que se
   * fixa aqui.
   *
   * O valor dele está globalmente determinado (spec §2.6), logo também está
   * determinada a soma que as fixas do grupo têm de atingir: `7 − valor`. Com o
   * teto aí, o joker acumula-se e elimina como qualquer outro grupo — não há
   * botão de confirmação, não é preciso mostrar o valor, e **não há maneira de o
   * gastar mal**.
   *
   * A versão anterior punha o teto em 6, que é o que o motor aceita, e por isso
   * a seleção ficava válida logo à primeira peça encostada ao joker.
   */
  /*
   * O joker é a única peça cujo valor o jogador escolhe (`[M 2.6]`), e é dessa
   * escolha que vem a dificuldade das bandas com joker: **só um valor esvazia o
   * tabuleiro, e o jogo deixa escolher qualquer um**. Escolher mal não bloqueia
   * na hora — o tabuleiro fica insolúvel em silêncio e só falha no fim.
   *
   * Escolher no momento do toque é o que dispensa um botão de confirmação: com o
   * valor fixado, a seleção volta a ter alvo exato e elimina sozinha.
   */
  describe("o joker", () => {
    // fixas 2 + 2 = 4; com o joker a 3, o total fecha em 7.
    const JOKER_BOARD: Board = [[0, 2], [2]];

    it("não entra na seleção sem valor escolhido", () => {
      const s = tap(startGame(level(JOKER_BOARD)), packed(0, 0));

      expect(s.selection).toEqual([]);
      expect(s.rejection).toBe("joker-needs-value");
    });

    it("com valor escolhido, conta como uma peça normal", () => {
      const s = tap(startGame(level(JOKER_BOARD)), packed(0, 0), 3);

      expect(s.selection).toHaveLength(1);
      expect(s.jokerAs).toBe(3);
      expect(selectionTotal(s)).toBe(3);
      expect(remainingToTarget(s)).toBe(4);
    });

    it("elimina sozinho ao chegar a 7, sem confirmação", () => {
      let s = startGame(level(JOKER_BOARD));

      s = tap(s, packed(0, 0), 3);
      s = tap(s, packed(0, 1)); // +2
      expect(s.moves).toBe(0);

      s = tap(s, packed(1, 0)); // +2 → 3+2+2 = 7

      expect(s.moves).toBe(1);
      expect(isFinished(s)).toBe(true);
    });

    /*
     * A propriedade que sustenta a dificuldade: **o valor errado é jogável**. Se
     * o jogo o recusasse, a banda `denso` passava de 14% de sobrevivência para
     * 96% — medido — e deixava de haver decisão nenhuma.
     */
    it("deixa escolher o valor errado, e a jogada acontece", () => {
      let s = startGame(level(JOKER_BOARD));

      s = tap(s, packed(0, 0), 5); // devia ser 3
      s = tap(s, packed(0, 1)); // +2 → 5+2 = 7

      expect(s.moves).toBe(1);
      // O tabuleiro esvaziou-se cedo de mais: sobra um 2 sem parceiro possível.
      expect(isFinished(s)).toBe(false);
    });

    it("tocar outra vez no joker troca o valor sem desfazer a seleção", () => {
      let s = startGame(level(JOKER_BOARD));

      s = tap(s, packed(0, 0), 5);
      s = tap(s, packed(0, 0), 3);

      expect(s.selection).toHaveLength(1);
      expect(s.jokerAs).toBe(3);
    });

    it("recusa a peça que passaria de 7", () => {
      let s = startGame(level([[0, 5], [6]] as Board));

      s = tap(s, packed(0, 0), 6);
      s = tap(s, packed(0, 1)); // +5 → 11

      expect(s.selection).toHaveLength(1);
      expect(s.rejection).toBe("over-target");
    });

    it("o valor escolhido não sobrevive à jogada nem ao desfazer", () => {
      let s = startGame(level(JOKER_BOARD));

      s = tap(s, packed(0, 0), 3);
      expect(s.jokerAs).toBe(3);

      s = undo(s);
      expect(s.jokerAs).toBeUndefined();
      expect(s.selection).toEqual([]);
    });

    it("limpar a seleção também limpa o valor", () => {
      let s = tap(startGame(level(JOKER_BOARD)), packed(0, 0), 4);
      s = clearSelection(s);

      expect(s.jokerAs).toBeUndefined();
    });
  });

  it("o undo restaura o tabuleiro exato", () => {
    let s = startGame(level(BOARD));
    const antes = boardKey(s.board);

    s = tap(s, packed(0, 0));
    s = tap(s, packed(0, 1));
    s = tap(s, packed(1, 0));
    expect(isFinished(s)).toBe(true);

    s = undo(s);

    expect(boardKey(s.board)).toBe(antes);
    expect(s.moves).toBe(0);
    expect(s.undos).toBe(1);
  });

  it("o undo tira primeiro a peça tocada, e só depois a jogada", () => {
    let s = startGame(level(BOARD));

    s = tap(s, packed(0, 0));
    s = undo(s);

    expect(s.selection).toEqual([]);
    expect(s.undos).toBe(0); // desfazer uma seleção não é desfazer uma jogada
  });

  it("o undo é ilimitado — é só uma pilha de tabuleiros imutáveis", () => {
    const b: Board = [
      [1, 2],
      [4],
      [3, 4],
    ];
    let s = startGame(level(b));

    s = tap(s, packed(0, 0));
    s = tap(s, packed(0, 1));
    s = tap(s, packed(1, 0));
    expect(s.moves).toBe(1);

    const chaves = [boardKey(s.board)];
    s = undo(s);
    s = undo(s);

    expect(s.undos).toBe(1); // só havia uma jogada por desfazer
    expect(chaves).toHaveLength(1);
  });

  it("reiniciar volta ao tabuleiro inicial e conta-se", () => {
    let s = startGame(level(BOARD));

    s = tap(s, packed(0, 0));
    s = tap(s, packed(0, 1));
    s = tap(s, packed(1, 0));
    s = restart(s);

    expect(boardKey(s.board)).toBe(boardKey(BOARD));
    expect(s.moves).toBe(0);
    expect(s.restarts).toBe(1);
    expect(s.selection).toEqual([]);
  });

  it("limpar a seleção não mexe no tabuleiro", () => {
    let s = startGame(level(BOARD));
    s = tap(s, packed(0, 0));
    s = clearSelection(s);

    expect(s.selection).toEqual([]);
    expect(boardKey(s.board)).toBe(boardKey(BOARD));
  });

  describe("dicas", () => {
    it("vêm da solução guardada enquanto o jogador a segue", () => {
      const r = hint(startGame(level(BOARD, [L_GROUP])));

      expect(r.source).toBe("stored");
      expect(r.group).toEqual(L_GROUP);
      expect(r.state.hints).toBe(1);
    });

    /*
     * O ponto fino: um grupo guardado pode continuar a ser válido num tabuleiro
     * a que o jogador chegou por outro caminho. Aí a solução guardada já não
     * serve, e a dica tem de ser recalculada — senão manda-o para um caminho
     * que deixou de existir.
     */
    it("são recalculadas quando o jogador saiu do caminho guardado", () => {
      const b: Board = [
        [1, 2],
        [4],
        [3, 4],
      ];
      // A solução guardada começa pelo grupo da direita; o jogador joga o da
      // esquerda, que é igualmente válido.
      const guardada: Group[] = [
        [packed(2, 0), packed(2, 1)] as Group,
        L_GROUP,
      ];

      let s = startGame(level(b, guardada));
      s = tap(s, packed(0, 0));
      s = tap(s, packed(0, 1));
      s = tap(s, packed(1, 0));

      expect(s.moves).toBe(1);
      expect(hint(s).source).toBe("computed");
    });

    it("num tabuleiro limpo não há dica nem custo", () => {
      let s = startGame(level(BOARD));
      s = tap(s, packed(0, 0));
      s = tap(s, packed(0, 1));
      s = tap(s, packed(1, 0));

      const r = hint(s);
      expect(r.source).toBe("none");
      expect(r.state.hints).toBe(0);
    });
  });

  describe("beco sem saída", () => {
    it("um tabuleiro com jogadas não está preso, e um vazio também não", () => {
      const s = startGame(level(BOARD));
      expect(isBlocked(s)).toBe(false);

      let limpo = s;
      for (const p of L_GROUP) limpo = tap(limpo, p);

      expect(isFinished(limpo)).toBe(true);
      // Ganhar não é encravar. São estados diferentes e o ecrã trata-os assim.
      expect(isBlocked(limpo)).toBe(false);
    });

    it("sobram peças e nenhuma soma 7", () => {
      // Exatamente o caso que o playtest reportou: sobra um 3 e um 2.
      expect(isBlocked(startGame(level([[3], [2]])))).toBe(true);
    });

    it("peças que somam 7 mas não são vizinhas continuam presas", () => {
      /*
       * `[[3],[1],[4]]` some 8 na coluna do meio... não: 3+4 = 7, mas o 1 está
       * entre eles e a conexão é ortogonal, portanto qualquer grupo que ligue o
       * 3 ao 4 tem de levar o 1 e passa a somar 8. A soma sozinha nunca chega.
       */
      expect(isBlocked(startGame(level([[3], [1], [4]])))).toBe(true);
    });

    it("desfazer tira o jogador do beco", () => {
      /*
       * A única jogada é 3+4, e leva a um beco: sobram dois 5 que somam 10.
       *
       * Note-se que `[[3],[4],[5],[2]]` **não** serve para isto, por muito que
       * pareça: tirar o 3 e o 4 colapsa as colunas e volta a encostar o 5 ao 2,
       * que somam 7. O colapso reabre jogadas, e é por isso que o beco tem de
       * ser lido no tabuleiro de chegada e nunca antecipado por contas.
       */
      const board: Board = [[3], [4], [5], [5]];
      let s = startGame(level(board));

      s = tap(s, packed(0, 0));
      s = tap(s, packed(1, 0));

      expect(s.moves).toBe(1);
      expect(isBlocked(s)).toBe(true);

      s = undo(s);
      expect(isBlocked(s)).toBe(false);
      expect(boardKey(s.board)).toBe(boardKey(board));
    });

    it("conta com o joker: um joker no tabuleiro é sempre uma saída", () => {
      /*
       * Joker mais um 2. As fixas somam 2, que está entre 1 e 6, portanto o
       * joker vale 5 e o grupo é legítimo. Sem contar com o joker, isto seria
       * lido como beco sem saída — e o `hasAnyGroup` conta.
       */
      const comJoker = level([[0], [2]]);
      expect(isBlocked(startGame(comJoker))).toBe(false);

      // O joker sozinho nunca forma grupo (spec §2.6).
      expect(isBlocked(startGame(level([[0]])))).toBe(true);
    });
  });
});

describe("PuzzleSession — selos (plano §6.2)", () => {
  const limpar = (s: ReturnType<typeof startPuzzle>) => {
    let g = s.game;
    g = tap(g, packed(0, 0));
    g = tap(g, packed(0, 1));
    g = tap(g, packed(1, 0));
    return { ...s, game: g };
  };

  it("não há selo enquanto o tabuleiro não estiver limpo", () => {
    expect(seal(startPuzzle(level(BOARD)))).toBeUndefined();
  });

  it("perfeito: sem undo, sem reinício, sem dicas", () => {
    expect(seal(limpar(startPuzzle(level(BOARD))))).toBe("perfect");
  });

  it("o perfeito perde-se à primeira dica, e fica limpo", () => {
    let s = startPuzzle(level(BOARD, [L_GROUP]));
    s = usePuzzleHint(s).state;
    s = limpar(s);

    expect(seal(s)).toBe("clean");
  });

  it("o limpo perde-se ao primeiro undo", () => {
    let s = startPuzzle(level(BOARD));
    s = limpar(s);
    s = undoPuzzle(s);
    s = limpar(s);

    expect(seal(s)).toBe("completed");
  });

  it("o limpo perde-se ao primeiro reinício", () => {
    let s = startPuzzle(level(BOARD));
    s = restartPuzzle(s);
    s = limpar(s);

    expect(seal(s)).toBe("completed");
  });

  it("as dicas esgotam-se, e o undo não", () => {
    let s = startPuzzle(level(BOARD, [L_GROUP]), { hintsPerLevel: 1 });

    s = usePuzzleHint(s).state;
    expect(s.hintsLeft).toBe(0);

    const esgotada = usePuzzleHint(s);
    expect(esgotada.result).toBeUndefined();
    expect(esgotada.state.game.hints).toBe(1); // não contou a que não deu

    // O undo continua disponível, sempre.
    s = { ...s, game: tap(s.game, packed(0, 0)) };
    expect(undoPuzzle(s).game.selection).toEqual([]);
  });

  it("reiniciar devolve as dicas", () => {
    let s = startPuzzle(level(BOARD, [L_GROUP]), { hintsPerLevel: 2 });
    s = usePuzzleHint(s).state;
    expect(s.hintsLeft).toBe(1);

    s = restartPuzzle(s, { hintsPerLevel: 2 });
    expect(s.hintsLeft).toBe(2);
  });
});

describe("combos (spec §4.3)", () => {
  it("a primeira jogada nunca encadeia", () => {
    const e = registerMove(startCombo(), 2, 1000);

    expect(e.chained).toBe(false);
    expect(e.state.count).toBe(1);
  });

  it("encadeia dentro da janela e quebra fora dela", () => {
    let c = startCombo();

    c = registerMove(c, 2, 1000).state;
    const dentro = registerMove(c, 2, 2000, {
      windowMs: 2500,
      bigGroupSize: 5,
    });
    expect(dentro.chained).toBe(true);
    expect(dentro.state.count).toBe(2);

    const fora = registerMove(c, 2, 9000, { windowMs: 2500, bigGroupSize: 5 });
    expect(fora.chained).toBe(false);
    expect(fora.state.count).toBe(1);
  });

  it("guarda o melhor encadeamento da sessão", () => {
    let c = startCombo();
    c = registerMove(c, 2, 0).state;
    c = registerMove(c, 2, 500).state;
    c = registerMove(c, 2, 1000).state;
    expect(c.best).toBe(3);

    c = registerMove(c, 2, 99_000).state;
    expect(c.count).toBe(1);
    expect(c.best).toBe(3);
  });

  it("marca os grupos grandes", () => {
    expect(registerMove(startCombo(), 5, 0).big).toBe(true);
    expect(registerMove(startCombo(), 4, 0).big).toBe(false);
  });

  it("quebrar o combo impede que o intervalo seguinte encadeie", () => {
    let c = registerMove(startCombo(), 2, 1000).state;
    c = breakCombo(c);

    expect(registerMove(c, 2, 1100).chained).toBe(false);
  });
});

describe("pontuação", () => {
  it("um grupo grande vale mais do que as peças soltas equivalentes", () => {
    // Um grupo de 4 contra dois pares: a mesma contagem de peças.
    expect(moveScore(4, 1)).toBeGreaterThan(2 * moveScore(2, 1));
  });

  it("o combo multiplica, e tem teto", () => {
    expect(comboMultiplier(1)).toBe(1);
    expect(comboMultiplier(3)).toBeGreaterThan(comboMultiplier(2));
    expect(comboMultiplier(999)).toBe(3);
  });

  it("um grupo vazio não pontua", () => {
    expect(moveScore(0, 5)).toBe(0);
  });
});

describe("TimeAttackSession (plano §6.3)", () => {
  it("o relógio é injetado — a mesma entrada dá sempre o mesmo estado", () => {
    const a = startTimeAttack(level(BOARD), 1_000);
    const b = startTimeAttack(level(BOARD), 1_000);

    expect(a).toEqual(b);
    expect(a.deadlineAt).toBe(1_000 + DEFAULT_TIME_ATTACK.initialMs);
  });

  it("o tempo que resta é o prazo menos agora, e nunca é negativo", () => {
    const s = startTimeAttack(level(BOARD), 0);

    expect(remainingMs(s, 0)).toBe(DEFAULT_TIME_ATTACK.initialMs);
    expect(remainingMs(s, 999_999)).toBe(0);
    expect(isOver(s, 999_999)).toBe(true);
  });

  it("recusa níveis com joker, por desenho", () => {
    expect(() => startTimeAttack(level([[0, 2], [2]]), 0)).toThrow(
      JokerInTimeAttackError,
    );
  });

  it("limpar o tabuleiro adiciona tempo ao relógio", () => {
    let s = startTimeAttack(level(BOARD), 0);
    const prazo = s.deadlineAt;

    s = tapTimeAttack(s, packed(0, 0), 0).state;
    s = tapTimeAttack(s, packed(0, 1), 10).state;
    const r = tapTimeAttack(s, packed(1, 0), 20);

    expect(r.cleared).toBe(true);
    expect(r.state.boardsCleared).toBe(1);
    expect(r.state.deadlineAt).toBeGreaterThan(prazo);
  });

  it("um tabuleiro leva sempre soma / 7 jogadas", () => {
    expect(jogadasDe(BOARD)).toBe(1);
    expect(jogadasDe([[1, 6], [2, 5], [3, 4]])).toBe(3);
  });

  it("o prémio é jogadas × ritmo exigido", () => {
    const seis: Board = [[1, 6], [2, 5], [3, 4], [1, 6], [2, 5], [3, 4]];

    expect(boardReward(0, seis)).toBe(6 * DEFAULT_TIME_ATTACK.ritmoInicialMs);
    expect(boardReward(5, seis)).toBe(Math.round(6 * ritmoExigido(5)));
  });

  it("limpar o primeiro tabuleiro devolve exatamente o seu prémio", () => {
    let s = startTimeAttack(level(BOARD), 0);
    const prazo = s.deadlineAt;

    s = tapTimeAttack(s, packed(0, 0), 0).state;
    s = tapTimeAttack(s, packed(0, 1), 10).state;
    const r = tapTimeAttack(s, packed(1, 0), 20);

    // Uma jogada só: não há combo, e o prémio é uma jogada ao ritmo inicial.
    expect(r.gainedMs).toBe(boardReward(0, BOARD));
    expect(r.state.deadlineAt).toBe(prazo + boardReward(0, BOARD));
  });

  /*
   * O defeito que isto corrige: o prémio tinha piso, e o piso era um ponto de
   * equilíbrio. Quem jogava abaixo dele nunca perdia. A escada de tamanho para
   * no sexto degrau — não há tabuleiros maiores para gerar — mas o ritmo tem de
   * continuar a apertar depois dela, senão a corrida volta a ter um patamar.
   */
  it("**o ritmo exigido aperta a cada tabuleiro, e nunca para** — nem depois da escada", () => {
    for (let n = 0; n < 200; n++) {
      expect(ritmoExigido(n + 1)).toBeLessThan(ritmoExigido(n));
    }
    expect(ritmoExigido(DEGRAUS + 10)).toBeLessThan(ritmoExigido(DEGRAUS));
  });

  /*
   * O combo devolvia `(n − 1) × 750ms` por jogada, sem teto: num encadeamento
   * longo pagava a corrida sozinho.
   */
  it("o tempo do combo tem teto por jogada", () => {
    const pares = level(Array.from({ length: 8 }, (): Cell[] => [1, 6]));
    let s = startTimeAttack(pares, 0);
    const ganhos: number[] = [];

    for (let k = 0; k < 8; k++) {
      s = tapTimeAttack(s, packed(0, 0), k * 1000).state;
      const r = tapTimeAttack(s, packed(0, 1), k * 1000 + 500);
      s = r.state;
      if (!r.cleared) ganhos.push(r.gainedMs);
    }

    expect(Math.max(...ganhos)).toBe(DEFAULT_TIME_ATTACK.comboTetoMs);
  });

  /*
   * A propriedade que importa, medida pelo caminho todo: um jogador
   * impossivelmente rápido — uma jogada por segundo, sempre em combo — acaba
   * por perder. Com o prémio antigo, esta corrida não acabava.
   */
  it("**nenhum ritmo aguenta para sempre**: a 1s por jogada, a corrida acaba", () => {
    const pares = level(Array.from({ length: 6 }, (): Cell[] => [1, 6]));
    let s = startTimeAttack(pares, 0);
    let agora = 0;

    while (!isOver(s, agora) && s.boardsCleared < 1000) {
      s = tapTimeAttack(s, packed(0, 0), agora).state;
      agora += 500;
      const r = tapTimeAttack(s, packed(0, 1), agora);
      agora += 500;
      s = r.cleared ? nextBoard(r.state, pares) : r.state;
    }

    expect(isOver(s, agora)).toBe(true);
    expect(s.boardsCleared).toBeLessThan(1000);
    // E vai bem além da escada: acaba por causa do ritmo, não do tamanho.
    expect(s.boardsCleared).toBeGreaterThan(DEGRAUS * 5);
  });

  describe("passar de 7 custa tempo", () => {
    /** 5+2 e 3+4, em colunas soltas: o 5 seguido do 3 passa de 7. */
    const QUATRO: Board = [[5], [3], [4], [2]];

    it("um toque que passaria de 7 tira tempo e quebra o combo", () => {
      let s = startTimeAttack(level(QUATRO), 0);
      s = { ...s, combo: { count: 3, best: 3, lastMoveAt: 0 } };
      s = tapTimeAttack(s, packed(0, 0), 100).state;

      const r = tapTimeAttack(s, packed(1, 0), 200);

      expect(r.penalizado).toBe(true);
      expect(r.perdidoMs).toBe(DEFAULT_TIME_ATTACK.penalizacaoMs);
      expect(r.state.deadlineAt).toBe(s.deadlineAt - DEFAULT_TIME_ATTACK.penalizacaoMs);
      expect(r.state.combo.count).toBe(0);
      // A recusa não mexe na seleção: o 5 continua lá, à espera do 2.
      expect(r.state.game.selection).toEqual([packed(0, 0)]);
    });

    it("cada toque errado custa outra vez", () => {
      let s = startTimeAttack(level(QUATRO), 0);
      s = tapTimeAttack(s, packed(0, 0), 0).state;
      const prazo = s.deadlineAt;

      s = tapTimeAttack(s, packed(1, 0), 10).state;
      s = tapTimeAttack(s, packed(2, 0), 20).state;

      expect(s.deadlineAt).toBe(prazo - 2 * DEFAULT_TIME_ATTACK.penalizacaoMs);
    });

    it("tirar uma peça da seleção, ou tocar fora das peças, não custa nada", () => {
      let s = startTimeAttack(level(QUATRO), 0);
      const prazo = s.deadlineAt;

      s = tapTimeAttack(s, packed(0, 0), 0).state;
      const fora = tapTimeAttack(s, packed(0, 0), 10);
      const vazio = tapTimeAttack(fora.state, packed(9, 9), 20);

      expect(fora.penalizado).toBe(false);
      expect(vazio.penalizado).toBe(false);
      expect(vazio.state.deadlineAt).toBe(prazo);
    });
  });
});

describe("a peça-bomba", () => {
  /** 3+4 numa base comum; o 5 em cima do 3 não entra em grupo nenhum. */
  const TORRE: Board = [[3, 4, 5], [4], [2]];

  const sempre = {
    ...DEFAULT_TIME_ATTACK,
    bomba: { ...DEFAULT_TIME_ATTACK.bomba, probabilidade: 1 },
  };

  /** Uma corrida já com tabuleiros limpos que cheguem para haver bomba. */
  const elegivel = (board: Board, now = 0): TimeAttackState => ({
    ...startTimeAttack(level(board), now),
    boardsCleared: DEFAULT_TIME_ATTACK.bomba.desdeTabuleiro,
  });

  const armada = (board: Board, at: number, rebentaEm: number): TimeAttackState => ({
    ...elegivel(board),
    bomba: { at, rebentaEm },
  });

  it("não aparece nos primeiros tabuleiros", () => {
    const s = startTimeAttack(level(TORRE), 0);
    expect(armarBomba(s, 0, mulberry32(1), sempre).bomba).toBeUndefined();
  });

  it("com probabilidade zero, nunca aparece", () => {
    const nunca = {
      ...DEFAULT_TIME_ATTACK,
      bomba: { ...DEFAULT_TIME_ATTACK.bomba, probabilidade: 0 },
    };
    for (let seed = 0; seed < 50; seed++) {
      expect(armarBomba(elegivel(TORRE), 0, mulberry32(seed), nunca).bomba).toBeUndefined();
    }
  });

  it("arma com o pavio a contar a partir de agora", () => {
    const s = armarBomba(elegivel(TORRE, 1000), 1000, mulberry32(1), sempre);

    expect(s.bomba?.rebentaEm).toBe(1000 + DEFAULT_TIME_ATTACK.bomba.pavioMs);
    expect(pavioRestante(s, 1000)).toBe(DEFAULT_TIME_ATTACK.bomba.pavioMs);
  });

  /*
   * Uma bomba numa peça sem parceiro à vista seria uma penalização garantida, e
   * não uma prioridade. Em `[[6], [6], [1]]` o primeiro 6 não tem com quem
   * somar 7.
   */
  it("**só arma peças que se podem jogar já**", () => {
    const vistas = new Set<number>();
    for (let seed = 0; seed < 100; seed++) {
      const s = armarBomba(elegivel([[6], [6], [1]]), 0, mulberry32(seed), sempre);
      if (s.bomba !== undefined) vistas.add(s.bomba.at);
    }

    expect(vistas).toEqual(new Set([packed(1, 0), packed(2, 0)]));
  });

  it("a mesma seed arma sempre a mesma peça", () => {
    const a = armarBomba(elegivel(TORRE), 0, mulberry32(42), sempre);
    const b = armarBomba(elegivel(TORRE), 0, mulberry32(42), sempre);
    expect(a.bomba).toEqual(b.bomba);
  });

  it("antes do fim do pavio não acontece nada", () => {
    const s = armada(TORRE, packed(0, 0), 5000);
    const r = resolverBomba(s, 4999);

    expect(r.rebentou).toBeUndefined();
    expect(r.state).toBe(s);
  });

  it("ao fim do pavio rebenta: tira tempo, quebra o combo, e a peça fica", () => {
    let s = armada(TORRE, packed(0, 0), 5000);
    s = { ...s, combo: { count: 4, best: 4, lastMoveAt: 4000 } };

    const r = resolverBomba(s, 5000);

    expect(r.rebentou).toBe(packed(0, 0));
    expect(r.perdidoMs).toBe(DEFAULT_TIME_ATTACK.bomba.penalizacaoMs);
    expect(r.state.bomba).toBeUndefined();
    expect(r.state.deadlineAt).toBe(s.deadlineAt - DEFAULT_TIME_ATTACK.bomba.penalizacaoMs);
    expect(r.state.combo.count).toBe(0);
    // A peça não sai: sem ela a soma deixava de dar múltiplo de 7.
    expect(r.state.game.board).toBe(s.game.board);
  });

  it("um toque depois do fim do pavio já não desarma", () => {
    let s = armada(TORRE, packed(0, 0), 5000);
    s = tapTimeAttack(s, packed(0, 0), 4000).state;

    const r = tapTimeAttack(s, packed(1, 0), 6000);

    expect(r.moved).toBe(true);
    expect(r.desarmou).toBe(false);
    expect(r.rebentou).toBe(packed(0, 0));
    expect(r.perdidoMs).toBe(DEFAULT_TIME_ATTACK.bomba.penalizacaoMs);
  });

  it("sair numa jogada desarma-a, e depois disso já não rebenta", () => {
    let s = armada(TORRE, packed(0, 0), 5000);
    s = tapTimeAttack(s, packed(0, 0), 1000).state;
    const r = tapTimeAttack(s, packed(1, 0), 2000);

    expect(r.desarmou).toBe(true);
    expect(r.state.bomba).toBeUndefined();
    expect(resolverBomba(r.state, 99_999).rebentou).toBeUndefined();
  });

  /*
   * Tirar o 3 de baixo e a coluna do 4 faz o 5 descer uma linha. A bomba tem
   * de ir com ele — senão passava a ameaçar a peça que caiu para o sítio antigo.
   */
  it("**acompanha a peça na gravidade e no colapso**", () => {
    let s = armada(TORRE, packed(0, 2), 50_000);
    s = tapTimeAttack(s, packed(0, 0), 0).state;
    const r = tapTimeAttack(s, packed(1, 0), 10);

    expect(r.moved).toBe(true);
    expect(r.desarmou).toBe(false);
    expect(r.state.bomba?.at).toBe(packed(0, 1));
    expect(r.state.game.board[0]?.[1]).toBe(5);
  });

  it("o tabuleiro seguinte chega sem bomba", () => {
    const s = nextBoard(armada(TORRE, packed(0, 0), 5000), level(TORRE));
    expect(s.bomba).toBeUndefined();
  });

  it("depois do fim da corrida já não rebenta", () => {
    const s = armada(TORRE, packed(0, 0), 5000);
    const r = resolverBomba(s, s.deadlineAt + 1);
    expect(r.rebentou).toBeUndefined();
  });

  it("se rebentar leva o resto do relógio, o toque já não conta", () => {
    const base = armada(TORRE, packed(0, 0), 5000);
    let s = { ...base, deadlineAt: 8000 };
    s = tapTimeAttack(s, packed(0, 0), 1000).state;

    const r = tapTimeAttack(s, packed(1, 0), 6000);

    expect(r.rebentou).toBe(packed(0, 0));
    expect(r.moved).toBe(false);
    expect(isOver(r.state, 6000)).toBe(true);
  });
});

describe("a escada de tamanho do modo tempo", () => {
  /** Níveis com contagens de peças distintas, por ordem baralhada. */
  const escadote = (contagens: readonly number[]): readonly Level[] =>
    contagens.map((n, i) => ({
      id: `t-${String(i)}`,
      seed: i,
      // Uma coluna de `n` uns: o que importa aqui é o número de peças.
      board: [Array.from({ length: n }, () => 1 as const)],
      solution: [] as never,
    }));

  const pecas = (l: Level): number => l.board[0]?.length ?? 0;

  it("**um tabuleiro por degrau**, do mais pequeno ao maior", () => {
    const niveis = escadote([24, 10, 18, 12, 22, 14, 20, 16, 11]);
    const e = escadaDeTamanho(niveis, mulberry32(1), 9);

    expect(e.ordem).toHaveLength(9);

    const tamanhos = e.ordem.map(pecas);
    expect([...tamanhos].sort((a, b) => a - b)).toEqual(tamanhos);
  });

  /*
   * Era este o erro a evitar. Com cinco níveis por degrau, jogar todos antes de
   * subir fazia o jogador ver cinco tabuleiros de dez peças seguidos — e a
   * corrida acabava-lhe antes de chegar a ver um tabuleiro grande.
   */
  it("com vários níveis por degrau, ainda assim sobe a cada tabuleiro", () => {
    // Cinco níveis em cada um de três tamanhos.
    const niveis = escadote([10, 10, 10, 10, 10, 20, 20, 20, 20, 20, 30, 30, 30, 30, 30]);
    const e = escadaDeTamanho(niveis, mulberry32(7), 3);

    expect(e.ordem.map(pecas)).toEqual([10, 20, 30]);
  });

  /*
   * Depois do último degrau o jogo continua, e continua **em cima**. O
   * `% ordem.length` antigo devolvia o jogador ao primeiro tabuleiro: a
   * dificuldade descia no momento em que ele mais tinha provado merecer que
   * subisse.
   */
  it("**depois da escada nunca se volta ao princípio** — sai sempre do cume", () => {
    const niveis = escadote([10, 12, 14, 16, 18, 20, 22, 24, 26, 28]);
    const rng = mulberry32(3);
    const e = escadaDeTamanho(niveis, rng, 5);

    const maior = Math.max(...niveis.map(pecas));
    const menor = Math.min(...niveis.map(pecas));

    for (let n = e.ordem.length; n < e.ordem.length + 30; n++) {
      const seguinte = nivelDoTabuleiro(e, n, rng);
      expect(seguinte).toBeDefined();
      expect(pecas(seguinte as Level)).toBeGreaterThan(menor);
      expect(pecas(seguinte as Level)).toBeLessThanOrEqual(maior);
      expect(e.cume).toContain(seguinte);
    }
  });

  it("baralha dentro do degrau — duas corridas não dão a mesma sequência", () => {
    const niveis = escadote(Array.from({ length: 45 }, (_, i) => 10 + Math.floor(i / 5)));

    const a = escadaDeTamanho(niveis, mulberry32(1)).ordem.map((l) => l.id);
    const b = escadaDeTamanho(niveis, mulberry32(2)).ordem.map((l) => l.id);

    expect(a).not.toEqual(b);
  });

  it("aguenta um pack mais curto do que a escada sem degraus vazios", () => {
    const e = escadaDeTamanho(escadote([10, 20, 30]), mulberry32(1), 9);

    expect(e.ordem.length).toBeGreaterThan(0);
    expect(e.ordem.every((l) => l !== undefined)).toBe(true);
    expect(e.cume.length).toBeGreaterThan(0);
  });

  it("sem níveis nenhuns não rebenta", () => {
    const e = escadaDeTamanho([], mulberry32(1));

    expect(e.ordem).toEqual([]);
    expect(nivelDoTabuleiro(e, 0, mulberry32(1))).toBeUndefined();
  });

  it("depois do fim do tempo, nada mais conta", () => {
    const s = startTimeAttack(level(BOARD), 0);
    const tarde = s.deadlineAt + 1;

    const r = tapTimeAttack(s, packed(0, 0), tarde);
    expect(r.moved).toBe(false);
    expect(r.state).toBe(s);
  });

  it("o combo não atravessa tabuleiros", () => {
    let s = startTimeAttack(level(BOARD), 0);
    s = tapTimeAttack(s, packed(0, 0), 0).state;
    s = tapTimeAttack(s, packed(0, 1), 10).state;
    s = tapTimeAttack(s, packed(1, 0), 20).state;

    s = nextBoard(s, level(BOARD));
    expect(s.combo.count).toBe(0);
    expect(s.combo.lastMoveAt).toBeUndefined();
  });

  it("a pontuação e o relógio sobrevivem à mudança de tabuleiro", () => {
    let s = startTimeAttack(level(BOARD), 0);
    s = tapTimeAttack(s, packed(0, 0), 0).state;
    s = tapTimeAttack(s, packed(0, 1), 10).state;
    s = tapTimeAttack(s, packed(1, 0), 20).state;

    const pontos = s.score;
    const prazo = s.deadlineAt;

    s = nextBoard(s, level(BOARD));
    expect(s.score).toBe(pontos);
    expect(s.deadlineAt).toBe(prazo);
  });
});

describe("progresso", () => {
  it("um perfil novo vai e volta do armazenamento", () => {
    const storage = memoryStorage();
    const p = recordLevel(emptyProfile(), "meio-000015", "clean");

    save(storage, p);
    expect(load(storage)).toEqual(p);
  });

  it("sem nada gravado, dá perfil vazio", () => {
    expect(load(memoryStorage())).toEqual(emptyProfile());
  });

  it("o selo nunca regride", () => {
    let p = recordLevel(emptyProfile(), "x", "perfect");
    p = recordLevel(p, "x", "completed");

    expect(p.levels["x"]?.seal).toBe("perfect");
  });

  it("um selo melhor substitui o anterior", () => {
    let p = recordLevel(emptyProfile(), "x", "completed");
    p = recordLevel(p, "x", "perfect");

    expect(p.levels["x"]?.seal).toBe("perfect");
  });

  it("guarda os melhores do modo tempo", () => {
    let p = recordTimeAttack(emptyProfile(), 5000, 7);
    p = recordTimeAttack(p, 3000, 9);

    expect(p.bestTimeAttackScore).toBe(5000);
    expect(p.bestBoardsCleared).toBe(9);
  });

  /*
   * ── O Survival não tinha um único teste aqui, e custou ──
   *
   * A `recordSurvival` gravava as duas marcas presas a uma condição só: ter
   * limpado o tabuleiro, e mais depressa do que a melhor limpeza anterior. Quem
   * transbordava não gravava nada — que é como a esmagadora maioria das corridas
   * acaba — e quem limpava devagar também não. Nada exercitava a função,
   * portanto nada o disse.
   */
  describe("guarda os melhores do Survival", () => {
    it("transbordar também grava o tempo", () => {
      const p = recordSurvival(emptyProfile(), false, 244_000);

      // Morrer ao fim de quatro minutos é ter sobrevivido quatro minutos.
      expect(p.bestSurvivalMs).toBe(244_000);
      expect(p.survivalClears).toBe(0);
    });

    it("maior é melhor, e não menor", () => {
      let p = recordSurvival(emptyProfile(), false, 244_000);
      // A limpeza-relâmpago do arranque: um bom desfecho, mas não uma sobrevida.
      p = recordSurvival(p, true, 20_000);

      expect(p.bestSurvivalMs).toBe(244_000);
    });

    it("o tempo e as limpezas não se estorvam", () => {
      // A grande corrida aguentou muito, mas transbordou.
      let p = recordSurvival(emptyProfile(), false, 300_000);
      // A pequena limpou o tabuleiro cedo.
      p = recordSurvival(p, true, 20_000);

      // Cada uma guarda o que fez de melhor, sem anular a outra.
      expect(p.bestSurvivalMs).toBe(300_000);
      expect(p.survivalClears).toBe(1);
    });

    it("as limpezas somam-se", () => {
      let p = recordSurvival(emptyProfile(), true, 90_000);
      p = recordSurvival(p, true, 40_000);
      p = recordSurvival(p, false, 5_000);

      expect(p.survivalClears).toBe(2);
      expect(p.bestSurvivalMs).toBe(90_000);
    });

    /*
     * O `bestSurvivalMs` é campo antigo com significado novo: era o tempo mais
     * curto a limpar, e passou a ser o maior tempo sobrevivido. É o caso que
     * costuma obrigar a descartar o gravado — e aqui não obriga, porque quem
     * limpou em 91 segundos também sobreviveu 91 segundos. O valor antigo
     * continua verdadeiro na leitura nova.
     */
    it("um perfil antigo continua a valer, e a campanha fica intacta", () => {
      const antigo = JSON.stringify({
        version: PROFILE_VERSION,
        levels: { "inicio-000001": { seal: "perfect", bestTimeMs: 4000 } },
        bestTimeAttackScore: 1200,
        bestBoardsCleared: 4,
        bestSurvivalMs: 91_000,
        bestSurvivalRows: 3,
        sawJokerTutorial: true,
      });

      const p = load({ getItem: () => antigo, setItem: () => undefined });

      expect(p.bestSurvivalMs).toBe(91_000);
      // Campo novo: ninguém tinha limpezas contadas antes de elas se contarem.
      expect(p.survivalClears).toBe(0);
      expect(p.levels["inicio-000001"]?.seal).toBe("perfect");
      expect(p.bestTimeAttackScore).toBe(1200);
    });
  });

  /*
   * Um perfil corrompido chega do disco de um telefone com naturalidade. Perder
   * progresso é mau; não abrir o jogo é pior.
   */
  describe("resiste a lixo no armazenamento", () => {
    const comRaw = (raw: string): ProfileStorage => ({
      getItem: () => raw,
      setItem: () => undefined,
    });

    it("JSON inválido", () => {
      expect(load(comRaw("{isto não é json"))).toEqual(emptyProfile());
    });

    it("JSON válido que não é objeto", () => {
      expect(load(comRaw("42"))).toEqual(emptyProfile());
    });

    it("versão desconhecida", () => {
      expect(load(comRaw(JSON.stringify({ version: 99 })))).toEqual(
        emptyProfile(),
      );
    });

    it("níveis com campos de outro tipo são descartados um a um", () => {
      const raw = JSON.stringify({
        version: PROFILE_VERSION,
        levels: {
          bom: { seal: "clean", bestMoves: 4 },
          mau: { seal: "inventado", bestMoves: 4 },
          pior: "isto devia ser um objeto",
        },
        bestTimeAttackScore: "não é número",
        bestBoardsCleared: 3,
      });

      const p = load(comRaw(raw));

      expect(Object.keys(p.levels)).toEqual(["bom"]);
      // O `bestMoves` dos perfis antigos entra no JSON e não sai do outro lado;
      // o `bestTimeMs`, que eles não têm, entra a zero.
      expect(p.levels["bom"]).toEqual({ seal: "clean", bestTimeMs: 0 });
      expect(p.bestTimeAttackScore).toBe(0);
      expect(p.bestBoardsCleared).toBe(3);
    });
  });

  it("a chave é estável — mudá-la apaga o progresso de toda a gente", () => {
    expect(PROFILE_KEY).toBe("dicetoseven.profile");
  });
});

/* ─── O recorde de tempo por nível ───────────────────────────────────────────
 *
 * Substituiu os pontos, que mediam ±14% de margem e premiavam a estratégia que
 * encrava o nível. O tempo é a única coisa que o jogador controla e melhora.
 */
describe("o melhor tempo por nível", () => {
  it("guarda o primeiro, e depois só o que for menor", () => {
    let p = recordLevel(emptyProfile(), "x", "clean", 9000);
    expect(p.levels["x"]?.bestTimeMs).toBe(9000);

    p = recordLevel(p, "x", "clean", 12_000);
    expect(p.levels["x"]?.bestTimeMs).toBe(9000);

    p = recordLevel(p, "x", "clean", 7500);
    expect(p.levels["x"]?.bestTimeMs).toBe(7500);
  });

  it("zero não é um tempo — é a ausência dele", () => {
    // Sem isto, o primeiro nível acabado ficava com um recorde de 0:00.0 que
    // nunca mais se batia.
    let p = recordLevel(emptyProfile(), "x", "clean", 0);
    expect(p.levels["x"]?.bestTimeMs).toBe(0);

    p = recordLevel(p, "x", "clean", 5000);
    expect(p.levels["x"]?.bestTimeMs).toBe(5000);

    p = recordLevel(p, "x", "clean", 0);
    expect(p.levels["x"]?.bestTimeMs).toBe(5000);
  });

  it("o selo e o tempo melhoram cada um por sua conta", () => {
    // Um jogo mais rápido mas com dica não pode apagar o selo Perfeito, e um
    // jogo Perfeito mais lento não pode apagar o recorde.
    let p = recordLevel(emptyProfile(), "x", "perfect", 20_000);
    p = recordLevel(p, "x", "completed", 8000);

    expect(p.levels["x"]?.seal).toBe("perfect");
    expect(p.levels["x"]?.bestTimeMs).toBe(8000);
  });

  it("vai e volta do armazenamento", () => {
    const storage = memoryStorage();
    const p = recordLevel(emptyProfile(), "meio-000015", "clean", 4321);

    save(storage, p);
    expect(load(storage).levels["meio-000015"]?.bestTimeMs).toBe(4321);
  });
});
