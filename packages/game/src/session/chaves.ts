/**
 * As chaves do Desafio do Dia.
 *
 * Começa-se com uma (`CHAVES_INICIAIS`), e cada chave serve para uma de duas
 * coisas:
 *
 * - **Salvar a sequência.** Ontem ficou por jogar, e a sequência acabava aí:
 *   uma chave liga-a por cima do dia que falhou. **Só ontem**, e só até ao fim
 *   de hoje — dois dias seguidos por jogar perdem-na, chaves ou não. O dia
 *   salvo liga a sequência mas não lhe soma: cinco dias, um salvo e hoje feito
 *   são seis.
 * - **Abrir um dia passado** que ficou por concluir — por jogar, ou
 *   interrompido. Joga-se como se fosse hoje: a primeira tentativa conta (para
 *   o mês, e para a estrela de mês completo), e o resto é treino. **Não conta
 *   para a sequência**: isso é só a outra chave. Duas maneiras de reparar a
 *   sequência eram uma a mais — e ligar duas sequências antigas jogando o dia
 *   entre elas dava os patamares outra vez.
 *
 * Um dia abre-se uma vez. Uma tentativa interrompida depois de aberto fica
 * interrompida, como a de hoje: pagar outra vez para tentar outra vez era o
 * «joga até te sair bem» que a regra da primeira tentativa existe para fechar.
 *
 * ── Ganham-se com a sequência ──
 *
 * Em patamares (`PATAMARES`): aos 3 dias seguidos, +1; aos 7, +2; aos 14, +3;
 * aos 30, +5. Depois dos 30 o ciclo recomeça — 33, 37, 44, 60 —, e uma
 * sequência nova, depois de partir, volta a ganhar desde os 3.
 *
 * ── O saldo guarda-se; o prémio marca-se no dia ──
 *
 * O saldo não se deduz do histórico: o histórico corta-se aos três anos, e um
 * saldo deduzido perdia as chaves dos dias que saem. Guarda-se, e cada prémio
 * deixa a marca no dia em que se ganhou (`premio`). É a marca que faz
 * `premiar` poder correr sempre que a sequência pode ter mudado — ao acabar o
 * desafio, ao salvar a sequência, ao abrir o jogo — sem nunca dar o mesmo
 * patamar duas vezes.
 *
 * O lugar de um dia na sequência só muda num caso: hoje, quando se salva
 * ontem depois de já ter jogado hoje — hoje passa de primeiro dia a mais um da
 * sequência que se salvou. O primeiro dia não é patamar, portanto um dia nunca
 * fica com um prémio que já não devia ter.
 */

import type { DiaDeDesafio, Desafios } from "./desafio";
import {
  contaParaASequencia,
  diaAnterior,
  estadoDoModo,
  lugarNaSequencia,
  modoDoDia,
  numeroDoDia,
} from "./desafio";

export interface Patamar {
  /** Os dias seguidos. */
  readonly dias: number;
  /** As chaves que dá. */
  readonly chaves: number;
}

export const PATAMARES: readonly Patamar[] = [
  { dias: 3, chaves: 1 },
  { dias: 7, chaves: 2 },
  { dias: 14, chaves: 3 },
  { dias: 30, chaves: 5 },
];

/** Os dias do ciclo: depois do último patamar, recomeça. */
export const CICLO = 30;

/** As chaves que a sequência dá no dia em que chega a `lugar` dias. */
export function premioDoLugar(lugar: number): number {
  if (lugar < 1) return 0;
  const noCiclo = ((lugar - 1) % CICLO) + 1;
  return PATAMARES.find((p) => p.dias === noCiclo)?.chaves ?? 0;
}

/** O primeiro patamar depois de `lugar` dias: quando chega, e o que dá. */
export function proximoPatamar(lugar: number): Patamar {
  let dias = Math.max(lugar, 0) + 1;
  while (premioDoLugar(dias) === 0) dias++;
  return { dias, chaves: premioDoLugar(dias) };
}

/**
 * Dá o prémio do dia, se a sequência chegou nele a um patamar. Uma vez só: o
 * dia fica marcado, e chamar outra vez não dá mais nada.
 */
export function premiar(d: Desafios, data: string): Desafios {
  const dia = d.dias[data];
  if (dia === undefined || dia.premio !== undefined) return d;

  const premio = premioDoLugar(lugarNaSequencia(d, data));
  if (premio === 0) return d;

  return {
    ...d,
    chaves: d.chaves + premio,
    dias: { ...d.dias, [data]: { ...dia, premio } },
  };
}

/** As chaves que a sequência deu entre um registo e o seguinte. */
export function chavesGanhas(antes: Desafios, depois: Desafios): number {
  let n = 0;
  for (const [data, dia] of Object.entries(depois.dias)) {
    n += (dia.premio ?? 0) - (antes.dias[data]?.premio ?? 0);
  }
  return n;
}

/* ─── Salvar a sequência ──────────────────────────────────────────────────── */

export interface SequenciaEmRisco {
  /** O dia que ficou por jogar: ontem. */
  readonly data: string;
  /** Os dias seguidos que se salvam — os que acabaram anteontem. */
  readonly sequencia: number;
}

/**
 * A sequência que uma chave pode salvar hoje: a que acabou anteontem, se ontem
 * ficou por jogar. Diz-se mesmo sem chaves na carteira — quem pergunta decide
 * o que fazer com isso.
 *
 * Continua em risco depois de jogar hoje: até à meia-noite, salvar ontem ainda
 * junta hoje à sequência antiga.
 */
export function sequenciaEmRisco(d: Desafios, hoje: string): SequenciaEmRisco | undefined {
  const ontem = diaAnterior(hoje);

  // Ontem contou, ou já foi salvo: não há nada em risco.
  if (contaParaASequencia(d, ontem) || d.dias[ontem]?.protegido === true) return undefined;

  const n = lugarNaSequencia(d, diaAnterior(ontem));
  return n === 0 ? undefined : { data: ontem, sequencia: n };
}

/** Gasta uma chave a salvar a sequência — ver `sequenciaEmRisco`. */
export function proteger(d: Desafios, hoje: string): Desafios {
  const risco = sequenciaEmRisco(d, hoje);
  if (risco === undefined || d.chaves < 1) return d;

  const salvo: Desafios = {
    ...d,
    chaves: d.chaves - 1,
    dias: { ...d.dias, [risco.data]: { ...d.dias[risco.data], protegido: true } },
  };

  // Se hoje já está feito, passou a ser mais um dia da sequência salva — e
  // pode ter chegado a um patamar.
  return premiar(salvo, hoje);
}

/* ─── Abrir um dia passado ────────────────────────────────────────────────── */

/**
 * Um dia passado abre-se com uma chave se o desafio dele ficou por concluir —
 * por jogar, ou interrompido —, e ainda não foi aberto.
 */
export function podeDesbloquear(d: Desafios, data: string, hoje: string): boolean {
  return (
    data < hoje &&
    numeroDoDia(data) >= 1 &&
    d.dias[data]?.desbloqueado !== true &&
    estadoDoModo(d, data, modoDoDia(data))?.estado !== "feito"
  );
}

/**
 * Gasta uma chave a abrir um dia passado. A tentativa que lá estava — uma
 * interrompida, um Puzzle aberto e nunca resolvido — sai: a primeira tentativa
 * depois de abrir é a que conta.
 */
export function desbloquear(d: Desafios, data: string, hoje: string): Desafios {
  if (d.chaves < 1 || !podeDesbloquear(d, data, hoje)) return d;

  const modo = modoDoDia(data);
  const dia: DiaDeDesafio = { ...d.dias[data] };
  const semTentativa = Object.fromEntries(
    Object.entries(dia).filter(([k]) => k !== modo),
  ) as DiaDeDesafio;

  return {
    ...d,
    chaves: d.chaves - 1,
    dias: { ...d.dias, [data]: { ...semTentativa, desbloqueado: true } },
  };
}
