/**
 * O Desafio do Dia — o núcleo, sem ecrã.
 *
 * Quatro promessas: **um desafio por dia, à vez**, **a mesma seed para toda a
 * gente no mesmo dia**, **só a primeira tentativa conta**, e **a sequência de
 * dias não mente** — nem a quem ainda não jogou hoje, nem a quem falhou um dia.
 */

import { describe, expect, it } from "vitest";

import type { Desafios } from "../src/session/desafio";
import {
  DESAFIO_KEY,
  SEM_DESAFIOS,
  comecar,
  dataDe,
  diaAnterior,
  diaDaSemana,
  diasDoMes,
  escolherDoDia,
  estadoDoModo,
  guardarDesafios,
  interromper,
  lerDesafios,
  modoDoDia,
  numeroDoDia,
  registar,
  seedDoDia,
  sequencia,
} from "../src/session/desafio";
import type { ProfileStorage } from "../src/session/progress";

const memoria = (): ProfileStorage & { readonly dados: Map<string, string> } => {
  const dados = new Map<string, string>();
  return {
    dados,
    getItem: (k) => dados.get(k) ?? null,
    setItem: (k, v) => void dados.set(k, v),
  };
};

const PUZZLE = { tempoMs: 83_400, selo: "perfect" } as const;
const TEMPO = { pontos: 1240, tabuleiros: 14, saltados: 1 };
const SURVIVAL = { tempoMs: 222_100, limpou: false, linhas: 18 };
const RESULTADO = { puzzle: PUZZLE, tempo: TEMPO, survival: SURVIVAL } as const;

/** Um dia com o desafio desse dia feito. */
const feito = (d: Desafios, data: string): Desafios => {
  const modo = modoDoDia(data);
  return registar(comecar(d, data, modo), data, modo, RESULTADO[modo]);
};

describe("as datas", () => {
  it("o dia é o do fuso de quem joga, e não o de Greenwich", () => {
    // 23:30 de 12 de outubro, hora local: ainda é dia 12, seja qual for o fuso.
    expect(dataDe(new Date(2026, 9, 12, 23, 30))).toBe("2026-10-12");
    expect(dataDe(new Date(2026, 0, 5, 0, 1))).toBe("2026-01-05");
  });

  it("o primeiro desafio é o #1, e conta-se por dias", () => {
    expect(numeroDoDia("2026-10-12")).toBe(1);
    expect(numeroDoDia("2026-10-13")).toBe(2);
    expect(numeroDoDia("2027-10-12")).toBe(366);
  });

  it("os dias do mês, do primeiro ao último — com os bissextos", () => {
    const outubro = diasDoMes("2026-10-12");
    expect(outubro).toHaveLength(31);
    expect(outubro[0]).toBe("2026-10-01");
    expect(outubro.at(-1)).toBe("2026-10-31");

    expect(diasDoMes("2028-02-10")).toHaveLength(29);
    expect(diasDoMes("2026-02-10")).toHaveLength(28);
    expect(diasDoMes("2026-12-31").at(-1)).toBe("2026-12-31");
  });

  it("a semana começa na segunda", () => {
    expect(diaDaSemana("2026-10-12")).toBe(0); // segunda, o #1
    expect(diaDaSemana("2026-10-01")).toBe(3); // quinta
    expect(diaDaSemana("2026-10-18")).toBe(6); // domingo

    // E bate com o calendário do sistema, um ano inteiro.
    for (let i = 0; i < 366; i++) {
      const d = new Date(Date.UTC(2026, 0, 1 + i));
      expect(diaDaSemana(d.toISOString().slice(0, 10))).toBe((d.getUTCDay() + 6) % 7);
    }
  });

  it("o dia anterior atravessa meses e anos", () => {
    expect(diaAnterior("2026-11-01")).toBe("2026-10-31");
    expect(diaAnterior("2027-01-01")).toBe("2026-12-31");
    expect(diaAnterior("2028-03-01")).toBe("2028-02-29");
  });
});

describe("um desafio por dia, à vez", () => {
  it("**Puzzle, Contra-Relógio, Survival**, e outra vez — o #1 é um Puzzle", () => {
    const semana = diasDoMes("2026-10-12").slice(11, 18).map(modoDoDia);
    expect(semana).toEqual(["puzzle", "tempo", "survival", "puzzle", "tempo", "survival", "puzzle"]);
  });

  it("a rotação continua para trás do #1, sem buracos", () => {
    expect(modoDoDia("2026-10-11")).toBe("survival");
    expect(modoDoDia("2026-10-10")).toBe("tempo");
    expect(modoDoDia("2026-10-09")).toBe("puzzle");
  });

  it("atravessa meses e anos sem saltar um modo", () => {
    const modos = ["puzzle", "tempo", "survival"];
    for (let i = 0; i < 400; i++) {
      const data = new Date(Date.UTC(2026, 9, 12 + i)).toISOString().slice(0, 10);
      expect(modoDoDia(data)).toBe(modos[i % 3]);
    }
  });
});

describe("a seed do dia", () => {
  it("**é a mesma para toda a gente no mesmo dia**", () => {
    expect(seedDoDia("2026-10-12", "survival")).toBe(seedDoDia("2026-10-12", "survival"));
  });

  it("muda de dia para dia, e de modo para modo", () => {
    const seeds = new Set<number>();
    for (let i = 0; i < 365; i++) {
      const dia = numeroDoDia("2026-10-12") + i;
      const data = new Date(Date.UTC(2026, 9, 12 + i)).toISOString().slice(0, 10);
      expect(numeroDoDia(data)).toBe(dia);
      seeds.add(seedDoDia(data, "tempo"));
      seeds.add(seedDoDia(data, "survival"));
    }
    expect(seeds.size).toBe(730);
  });

  it("é um inteiro sem sinal, como as seeds do resto do jogo", () => {
    const s = seedDoDia("2026-10-12", "tempo");
    expect(Number.isInteger(s)).toBe(true);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThan(2 ** 32);
  });
});

describe("a tentativa que conta", () => {
  /** Um dia de Contra-Relógio: o #2. */
  const HOJE = "2026-10-13";

  it("começar marca a tentativa, e acabar grava o resultado", () => {
    let d = comecar(SEM_DESAFIOS, HOJE, "tempo");
    expect(estadoDoModo(d, HOJE, "tempo")).toEqual({ estado: "a-jogar" });

    d = registar(d, HOJE, "tempo", TEMPO);
    expect(estadoDoModo(d, HOJE, "tempo")).toEqual({ estado: "feito", resultado: TEMPO });
  });

  it("**só a primeira conta**: um segundo resultado no mesmo dia não muda nada", () => {
    const d = feito(SEM_DESAFIOS, HOJE);
    const outra = registar(comecar(d, HOJE, "tempo"), HOJE, "tempo", { ...TEMPO, pontos: 9_999 });
    expect(estadoDoModo(outra, HOJE, "tempo")).toEqual({ estado: "feito", resultado: TEMPO });
  });

  it("abandonar a meio fica interrompido — e o resto do dia é treino", () => {
    let d = interromper(comecar(SEM_DESAFIOS, HOJE, "tempo"), HOJE, "tempo");
    expect(estadoDoModo(d, HOJE, "tempo")).toEqual({ estado: "interrompido" });

    d = registar(comecar(d, HOJE, "tempo"), HOJE, "tempo", TEMPO);
    expect(estadoDoModo(d, HOJE, "tempo")).toEqual({ estado: "interrompido" });
  });

  it("os dois modos do dia são independentes", () => {
    const d = registar(comecar(feito(SEM_DESAFIOS, HOJE), HOJE, "survival"), HOJE, "survival", SURVIVAL);
    expect(estadoDoModo(d, HOJE, "tempo")?.estado).toBe("feito");
    expect(estadoDoModo(d, HOJE, "survival")).toEqual({ estado: "feito", resultado: SURVIVAL });
  });
});

describe("a sequência de dias", () => {
  it("conta os dias seguidos até hoje", () => {
    let d = SEM_DESAFIOS;
    for (const dia of ["2026-10-10", "2026-10-11", "2026-10-12"]) d = feito(d, dia);
    expect(sequencia(d, "2026-10-12")).toBe(3);
  });

  it("**hoje por jogar não a parte**: conta-se a partir de ontem", () => {
    let d = SEM_DESAFIOS;
    for (const dia of ["2026-10-10", "2026-10-11"]) d = feito(d, dia);
    expect(sequencia(d, "2026-10-12")).toBe(2);
  });

  it("um dia falhado parte-a", () => {
    let d = SEM_DESAFIOS;
    for (const dia of ["2026-10-08", "2026-10-10", "2026-10-11"]) d = feito(d, dia);
    expect(sequencia(d, "2026-10-11")).toBe(2);
    expect(sequencia(d, "2026-10-13")).toBe(0);
  });

  it("uma tentativa interrompida não conta", () => {
    // O 13 é um Contra-Relógio.
    const d = interromper(comecar(feito(SEM_DESAFIOS, "2026-10-12"), "2026-10-13", "tempo"), "2026-10-13", "tempo");
    expect(sequencia(d, "2026-10-13")).toBe(1);
  });

  it("**só conta o desafio do dia**: outro modo feito nesse dia não faz sequência", () => {
    // O 12 é um Puzzle; um Contra-Relógio feito nesse dia é de quando havia três.
    const d = registar(comecar(SEM_DESAFIOS, "2026-10-12", "tempo"), "2026-10-12", "tempo", TEMPO);
    expect(sequencia(d, "2026-10-12")).toBe(0);
  });
});

describe("guardar e ler", () => {
  it("volta exatamente ao que era", () => {
    const s = memoria();
    let d = feito(SEM_DESAFIOS, "2026-10-11");
    d = comecar(d, "2026-10-12", "survival");

    guardarDesafios(s, d);
    expect(lerDesafios(s)).toEqual(d);
  });

  it("sem nada guardado, não há desafios", () => {
    expect(lerDesafios(memoria())).toEqual(SEM_DESAFIOS);
  });

  it("um dia estragado perde-se sozinho, e os outros ficam", () => {
    const s = memoria();
    s.setItem(
      DESAFIO_KEY,
      JSON.stringify({
        versao: 1,
        dias: {
          "2026-10-11": { tempo: { estado: "feito", resultado: TEMPO } },
          "2026-10-12": { tempo: { estado: "feito", resultado: { pontos: "muitos" } } },
          "ontem": { tempo: { estado: "feito", resultado: TEMPO } },
          "2026-02-30": { tempo: { estado: "feito", resultado: TEMPO } },
        },
      }),
    );

    expect(Object.keys(lerDesafios(s).dias)).toEqual(["2026-10-11"]);
  });

  it("lixo no armazenamento não rebenta nada", () => {
    const s = memoria();
    s.setItem(DESAFIO_KEY, "{isto não é json");
    expect(lerDesafios(s)).toEqual(SEM_DESAFIOS);
  });
});

describe("o Puzzle do Dia", () => {
  const POOL = Array.from({ length: 30 }, (_, i) => `nivel-${String(i)}`);

  it("**o mesmo nível para toda a gente no mesmo dia**", () => {
    expect(escolherDoDia("2026-10-14", POOL)).toBe(escolherDoDia("2026-10-14", POOL));
  });

  it("muda a cada Puzzle do Dia — um em cada três dias — e só repete quando a lista acaba", () => {
    const puzzles = Array.from({ length: 31 }, (_, i) =>
      new Date(Date.UTC(2026, 9, 12 + 3 * i)).toISOString().slice(0, 10),
    );
    expect(puzzles.every((d) => modoDoDia(d) === "puzzle")).toBe(true);

    const niveis = puzzles.map((d) => escolherDoDia(d, POOL));
    expect(new Set(niveis.slice(0, 30)).size).toBe(30);
    // O 31.º Puzzle do Dia volta ao primeiro.
    expect(niveis[30]).toBe(niveis[0]);
  });

  it("não segue a ordem do ficheiro", () => {
    expect(escolherDoDia("2026-10-12", POOL)).not.toBe(POOL[0]);
  });

  it("sem níveis, não há puzzle", () => {
    expect(escolherDoDia("2026-10-12", [])).toBeUndefined();
  });

  it("o resultado grava-se, conta para a sequência, e volta do armazenamento", () => {
    const s = memoria();
    const d = registar(comecar(SEM_DESAFIOS, "2026-10-12", "puzzle"), "2026-10-12", "puzzle", PUZZLE);

    expect(sequencia(d, "2026-10-12")).toBe(1);
    guardarDesafios(s, d);
    expect(lerDesafios(s)).toEqual(d);
  });

  it("um selo que não existe perde o dia", () => {
    const s = memoria();
    s.setItem(
      DESAFIO_KEY,
      JSON.stringify({
        versao: 1,
        dias: { "2026-10-12": { puzzle: { estado: "feito", resultado: { tempoMs: 1, selo: "ouro" } } } },
      }),
    );
    expect(lerDesafios(s)).toEqual(SEM_DESAFIOS);
  });
});
