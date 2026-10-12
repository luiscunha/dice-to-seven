/**
 * O Desafio do Dia — o mesmo desafio para toda a gente, uma vez por dia.
 *
 * Três por dia. **Um Puzzle**: um tabuleiro fixo, o mesmo para toda a gente,
 * escolhido dos níveis que a campanha reservou (`escolherDoDia`). É o desafio
 * que se percebe sem explicação — toda a gente resolveu este tabuleiro — e o
 * mais acessível a quem está a começar. **Um Contra-Relógio e um Survival**,
 * com **a seed tirada da data**: no mesmo dia, toda a gente recebe os mesmos
 * tabuleiros, as mesmas linhas e as mesmas bombas. É o que faz um resultado
 * comparar-se com o de outra pessoa, e sai de graça da regra que proíbe
 * `Math.random()`: os dois modos já eram determinísticos na seed.
 *
 * ── A tentativa que conta é a primeira ──
 *
 * Jogar outra vez no mesmo dia é treino: os mesmos tabuleiros, e o resultado
 * não se grava. Sem isto o desafio era «joga até te sair bem», e um resultado
 * partilhado deixava de dizer alguma coisa.
 *
 * A primeira tentativa marca-se ao **começar**, e não só ao acabar. Uma corrida
 * que corria mal e se abandonava a meio — a aplicação fechada, o browser a
 * recuar — voltava a ser a primeira, e era a mesma porta aberta. Fica
 * «interrompida», sem resultado, e o resto do dia é treino. O Survival é a
 * exceção boa: guarda-se a meio, como a corrida normal, e retoma-se. O Puzzle
 * também: não há relógio a correr contra ninguém, e sair para pensar não é
 * desistir — a tentativa oficial fica aberta até ser resolvida.
 *
 * ── A sessão não lê as horas ──
 *
 * Como em toda a parte: quem sabe que dia é hoje é o ecrã, que o passa para
 * aqui como texto, `AAAA-MM-DD`. É o que deixa testar a sequência de dias sem
 * esperar por amanhã.
 */

import type { Cell } from "@dicetoseven/engine";
import { mulberry32, randInt, shuffled } from "@dicetoseven/engine";

import type { ProfileStorage } from "./progress";

export type ModoDoDesafio = "puzzle" | "tempo" | "survival";

/** O dia do primeiro desafio. É o «#1», e daí em diante conta-se. */
export const EPOCA_DESAFIO = "2026-10-12";

export const DESAFIO_KEY = "dicetoseven.desafio";
export const DESAFIO_VERSAO = 1;

/**
 * O tempo de arranque do Contra-Relógio do Dia.
 *
 * **Fixo, e não a definição do jogador.** Um resultado de 90 s de arranque não
 * se compara com um de 30, e o desafio existe para comparar. Sessenta é a
 * omissão das definições.
 */
export const DESAFIO_TEMPO_INICIAL = 60;

/** Dias guardados. Chega para a sequência mais longa que importa mostrar. */
const DIAS_GUARDADOS = 400;

export interface ResultadoTempo {
  readonly pontos: number;
  readonly tabuleiros: number;
  readonly saltados: number;
}

export interface ResultadoSurvival {
  readonly tempoMs: number;
  readonly limpou: boolean;
  readonly linhas: number;
}

/** O selo é o da campanha: perfeito, limpo (com dicas) ou concluído. */
export type SeloDoPuzzle = "perfect" | "clean" | "completed";

export interface ResultadoPuzzle {
  readonly tempoMs: number;
  readonly selo: SeloDoPuzzle;
}

interface ResultadoDe {
  readonly puzzle: ResultadoPuzzle;
  readonly tempo: ResultadoTempo;
  readonly survival: ResultadoSurvival;
}

export type EstadoDoModo<R> =
  | { readonly estado: "a-jogar" }
  | { readonly estado: "feito"; readonly resultado: R }
  | { readonly estado: "interrompido" };

export interface DiaDeDesafio {
  readonly puzzle?: EstadoDoModo<ResultadoPuzzle>;
  readonly tempo?: EstadoDoModo<ResultadoTempo>;
  readonly survival?: EstadoDoModo<ResultadoSurvival>;
}

export interface Desafios {
  /** Por data, `AAAA-MM-DD`. */
  readonly dias: Readonly<Record<string, DiaDeDesafio>>;
}

export const SEM_DESAFIOS: Desafios = { dias: {} };

/* ─── Datas ───────────────────────────────────────────────────────────────── */

const doisDigitos = (n: number): string => String(n).padStart(2, "0");

/**
 * O dia de `d` no **fuso de quem joga**, como `AAAA-MM-DD`.
 *
 * Local e não UTC: o desafio muda à meia-noite de quem o joga, como um jornal.
 * Em UTC, em Portugal no verão o desafio mudava à uma da manhã, e no Brasil às
 * nove da noite — a meio do serão.
 */
export const dataDe = (d: Date): string =>
  `${String(d.getFullYear())}-${doisDigitos(d.getMonth() + 1)}-${doisDigitos(d.getDate())}`;

/** Meia-noite UTC dessa data. Só para contar dias, e por isso em UTC. */
const emDias = (data: string): number => {
  const [a, m, d] = data.split("-").map(Number);
  return Math.round(Date.UTC(a ?? 1970, (m ?? 1) - 1, d ?? 1) / 86_400_000);
};

const deDias = (dias: number): string => {
  const d = new Date(dias * 86_400_000);
  return `${String(d.getUTCFullYear())}-${doisDigitos(d.getUTCMonth() + 1)}-${doisDigitos(d.getUTCDate())}`;
};

export const diaAnterior = (data: string): string => deDias(emDias(data) - 1);

/** O número do desafio: o primeiro dia é o #1. */
export const numeroDoDia = (data: string): number =>
  emDias(data) - emDias(EPOCA_DESAFIO) + 1;

/** Uma data bem formada, que é tudo o que se aceita vindo do armazenamento. */
const eData = (s: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(s) && deDias(emDias(s)) === s;

/* ─── A seed ──────────────────────────────────────────────────────────────── */

/**
 * A seed do dia para o modo — a mesma para toda a gente, nesse dia.
 *
 * FNV-1a sobre um texto com o nome do jogo, a data e o modo. O modo entra para
 * os dois desafios do dia não partilharem a seed: o Survival e o Contra-Relógio
 * consomem-na de maneiras diferentes, mas uma relação entre os dois seria um
 * padrão que alguém acabaria por encontrar.
 */
export function seedDoDia(data: string, modo: ModoDoDesafio): number {
  let h = 0x811c9dc5;
  for (const c of `dicetoseven|${data}|${modo}`) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Os dados do dia: seis faces tiradas da seed. **Só desenho** — a cara do
 * desafio na Home, diferente todos os dias e igual para toda a gente no mesmo
 * dia. Não entram em nenhuma corrida.
 */
export function dadosDoDia(data: string): Cell[] {
  const rng = mulberry32(seedDoDia(data, "tempo") ^ 0xd1ce);
  return Array.from({ length: 6 }, () => (randInt(rng, 6) + 1) as Cell);
}

/**
 * O nível do Puzzle do Dia, de uma lista que **tem de vir sempre pela mesma
 * ordem**. A lista é baralhada uma vez, com uma seed fixa — para os dias não
 * seguirem a ordem do ficheiro, que alterna mal as bandas —, e cada dia leva o
 * seguinte. Quando a lista acaba, recomeça: com os 30 níveis reservados, isso
 * acontece ao fim de um mês, e é aí que precisa de uma banda própria.
 */
export function escolherDoDia<T>(data: string, pool: readonly T[]): T | undefined {
  if (pool.length === 0) return undefined;

  const ordem = shuffled(mulberry32(0x9e2d1), pool);
  const n = numeroDoDia(data) - 1;
  return ordem[((n % ordem.length) + ordem.length) % ordem.length];
}

/* ─── A tentativa ─────────────────────────────────────────────────────────── */

export const estadoDoModo = <M extends ModoDoDesafio>(
  d: Desafios,
  data: string,
  modo: M,
): EstadoDoModo<ResultadoDe[M]> | undefined =>
  d.dias[data]?.[modo] as EstadoDoModo<ResultadoDe[M]> | undefined;

function comEstado<M extends ModoDoDesafio>(
  d: Desafios,
  data: string,
  modo: M,
  estado: EstadoDoModo<ResultadoDe[M]>,
): Desafios {
  return { dias: { ...d.dias, [data]: { ...d.dias[data], [modo]: estado } } };
}

/** Começa a tentativa oficial, se ainda não houve nenhuma nesse dia. */
export function comecar(d: Desafios, data: string, modo: ModoDoDesafio): Desafios {
  if (estadoDoModo(d, data, modo) !== undefined) return d;
  return comEstado(d, data, modo, { estado: "a-jogar" });
}

/**
 * O resultado da tentativa oficial. Só a primeira conta: um resultado de um
 * dia que já tem um, ou de uma tentativa interrompida, não muda nada.
 */
export function registar<M extends ModoDoDesafio>(
  d: Desafios,
  data: string,
  modo: M,
  resultado: ResultadoDe[M],
): Desafios {
  const antes = estadoDoModo(d, data, modo);
  if (antes !== undefined && antes.estado !== "a-jogar") return d;
  return comEstado(d, data, modo, { estado: "feito", resultado });
}

/** A tentativa oficial ficou a meio e não se pode retomar. */
export function interromper(d: Desafios, data: string, modo: ModoDoDesafio): Desafios {
  if (estadoDoModo(d, data, modo)?.estado !== "a-jogar") return d;
  return comEstado(d, data, modo, { estado: "interrompido" });
}

/* ─── A sequência ─────────────────────────────────────────────────────────── */

/** Um dia conta para a sequência se pelo menos um dos desafios foi feito. */
const conta = (dia: DiaDeDesafio | undefined): boolean =>
  dia?.puzzle?.estado === "feito" ||
  dia?.tempo?.estado === "feito" ||
  dia?.survival?.estado === "feito";

/**
 * Dias seguidos com desafio feito, até hoje.
 *
 * **Hoje ainda por jogar não parte a sequência**: conta-se a partir de ontem.
 * Sem isto, quem abrisse o jogo de manhã via a sequência a zero antes de ter
 * tido hipótese de a continuar.
 */
export function sequencia(d: Desafios, hoje: string): number {
  let dia = conta(d.dias[hoje]) ? hoje : diaAnterior(hoje);
  let n = 0;

  while (conta(d.dias[dia])) {
    n++;
    dia = diaAnterior(dia);
  }

  return n;
}

/* ─── Guardar e ler ───────────────────────────────────────────────────────── */

export function guardarDesafios(storage: ProfileStorage, d: Desafios): void {
  // Só os dias mais recentes: a sequência não precisa de mais, e o armazenamento
  // de um telemóvel não é sítio para um diário infinito.
  const datas = Object.keys(d.dias).sort().slice(-DIAS_GUARDADOS);
  const dias = Object.fromEntries(datas.map((k) => [k, d.dias[k]]));

  try {
    storage.setItem(DESAFIO_KEY, JSON.stringify({ versao: DESAFIO_VERSAO, dias }));
  } catch {
    // Disco cheio ou armazenamento negado: perde-se o registo, não o jogo.
  }
}

const numero = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);

function estadoValido<R>(
  x: unknown,
  resultadoValido: (r: unknown) => r is R,
): EstadoDoModo<R> | undefined {
  if (typeof x !== "object" || x === null) return undefined;
  const e = x as { estado?: unknown; resultado?: unknown };

  if (e.estado === "a-jogar") return { estado: "a-jogar" };
  if (e.estado === "interrompido") return { estado: "interrompido" };
  if (e.estado === "feito" && resultadoValido(e.resultado)) {
    return { estado: "feito", resultado: e.resultado };
  }
  return undefined;
}

const tempoValido = (r: unknown): r is ResultadoTempo => {
  const t = r as Partial<ResultadoTempo> | null;
  return (
    typeof t === "object" && t !== null &&
    numero(t.pontos) && numero(t.tabuleiros) && numero(t.saltados)
  );
};

const SELOS: readonly unknown[] = ["perfect", "clean", "completed"];

const puzzleValido = (r: unknown): r is ResultadoPuzzle => {
  const p = r as Partial<ResultadoPuzzle> | null;
  return typeof p === "object" && p !== null && numero(p.tempoMs) && SELOS.includes(p.selo);
};

const survivalValido = (r: unknown): r is ResultadoSurvival => {
  const s = r as Partial<ResultadoSurvival> | null;
  return (
    typeof s === "object" && s !== null &&
    numero(s.tempoMs) && typeof s.limpou === "boolean" && numero(s.linhas)
  );
};

/**
 * Lê os desafios, ou nenhuns.
 *
 * Dia a dia e modo a modo: um dia estragado — de um armazenamento mexido à mão,
 * de uma versão futura — perde-se sozinho, e a sequência dos outros fica.
 */
export function lerDesafios(storage: ProfileStorage): Desafios {
  let parsed: unknown;
  try {
    const raw = storage.getItem(DESAFIO_KEY);
    if (raw === null || raw === "") return SEM_DESAFIOS;
    parsed = JSON.parse(raw);
  } catch {
    return SEM_DESAFIOS;
  }

  if (typeof parsed !== "object" || parsed === null) return SEM_DESAFIOS;
  const env = parsed as { versao?: unknown; dias?: unknown };
  if (env.versao !== DESAFIO_VERSAO) return SEM_DESAFIOS;
  if (typeof env.dias !== "object" || env.dias === null) return SEM_DESAFIOS;

  const dias: Record<string, DiaDeDesafio> = {};
  for (const [data, valor] of Object.entries(env.dias as Record<string, unknown>)) {
    if (!eData(data) || typeof valor !== "object" || valor === null) continue;

    const v = valor as { puzzle?: unknown; tempo?: unknown; survival?: unknown };
    const puzzle = estadoValido(v.puzzle, puzzleValido);
    const tempo = estadoValido(v.tempo, tempoValido);
    const survival = estadoValido(v.survival, survivalValido);

    if (puzzle === undefined && tempo === undefined && survival === undefined) continue;
    dias[data] = {
      ...(puzzle === undefined ? {} : { puzzle }),
      ...(tempo === undefined ? {} : { tempo }),
      ...(survival === undefined ? {} : { survival }),
    };
  }

  return { dias };
}
