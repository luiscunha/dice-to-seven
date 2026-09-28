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

import { SEM_MARCAS, checkInvariants } from "@dicetoseven/engine";

import type { SurvivalState } from "./SurvivalSession";
import type { ProfileStorage } from "./progress";

export const CORRIDA_KEY = "dicetoseven.survival";

/**
 * Sobe quando a forma do `SurvivalState` mudar de maneira incompatível.
 *
 * Uma versão que não se reconheça descarta a corrida em vez de tentar migrar:
 * são partidas a meio, não progresso conquistado.
 */
const CORRIDA_VERSION = 2;

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
  const game = corrida.estado.game;
  if (game.marcas !== undefined && game.historyMarcas !== undefined) {
    return corrida;
  }

  return {
    ...corrida,
    estado: {
      ...corrida.estado,
      game: {
        ...game,
        marcas: game.marcas ?? SEM_MARCAS,
        historyMarcas: game.historyMarcas ?? game.history.map(() => SEM_MARCAS),
      },
    },
  };
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
