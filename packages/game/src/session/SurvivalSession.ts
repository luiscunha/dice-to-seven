/**
 * Modo Survival — tabuleiro aberto, com peças a entrar.
 *
 * O terceiro modo, e o primeiro que **não herda a garantia central do projeto**.
 * Na campanha nenhum nível publicado é impossível, e isso vem da construção
 * reversa validada por simulação. Aqui não há nível: há um fluxo. O jogador vai
 * perder, e a pergunta é quando — como em qualquer jogo de sobrevivência.
 *
 * Isso não é uma brecha na garantia, é outro contrato. O que a garantia protege
 * é a promessa da campanha: «isto tem solução». O Survival nunca a faz.
 *
 * ### As três decisões que dão forma ao modo
 *
 * **A linha entra pelo topo.** As colunas guardam-se de baixo para cima,
 * portanto acrescentar por cima é um `concat` e nada mais se mexe. Pelo lado
 * seria igualmente barato de escrever e uma confusão a jogar: o colapso já
 * empurra colunas para a esquerda, e ficavam dois movimentos laterais a competir.
 *
 * **A linha entra à largura cheia.** Se seguisse a largura do tabuleiro, limpar
 * uma coluna encolhia a área de jogo para sempre e o jogador era punido por
 * jogar bem. À largura cheia, o colapso é alívio: as peças que caem sobre o
 * vazio descem à base pela gravidade normal, e a largura repõe-se.
 *
 * Cheia quer dizer **sete**, do primeiro instante ao último.
 *
 * Nem sempre foi assim: o tabuleiro arrancava com cinco colunas e ganhava uma a
 * cada quatro linhas caídas, porque com cinco colunas a peça mede 69px num
 * telemóvel de 375px e com sete mede 46px — a corrida começava com peças
 * grandes e ia-as encolhendo. Lia-se mal a jogar: a área de jogo mudava de
 * tamanho por baixo das mãos, e o tabuleiro parecia outro a meio da corrida.
 * Sete desde o início custa o tamanho da peça e paga em estabilidade.
 *
 * O mecanismo fica montado — `larguraNoIndice` continua a ser a largura em
 * função do índice, e `larguraInicial` apenas passou a valer o mesmo que o teto.
 * Voltar a fazê-la crescer é mudar esse número.
 *
 * **Puxar a linha paga.** Um botão que só faz mal nunca é premido, e seria UI
 * morta. Puxar de vontade própria rende um multiplicador proporcional ao espaço
 * que ainda existe — e reinicia o relógio da injeção automática. A decisão passa
 * a ser real: puxo agora, com folga, para arrecadar pontos e comprar tempo, ou
 * seguro e arrisco que a automática caia no pior momento? É a mesma tensão
 * entre ganância e segurança que sustenta o jogo todo.
 *
 * ### A pressão é o relógio
 *
 * As linhas caíam a cada N **jogadas**. Caem a cada N **segundos**, e a troca
 * muda o modo inteiro: parar a pensar deixou de ser grátis, e jogar depressa
 * deixou de ser apenas elegante para passar a ser a única forma de ganhar
 * espaço. É a diferença entre um puzzle com um contador e um jogo de reflexos
 * com um puzzle dentro.
 *
 * Isto substitui o contador de jogadas, não se soma a ele. Dois relógios a
 * competir pela mesma injeção davam ao jogador duas contas para fazer e nenhuma
 * para confiar.
 *
 * **A sessão continua a não ler as horas.** Recebe o decorrido da corrida e
 * compara-o com um prazo que guarda no estado — ver `avancarRelogio`. Um
 * `Date.now()` aqui dentro tornava os testes dependentes da máquina e a corrida
 * impossível de pausar, e a pausa é a coisa que um jogo de telemóvel mais
 * precisa de acertar.
 *
 * ### Sem joker, por enquanto
 *
 * O valor do joker está *globalmente determinado* pela soma do tabuleiro, e essa
 * regra só existe porque o tabuleiro da campanha é finito e destina-se a ficar
 * vazio. Aqui não há tabuleiro final, portanto não há valor determinado. Fica de
 * fora até a pergunta ter resposta — e quando tiver, o joker aqui será uma peça
 * **diferente** da da campanha: um curinga livre, resgate em vez de armadilha.
 *
 * Nada aqui chama `Date.now()` nem `Math.random()`. As linhas derivam da seed
 * pelo índice, portanto a mesma seed dá sempre as mesmas peças pela mesma ordem
 * — que é o que torna uma seed partilhável. O que a corrida faz com elas passou
 * a depender de quão depressa o jogador se mexe, e isso é o modo.
 */

import type { Board, Cell, Level, Packed } from "@dicetoseven/engine";
import {
  JOKER,
  deriveSeed,
  isEmpty,
  jokerAt,
  mulberry32,
  pushRow,
  randInt,
  tallestColumn,
  totalSum,
  weightedIndex,
} from "@dicetoseven/engine";

import type { GameState, JokerValue } from "./GameSession";
import { startGame, tap } from "./GameSession";
import type { ScoringConfig } from "./scoring";
import { DEFAULT_SCORING, moveScore } from "./scoring";

/** Uma linha por injetar. `null` deixa a coluna como está. */
export type Linha = readonly (Cell | null)[];

export interface SurvivalConfig {
  /**
   * A largura máxima, e o alvo para onde a corrida cresce.
   *
   * Já não é a largura de todas as linhas: é o teto de `larguraNoIndice`.
   */
  readonly largura: number;

  /**
   * A largura com que a corrida arranca. **Hoje é igual a `largura`.**
   *
   * É o que decide o tamanho da peça: a peça mede-se pelo menor de «palco a
   * dividir pelas colunas» e «palco a dividir pelas linhas», e num telemóvel
   * quem manda é sempre a largura — a 375px, sete colunas dão 46px e cinco dão
   * 69px. Arrancar estreito dava peças maiores no início, ao preço de a área de
   * jogo mudar de tamanho durante a corrida; a estabilidade ganhou.
   */
  readonly larguraInicial: number;

  /** Linhas caídas até o tabuleiro ganhar mais uma coluna. */
  readonly linhasPorColuna: number;
  /** Linhas no arranque. Poucas: o jogador tem de ver o tabuleiro a encher. */
  readonly alturaInicial: number;
  /**
   * Passar daqui é perder.
   *
   * **Sete, e quem manda é o piso de toque.** A 320px de largura, o palco que
   * sobra depois da fila e do rodapé dá 348px de altura: com nove linhas a peça
   * ficava a 39px, abaixo dos 44 que o projeto fixou. Com sete dá 46px.
   *
   * O custo mediu-se: 78 jogadas por corrida em vez de 92, com ramificação 9.2.
   * Quinze por cento mais curta, e jogável com o dedo — que não é uma troca
   * difícil quando 80% de quem vai jogar está no telemóvel.
   */
  readonly alturaMaxima: number;

  /**
   * Milissegundos entre injeções automáticas, no início.
   *
   * **A pressão do modo é o relógio.** Antes era um contador de jogadas, e a
   * diferença não é de afinação: com um contador, parar a pensar era grátis e
   * o tabuleiro esperava indefinidamente. O tabuleiro deixou de esperar.
   *
   * Trinta segundos é aproximadamente o que as cinco jogadas do contador
   * antigo custavam a quem joga com cuidado, portanto o arranque não fica mais
   * apertado do que estava — o que muda é que o tempo passa a correr também
   * enquanto se olha.
   */
  readonly msPorLinha: number;
  /** O piso desse intervalo, por muito que a corrida se prolongue. */
  readonly minMsPorLinha: number;
  /** Quanto o intervalo encolhe a cada degrau. */
  readonly msPorDegrau: number;
  /** Quantas linhas caídas até o intervalo descer um degrau. */
  readonly linhasPorDegrau: number;

  /** Quantas linhas o jogador vê à frente. */
  readonly previsao: number;

  /**
   * Puxar de vontade própria dá um **multiplicador temporário**, não pontos.
   *
   * A primeira versão dava um prémio fixo por linha de folga, e a simulação
   * mostrou que era uma armadilha: puxar cedo perdia ~40% de pontuação a
   * qualquer preço testado, entre 25 e 200 por linha. A razão não é de afinação
   * — é de forma. Puxar custa **espaço**, e o espaço é o recurso que gera todos
   * os pontos futuros; nenhuma soma fixa compete com um valor que compõe.
   *
   * Um multiplicador compõe da mesma maneira: aplica-se às jogadas que se fazem
   * com o espaço que ainda resta. Cresce com a folga, portanto puxar cedo vale
   * mais — que continua a ser a estratégia que o prémio quer ensinar.
   */
  readonly bonusPorFolga: number;
  /** Teto do multiplicador, para puxar num tabuleiro vazio não descolar. */
  readonly bonusMaximo: number;
  /** Durante quantas jogadas o multiplicador se mantém. */
  readonly jogadasComBonus: number;

  /**
   * Prémio por esvaziar o tabuleiro. Raro de propósito — ver `restoParaLimpar`.
   */
  readonly bonusTabuleiroLimpo: number;

  /**
   * Peso de cada face, de 1 a 6.
   *
   * **É o parâmetro que decide se o modo existe.** Faces baixas combinam-se de
   * mais maneiras — um 1 encaixa em quase todo o lado, um 6 exige um 1 ao lado.
   *
   * Medido em 150 corridas por perfil, com um jogador guloso:
   *
   * | pesos | jogadas | posições sem jogada | ramificação |
   * |---|---|---|---|
   * | uniforme | 33 | **24.1%** | 2.5 |
   * | `[3,3,2,2,1,1]` | 67 | 14.1% | 6.9 |
   * | `[4,3,2,1,1,1]` | 92 | 10.7% | 14.5 |
   * | `[5,4,3,2,1,1]` | 102 | 9.8% | 14.8 |
   *
   * Uniforme não é uma afinação conservadora, é um jogo partido: um quarto das
   * posições sem jogada nenhuma. O ganho achata-se depois de `[4,3,2,1,1,1]`, e
   * é aí que fica — 10% de posições sem saída ainda dá ao botão de puxar uma
   * razão para existir, sem o tornar a mecânica principal.
   */
  readonly pesos: readonly number[];

  /** O joker entra nas linhas novas. É uma opção do jogador. */
  readonly comJoker: boolean;
  /**
   * Peças entre jokers.
   *
   * Conta-se em peças e não em linhas para o encontro não ficar preso à largura
   * do tabuleiro. Só entra um se o tabuleiro não tiver já um — a invariante 3
   * não admite dois, e `pushRow` recusa-o.
   */
  readonly pecasPorJoker: number;
}

export const DEFAULT_SURVIVAL: SurvivalConfig = {
  largura: 7,
  // Igual ao teto: a largura deixou de crescer durante a corrida.
  larguraInicial: 7,
  linhasPorColuna: 4,
  alturaInicial: 5,
  alturaMaxima: 7,
  msPorLinha: 30_000,
  minMsPorLinha: 10_000,
  msPorDegrau: 5_000,
  linhasPorDegrau: 6,
  previsao: 1,
  bonusPorFolga: 0.25,
  bonusMaximo: 2.5,
  jogadasComBonus: 8,
  bonusTabuleiroLimpo: 500,
  pesos: [4, 3, 2, 1, 1, 1],
  comJoker: true,
  pecasPorJoker: 25,
};

export interface SurvivalState {
  readonly game: GameState;
  readonly score: number;

  /** Quantas linhas já entraram. É também o índice da próxima na fila. */
  readonly linhasInjetadas: number;
  /**
   * O instante — em tempo de corrida — em que a próxima linha cai.
   *
   * Absoluto e não uma contagem decrescente, porque quem manda no relógio é o
   * ecrã: a sessão nunca lê `Date.now()`, recebe o decorrido e compara. Um
   * contador a descer obrigava a sessão a saber quanto tempo passou desde a
   * última vez que alguém lhe falou, e ninguém lho pode dizer com confiança.
   *
   * É também o que faz a pausa sair de graça. O decorrido da corrida já pára
   * quando o jogador sai do ecrã, portanto um prazo medido nele pára com ele.
   */
  readonly proximaLinhaMs: number;
  /** Tabuleiros esvaziados por completo. É o objetivo do modo. */
  readonly limpezas: number;
  /** Peças entradas desde o último joker. Decide quando aparece o próximo. */
  readonly pecasDesdeJoker: number;
  /** O tabuleiro ficou vazio. A corrida acabou, e acabou bem. */
  readonly limpo: boolean;

  /** Multiplicador em vigor, de puxar uma linha. `1` quando não há. */
  readonly multiplicador: number;
  /** Jogadas que faltam até ele expirar. */
  readonly jogadasComBonus: number;

  readonly morto: boolean;
  readonly seed: number;
}

/* ─── A fila ──────────────────────────────────────────────────────────────── */

/**
 * A linha de índice `i`, derivada só da seed.
 *
 * Pura em `i`: a fila que o jogador vê é exatamente a que vai receber, aconteça
 * o que acontecer ao tabuleiro entretanto. Sem isto a previsão era decorativa —
 * e a previsão é a razão de ser do modo.
 */
/**
 * Quantas colunas tem a linha número `i`.
 *
 * **Pura em `i`, como a própria linha.** A largura tem de sair do índice da
 * fila e não do estado: se saísse do tabuleiro, a linha que o jogador vê na
 * previsão podia entrar com outra largura, e a promessa do modo — o que se vê é
 * o que se recebe — deixava de valer.
 *
 * As linhas do arranque contam todas como largura inicial, e é por isso que se
 * desconta `alturaInicial`: são o tabuleiro de partida, não crescimento.
 */
export const larguraNoIndice = (
  i: number,
  config: SurvivalConfig = DEFAULT_SURVIVAL,
): number =>
  Math.min(
    config.largura,
    config.larguraInicial +
      Math.floor(Math.max(0, i - config.alturaInicial) / config.linhasPorColuna),
  );

export function linhaDe(
  seed: number,
  i: number,
  config: SurvivalConfig = DEFAULT_SURVIVAL,
  comJoker = false,
): readonly Cell[] {
  const rng = mulberry32(deriveSeed(seed, i));
  const largura = larguraNoIndice(i, config);
  const linha: Cell[] = [];
  for (let c = 0; c < largura; c++) {
    linha.push((weightedIndex(rng, config.pesos) + 1) as Cell);
  }

  // O joker toma o lugar de uma face, em coluna sorteada pela mesma seed.
  if (comJoker) linha[randInt(rng, largura)] = JOKER;

  return linha;
}

/**
 * O joker entra nesta linha?
 *
 * Contado em peças, e só se o tabuleiro não tiver já um — a invariante 3 não
 * admite dois. É a mesma função que a fila usa e que a injeção usa, portanto o
 * joker que se vê na previsão é o joker que cai.
 */
export const trazJoker = (
  s: SurvivalState,
  config: SurvivalConfig = DEFAULT_SURVIVAL,
): boolean =>
  config.comJoker &&
  s.pecasDesdeJoker >= config.pecasPorJoker &&
  jokerAt(s.game.board) === undefined;

/** A linha que entra a seguir. É a única que se mostra. */
export const proximaLinha = (
  s: SurvivalState,
  config: SurvivalConfig = DEFAULT_SURVIVAL,
): readonly Cell[] =>
  linhaDe(s.seed, s.linhasInjetadas, config, trazJoker(s, config));

/* ─── Leituras ────────────────────────────────────────────────────────────── */

/**
 * A largura do tabuleiro agora — o alvo, não o que o colapso deixou.
 *
 * É por ela que o ecrã dimensiona a peça e a caixa. Lê-se de `linhasInjetadas`
 * porque esse é o índice da próxima linha, e é a largura dela que manda: a
 * caixa tem de ter o tamanho do que aí vem, senão a linha entra fora dela.
 */
export const larguraAtual = (
  s: SurvivalState,
  config: SurvivalConfig = DEFAULT_SURVIVAL,
): number => larguraNoIndice(s.linhasInjetadas, config);

/** Linhas de folga entre a coluna mais alta e o teto. Zero é estar a morrer. */
export const folga = (
  s: SurvivalState,
  config: SurvivalConfig = DEFAULT_SURVIVAL,
): number => Math.max(0, config.alturaMaxima - tallestColumn(s.game.board));

/**
 * Quanto falta à soma do tabuleiro para ser múltipla de 7.
 *
 * Cada jogada tira exatamente 7, portanto **um tabuleiro só pode ficar vazio se
 * a sua soma for múltipla de 7**. Na campanha isso é garantido na geração; aqui
 * as linhas fazem a soma derivar, e limpar o tabuleiro passa a ser um acidente
 * que se persegue em vez de um objetivo.
 *
 * É condição necessária, não suficiente: `0` quer dizer «vale a pena tentar»,
 * qualquer outro valor quer dizer «hoje não dá, de certeza».
 */
export const restoParaLimpar = (s: SurvivalState): number =>
  totalSum(s.game.board) % 7;

/**
 * Milissegundos entre injeções, já com a aceleração da corrida aplicada.
 *
 * Conta **linhas caídas**, não `linhasInjetadas`: este último arranca em
 * `alturaInicial` porque é o índice da fila, e usá-lo aqui gastava os primeiros
 * degraus a montar o tabuleiro inicial. A corrida começava já acelerada, e o
 * valor configurado para o arranque nunca chegava a valer para ninguém.
 */
export const cadencia = (
  s: SurvivalState,
  config: SurvivalConfig = DEFAULT_SURVIVAL,
): number => {
  const caidas = Math.max(0, s.linhasInjetadas - config.alturaInicial);
  return Math.max(
    config.minMsPorLinha,
    config.msPorLinha - Math.floor(caidas / config.linhasPorDegrau) * config.msPorDegrau,
  );
};

/**
 * Quanto falta para a próxima linha, em milissegundos. Nunca negativo.
 *
 * É o que o ecrã desenha. Antes da primeira jogada `agoraMs` é 0 e isto dá o
 * intervalo inteiro: o cronómetro só arranca ao primeiro toque, e portanto
 * ninguém é cronometrado a olhar para o tabuleiro pela primeira vez.
 */
export const faltaParaLinha = (s: SurvivalState, agoraMs: number): number =>
  Math.max(0, s.proximaLinhaMs - agoraMs);

/** A fração do intervalo que ainda falta, de 1 a 0. É a barra do ecrã. */
export const fracaoParaLinha = (
  s: SurvivalState,
  agoraMs: number,
  config: SurvivalConfig = DEFAULT_SURVIVAL,
): number => {
  const total = cadencia(s, config);
  return total <= 0 ? 0 : Math.min(1, faltaParaLinha(s, agoraMs) / total);
};

/* ─── Arranque ────────────────────────────────────────────────────────────── */

/** O nível sintético que o `GameSession` pede. Não há ficheiro por trás. */
const nivelDe = (seed: number, board: Board): Level => ({
  id: `survival-${String(seed)}`,
  seed,
  board,
  solution: [] as never,
});

export function startSurvival(
  seed: number,
  config: SurvivalConfig = DEFAULT_SURVIVAL,
): SurvivalState {
  let board: Board = [];
  for (let i = 0; i < config.alturaInicial; i++) {
    board = pushRow(board, linhaDe(seed, i, config));
  }

  return {
    game: startGame(nivelDe(seed, board)),
    score: 0,
    linhasInjetadas: config.alturaInicial,
    proximaLinhaMs: config.msPorLinha,
    limpezas: 0,
    pecasDesdeJoker: 0,
    limpo: false,
    multiplicador: 1,
    jogadasComBonus: 0,
    morto: false,
    seed,
  };
}

/** O multiplicador que puxar agora daria. Cresce com a folga, com teto. */
export const multiplicadorAoPuxar = (
  s: SurvivalState,
  config: SurvivalConfig = DEFAULT_SURVIVAL,
): number =>
  Math.min(config.bonusMaximo, 1 + folga(s, config) * config.bonusPorFolga);

/* ─── Injeção ─────────────────────────────────────────────────────────────── */

const comTabuleiro = (s: SurvivalState, board: Board): SurvivalState => ({
  ...s,
  game: { ...s.game, board, selection: [], history: [] },
});

/**
 * Faz cair a próxima linha.
 *
 * `voluntaria` decide se paga: puxar é uma escolha e uma escolha premeia-se; a
 * automática é a pressão e não paga nada. O histórico é limpo porque não há
 * undo neste modo — e guardá-lo seria prometer um retrocesso que não existe.
 *
 * `agoraMs` é o decorrido da corrida, e serve para marcar o prazo seguinte a
 * partir de **agora** e não do prazo que acabou de passar. A diferença nota-se
 * quando a injeção chega atrasada — o ecrã estava a animar uma jogada, ou o
 * jogador tinha a app em segundo plano: sem isto o atraso descontava do
 * intervalo seguinte, e duas linhas caíam quase coladas.
 *
 * É também aqui que puxar de vontade própria compra tempo. O prazo reinicia
 * por inteiro, o que torna a compra literal em vez de metafórica.
 */
export function injectRow(
  s: SurvivalState,
  voluntaria: boolean,
  config: SurvivalConfig = DEFAULT_SURVIVAL,
  agoraMs = 0,
): SurvivalState {
  if (s.morto || s.limpo) return s;

  const bonus = voluntaria
    ? { multiplicador: multiplicadorAoPuxar(s, config), jogadasComBonus: config.jogadasComBonus }
    : { multiplicador: s.multiplicador, jogadasComBonus: s.jogadasComBonus };

  const comJoker = trazJoker(s, config);
  const board = pushRow(s.game.board, proximaLinha(s, config));

  const seguinte: SurvivalState = {
    ...comTabuleiro(s, board),
    ...bonus,
    linhasInjetadas: s.linhasInjetadas + 1,
    /*
     * O contador reinicia quando o joker cai, e acumula quando não cai. Conta
     * as peças que **esta** linha trouxe, que já não são sempre as mesmas — o
     * tabuleiro alarga durante a corrida.
     */
    pecasDesdeJoker: comJoker
      ? 0
      : s.pecasDesdeJoker + larguraNoIndice(s.linhasInjetadas, config),
    morto: tallestColumn(board) > config.alturaMaxima,
    proximaLinhaMs: s.proximaLinhaMs,
  };

  // A cadência lê-se **depois** de a linha entrar: é ela que conta para o degrau.
  return { ...seguinte, proximaLinhaMs: agoraMs + cadencia(seguinte, config) };
}

/**
 * O relógio andou até `agoraMs`. Faz cair a linha, se o prazo venceu.
 *
 * É a única porta da injeção automática, e é **pura**: quem sabe as horas é o
 * ecrã, que as passa para aqui. A regra 5 do projeto diz que a engine não sabe
 * em que modo está; o corolário é que a sessão não sabe que horas são.
 *
 * **Cai no máximo uma linha por chamada, e o atraso perdoa-se.** Cai da regra
 * de o prazo seguinte contar a partir de agora: por muito tempo que tenha
 * passado, sobra sempre um intervalo inteiro antes da linha a seguir. Não é um
 * acidente que se tolera, é a propriedade que se quer — um separador congelado,
 * uma animação longa ou um arranque lento nunca podem despejar meio tabuleiro
 * de uma vez sobre alguém que não teve hipótese de jogar.
 *
 * A pausa de segundo plano, no ecrã, trata do caso legítimo. Isto é a rede por
 * baixo dela.
 */
export function avancarRelogio(
  s: SurvivalState,
  agoraMs: number,
  config: SurvivalConfig = DEFAULT_SURVIVAL,
): { readonly state: SurvivalState; readonly caiu: boolean } {
  if (s.morto || s.limpo || agoraMs < s.proximaLinhaMs) {
    return { state: s, caiu: false };
  }

  return { state: injectRow(s, false, config, agoraMs), caiu: true };
}

/* ─── Jogada ──────────────────────────────────────────────────────────────── */

export interface SurvivalTap {
  readonly state: SurvivalState;
  /** A jogada aconteceu, e não foi só um toque a acumular seleção. */
  readonly moved: boolean;
  readonly gainedScore: number;
  /** A jogada esvaziou o tabuleiro. */
  readonly cleared: boolean;
}

const parado = (s: SurvivalState): SurvivalTap => ({
  state: s,
  moved: false,
  gainedScore: 0,
  cleared: false,
});

/**
 * Um toque.
 *
 * **Uma jogada já não faz cair nada.** Quem faz cair é o relógio, por
 * `avancarRelogio`, e por isso jogar depressa passou a ser a forma de ganhar
 * espaço em vez de a forma de o gastar. A jogada aqui só pontua e vê se o
 * tabuleiro ficou limpo.
 */
export function survivalTap(
  s: SurvivalState,
  p: Packed,
  config: SurvivalConfig = DEFAULT_SURVIVAL,
  scoring: ScoringConfig = DEFAULT_SCORING,
  /** O valor que o jogador deu ao joker. Obrigatório ao tocar-lhe. */
  jokerAs?: JokerValue,
): SurvivalTap {
  if (s.morto || s.limpo) return parado(s);

  const antes = s.game;
  const candidato = antes.selection.includes(p)
    ? [...antes.selection]
    : [...antes.selection, p];

  const game = tap(antes, p, jokerAs);
  const jogou = game.history.length > antes.history.length;

  if (!jogou) return { ...parado(s), state: { ...s, game } };

  /*
   * Sem combo por tempo, e continua a ser deliberado — agora por outra razão.
   * O relógio já castiga quem demora, com linhas a cair; um combo que também
   * premiasse a velocidade punha o mesmo eixo a pagar duas vezes, e o tamanho
   * do grupo — que é a decisão interessante — deixava de contar para nada.
   */
  let ganho = moveScore(candidato.length, 1, scoring);

  const limpou = isEmpty(game.board);
  if (limpou) ganho += config.bonusTabuleiroLimpo;

  // O multiplicador de puxar aplica-se a tudo o que se ganha enquanto durar.
  const comBonus = s.jogadasComBonus > 0;
  if (comBonus) ganho = Math.round(ganho * s.multiplicador);

  const restantes = comBonus ? s.jogadasComBonus - 1 : 0;

  /*
   * **Limpar o tabuleiro acaba a corrida**, e acaba-a bem. É o objetivo do modo:
   * o relógio corre até lá, e o tempo é a marca. `avancarRelogio` vê o `limpo`
   * e não injeta mais nada por cima de uma vitória.
   */
  const seguinte: SurvivalState = {
    ...s,
    game,
    score: s.score + ganho,
    limpezas: limpou ? s.limpezas + 1 : s.limpezas,
    limpo: limpou,
    jogadasComBonus: restantes,
    multiplicador: restantes > 0 ? s.multiplicador : 1,
  };

  return {
    state: seguinte,
    moved: true,
    gainedScore: ganho,
    cleared: limpou,
  };
}

/**
 * Puxar a linha por vontade própria. É onde está a decisão do modo.
 *
 * `agoraMs` faz o prazo seguinte contar a partir de agora — é assim que puxar
 * compra tempo, e não só pontos.
 */
export const puxarLinha = (
  s: SurvivalState,
  config: SurvivalConfig = DEFAULT_SURVIVAL,
  agoraMs = 0,
): SurvivalState => injectRow(s, true, config, agoraMs);
