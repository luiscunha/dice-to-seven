/**
 * As estatísticas — o que as medalhas da segunda fase contam.
 *
 * Três promessas: **as catorze composições são exatamente as maneiras de fazer
 * 7** com faces de 1 a 6, e cada grupo cai na sua, com o joker pelo valor que
 * tomou; **guarda-se o melhor de uma corrida**, e não a soma; e **ler nunca
 * falha**, nem deixa entrar uma composição que não existe.
 */

import type { Board, Cell } from "@dicetoseven/engine";
import { packed } from "@dicetoseven/engine";
import { describe, expect, it } from "vitest";

import type { Composicao } from "../src/session/estatisticas";
import {
  COMPOSICOES,
  ESTATISTICAS_KEY,
  SEM_ESTATISTICAS,
  SETE_UNS,
  composicaoDe,
  composicaoDoGrupo,
  guardarEstatisticas,
  lerEstatisticas,
  registarComposicao,
  registarCorridaDeSurvival,
  registarCorridaDeTempo,
} from "../src/session/estatisticas";
import type { ProfileStorage } from "../src/session/progress";

const memoria = (): ProfileStorage & { readonly dados: Map<string, string> } => {
  const dados = new Map<string, string>();
  return {
    dados,
    getItem: (k) => dados.get(k) ?? null,
    setItem: (k, v) => void dados.set(k, v),
  };
};

/** Todas as partições de `n` em partes de 1 a `max`, por ordem crescente. */
function particoes(n: number, min = 1): number[][] {
  if (n === 0) return [[]];
  const r: number[][] = [];
  for (let p = min; p <= Math.min(n, 6); p++) {
    for (const resto of particoes(n - p, p)) r.push([p, ...resto]);
  }
  return r;
}

/* ─── As composições ──────────────────────────────────────────────────────── */

describe("as composições do 7", () => {
  it("são exatamente as catorze maneiras de fazer 7 com faces de 1 a 6", () => {
    const todas = particoes(7).map((p) => p.join(""));
    expect([...COMPOSICOES].sort()).toEqual(todas.sort());
    expect(COMPOSICOES).toHaveLength(14);
  });

  it("um grupo cai na sua, pela ordem que for", () => {
    expect(composicaoDe([3, 4])).toBe("34");
    expect(composicaoDe([4, 3])).toBe("34");
    expect(composicaoDe([5, 1, 1])).toBe("115");
    expect(composicaoDe([1, 1, 1, 1, 1, 1, 1])).toBe(SETE_UNS);
  });

  it("o joker conta pelo valor que tomou — o que falta para 7", () => {
    expect(composicaoDe([0, 5])).toBe("25");
    expect(composicaoDe([1, 0, 1])).toBe("115");
    expect(composicaoDe([1, 1, 1, 1, 1, 0, 1])).toBe(SETE_UNS);
  });

  it("o que não soma 7 não é composição nenhuma", () => {
    expect(composicaoDe([3, 3])).toBeUndefined();
    expect(composicaoDe([6, 6])).toBeUndefined();
    expect(composicaoDe([])).toBeUndefined();
  });

  it("lê-se do tabuleiro de antes de o grupo sair", () => {
    // Coluna 0: 3 em baixo, 1 por cima; coluna 1: 4.
    const board: Board = [[3, 1], [4]];
    expect(composicaoDoGrupo(board, [packed(0, 0), packed(1, 0)])).toBe("34");
    // Uma célula fora da silhueta não inventa uma face.
    expect(composicaoDoGrupo(board, [packed(0, 0), packed(1, 3)])).toBeUndefined();
  });
});

/* ─── Registar ────────────────────────────────────────────────────────────── */

describe("registar", () => {
  it("guarda o melhor de uma corrida, e não a soma", () => {
    let e = registarCorridaDeTempo(SEM_ESTATISTICAS, { bombas: 3, combo: 6 });
    e = registarCorridaDeTempo(e, { bombas: 2, combo: 8 });
    expect(e.bombas).toBe(3);
    expect(e.combo).toBe(8);

    e = registarCorridaDeSurvival(e, { linhas: 14 });
    e = registarCorridaDeSurvival(e, { linhas: 9 });
    expect(e.linhas).toBe(14);
  });

  it("sem nada melhor, devolve o mesmo objeto — não há nada a gravar", () => {
    const e = registarCorridaDeTempo(SEM_ESTATISTICAS, { bombas: 3, combo: 6 });
    expect(registarCorridaDeTempo(e, { bombas: 3, combo: 2 })).toBe(e);
    expect(registarCorridaDeSurvival(e, { linhas: 0 })).toBe(e);
    expect(registarComposicao(e, undefined)).toBe(e);
  });

  it("cada composição conta uma vez, e ficam pela ordem do catálogo", () => {
    let e = registarComposicao(SEM_ESTATISTICAS, SETE_UNS);
    e = registarComposicao(e, "34");
    e = registarComposicao(e, "16");
    expect(registarComposicao(e, "34")).toBe(e);
    expect(e.composicoes).toEqual(["16", "34", SETE_UNS]);
  });
});

/* ─── Guardar e ler ───────────────────────────────────────────────────────── */

describe("guardar e ler", () => {
  it("sobrevive a gravar e reler", () => {
    const m = memoria();
    const e = {
      bombas: 5,
      combo: 9,
      linhas: 21,
      composicoes: ["25", "1123", SETE_UNS] as Composicao[],
    };
    guardarEstatisticas(m, e);
    expect(lerEstatisticas(m)).toEqual(e);
  });

  it("nunca falha: nada, lixo, ou outra versão dão as estatísticas vazias", () => {
    const m = memoria();
    expect(lerEstatisticas(m)).toEqual(SEM_ESTATISTICAS);
    m.setItem(ESTATISTICAS_KEY, "{isto não é json");
    expect(lerEstatisticas(m)).toEqual(SEM_ESTATISTICAS);
    m.setItem(ESTATISTICAS_KEY, JSON.stringify({ versao: 99, bombas: 5 }));
    expect(lerEstatisticas(m)).toEqual(SEM_ESTATISTICAS);
  });

  it("um número estragado vale zero, e uma composição que não existe não entra", () => {
    const m = memoria();
    m.setItem(
      ESTATISTICAS_KEY,
      JSON.stringify({
        versao: 1,
        bombas: -3,
        combo: "nove",
        linhas: 12.7,
        composicoes: ["34", "77", 16, "34", SETE_UNS],
      }),
    );
    expect(lerEstatisticas(m)).toEqual({
      bombas: 0,
      combo: 0,
      linhas: 12,
      composicoes: ["34", SETE_UNS],
    });
  });

  it("as faces de um grupo nunca chegam ao disco: só as composições", () => {
    const m = memoria();
    const faces: Cell[] = [1, 6];
    guardarEstatisticas(m, registarComposicao(SEM_ESTATISTICAS, composicaoDe(faces)));
    expect(JSON.parse(m.dados.get(ESTATISTICAS_KEY) ?? "{}")).toEqual({
      versao: 1,
      bombas: 0,
      combo: 0,
      linhas: 0,
      composicoes: ["16"],
    });
  });
});
