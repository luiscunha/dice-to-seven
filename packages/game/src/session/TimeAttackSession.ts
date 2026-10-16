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

import type { Board, Level, Packed, Rng } from "@dicetoseven/engine";
import { jokerAt, pick, pieceCount, shuffled, totalSum } from "@dicetoseven/engine";

import type { Bomba } from "./bomba";
import { pavioAcabou, pavioDe, pecasJogaveis, saiNaJogada, seguirBomba } from "./bomba";
import type { ComboState } from "./combos";
import { DEFAULT_COMBO_CONFIG, breakCombo, registerMove, startCombo } from "./combos";
import type { ComboConfig } from "./combos";
import type { GameState } from "./GameSession";
import { isBlocked, isFinished, startGame, tap } from "./GameSession";
import type { ScoringConfig } from "./scoring";
import { DEFAULT_SCORING, moveScore } from "./scoring";

export type { Bomba };

/**
 * A bomba do Contra-Relógio — o mecanismo comum está em `bomba.ts`.
 *
 * Os tabuleiros deste modo são greedy-safe, portanto **qualquer ordem resolve**.
 * Era essa a promessa do modo, e era também o que o deixava sem decisão
 * nenhuma: só contava a velocidade. A bomba põe uma pergunta de volta —
 * *que grupo tiro primeiro?* — sem tocar na promessa, porque não mexe no que é
 * jogada legal. Mexe só no relógio: rebentar custa tempo.
 */
export interface ConfigBomba {
  /**
   * Quantos tabuleiros limpos antes de poder aparecer a primeira bomba.
   *
   * Os primeiros tabuleiros são onde o jogador entra no ritmo, e uma ameaça
   * nova antes disso é ruído e não decisão.
   */
  readonly desdeTabuleiro: number;
  /** Probabilidade de um tabuleiro elegível trazer bomba. */
  readonly probabilidade: number;
  /** Quanto tempo a bomba dá ao jogador, desde que o tabuleiro aparece. */
  readonly pavioMs: number;
  /** O que custa deixá-la rebentar. */
  readonly penalizacaoMs: number;
}

export interface TimeAttackConfig {
  /** Generoso, para o jogador entrar em flow antes da pressão (plano §6.3). */
  readonly initialMs: number;

  /**
   * O **ritmo-alvo** do primeiro tabuleiro: o tempo que cada jogada dele
   * devolve ao relógio.
   *
   * ── Porque não um prémio fixo por tabuleiro ──
   *
   * Era assim: 30s pelo primeiro, a descer 4s por tabuleiro até um piso de 10s.
   * Com o piso, o modo tinha um ponto de equilíbrio — e quem jogava abaixo dele
   * nunca perdia. Medido com o pack publicado, a 2s por jogada um tabuleiro do
   * cume dava **+9s de saldo**, todos os tabuleiros, para sempre. O modo era
   * fácil porque, para quem joga bem, não tinha fim.
   *
   * Agora o prémio é `jogadas × ritmo`, e o ritmo aperta a cada tabuleiro sem
   * piso nenhum. A corrida acaba exatamente quando o jogador deixa de
   * acompanhar o ritmo que se lhe pede — e acaba sempre, seja qual for a
   * velocidade dele. Ver `ritmoExigido`.
   *
   * Multiplicar pelas jogadas, e não pelas peças, é o que mantém isto justo
   * quando os tabuleiros crescem: um tabuleiro de vinte peças pede seis
   * jogadas, e é a jogada que custa tempo, não a peça.
   */
  readonly ritmoInicialMs: number;

  /**
   * Por quanto se multiplica o ritmo a cada tabuleiro limpo.
   *
   * **Geométrico, e não linear, e a diferença foi medida.** A descer um valor
   * fixo por tabuleiro, a curva comprimia os jogadores rápidos — o de 1,5s e o
   * de 1s por jogada acabavam quase no mesmo tabuleiro — e esticava as
   * corridas lentas. A multiplicar, cada 20% de velocidade a mais compra mais
   * ou menos o mesmo número de tabuleiros, seja onde for na escala: a
   * classificação quer dizer alguma coisa tanto para quem começa como para
   * quem já é rápido.
   */
  readonly ritmoFator: number;

  /** Tempo por cada nível de combo acima do primeiro. */
  readonly comboBonusMs: number;

  /**
   * O máximo que o combo devolve **por jogada**.
   *
   * Sem teto, o combo era a outra metade do defeito: `(count − 1) × 750ms`
   * cresce com o quadrado das jogadas encadeadas, e o tempo gasto a jogá-las
   * cresce em linha. Num tabuleiro de seis jogadas o combo sozinho devolvia
   * 11s — mais do que as jogadas custavam. E quanto maior o tabuleiro, maior o
   * saldo: a escada de tamanho, que devia endurecer o modo, aliviava-o.
   *
   * Com teto, o combo continua a valer — o encadeamento sobe o prémio das
   * primeiras jogadas — mas deixa de poder pagar a corrida sozinho.
   */
  readonly comboTetoMs: number;

  /** Tempo por peça acima do limiar, num grupo grande. */
  readonly bigGroupBonusMs: number;

  /**
   * O que custa um toque que passaria de 7.
   *
   * Sem custo nenhum, tocar ao calhas era uma estratégia: a peça errada era
   * recusada, e a recusa não tirava nada. Num modo que mede reconhecimento, o
   * erro tem de pesar — senão mede-se velocidade de dedo.
   *
   * Quebra também o combo. Um encadeamento com uma peça errada no meio não é o
   * ritmo que o combo existe para premiar.
   */
  readonly penalizacaoMs: number;

  /**
   * O que custa saltar um tabuleiro. Ver `saltarTabuleiro`.
   *
   * **Mais do que a bomba (5s), e de propósito.** Saltar tem de ser a saída de
   * um beco, não um atalho: se custasse menos do que a bomba, saltar o
   * tabuleiro da bomba passava a ser a jogada certa.
   *
   * E saltar um tabuleiro que ainda se joga não poupa nada: troca um tabuleiro
   * meio jogado por um inteiro, do degrau seguinte, e não soma à conta dos
   * limpos. Só compensa quando o tabuleiro já não tem jogadas — que é para isso
   * que existe.
   */
  readonly saltarMs: number;

  /**
   * O primeiro tabuleiro, contando de 0, que oferece o salto.
   *
   * Por omissão é o primeiro depois da escada com garantia. Mas quem manda é a
   * escada **desta** corrida: um pack com menos níveis com garantia do que
   * degraus dá uma escada mais curta, e os tabuleiros sem garantia começavam
   * antes do salto existir. O ecrã acerta este número por `Escada.livresDesde`.
   */
  readonly saltoDesde: number;

  readonly bomba: ConfigBomba;
}

/**
 * Valores de partida — **todos de playtest**, e é por isso que vivem em
 * configuração e não no código.
 *
 * O ritmo foi escolhido por simulação contra o pack publicado, com 1s de
 * leitura por tabuleiro novo e 60s de arranque (o valor das definições):
 *
 * | ritmo do jogador | tabuleiros | duração |
 * |---|---|---|
 * | 4 s/jogada | ~7 | ~3 min |
 * | 3 s/jogada | ~12 | ~4 min |
 * | 2 s/jogada | ~28 | ~6 min |
 * | 1,5 s/jogada | ~42 | ~7 min |
 * | 1 s/jogada | ~69 | ~8 min |
 *
 * Com a configuração anterior, todas as linhas de 2,5 s/jogada para baixo
 * davam corridas sem fim.
 */
export const DEFAULT_TIME_ATTACK: TimeAttackConfig = {
  initialMs: 90_000,
  ritmoInicialMs: 4_000,
  ritmoFator: 0.92,
  comboBonusMs: 250,
  comboTetoMs: 500,
  bigGroupBonusMs: 400,
  penalizacaoMs: 1_500,
  saltarMs: 10_000,
  saltoDesde: 6,
  bomba: {
    desdeTabuleiro: 3,
    probabilidade: 0.5,
    pavioMs: 6_000,
    penalizacaoMs: 5_000,
  },
};

export interface TimeAttackState {
  readonly game: GameState;
  readonly combo: ComboState;
  readonly score: number;
  readonly boardsCleared: number;
  /** Instante em que a corrida acaba, se nada mais for ganho. */
  readonly deadlineAt: number;
  readonly startedAt: number;
  /** A bomba armada neste tabuleiro, se houver. Ver `Bomba`. */
  readonly bomba: Bomba | undefined;
  /** Tabuleiros saltados. Não contam como limpos, nem apertam o ritmo. */
  readonly saltados: number;
  /**
   * Bombas desarmadas nesta corrida. Não mexe em nada do modo: conta para a
   * medalha do Sangue-frio, que pede cinco numa corrida só.
   */
  readonly desarmadas: number;
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
    bomba: undefined,
    saltados: 0,
    desarmadas: 0,
  };
}

export const remainingMs = (s: TimeAttackState, now: number): number =>
  Math.max(0, s.deadlineAt - now);

export const isOver = (s: TimeAttackState, now: number): boolean =>
  now >= s.deadlineAt;

/* ─── Saltar ──────────────────────────────────────────────────────────────── */

/**
 * O número do tabuleiro em jogo, contando de 0: os limpos mais os saltados.
 *
 * É a posição na escada. Saltar avança na escada como limpar — o tabuleiro
 * seguinte é o do degrau seguinte —, porque saltar não pode ser uma maneira de
 * ficar nos tabuleiros pequenos.
 */
export const indiceDoTabuleiro = (s: TimeAttackState): number =>
  s.boardsCleared + s.saltados;

/**
 * Este tabuleiro oferece o salto?
 *
 * **Só depois da escada.** Os tabuleiros da escada são greedy-safe — não há
 * como ficar preso, e um botão que só servisse para fugir de um tabuleiro que
 * se joga era um convite a desperdiçar tempo. A partir do sétimo os tabuleiros
 * podem bloquear, e é aí que a saída tem de existir.
 *
 * **Um tabuleiro bloqueado salta-se sempre**, esteja onde estiver. Com a escada
 * a sair da banda com garantia não devia acontecer — mas uma corrida presa num
 * tabuleiro sem jogadas e sem saída, à espera de que o relógio acabe, é um
 * defeito que nenhuma garantia de geração pode valer o risco.
 */
export const podeSaltar = (
  s: TimeAttackState,
  now: number,
  config: TimeAttackConfig = DEFAULT_TIME_ATTACK,
): boolean =>
  !isOver(s, now) &&
  !isFinished(s.game) &&
  (indiceDoTabuleiro(s) >= config.saltoDesde || isBlocked(s.game));

/**
 * Salta o tabuleiro: custa `saltarMs`, e o seguinte vem do degrau seguinte.
 *
 * Só mexe no relógio e nas contas. O tabuleiro novo entra por `nextBoard`, como
 * depois de um tabuleiro limpo — a sessão não sabe de onde ele vem.
 *
 * **O ritmo não aperta.** O ritmo exigido conta tabuleiros limpos, e um
 * tabuleiro saltado não foi limpo: saltar não pode ser premiado com a mesma
 * curva que limpar.
 *
 * Se a bomba estiver armada, vai com o tabuleiro sem rebentar. Saltar já custa
 * o dobro dela, e cobrar as duas era cobrar o mesmo erro duas vezes.
 */
export function saltarTabuleiro(
  s: TimeAttackState,
  now: number,
  config: TimeAttackConfig = DEFAULT_TIME_ATTACK,
): TimeAttackState {
  if (!podeSaltar(s, now, config)) return s;

  return {
    ...s,
    deadlineAt: s.deadlineAt - config.saltarMs,
    saltados: s.saltados + 1,
    combo: breakCombo(s.combo),
    bomba: undefined,
  };
}

/**
 * O tempo por jogada que o `n`-ésimo tabuleiro devolve, contando de 0.
 *
 * **Sem piso, e é de propósito.** Um piso é um ponto de equilíbrio, e um ponto
 * de equilíbrio é uma corrida infinita para quem joga mais depressa do que
 * ele. Ver `ritmoInicialMs`.
 */
export function ritmoExigido(
  cleared: number,
  config: TimeAttackConfig = DEFAULT_TIME_ATTACK,
): number {
  return config.ritmoInicialMs * Math.pow(config.ritmoFator, cleared);
}

/**
 * Quantas jogadas leva a limpar o tabuleiro — **qualquer** limpeza, por
 * qualquer ordem.
 *
 * Cada jogada tira exatamente 7, portanto são sempre `soma / 7`. Não se lê da
 * solução guardada: é aritmética sobre o tabuleiro, e vale para um nível que não
 * traga solução nenhuma.
 */
export const jogadasDe = (board: Board): number =>
  Math.round(totalSum(board) / 7);

/** Prémio do `n`-ésimo tabuleiro limpo, contando de 0: jogadas × ritmo. */
export function boardReward(
  cleared: number,
  board: Board,
  config: TimeAttackConfig = DEFAULT_TIME_ATTACK,
): number {
  return Math.round(jogadasDe(board) * ritmoExigido(cleared, config));
}

/* ─── A bomba ─────────────────────────────────────────────────────────────── */

/**
 * Arma uma bomba no tabuleiro de agora, se o sorteio o pedir.
 *
 * Chama-se ao mostrar um tabuleiro novo, e não dentro de `nextBoard`: é uma
 * camada por cima do modo, com o seu próprio sorteio, e quem não a quiser
 * — os testes do relógio, por exemplo — simplesmente não a chama.
 *
 * **A peça armada está sempre num grupo que se pode jogar já.** Uma bomba numa
 * peça sem parceiro à vista seria uma penalização garantida para quem não
 * descobriu a ordem exata de a soltar, e a bomba existe para pôr uma
 * prioridade, não um enigma. Depois de armada, gastar o parceiro dela noutra
 * jogada é um erro do jogador — e é esse o erro que a bomba ensina a ver.
 *
 * «Jogável» conta com o gelo, e **a bomba nunca vai numa peça gelada**: as
 * duas regras na mesma peça — sai a par, e sai já — eram duas contas para
 * fazer em seis segundos, numa peça só.
 *
 * O `rng` é o da corrida: nada aqui chama `Math.random()`.
 */
export function armarBomba(
  s: TimeAttackState,
  now: number,
  rng: Rng,
  config: TimeAttackConfig = DEFAULT_TIME_ATTACK,
): TimeAttackState {
  const cfg = config.bomba;

  if (s.boardsCleared < cfg.desdeTabuleiro) return s;
  if (rng() >= cfg.probabilidade) return s;

  const gelo = s.game.marcas.gelo;
  const alvo = pick(
    rng,
    pecasJogaveis(s.game.board, s.game.marcas).filter((p) => !gelo.includes(p)),
  );
  if (alvo === undefined) return s;

  return { ...s, bomba: { at: alvo, rebentaEm: now + cfg.pavioMs } };
}

export interface Rebentamento {
  readonly state: TimeAttackState;
  /** Onde estava a bomba que rebentou agora. `undefined` se não rebentou nada. */
  readonly rebentou: Packed | undefined;
  readonly perdidoMs: number;
}

/**
 * Faz a bomba rebentar, se o pavio já acabou.
 *
 * O relógio entra por parâmetro, como em tudo o resto: é o ecrã que chama isto
 * a cada tique, e `tapTimeAttack` chama-o antes de olhar para o toque — um toque
 * que chega depois do fim do pavio já não desarma nada.
 *
 * Depois do fim da corrida não rebenta: o tempo que a bomba tiraria já não
 * existe.
 */
export function resolverBomba(
  s: TimeAttackState,
  now: number,
  config: TimeAttackConfig = DEFAULT_TIME_ATTACK,
): Rebentamento {
  const bomba = s.bomba;

  if (bomba === undefined || !pavioAcabou(bomba, now) || isOver(s, now)) {
    return { state: s, rebentou: undefined, perdidoMs: 0 };
  }

  const perdidoMs = config.bomba.penalizacaoMs;

  return {
    state: {
      ...s,
      bomba: undefined,
      deadlineAt: s.deadlineAt - perdidoMs,
      // Rebentar é perder o fio: o encadeamento acaba aqui.
      combo: breakCombo(s.combo),
    },
    rebentou: bomba.at,
    perdidoMs,
  };
}

/** Quanto falta para a bomba rebentar. `undefined` sem bomba armada. */
export const pavioRestante = (
  s: TimeAttackState,
  now: number,
): number | undefined => pavioDe(s.bomba, now);

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
 * Quantos degraus tem a escada **com garantia** — os tabuleiros da banda
 * `tempo`, onde não há como ficar preso.
 *
 * **Seis, e não é um número solto**: o pack tem seis janelas de tamanho, uma
 * por degrau, e há um teste em `tools` a exigir que os dois coincidam.
 *
 * Seis é o que a garantia permite, não o que se desejava. O tabuleiro vai de 10
 * a 20 peças; acima disso não há tabuleiros impossíveis de bloquear para gerar.
 * Ver o comentário da banda `tempo`, em `tools/src/bands.ts`.
 *
 * A escada já não acaba aqui: continua pelos `DEGRAUS_LIVRES`, e é a partir
 * daqui que o modo oferece o salto. Ver `podeSaltar`.
 */
export const DEGRAUS = 6;

/**
 * Os degraus que vêm depois, **sem garantia** — a banda `tempo-livre`, de 21 a
 * 42 peças, onde um tabuleiro pode bloquear e o jogador o pode saltar.
 *
 * Quatro, pelas quatro janelas da banda, com o mesmo teste do outro lado. É o
 * que leva a escada inteira a dez tabuleiros a crescer, e o tabuleiro de cima a
 * um 6×7 — antes ficava num 4×5 a partir do sexto tabuleiro, para sempre.
 */
export const DEGRAUS_LIVRES = 4;

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
  /**
   * A posição do primeiro tabuleiro sem garantia de não bloquear, ou
   * `Infinity` se a corrida não os tiver. É daí que o salto passa a existir.
   */
  readonly livresDesde: number;
}

export function escadaDeTamanho(
  niveis: readonly Level[],
  rng: Rng,
  degraus = DEGRAUS,
): Escada {
  if (niveis.length === 0) return { ordem: [], cume: [], livresDesde: Infinity };

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

  return { ordem, cume, livresDesde: Infinity };
}

const escolher = <T>(xs: readonly T[], rng: Rng): T => {
  const [primeiro] = shuffled(rng, xs);
  if (primeiro === undefined) throw new Error("degrau vazio");
  return primeiro;
};

/**
 * A escada da corrida inteira: os degraus com garantia, e depois os sem.
 *
 * São duas escadas coladas e não uma só sobre as duas bandas juntas, porque o
 * que separa as duas não é o tamanho — é a garantia. Ordenar tudo por peças
 * misturava as duas na fronteira, e um tabuleiro que pode bloquear aparecia
 * antes do sétimo, onde o salto ainda não existe.
 *
 * Sem tabuleiros livres — um pack antigo, ou uma banda que não carregou — a
 * corrida é a de antes: a escada com garantia, e o cume dela para sempre.
 */
export function escadaDaCorrida(
  seguros: readonly Level[],
  livres: readonly Level[],
  rng: Rng,
): Escada {
  const primeira = escadaDeTamanho(seguros, rng, DEGRAUS);
  if (livres.length === 0) return primeira;

  const segunda = escadaDeTamanho(livres, rng, DEGRAUS_LIVRES);
  return {
    ordem: [...primeira.ordem, ...segunda.ordem],
    cume: segunda.cume,
    livresDesde: primeira.ordem.length,
  };
}

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

  /**
   * Tempo perdido neste toque: a penalização por passar de 7, a bomba que
   * rebentou antes de ele chegar, ou as duas. Sempre positivo ou zero.
   */
  readonly perdidoMs: number;
  /** O toque passava de 7 e custou tempo. */
  readonly penalizado: boolean;
  /** A bomba rebentou antes deste toque, e estava aqui. */
  readonly rebentou: Packed | undefined;
  /** A jogada levou a bomba consigo. */
  readonly desarmou: boolean;
}

/**
 * Tocar numa peça, com relógio.
 *
 * Depois do fim do tempo nada mais conta — a corrida acabou, e aceitar jogadas
 * seria pontuar tempo que o jogador já não tinha.
 *
 * **A bomba resolve-se antes do toque.** Um toque que chega depois do fim do
 * pavio encontra a bomba já rebentada: desarmá-la nesse toque seria dar razão a
 * quem chegou tarde só porque o ecrã ainda não tinha repintado.
 */
export function tapTimeAttack(
  s: TimeAttackState,
  p: Packed,
  now: number,
  configs: TimeAttackConfigs = {},
): TimeAttackTap {
  const time = configs.time ?? DEFAULT_TIME_ATTACK;

  const nada = {
    moved: false,
    gainedScore: 0,
    gainedMs: 0,
    cleared: false,
    penalizado: false,
    desarmou: false,
  } as const;

  if (isOver(s, now)) {
    return { ...nada, state: s, perdidoMs: 0, rebentou: undefined };
  }

  const bomba = resolverBomba(s, now, time);
  const antes = bomba.state;

  // A bomba pode ter levado o resto do relógio consigo.
  if (isOver(antes, now)) {
    return {
      ...nada,
      state: antes,
      perdidoMs: bomba.perdidoMs,
      rebentou: bomba.rebentou,
    };
  }

  const before = antes.game;
  const groupSize = before.selection.length + 1;
  const game = tap(before, p);
  const moved = game.history.length > before.history.length;

  if (!moved) {
    const penalizado = game.rejection === "over-target";
    const multaMs = penalizado ? time.penalizacaoMs : 0;

    return {
      ...nada,
      state: {
        ...antes,
        game,
        deadlineAt: antes.deadlineAt - multaMs,
        combo: penalizado ? breakCombo(antes.combo) : antes.combo,
      },
      perdidoMs: bomba.perdidoMs + multaMs,
      penalizado,
      rebentou: bomba.rebentou,
    };
  }

  const event = registerMove(antes.combo, groupSize, now, configs.combo);
  const scoring = configs.scoring ?? DEFAULT_SCORING;
  const comboCfg = configs.combo ?? DEFAULT_COMBO_CONFIG;

  const gainedScore = moveScore(groupSize, event.state.count, scoring);

  /*
   * Combos devolvem tempo — é o loop de reforço que sustenta o modo: jogar bem
   * compra espaço para jogar mais. Mas **com teto por jogada**: sem ele, o
   * combo crescia com o quadrado do encadeamento e pagava a corrida sozinho.
   * Ver `comboTetoMs`.
   *
   * Os grupos grandes valem mais por peça acima do limiar, para dar razão ao
   * jogador para os procurar em vez de limpar só os pares.
   */
  const comboMs = event.chained
    ? Math.min((event.state.count - 1) * time.comboBonusMs, time.comboTetoMs)
    : 0;

  const bigMs = event.big
    ? (groupSize - comboCfg.bigGroupSize + 1) * time.bigGroupBonusMs
    : 0;

  const cleared = isFinished(game);
  const clearMs = cleared
    ? boardReward(antes.boardsCleared, before.level.board, time)
    : 0;
  const gainedMs = comboMs + bigMs + clearMs;

  // `moved` garante que há jogada; o `?? []` é só para o compilador.
  const jogada = game.lastMove ?? [];
  const desarmou = saiNaJogada(antes.bomba, jogada);

  return {
    state: {
      ...antes,
      game,
      combo: event.state,
      score: antes.score + gainedScore,
      boardsCleared: antes.boardsCleared + (cleared ? 1 : 0),
      deadlineAt: antes.deadlineAt + gainedMs,
      bomba: desarmou ? undefined : seguirBomba(antes.bomba, before.board, jogada),
      desarmadas: antes.desarmadas + (desarmou ? 1 : 0),
    },
    moved: true,
    gainedScore,
    gainedMs,
    cleared,
    perdidoMs: bomba.perdidoMs,
    penalizado: false,
    rebentou: bomba.rebentou,
    desarmou,
  };
}

/**
 * Encadeia o tabuleiro seguinte, mantendo relógio e pontuação.
 *
 * O combo **não** atravessa tabuleiros: o intervalo entre a última jogada de um
 * e a primeira do seguinte inclui a transição, que não é ritmo do jogador.
 *
 * O tabuleiro chega sem bomba. Armá-la é `armarBomba`, à parte.
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
    bomba: undefined,
  };
}

function assertNoJoker(level: Level): void {
  if (jokerAt(level.board) !== undefined) {
    throw new JokerInTimeAttackError(level.id);
  }
}
