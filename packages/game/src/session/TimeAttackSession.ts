/**
 * Modo Tempo — time attack contínuo (plano §6.3).
 *
 * **Relógio único**, que corre sempre. Cada tabuleiro limpo *adiciona* tempo; a
 * corrida acaba quando o jogador deixa de acompanhar a exigência crescente. Não
 * há countdown por nível — cria momentos mortos e fim abrupto, e o plano
 * descarta-o explicitamente.
 *
 * Sem undo e sem joker, e nenhuma das duas coisas é arbitrária. Os níveis deste
 * modo são greedy-safe: **não há como bloquear**, portanto o undo não teria o
 * que corrigir. E o joker reduz precisamente a carga de reconhecimento que é o
 * desafio, além de exigir um tempo de reflexão que o relógio não dá.
 *
 * O tempo é guardado como **instante-limite**, não como saldo. Assim o relógio
 * anda sozinho e não é preciso ninguém decrementá-lo: o que resta é sempre
 * `deadline − agora`. Nenhuma função aqui lê o relógio do sistema — `now` entra
 * por parâmetro, que é o que torna isto testável (plano, fase 7).
 */

import type { Level, Packed, Rng } from "@dicetoseven/engine";
import { jokerAt, pieceCount, shuffled } from "@dicetoseven/engine";

import type { ComboState } from "./combos";
import { DEFAULT_COMBO_CONFIG, breakCombo, registerMove, startCombo } from "./combos";
import type { ComboConfig } from "./combos";
import type { GameState } from "./GameSession";
import { isFinished, startGame, tap } from "./GameSession";
import type { ScoringConfig } from "./scoring";
import { DEFAULT_SCORING, moveScore } from "./scoring";

export interface TimeAttackConfig {
  /** Generoso, para o jogador entrar em flow antes da pressão (plano §6.3). */
  readonly initialMs: number;
  /** Tempo concedido pelo primeiro tabuleiro limpo. */
  readonly perBoardMs: number;
  /**
   * Quanto o prémio por tabuleiro encolhe a cada tabuleiro já limpo.
   *
   * É isto que faz a corrida acabar: sem decaimento, um jogador competente
   * jogaria para sempre. O plano pede que o prémio decresça, ou pelo menos que
   * cresça mais devagar do que a exigência.
   *
   * **O decaimento e a escada de tamanho aterram juntos.** O prémio chega ao
   * piso no mesmo tabuleiro em que os tabuleiros deixam de crescer, e daí para
   * a frente as duas coisas ficam quietas: tabuleiro no máximo, prémio no piso.
   * Ver `escadaDeTamanho`.
   */
  readonly perBoardDecayMs: number;
  /** Piso do prémio por tabuleiro. Daqui para baixo não desce mais. */
  readonly minPerBoardMs: number;
  /** Tempo por cada nível de combo acima do primeiro. */
  readonly comboBonusMs: number;
  /** Tempo por peça acima do limiar, num grupo grande. */
  readonly bigGroupBonusMs: number;
}

/**
 * Valores de partida. **Os dois primeiros são os parâmetros que o plano manda
 * afinar em playtest**, e é por isso que vivem em configuração e não no código.
 */
export const DEFAULT_TIME_ATTACK: TimeAttackConfig = {
  initialMs: 90_000,
  perBoardMs: 30_000,
  /*
   * De 30s a 10s em cinco passos, que é o comprimento da escada de tamanho —
   * ver `DEGRAUS`. Antes eram 1,5s por tabuleiro até 8s, um piso que só chegava
   * ao décimo quinto tabuleiro, muito depois de a exigência ter parado de
   * subir: os dois eixos nunca se encontravam.
   */
  perBoardDecayMs: 4_000,
  minPerBoardMs: 10_000,
  comboBonusMs: 750,
  bigGroupBonusMs: 400,
};

export interface TimeAttackState {
  readonly game: GameState;
  readonly combo: ComboState;
  readonly score: number;
  readonly boardsCleared: number;
  /** Instante em que a corrida acaba, se nada mais for ganho. */
  readonly deadlineAt: number;
  readonly startedAt: number;
}

export class JokerInTimeAttackError extends Error {
  constructor(levelId: string) {
    super(
      `o nível ${levelId} tem joker, e o modo tempo não o admite (plano §6.3)`,
    );
    this.name = "JokerInTimeAttackError";
  }
}

export function startTimeAttack(
  level: Level,
  now: number,
  config: TimeAttackConfig = DEFAULT_TIME_ATTACK,
): TimeAttackState {
  assertNoJoker(level);

  return {
    game: startGame(level),
    combo: startCombo(),
    score: 0,
    boardsCleared: 0,
    deadlineAt: now + config.initialMs,
    startedAt: now,
  };
}

export const remainingMs = (s: TimeAttackState, now: number): number =>
  Math.max(0, s.deadlineAt - now);

export const isOver = (s: TimeAttackState, now: number): boolean =>
  now >= s.deadlineAt;

/** Prémio do `n`-ésimo tabuleiro limpo, contando de 0. */
export function boardReward(
  cleared: number,
  config: TimeAttackConfig = DEFAULT_TIME_ATTACK,
): number {
  return Math.max(
    config.minPerBoardMs,
    config.perBoardMs - cleared * config.perBoardDecayMs,
  );
}

/* ─── A escada de tamanho ─────────────────────────────────────────────────── */

/**
 * Os níveis por ordem de tamanho, do mais pequeno ao maior.
 *
 * **A exigência tem de subir com a corrida.** Antes a ordem era um baralhar
 * puro: o quinto tabuleiro podia ser menor do que o primeiro, e a única coisa
 * que endurecia era o relógio. Um jogador competente passava vinte tabuleiros
 * sem que nada no ecrã mudasse de tamanho.
 *
 * Ordena por **número de peças** e não por colunas ou linhas. É a leitura que
 * ordena bem um tabuleiro alto e estreito contra um baixo e largo — e nenhuma
 * das duas dimensões sozinha o faz. Um 3×7 e um 7×3 exigem o mesmo, e é isso
 * que 21 peças diz e «7 linhas» não.
 *
 * **Baralha dentro de cada tamanho.** Sem isto, duas corridas seguidas davam
 * exatamente a mesma sequência e o modo virava um exercício de memória — que é
 * a razão pela qual o baralhar existia.
 *
 * `topo` é quantos níveis do fim partilham o maior tamanho. É por ele que o
 * ecrã volta atrás quando a lista acaba: reentrar pelo princípio devolvia o
 * jogador a tabuleiros de dez peças depois de ele ter chegado aos maiores, o
 * que é a dificuldade a **descer** no momento em que ele mais provou merecer
 * que subisse.
 */
/**
 * Quantos tabuleiros o jogador sobe antes de o tamanho parar de crescer.
 *
 * **Seis, e não é um número solto**: é o mesmo que leva o prémio de tempo de
 * 30s ao piso de 10s, a 4s por tabuleiro. Os dois eixos aterram juntos — o
 * tabuleiro para de crescer no tabuleiro em que o prémio para de encolher — e
 * o pack tem seis janelas de tamanho pela mesma razão. Mexer num destes três
 * números sem mexer nos outros dois desalinha a corrida inteira, e há um teste
 * de cada lado a exigi-lo.
 *
 * Seis é o que a garantia do modo permite, não o que se desejava. O tabuleiro
 * vai de 10 a 20 peças; acima disso não há tabuleiros impossíveis de bloquear
 * para gerar. Ver o comentário da banda `tempo`, em `tools/src/bands.ts`.
 */
export const DEGRAUS = 6;

/**
 * Um degrau por tabuleiro, e um nível sorteado dentro de cada degrau.
 *
 * O erro a evitar aqui é jogar **todos** os níveis de um tamanho antes de subir
 * ao seguinte: com cinco níveis por degrau, o jogador via cinco tabuleiros de
 * dez peças antes de o primeiro crescer, e a corrida acabava-lhe antes de ele
 * chegar a ver um tabuleiro grande. A escada sobe de tabuleiro para tabuleiro;
 * os outros níveis do degrau existem para as corridas seguintes serem
 * diferentes, não para serem jogados todos nesta.
 *
 * Os degraus são **quantis** do pack ordenado por peças, e não tamanhos
 * exatos. Assim o comprimento da escada é uma decisão de desenho — `DEGRAUS` —
 * e não o que a geração calhou produzir: um pack com dezassete contagens
 * distintas daria dezassete degraus e uma rampa que nenhuma corrida chega ao
 * fim.
 *
 * Ordena por **número de peças**. É a leitura que compara bem um tabuleiro alto
 * e estreito com um baixo e largo, e nenhuma das duas dimensões sozinha o faz:
 * um 3×7 e um 7×3 exigem o mesmo, e é isso que «21 peças» diz e «7 linhas» não.
 */
export interface Escada {
  /** Um nível por degrau, do mais pequeno ao maior. */
  readonly ordem: readonly Level[];
  /** Os níveis do degrau de cima, de onde sai tudo o que vem depois da escada. */
  readonly cume: readonly Level[];
}

export function escadaDeTamanho(
  niveis: readonly Level[],
  rng: Rng,
  degraus = DEGRAUS,
): Escada {
  if (niveis.length === 0) return { ordem: [], cume: [] };

  const ordenados = [...niveis].sort(
    (a, b) => pieceCount(a.board) - pieceCount(b.board),
  );

  /*
   * Quantis por posição, não por valor. Um pack encostado a um tamanho daria
   * degraus vazios se se cortasse pelo número de peças, e um degrau vazio é um
   * tabuleiro que não aparece.
   */
  const passo = ordenados.length / degraus;
  const tiers: Level[][] = [];
  for (let i = 0; i < degraus; i++) {
    const fatia = ordenados.slice(
      Math.floor(i * passo),
      Math.max(Math.floor((i + 1) * passo), Math.floor(i * passo) + 1),
    );
    if (fatia.length > 0) tiers.push(fatia);
  }

  const ordem = tiers.map((t) => escolher(t, rng));
  const cume = tiers[tiers.length - 1] ?? [];

  return { ordem, cume };
}

const escolher = <T>(xs: readonly T[], rng: Rng): T => {
  const [primeiro] = shuffled(rng, xs);
  if (primeiro === undefined) throw new Error("degrau vazio");
  return primeiro;
};

/**
 * O tabuleiro número `n` da corrida, contando de 0.
 *
 * Enquanto a escada dura, é o degrau `n`. Depois dela, é um nível sorteado do
 * cume — **nunca o regresso ao princípio**, que era o que o `% ordem.length`
 * antigo fazia: depois de chegar aos tabuleiros grandes, o jogador voltava aos
 * de dez peças. A dificuldade descia no momento em que ele mais tinha provado
 * merecer que subisse.
 */
export function nivelDoTabuleiro(
  escada: Escada,
  n: number,
  rng: Rng,
): Level | undefined {
  const degrau = escada.ordem[n];
  if (degrau !== undefined) return degrau;
  if (escada.cume.length === 0) return undefined;

  return escolher(escada.cume, rng);
}

export interface TimeAttackConfigs {
  readonly time?: TimeAttackConfig;
  readonly combo?: ComboConfig;
  readonly scoring?: ScoringConfig;
}

export interface TimeAttackTap {
  readonly state: TimeAttackState;
  /** A jogada aconteceu, em vez de a peça só entrar na seleção. */
  readonly moved: boolean;
  readonly gainedScore: number;
  readonly gainedMs: number;
  /** O tabuleiro ficou limpo com esta jogada. */
  readonly cleared: boolean;
}

/**
 * Tocar numa peça, com relógio.
 *
 * Depois do fim do tempo nada mais conta — a corrida acabou, e aceitar jogadas
 * seria pontuar tempo que o jogador já não tinha.
 */
export function tapTimeAttack(
  s: TimeAttackState,
  p: Packed,
  now: number,
  configs: TimeAttackConfigs = {},
): TimeAttackTap {
  const time = configs.time ?? DEFAULT_TIME_ATTACK;

  if (isOver(s, now)) {
    return { state: s, moved: false, gainedScore: 0, gainedMs: 0, cleared: false };
  }

  const before = s.game;
  const groupSize = before.selection.length + 1;
  const game = tap(before, p);
  const moved = game.history.length > before.history.length;

  if (!moved) {
    return {
      state: { ...s, game },
      moved: false,
      gainedScore: 0,
      gainedMs: 0,
      cleared: false,
    };
  }

  const event = registerMove(s.combo, groupSize, now, configs.combo);
  const scoring = configs.scoring ?? DEFAULT_SCORING;
  const comboCfg = configs.combo ?? DEFAULT_COMBO_CONFIG;

  const gainedScore = moveScore(groupSize, event.state.count, scoring);

  /*
   * Combos devolvem tempo — é o loop de reforço que sustenta o modo: jogar bem
   * compra espaço para jogar mais. E os grupos grandes valem mais por peça
   * acima do limiar, para dar razão ao jogador para os procurar em vez de
   * limpar só os pares.
   */
  const comboMs = event.chained
    ? (event.state.count - 1) * time.comboBonusMs
    : 0;

  const bigMs = event.big
    ? (groupSize - comboCfg.bigGroupSize + 1) * time.bigGroupBonusMs
    : 0;

  const cleared = isFinished(game);
  const clearMs = cleared ? boardReward(s.boardsCleared, time) : 0;
  const gainedMs = comboMs + bigMs + clearMs;

  return {
    state: {
      ...s,
      game,
      combo: event.state,
      score: s.score + gainedScore,
      boardsCleared: s.boardsCleared + (cleared ? 1 : 0),
      deadlineAt: s.deadlineAt + gainedMs,
    },
    moved: true,
    gainedScore,
    gainedMs,
    cleared,
  };
}

/**
 * Encadeia o tabuleiro seguinte, mantendo relógio e pontuação.
 *
 * O combo **não** atravessa tabuleiros: o intervalo entre a última jogada de um
 * e a primeira do seguinte inclui a transição, que não é ritmo do jogador.
 */
export function nextBoard(
  s: TimeAttackState,
  level: Level,
): TimeAttackState {
  assertNoJoker(level);

  return {
    ...s,
    game: startGame(level),
    combo: breakCombo(s.combo),
  };
}

function assertNoJoker(level: Level): void {
  if (jokerAt(level.board) !== undefined) {
    throw new JokerInTimeAttackError(level.id);
  }
}
