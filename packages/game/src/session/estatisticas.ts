/**
 * As estatísticas: o que o jogo passou a contar por causa das medalhas.
 *
 * As primeiras medalhas deduziam-se todas do que o jogo já guardava — os selos,
 * os recordes, o histórico do desafio —, e por isso chegaram retroativas. Estas
 * não: são coisas que nenhum registo tinha. As bombas desarmadas numa corrida,
 * o combo mais longo, as linhas aguentadas no Survival, e os grupos que se
 * eliminaram. **Contam a partir daqui**, e é por isso que vivem à parte.
 *
 * ── Os máximos, e não as somas ──
 *
 * As três primeiras guardam **o melhor de uma corrida**, porque é isso que as
 * medalhas pedem: cinco bombas *numa* corrida, e não cinco ao longo de um mês.
 * Um contador acumulado premiava a persistência, e para isso já há o Desafio do
 * Dia.
 *
 * ── As composições do 7 ──
 *
 * Há catorze maneiras de fazer 7 com faces de 1 a 6, de «1 + 6» aos sete 1. Um
 * grupo eliminado é uma delas, e o que se guarda é **quais já saíram**, e não
 * quantas vezes: é a coleção do Colecionador, e o sete uns é uma das catorze.
 * O joker conta pelo valor que tomou — que é o único possível, o que falta
 * para 7.
 *
 * Numa chave própria, e não no registo das medalhas: um jogo mais antigo,
 * instalado por cima deste, lê o registo das medalhas com a versão que conhece,
 * e não pode apagar números que nunca soube contar.
 */

import type { Board, Cell, Packed } from "@dicetoseven/engine";
import { cellAt } from "@dicetoseven/engine";

import type { ProfileStorage } from "./progress";

/**
 * As catorze composições do 7 em faces de 1 a 6, com as partes por ordem
 * crescente. É a ordem em que a página as mostra: das duas peças às sete.
 */
export const COMPOSICOES = [
  "16",
  "25",
  "34",
  "115",
  "124",
  "133",
  "223",
  "1114",
  "1123",
  "1222",
  "11113",
  "11122",
  "111112",
  "1111111",
] as const;

export type Composicao = (typeof COMPOSICOES)[number];

/** O maior grupo que existe: sete peças, todas com uma pinta. */
export const SETE_UNS: Composicao = "1111111";

const eComposicao = (x: unknown): x is Composicao =>
  typeof x === "string" && (COMPOSICOES as readonly string[]).includes(x);

/**
 * A composição de um grupo, pelas faces que tinha antes de sair.
 *
 * O joker (`0`) toma o que falta para 7. Um grupo que não some 7 — que não
 * devia chegar aqui — não é composição nenhuma.
 */
export function composicaoDe(faces: readonly Cell[]): Composicao | undefined {
  const fixas = faces.filter((f) => f !== 0);
  const soma = fixas.reduce((a, b) => a + b, 0);
  const valores = fixas.length === faces.length ? fixas : [...fixas, 7 - soma];
  const chave = [...valores].sort((a, b) => a - b).join("");
  return eComposicao(chave) ? chave : undefined;
}

/**
 * A composição de um grupo, lida do tabuleiro **de antes** de ele sair — o
 * único que ainda tem as faces. Os três modos chamam isto com o tabuleiro de
 * antes do toque e o `lastMove` da sessão.
 */
export const composicaoDoGrupo = (board: Board, grupo: readonly Packed[]): Composicao | undefined =>
  composicaoDe(grupo.map((p) => cellAt(board, p)).filter((c): c is Cell => c !== undefined));

export interface Estatisticas {
  /** Mais bombas desarmadas numa corrida do Contra-Relógio. */
  readonly bombas: number;
  /**
   * O combo mais longo numa corrida do Contra-Relógio: jogadas seguidas, no
   * mesmo tabuleiro, sem passar a janela entre elas. Ver `combos.ts`.
   */
  readonly combo: number;
  /** Mais linhas aguentadas numa corrida do Survival, contando as puxadas. */
  readonly linhas: number;
  /** As composições do 7 que já saíram, pela ordem de `COMPOSICOES`. */
  readonly composicoes: readonly Composicao[];
}

export const SEM_ESTATISTICAS: Estatisticas = { bombas: 0, combo: 0, linhas: 0, composicoes: [] };

/*
 * Todas as funções de registo devolvem **o mesmo objeto** quando nada muda,
 * para quem chama saber, por identidade, que não há nada a gravar.
 */

/** Uma corrida do Contra-Relógio acabou. */
export function registarCorridaDeTempo(
  e: Estatisticas,
  corrida: { readonly bombas: number; readonly combo: number },
): Estatisticas {
  if (corrida.bombas <= e.bombas && corrida.combo <= e.combo) return e;
  return { ...e, bombas: Math.max(e.bombas, corrida.bombas), combo: Math.max(e.combo, corrida.combo) };
}

/** Uma corrida do Survival acabou. */
export function registarCorridaDeSurvival(
  e: Estatisticas,
  corrida: { readonly linhas: number },
): Estatisticas {
  return corrida.linhas <= e.linhas ? e : { ...e, linhas: corrida.linhas };
}

/** Saiu um grupo. Só conta a primeira vez de cada composição. */
export function registarComposicao(e: Estatisticas, c: Composicao | undefined): Estatisticas {
  if (c === undefined || e.composicoes.includes(c)) return e;
  const feitas = new Set([...e.composicoes, c]);
  return { ...e, composicoes: COMPOSICOES.filter((x) => feitas.has(x)) };
}

/* ─── Guardar e ler ───────────────────────────────────────────────────────── */

export const ESTATISTICAS_KEY = "dicetoseven.estatisticas";
export const ESTATISTICAS_VERSAO = 1;

export function guardarEstatisticas(storage: ProfileStorage, e: Estatisticas): void {
  try {
    storage.setItem(ESTATISTICAS_KEY, JSON.stringify({ versao: ESTATISTICAS_VERSAO, ...e }));
  } catch {
    // Disco cheio ou armazenamento negado: perdem-se os números, não o jogo.
  }
}

/** Um contador lido do disco: um inteiro não negativo, ou zero. */
const contador = (x: unknown): number =>
  typeof x === "number" && Number.isFinite(x) && x > 0 ? Math.floor(x) : 0;

/** Lê as estatísticas, ou nenhumas. Nunca falha. */
export function lerEstatisticas(storage: ProfileStorage): Estatisticas {
  let parsed: unknown;
  try {
    const raw = storage.getItem(ESTATISTICAS_KEY);
    if (raw === null || raw === "") return SEM_ESTATISTICAS;
    parsed = JSON.parse(raw);
  } catch {
    return SEM_ESTATISTICAS;
  }

  if (typeof parsed !== "object" || parsed === null) return SEM_ESTATISTICAS;
  const env = parsed as Record<string, unknown>;
  if (env["versao"] !== ESTATISTICAS_VERSAO) return SEM_ESTATISTICAS;

  const lidas = Array.isArray(env["composicoes"]) ? env["composicoes"] : [];
  const feitas = new Set(lidas.filter(eComposicao));

  return {
    bombas: contador(env["bombas"]),
    combo: contador(env["combo"]),
    linhas: contador(env["linhas"]),
    composicoes: COMPOSICOES.filter((c) => feitas.has(c)),
  };
}
