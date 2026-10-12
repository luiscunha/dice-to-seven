/**
 * A corrida de Survival por acabar, gravada em disco.
 *
 * Sair do modo é uma pausa, não uma desistência — e uma pausa que só vivesse em
 * memória não sobrevivia a recarregar a página. Num telemóvel isso não é caso
 * raro: trocar de aplicação e voltar já basta para o browser deitar a página
 * fora e montá-la de novo.
 *
 * Segue as regras do `progress.ts`: o armazenamento entra por interface, e **ler
 * nunca falha**. Uma corrida corrompida dá corrida nenhuma, e o modo arranca do
 * princípio. Perder uma partida a meio é mau; não abrir o jogo é pior.
 */

import type { Board, Packed } from "@dicetoseven/engine";
import { SEM_MARCAS, cellAt, checkInvariants } from "@dicetoseven/engine";

import type { BombaSurvival, SurvivalState } from "./SurvivalSession";
import type { ProfileStorage } from "./progress";

export const CORRIDA_KEY = "dicetoseven.survival";

/**
 * Sobe quando a forma do `SurvivalState` mudar de maneira incompatível.
 *
 * Uma versão que não se reconheça descarta a corrida em vez de tentar migrar:
 * são partidas a meio, não progresso conquistado.
 *
 * A 3 não mudou a forma, mudou o **significado**: a largura do tabuleiro passou
 * a sair de `linhasInjetadas`, e uma corrida da 2 traz sete colunas onde o novo
 * cálculo diz cinco. O ecrã dimensionava a peça para cinco e desenhava a caixa
 * para sete — 486px de caixa num telemóvel de 375. Um campo novo não teria
 * apanhado isto; o que está errado é a relação entre dois campos antigos.
 *
 * A 4 é o mesmo defeito outra vez, e é por isso que esta nota fica: o teto de
 * largura desceu de sete para seis. Uma corrida da 3 tem um tabuleiro de sete
 * colunas que o novo cálculo diz ter seis — a caixa era desenhada a seis e a
 * sétima coluna ficava a jogar fora dela, e as linhas novas entravam estreitas
 * numa área larga, sem nunca lá voltarem a chegar.
 *
 * Descartar é a resposta certa: é uma corrida a meio, não progresso conquistado,
 * e o recorde vive no perfil, que não se toca.
 */
export const CORRIDA_VERSION = 4;

export interface CorridaGuardada {
  readonly estado: SurvivalState;
  readonly decorridoMs: number;
}

interface Envelope {
  readonly version: number;
  readonly corrida: CorridaGuardada;
}

export function guardarCorrida(
  storage: ProfileStorage,
  corrida: CorridaGuardada,
): void {
  const envelope: Envelope = { version: CORRIDA_VERSION, corrida };
  try {
    storage.setItem(CORRIDA_KEY, JSON.stringify(envelope));
  } catch {
    // Disco cheio ou armazenamento negado: a corrida perde-se, o jogo não.
  }
}

export function limparCorrida(storage: ProfileStorage): void {
  try {
    storage.setItem(CORRIDA_KEY, "");
  } catch {
    // Ver acima.
  }
}

/**
 * Corridas gravadas antes de as marcas existirem.
 *
 * O `GameState` guardava `soldas`/`historySoldas`; passou a guardar
 * `marcas`/`historyMarcas`. Uma corrida antiga chega sem elas, e sem isto
 * rebentava à primeira jogada.
 *
 * Preenche-se em vez de se subir a `CORRIDA_VERSION` porque o Survival **não
 * tem marcas nenhumas**: o valor correto para uma corrida antiga é exatamente o
 * vazio, e descartar a corrida seria castigar o jogador por uma refatoração.
 */
function normalizar(corrida: CorridaGuardada): CorridaGuardada {
  const estado = corrida.estado;
  const game = estado.game;

  return {
    ...corrida,
    estado: {
      ...estado,
      game:
        game.marcas !== undefined && game.historyMarcas !== undefined
          ? game
          : {
              ...game,
              marcas: game.marcas ?? SEM_MARCAS,
              historyMarcas:
                game.historyMarcas ?? game.history.map(() => SEM_MARCAS),
            },
      /*
       * Corridas gravadas antes das bombas chegam sem estes dois campos. Pela
       * mesma razão das marcas, preenchem-se em vez de se subir a versão: o
       * valor certo para uma corrida antiga é exatamente «sem bomba, contador
       * a zero», e descartá-la seria castigar o jogador por uma mecânica nova.
       */
      linhasDesdeBomba: Number.isFinite(estado.linhasDesdeBomba)
        ? estado.linhasDesdeBomba
        : 0,
      bomba: bombaValida(estado.bomba, game.board) ? estado.bomba : undefined,
    },
  };
}

/**
 * A bomba guardada aponta para uma peça que existe, e tem prazo?
 *
 * Uma que não aponte — de um armazenamento mexido à mão — perde-se, e a corrida
 * não. Rebentar sobre uma coordenada fora do tabuleiro não fazia mal nenhum à
 * engine, mas desenhava um pavio em lado nenhum.
 *
 * Uma bomba de antes das enterradas chega sem `enterrada`, e é exatamente isso
 * que ela era: uma bomba da linha.
 */
function bombaValida(bomba: unknown, board: Board): bomba is BombaSurvival {
  if (typeof bomba !== "object" || bomba === null) return false;

  const { at, rebentaEm, enterrada } = bomba as Partial<BombaSurvival>;
  if (!Number.isInteger(at) || !Number.isFinite(rebentaEm)) return false;
  if (enterrada !== undefined && enterrada !== true) return false;

  return cellAt(board, at as Packed) !== undefined;
}

/**
 * Lê a corrida guardada, ou `undefined`.
 *
 * O tabuleiro passa pelo `checkInvariants` da engine antes de voltar ao jogo.
 * É o mesmo verificador que o gerador usa, e é o que impede um tabuleiro
 * inválido — de um `localStorage` mexido à mão, ou de uma versão antiga — de
 * chegar ao motor e rebentar a meio de uma jogada.
 */
export function lerCorrida(
  storage: ProfileStorage,
): CorridaGuardada | undefined {
  const raw = storage.getItem(CORRIDA_KEY);
  if (raw === null || raw === "") return undefined;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return undefined;
  }

  if (typeof parsed !== "object" || parsed === null) return undefined;

  const envelope = parsed as Partial<Envelope>;
  if (envelope.version !== CORRIDA_VERSION) return undefined;

  const corrida = envelope.corrida;
  if (typeof corrida !== "object") return undefined;

  const estado = corrida.estado as Partial<SurvivalState> | undefined;
  if (typeof estado !== "object" || estado === null) return undefined;

  if (!Number.isFinite(estado.seed)) return undefined;
  if (!Number.isFinite(corrida.decorridoMs)) return undefined;
  /*
   * O prazo da próxima linha é agora parte do estado, e é o que impede a
   * corrida retomada de injetar de imediato. Sem ele — ou com lixo lá dentro —
   * a comparação em `avancarRelogio` dava sempre vencido e o tabuleiro
   * transbordava no instante em que o jogador voltasse.
   */
  if (!Number.isFinite(estado.proximaLinhaMs)) return undefined;

  // Uma corrida já terminada não é uma corrida por retomar.
  if (estado.morto === true || estado.limpo === true) return undefined;

  const board = estado.game?.board;
  if (!Array.isArray(board)) return undefined;
  if (checkInvariants(board).length > 0) return undefined;

  return normalizar(corrida as CorridaGuardada);
}
