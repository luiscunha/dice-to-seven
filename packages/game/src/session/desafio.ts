/**
 * O Desafio do Dia — o mesmo desafio para toda a gente, uma vez por dia.
 *
 * **Um por dia, à vez** (`modoDoDia`): um Puzzle, um Contra-Relógio, um
 * Survival, e outra vez o Puzzle. Foram três por dia, um de cada modo, e o
 * desafio passou a ser uma lista de tarefas que tirava o lugar ao resto do
 * jogo; um só é uma coisa a fazer hoje, e a rotação é o que faz amanhã ser
 * diferente de hoje.
 *
 * **O Puzzle** é um tabuleiro fixo, o mesmo para toda a gente, escolhido dos
 * níveis que a campanha reservou (`escolherDoDia`). É o desafio que se
 * percebe sem explicação — toda a gente resolveu este tabuleiro — e o mais
 * acessível a quem está a começar. **O Contra-Relógio e o Survival** têm **a
 * seed tirada da data**: no mesmo dia, toda a gente recebe os mesmos
 * tabuleiros, as mesmas linhas e as mesmas bombas. É o que faz um resultado
 * comparar-se com o de outra pessoa, e sai de graça da regra que proíbe
 * `Math.random()`: os dois modos já eram determinísticos na seed.
 *
 * O registo continua a ser por modo, dentro de cada dia: um dia de quando
 * havia três guarda os três, e só conta o do dia.
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
 * «interrompida», sem resultado, e o resto do dia é treino. É assim no
 * Contra-Relógio. O Puzzle e o Survival têm um fim que se ganha, e a tentativa
 * oficial fica aberta até lá: o Puzzle até ser resolvido — não há relógio a
 * correr contra ninguém, e sair para pensar não é desistir —, e o Survival até
 * o tabuleiro ficar limpo. Guarda-se a meio, como a corrida normal, e
 * retoma-se; transbordar volta ao princípio, com as mesmas linhas.
 *
 * Um Survival que transbordava contava como feito. Dava o fogo da sequência a
 * quem perdeu, e quem se deixava perder de propósito ficava com o dia feito em
 * trinta segundos.
 *
 * ── A sessão não lê as horas ──
 *
 * Como em toda a parte: quem sabe que dia é hoje é o ecrã, que o passa para
 * aqui como texto, `AAAA-MM-DD`. É o que deixa testar a sequência de dias sem
 * esperar por amanhã.
 *
 * ── As chaves ──
 *
 * Vivem no mesmo registo, porque mexem na sequência — um dia salvo por uma
 * chave liga-a, um dia jogado depois com uma chave não lhe soma — e porque o
 * saldo e as marcas de cada dia têm de se gravar juntos, ou nada. As regras
 * estão em `chaves.ts`; aqui ficam os dados, e a sequência que os lê.
 */

import { mulberry32, shuffled } from "@dicetoseven/engine";

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

/**
 * Dias guardados: três anos. É o histórico que o trilho deixa ver, mês a mês
 * — ver `primeiroMesDoTrilho`. Um dia guardado são uns cem bytes, e três anos
 * cabem em pouco mais de cem quilobytes.
 */
export const DIAS_GUARDADOS = 1100;

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
  /** Ficou por jogar, e uma chave salvou a sequência — ver `chaves.ts`. */
  readonly protegido?: true;
  /** Uma chave abriu-o depois de ele passar: joga-se, mas não conta para a sequência. */
  readonly desbloqueado?: true;
  /** As chaves que a sequência ganhou neste dia, por chegar a um patamar. */
  readonly premio?: number;
  /** O lugar do dia na sequência, guardado só onde o histórico se corta — ver `guardarDesafios`. */
  readonly serie?: number;
}

/**
 * As chaves com que se começa: uma, ao abrir o jogo pela primeira vez — e
 * também quem já jogava antes de haver chaves a recebe, porque o registo dele
 * não tem saldo nenhum.
 */
export const CHAVES_INICIAIS = 1;

export interface Desafios {
  /** Por data, `AAAA-MM-DD`. */
  readonly dias: Readonly<Record<string, DiaDeDesafio>>;
  /** As chaves na carteira. */
  readonly chaves: number;
}

export const SEM_DESAFIOS: Desafios = { dias: {}, chaves: CHAVES_INICIAIS };

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

/** O resto que não fica negativo: os dias antes do #1 também têm modo. */
const resto = (n: number, m: number): number => ((n % m) + m) % m;

/** A ordem da rotação. O #1 é um Puzzle: é o desafio que toda a gente percebe. */
export const MODOS_DO_DESAFIO: readonly ModoDoDesafio[] = ["puzzle", "tempo", "survival"];

/** O desafio do dia: um modo por dia, à vez. */
export const modoDoDia = (data: string): ModoDoDesafio =>
  MODOS_DO_DESAFIO[resto(numeroDoDia(data) - 1, MODOS_DO_DESAFIO.length)] ?? "puzzle";

/** O dia `n` dias depois de `data` — ou antes, com `n` negativo. */
export const somarDias = (data: string, n: number): string => deDias(emDias(data) + n);

/* ─── Os meses do caminho ─────────────────────────────────────────────────── */

/** O mês de uma data, `AAAA-MM`. Compara-se como texto, como as datas. */
export const mesDe = (data: string): string => data.slice(0, 7);

const somarMeses = (mes: string, n: number): string => {
  const [a, m] = mes.split("-").map(Number);
  const total = (a ?? 1970) * 12 + ((m ?? 1) - 1) + n;
  return `${String(Math.floor(total / 12))}-${doisDigitos(resto(total, 12) + 1)}`;
};

export const mesSeguinte = (mes: string): string => somarMeses(mes, 1);

/** Os dias do mês que tiveram desafio — do #1 em diante —, do primeiro ao último. */
export function diasDoMes(mes: string): string[] {
  const dias: string[] = [];

  for (let d = `${mes}-01`; mesDe(d) === mes; d = somarDias(d, 1)) {
    if (numeroDoDia(d) >= 1) dias.push(d);
  }

  return dias;
}

/**
 * O mês mais antigo que o caminho deixa ver: o do #1, ou o primeiro que ainda
 * está inteiro no armazenamento (`DIAS_GUARDADOS`). Mais para trás, um dia
 * feito que já se apagou aparecia como perdido.
 */
export function primeiroMesDoTrilho(hoje: string): string {
  const guardado = mesSeguinte(mesDe(somarDias(hoje, -DIAS_GUARDADOS)));
  const epoca = mesDe(EPOCA_DESAFIO);
  return guardado > epoca ? guardado : epoca;
}

/** Uma data bem formada, que é tudo o que se aceita vindo do armazenamento ou do endereço. */
export const eData = (s: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(s) && deDias(emDias(s)) === s;

/* ─── A seed ──────────────────────────────────────────────────────────────── */

/**
 * A seed do dia para o modo — a mesma para toda a gente, nesse dia.
 *
 * FNV-1a sobre um texto com o nome do jogo, a data e o modo. O modo entra do
 * tempo em que havia um desafio de cada modo por dia, e fica: mudá-lo mudava as
 * seeds dos dias que já se jogaram.
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
 * O nível do Puzzle do Dia, de uma lista que **tem de vir sempre pela mesma
 * ordem**. A lista é baralhada uma vez, com uma seed fixa — para os dias não
 * seguirem a ordem do ficheiro, que alterna mal as bandas —, e cada Puzzle do
 * Dia leva o seguinte: um em cada três dias, pela rotação. Quando a lista
 * acaba, recomeça: com os 34 níveis reservados, isso acontece ao fim de 102
 * dias, e é aí que precisa de uma banda própria.
 */
export function escolherDoDia<T>(data: string, pool: readonly T[]): T | undefined {
  if (pool.length === 0) return undefined;

  const ordem = shuffled(mulberry32(0x9e2d1), pool);
  // Quantos Puzzles do Dia houve antes deste.
  const n = Math.floor((numeroDoDia(data) - 1) / MODOS_DO_DESAFIO.length);
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
  return { ...d, dias: { ...d.dias, [data]: { ...d.dias[data], [modo]: estado } } };
}

/** Começa a tentativa oficial, se ainda não houve nenhuma nesse dia. */
export function comecar(d: Desafios, data: string, modo: ModoDoDesafio): Desafios {
  if (estadoDoModo(d, data, modo) !== undefined) return d;
  return comEstado(d, data, modo, { estado: "a-jogar" });
}

/**
 * O resultado da tentativa oficial. Só a primeira conta: um resultado de um
 * dia que já tem um, ou de uma tentativa interrompida, não muda nada.
 *
 * **Um Survival que transbordou não é resultado**: o dia resolve-se com o
 * tabuleiro limpo, e a tentativa continua aberta.
 */
export function registar<M extends ModoDoDesafio>(
  d: Desafios,
  data: string,
  modo: M,
  resultado: ResultadoDe[M],
): Desafios {
  const antes = estadoDoModo(d, data, modo);
  if (antes !== undefined && antes.estado !== "a-jogar") return d;
  if (modo === "survival" && !(resultado as ResultadoSurvival).limpou) return d;
  return comEstado(d, data, modo, { estado: "feito", resultado });
}

/** A tentativa oficial ficou a meio e não se pode retomar. */
export function interromper(d: Desafios, data: string, modo: ModoDoDesafio): Desafios {
  if (estadoDoModo(d, data, modo)?.estado !== "a-jogar") return d;
  return comEstado(d, data, modo, { estado: "interrompido" });
}

/* ─── A sequência ─────────────────────────────────────────────────────────── */

/**
 * Um dia conta para a sequência se o desafio desse dia foi feito **nesse
 * dia**. Os outros modos guardados num dia — de quando havia três — não
 * contam; e um dia jogado depois, com uma chave, também não: a sequência é de
 * dias seguidos, e jogar ontem hoje não é jogar ontem.
 */
export const contaParaASequencia = (d: Desafios, data: string): boolean =>
  d.dias[data]?.desbloqueado !== true &&
  estadoDoModo(d, data, modoDoDia(data))?.estado === "feito";

/**
 * O dia que vem antes deste na sequência: ontem, se contou; anteontem, se
 * ontem ficou por jogar mas uma chave o salvou. Senão, nenhum — a sequência
 * começa aqui.
 *
 * O dia salvo **liga** a sequência, mas não lhe soma: cinco dias, um salvo e
 * hoje feito são seis. A chave guarda o que se tinha; não dá um dia que não se
 * jogou.
 */
function anteriorNaSequencia(d: Desafios, data: string): string | undefined {
  const ontem = diaAnterior(data);
  if (contaParaASequencia(d, ontem)) return ontem;

  const anteontem = diaAnterior(ontem);
  if (d.dias[ontem]?.protegido === true && contaParaASequencia(d, anteontem)) return anteontem;

  return undefined;
}

/**
 * O lugar de um dia na sequência que acaba nele: o primeiro dia é o 1. Um dia
 * que não conta não tem lugar, e dá 0.
 *
 * Para quando encontra um `serie` guardado: é onde o histórico foi cortado, e
 * daí para trás já não há dias para contar — ver `guardarDesafios`.
 */
export function lugarNaSequencia(d: Desafios, data: string): number {
  let n = 0;

  for (
    let dia: string | undefined = data;
    dia !== undefined && contaParaASequencia(d, dia);
    dia = anteriorNaSequencia(d, dia)
  ) {
    const guardado = d.dias[dia]?.serie;
    if (guardado !== undefined) return n + guardado;
    n++;
  }

  return n;
}

/**
 * Dias seguidos com desafio feito, até hoje.
 *
 * **Hoje ainda por jogar não parte a sequência**: conta-se a partir de ontem.
 * Sem isto, quem abrisse o jogo de manhã via a sequência a zero antes de ter
 * tido hipótese de a continuar.
 */
export function sequencia(d: Desafios, hoje: string): number {
  if (contaParaASequencia(d, hoje)) return lugarNaSequencia(d, hoje);

  const ultimo = anteriorNaSequencia(d, hoje);
  return ultimo === undefined ? 0 : lugarNaSequencia(d, ultimo);
}

/* ─── Guardar e ler ───────────────────────────────────────────────────────── */

export function guardarDesafios(storage: ProfileStorage, d: Desafios): void {
  // Só os dias mais recentes: os três anos que o trilho deixa ver. O
  // armazenamento de um telemóvel não é sítio para um diário infinito.
  const todas = Object.keys(d.dias).sort();
  const datas = todas.slice(-DIAS_GUARDADOS);
  const dias: Record<string, DiaDeDesafio> = {};
  for (const k of datas) dias[k] = d.dias[k] ?? {};

  /*
   * Uma sequência que atravessa o corte não recomeça do zero: os primeiros
   * dias que ficam guardam o lugar que tinham. Sem isto, uma sequência de mais
   * de três anos ficava presa no tamanho do histórico — e os patamares das
   * chaves, que se contam por ela, repetiam-se dia após dia. Dois dias, porque
   * um dia salvo por uma chave faz a sequência saltar dois para trás.
   */
  if (datas.length < todas.length) {
    for (const k of datas.slice(0, 2)) {
      const lugar = lugarNaSequencia(d, k);
      if (lugar > 0) dias[k] = { ...dias[k], serie: lugar };
    }
  }

  try {
    storage.setItem(
      DESAFIO_KEY,
      JSON.stringify({ versao: DESAFIO_VERSAO, chaves: d.chaves, dias }),
    );
  } catch {
    // Disco cheio ou armazenamento negado: perde-se o registo, não o jogo.
  }
}

const numero = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);

const contagem = (x: unknown): x is number =>
  typeof x === "number" && Number.isInteger(x) && x >= 0;

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
 * O Survival só tem dois estados: aberto, ou feito com o tabuleiro limpo — ver
 * `registar`. Um registo de antes disso pode ter uma corrida que transbordou,
 * dada como feita, ou uma interrompida; as duas leem-se como a tentativa que
 * continua aberta. Hoje, joga-se outra vez; num dia que passou, é um dia por
 * jogar, como os outros.
 */
const survivalAberto = (
  e: EstadoDoModo<ResultadoSurvival> | undefined,
): EstadoDoModo<ResultadoSurvival> | undefined =>
  e === undefined || e.estado === "a-jogar" || (e.estado === "feito" && e.resultado.limpou)
    ? e
    : { estado: "a-jogar" };

/**
 * Lê os desafios, ou nenhuns.
 *
 * Dia a dia e modo a modo: um dia estragado — de um armazenamento mexido à mão,
 * de uma versão futura — perde-se sozinho, e a sequência dos outros fica.
 *
 * Um registo sem saldo é de antes das chaves, e começa com as iniciais, como
 * quem chega agora.
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
  const env = parsed as { versao?: unknown; chaves?: unknown; dias?: unknown };
  if (env.versao !== DESAFIO_VERSAO) return SEM_DESAFIOS;
  if (typeof env.dias !== "object" || env.dias === null) return SEM_DESAFIOS;

  const dias: Record<string, DiaDeDesafio> = {};
  for (const [data, valor] of Object.entries(env.dias as Record<string, unknown>)) {
    if (!eData(data) || typeof valor !== "object" || valor === null) continue;

    const v = valor as {
      puzzle?: unknown;
      tempo?: unknown;
      survival?: unknown;
      protegido?: unknown;
      desbloqueado?: unknown;
      premio?: unknown;
      serie?: unknown;
    };
    const puzzle = estadoValido(v.puzzle, puzzleValido);
    const tempo = estadoValido(v.tempo, tempoValido);
    const survival = survivalAberto(estadoValido(v.survival, survivalValido));

    const dia: DiaDeDesafio = {
      ...(puzzle === undefined ? {} : { puzzle }),
      ...(tempo === undefined ? {} : { tempo }),
      ...(survival === undefined ? {} : { survival }),
      ...(v.protegido === true ? { protegido: true as const } : {}),
      ...(v.desbloqueado === true ? { desbloqueado: true as const } : {}),
      ...(contagem(v.premio) && v.premio > 0 ? { premio: v.premio } : {}),
      ...(contagem(v.serie) && v.serie > 0 ? { serie: v.serie } : {}),
    };

    if (Object.keys(dia).length > 0) dias[data] = dia;
  }

  return { dias, chaves: contagem(env.chaves) ? env.chaves : CHAVES_INICIAIS };
}
