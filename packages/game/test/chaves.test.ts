/**
 * As chaves do Desafio do Dia — o núcleo, sem ecrã.
 *
 * Cinco promessas: **começa-se com uma**, **os patamares dão-se uma vez e só
 * uma**, **salvar a sequência é só para ontem e liga sem somar**, **um dia
 * aberto com uma chave joga-se mas não conta para a sequência**, e **nada
 * disto se perde ao gravar** — nem ao fim de três anos, quando o histórico se
 * corta.
 */

import { describe, expect, it } from "vitest";

import {
  CICLO,
  PATAMARES,
  chavesGanhas,
  desbloquear,
  podeDesbloquear,
  premiar,
  premioDoLugar,
  proteger,
  proximoPatamar,
  sequenciaEmRisco,
} from "../src/session/chaves";
import type { Desafios } from "../src/session/desafio";
import {
  CHAVES_INICIAIS,
  DESAFIO_KEY,
  DIAS_GUARDADOS,
  SEM_DESAFIOS,
  comecar,
  estadoDoModo,
  guardarDesafios,
  interromper,
  lerDesafios,
  lugarNaSequencia,
  modoDoDia,
  registar,
  sequencia,
  somarDias,
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

const RESULTADO = {
  puzzle: { tempoMs: 83_400, selo: "perfect" },
  tempo: { pontos: 1240, tabuleiros: 14, saltados: 1 },
  survival: { tempoMs: 222_100, limpou: true, linhas: 18 },
} as const;

/** O desafio desse dia, feito — e o prémio dado, como o jogo faz ao acabar. */
const feito = (d: Desafios, data: string): Desafios => {
  const modo = modoDoDia(data);
  return premiar(registar(comecar(d, data, modo), data, modo, RESULTADO[modo]), data);
};

/** `n` dias feitos a partir de `inicio`, cada um com o prémio que der. */
const dias = (d: Desafios, inicio: string, n: number): Desafios => {
  let r = d;
  for (let i = 0; i < n; i++) r = feito(r, somarDias(inicio, i));
  return r;
};

/** O #1 — 12 de outubro — é um Puzzle; o 13 um Contra-Relógio; o 14 um Survival. */
const D = (n: number): string => somarDias("2026-10-12", n - 1);

describe("a carteira", () => {
  it("**começa com uma chave**", () => {
    expect(CHAVES_INICIAIS).toBe(1);
    expect(SEM_DESAFIOS.chaves).toBe(1);
    expect(lerDesafios(memoria()).chaves).toBe(1);
  });

  it("quem já jogava antes das chaves também recebe a inicial", () => {
    const s = memoria();
    s.setItem(
      DESAFIO_KEY,
      JSON.stringify({
        versao: 1,
        dias: { [D(1)]: { puzzle: { estado: "feito", resultado: RESULTADO.puzzle } } },
      }),
    );

    const d = lerDesafios(s);
    expect(d.chaves).toBe(1);
    expect(sequencia(d, D(1))).toBe(1);
  });

  it("o saldo grava-se e volta, e um saldo estragado vale o inicial", () => {
    const s = memoria();
    guardarDesafios(s, { ...SEM_DESAFIOS, chaves: 7 });
    expect(lerDesafios(s).chaves).toBe(7);

    for (const lixo of [-1, 2.5, "muitas", null]) {
      s.setItem(DESAFIO_KEY, JSON.stringify({ versao: 1, chaves: lixo, dias: {} }));
      expect(lerDesafios(s).chaves).toBe(CHAVES_INICIAIS);
    }
  });

  it("as marcas de cada dia gravam-se e voltam, e as estragadas caem sozinhas", () => {
    const s = memoria();
    s.setItem(
      DESAFIO_KEY,
      JSON.stringify({
        versao: 1,
        chaves: 2,
        dias: {
          [D(2)]: { protegido: true },
          [D(3)]: { desbloqueado: true, premio: 2 },
          [D(4)]: { protegido: "sim", premio: -1, serie: 0 },
        },
      }),
    );

    expect(lerDesafios(s)).toEqual({
      chaves: 2,
      dias: { [D(2)]: { protegido: true }, [D(3)]: { desbloqueado: true, premio: 2 } },
    });
  });
});

describe("os patamares", () => {
  it("**3 dias +1, 7 dias +2, 14 dias +3, 30 dias +5**", () => {
    expect(PATAMARES).toEqual([
      { dias: 3, chaves: 1 },
      { dias: 7, chaves: 2 },
      { dias: 14, chaves: 3 },
      { dias: 30, chaves: 5 },
    ]);
    expect([1, 2, 3, 4, 7, 13, 14, 29, 30].map(premioDoLugar)).toEqual([0, 0, 1, 0, 2, 0, 3, 0, 5]);
  });

  it("**depois dos 30, o ciclo recomeça**: 33, 37, 44, 60", () => {
    expect(CICLO).toBe(30);
    expect([31, 33, 37, 44, 60, 63, 90].map(premioDoLugar)).toEqual([0, 1, 2, 3, 5, 1, 5]);
  });

  it("um mês seguido dá onze chaves, e cada mês a seguir outras onze", () => {
    const total = (ate: number): number =>
      Array.from({ length: ate }, (_, i) => premioDoLugar(i + 1)).reduce((a, b) => a + b, 0);
    expect(total(30)).toBe(11);
    expect(total(60)).toBe(22);
  });

  it("o próximo patamar diz quando chega e o que dá", () => {
    expect(proximoPatamar(0)).toEqual({ dias: 3, chaves: 1 });
    expect(proximoPatamar(3)).toEqual({ dias: 7, chaves: 2 });
    expect(proximoPatamar(29)).toEqual({ dias: 30, chaves: 5 });
    expect(proximoPatamar(30)).toEqual({ dias: 33, chaves: 1 });
  });
});

describe("ganhar chaves com a sequência", () => {
  it("**ao terceiro dia seguido, +1** — e não antes", () => {
    let d = dias(SEM_DESAFIOS, D(1), 2);
    expect(d.chaves).toBe(1);

    d = feito(d, D(3));
    expect(d.chaves).toBe(2);
    expect(d.dias[D(3)]?.premio).toBe(1);
  });

  it("**cada patamar dá-se uma vez**: premiar outra vez não dá mais nada", () => {
    const d = dias(SEM_DESAFIOS, D(1), 3);
    expect(premiar(premiar(d, D(3)), D(3))).toBe(d);
  });

  it("trinta dias seguidos dão as onze chaves, nos dias certos", () => {
    const d = dias(SEM_DESAFIOS, D(1), 30);
    expect(d.chaves).toBe(1 + 11);

    const comPremio = Object.entries(d.dias)
      .filter(([, dia]) => dia.premio !== undefined)
      .map(([data, dia]) => [data, dia.premio]);
    expect(comPremio).toEqual([
      [D(3), 1],
      [D(7), 2],
      [D(14), 3],
      [D(30), 5],
    ]);
  });

  it("uma sequência nova, depois de partir, volta a ganhar desde os 3", () => {
    let d = dias(SEM_DESAFIOS, D(1), 3);
    // O 4 fica por jogar.
    d = dias(d, D(5), 3);
    expect(d.chaves).toBe(1 + 1 + 1);
  });

  it("um dia que não conta não dá prémio, e um dia sem registo também não", () => {
    let d = dias(SEM_DESAFIOS, D(1), 2);
    // O 3 é um Survival: transbordou, não conta.
    d = registar(comecar(d, D(3), "survival"), D(3), "survival", {
      ...RESULTADO.survival,
      limpou: false,
    });
    expect(premiar(d, D(3))).toBe(d);
    expect(premiar(d, D(9))).toBe(d);
  });

  it("as chaves ganhas contam-se entre dois registos", () => {
    const antes = dias(SEM_DESAFIOS, D(1), 2);
    const depois = feito(antes, D(3));
    expect(chavesGanhas(antes, depois)).toBe(1);
    expect(chavesGanhas(depois, depois)).toBe(0);
  });
});

describe("salvar a sequência", () => {
  /** Cinco dias feitos, do #1 ao #5; o #6 ficou por jogar; hoje é o #7. */
  const cinco = dias(SEM_DESAFIOS, D(1), 5);
  const HOJE = D(7);

  it("**ontem ficou por jogar: a sequência está em risco**, e diz quantos dias", () => {
    expect(sequencia(cinco, HOJE)).toBe(0);
    expect(sequenciaEmRisco(cinco, HOJE)).toEqual({ data: D(6), sequencia: 5 });
  });

  it("sem nada em risco, nada a salvar", () => {
    // Ontem foi feito.
    expect(sequenciaEmRisco(cinco, D(6))).toBeUndefined();
    // Não havia sequência para salvar.
    expect(sequenciaEmRisco(SEM_DESAFIOS, HOJE)).toBeUndefined();
  });

  it("**só ontem**: dois dias seguidos por jogar perdem-na", () => {
    expect(sequenciaEmRisco(cinco, D(8))).toBeUndefined();
    expect(proteger({ ...cinco, chaves: 3 }, D(8))).toEqual({ ...cinco, chaves: 3 });
  });

  it("**gasta uma chave, liga a sequência — e o dia salvo não soma**", () => {
    const d = proteger(cinco, HOJE);
    expect(d.chaves).toBe(cinco.chaves - 1);
    expect(d.dias[D(6)]?.protegido).toBe(true);
    expect(sequencia(d, HOJE)).toBe(5);

    // Hoje feito: seis, e não sete.
    expect(sequencia(feito(d, HOJE), HOJE)).toBe(6);
    expect(sequenciaEmRisco(d, HOJE)).toBeUndefined();
  });

  it("sem chaves, não salva nada", () => {
    const pobre = { ...cinco, chaves: 0 };
    expect(proteger(pobre, HOJE)).toBe(pobre);
  });

  it("**vale até ao fim de hoje, mesmo depois de jogar** — e hoje junta-se à sequência salva", () => {
    const jogado = feito(cinco, HOJE);
    expect(sequencia(jogado, HOJE)).toBe(1);
    expect(sequenciaEmRisco(jogado, HOJE)).toEqual({ data: D(6), sequencia: 5 });

    const salvo = proteger(jogado, HOJE);
    expect(sequencia(salvo, HOJE)).toBe(6);
  });

  it("**salvar depois de jogar dá o patamar que hoje passou a ser**", () => {
    // Seis dias, o 7.º por jogar, e o 8.º feito antes de salvar: era o 1.º dia
    // de uma sequência nova, e passa a ser o 7.º da antiga.
    let d = dias(SEM_DESAFIOS, D(1), 6);
    d = feito(d, D(8));
    const antes = d.chaves;

    d = proteger(d, D(8));
    expect(lugarNaSequencia(d, D(8))).toBe(7);
    expect(d.dias[D(8)]?.premio).toBe(2);
    expect(d.chaves).toBe(antes - 1 + 2);
  });

  it("**ligar duas sequências não dá os patamares outra vez**", () => {
    // 3 dias (+1 ao 3.º), o 4.º salvo, e mais 3: o 5.º, 6.º e 7.º são o 4.º, 5.º e 6.º.
    let d = { ...dias(SEM_DESAFIOS, D(1), 3), chaves: 5 };
    d = proteger(d, D(5));
    d = dias(d, D(5), 3);

    expect(sequencia(d, D(7))).toBe(6);
    expect(Object.values(d.dias).map((dia) => dia.premio ?? 0)).toEqual([0, 0, 1, 0, 0, 0, 0]);
    expect(d.chaves).toBe(5 - 1);
  });

  it("um dia salvo ainda fica por jogar — e pode abrir-se com outra chave", () => {
    const d = proteger({ ...cinco, chaves: 2 }, HOJE);
    expect(podeDesbloquear(d, D(6), HOJE)).toBe(true);
  });
});

describe("abrir um dia passado", () => {
  const HOJE = D(10);

  it("**abre o que ficou por concluir**: por jogar, ou interrompido", () => {
    let d = feito(SEM_DESAFIOS, D(1));
    // O 2 é um Contra-Relógio, interrompido; o 3 ficou por jogar.
    d = interromper(comecar(d, D(2), "tempo"), D(2), "tempo");

    expect(podeDesbloquear(d, D(1), HOJE)).toBe(false);
    expect(podeDesbloquear(d, D(2), HOJE)).toBe(true);
    expect(podeDesbloquear(d, D(3), HOJE)).toBe(true);
  });

  it("um Survival que transbordou também ficou por concluir", () => {
    // O 3 é um Survival.
    const d = registar(comecar(SEM_DESAFIOS, D(3), "survival"), D(3), "survival", {
      ...RESULTADO.survival,
      limpou: false,
    });
    expect(podeDesbloquear(d, D(3), HOJE)).toBe(true);
  });

  it("nem hoje, nem o que vem, nem antes do #1", () => {
    expect(podeDesbloquear(SEM_DESAFIOS, HOJE, HOJE)).toBe(false);
    expect(podeDesbloquear(SEM_DESAFIOS, D(11), HOJE)).toBe(false);
    expect(podeDesbloquear(SEM_DESAFIOS, D(0), HOJE)).toBe(false);
  });

  it("**gasta uma chave**, e a tentativa que lá estava sai: a primeira depois de abrir é a que conta", () => {
    let d = interromper(comecar(SEM_DESAFIOS, D(2), "tempo"), D(2), "tempo");
    d = desbloquear(d, D(2), HOJE);

    expect(d.chaves).toBe(0);
    expect(d.dias[D(2)]?.desbloqueado).toBe(true);
    expect(estadoDoModo(d, D(2), "tempo")).toBeUndefined();

    d = registar(comecar(d, D(2), "tempo"), D(2), "tempo", RESULTADO.tempo);
    expect(estadoDoModo(d, D(2), "tempo")).toEqual({ estado: "feito", resultado: RESULTADO.tempo });
  });

  it("os outros modos guardados nesse dia ficam onde estavam", () => {
    // O 2 é um Contra-Relógio; o Survival desse dia é de quando havia três.
    const d = registar(comecar(SEM_DESAFIOS, D(2), "survival"), D(2), "survival", RESULTADO.survival);
    expect(estadoDoModo(desbloquear(d, D(2), HOJE), D(2), "survival")?.estado).toBe("feito");
  });

  it("**abre-se uma vez**: interrompido depois de aberto, fica interrompido", () => {
    let d = { ...SEM_DESAFIOS, chaves: 3 };
    d = desbloquear(d, D(2), HOJE);
    d = interromper(comecar(d, D(2), "tempo"), D(2), "tempo");

    expect(podeDesbloquear(d, D(2), HOJE)).toBe(false);
    expect(desbloquear(d, D(2), HOJE)).toBe(d);
  });

  it("sem chaves, não abre", () => {
    const pobre = { ...SEM_DESAFIOS, chaves: 0 };
    expect(desbloquear(pobre, D(2), HOJE)).toBe(pobre);
  });

  it("**feito depois, não conta para a sequência** — nem a liga, nem dá patamares", () => {
    // 1 e 2 feitos, o 3 por jogar, 4 e 5 feitos.
    let d = { ...dias(SEM_DESAFIOS, D(1), 2), chaves: 1 };
    d = dias(d, D(4), 2);

    d = desbloquear(d, D(3), D(5));
    d = feito(d, D(3));

    expect(estadoDoModo(d, D(3), "survival")?.estado).toBe("feito");
    expect(sequencia(d, D(5))).toBe(2);
    expect(d.dias[D(3)]?.premio).toBeUndefined();
  });
});

describe("três anos depois", () => {
  /**
   * `n` dias feitos, **sem prémios**. Os mil e cem dias de um histórico cheio
   * construídos com `dias` pediam um `premiar` por dia, e cada um anda a
   * sequência inteira para trás — quadrático, e lento de mais para um teste.
   * Os prémios que interessam aqui são os dos dias que vêm depois.
   */
  const feitos = (d: Desafios, inicio: string, n: number): Desafios => {
    let r = d;
    for (let i = 0; i < n; i++) {
      const data = somarDias(inicio, i);
      const modo = modoDoDia(data);
      r = registar(comecar(r, data, modo), data, modo, RESULTADO[modo]);
    }
    return r;
  };

  /** Um histórico cheio, todo feito. */
  const historicoCheio = (): Desafios => feitos(SEM_DESAFIOS, D(1), DIAS_GUARDADOS);

  it("**uma sequência maior do que o histórico não encolhe ao gravar**", () => {
    const n = DIAS_GUARDADOS + 40;
    const d = dias(historicoCheio(), D(DIAS_GUARDADOS + 1), 40);
    expect(sequencia(d, D(n))).toBe(n);

    const s = memoria();
    guardarDesafios(s, d);
    const lido = lerDesafios(s);

    expect(Object.keys(lido.dias)).toHaveLength(DIAS_GUARDADOS);
    expect(sequencia(lido, D(n))).toBe(n);
    expect(lido.chaves).toBe(d.chaves);
  });

  it("**e os patamares continuam a dar-se uma vez**, dia após dia de histórico cortado", () => {
    const s = memoria();
    let n = DIAS_GUARDADOS;
    let d = historicoCheio();

    // Mais sessenta dias, cada um gravado e relido, como o jogo faz.
    for (let i = 0; i < 60; i++) {
      n++;
      d = feito(d, D(n));
      guardarDesafios(s, d);
      d = lerDesafios(s);
    }

    expect(sequencia(d, D(n))).toBe(n);
    // Cada patamar dos sessenta dias deu-se uma vez, no lugar certo — dois
    // ciclos inteiros, oito patamares.
    let esperado = 0;
    for (let lugar = DIAS_GUARDADOS + 1; lugar <= n; lugar++) esperado += premioDoLugar(lugar);
    expect(esperado).toBeGreaterThan(0);
    expect(d.chaves).toBe(CHAVES_INICIAIS + esperado);
  });

  it("**um dia salvo logo no corte não parte a sequência guardada**", () => {
    // Quarenta e um dias, o 42.º salvo — e é o primeiro que fica guardado —, e
    // feitos até encher o histórico.
    const corte = 41;
    let d = { ...feitos(SEM_DESAFIOS, D(1), corte), chaves: 1 };
    d = proteger(d, D(corte + 2));
    d = feitos(d, D(corte + 2), DIAS_GUARDADOS - 1);
    const fim = D(corte + DIAS_GUARDADOS);

    const s = memoria();
    guardarDesafios(s, d);
    const lido = lerDesafios(s);

    expect(Object.keys(lido.dias).sort()[0]).toBe(D(corte + 1));
    expect(sequencia(lido, fim)).toBe(corte + DIAS_GUARDADOS - 1);
  });
});
