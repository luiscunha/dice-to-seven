/**
 * As medalhas — o núcleo, sem ecrã.
 *
 * Quatro promessas: **cada medalha cai no seu limiar, nem antes nem depois**;
 * **deduzem-se do que o jogo já guarda**, e por isso chegam a quem já tinha o
 * progresso; **uma medalha ganha não se perde**; e **o registo nunca falha a
 * ler**, nem perde medalhas que esta versão do jogo não conhece.
 */

import { describe, expect, it } from "vitest";

import type { Desafios, ModoDoDesafio } from "../src/session/desafio";
import {
  SEM_DESAFIOS,
  maiorSequencia,
  mesCompleto,
  modoDoDia,
  registar,
  somarDias,
} from "../src/session/desafio";
import type { Estatisticas } from "../src/session/estatisticas";
import { COMPOSICOES, SEM_ESTATISTICAS, SETE_UNS } from "../src/session/estatisticas";
import type { ContextoDasMedalhas, Medalha, RegistoDeMedalhas } from "../src/session/medalhas";
import {
  LIMIARES,
  MEDALHAS,
  MEDALHAS_KEY,
  SEM_MEDALHAS,
  atingido,
  avaliar,
  contarGanhas,
  guardarMedalhas,
  lerMedalhas,
  marcarVistas,
} from "../src/session/medalhas";
import { t } from "../src/i18n";
import type { LevelProgress, Profile, ProfileStorage } from "../src/session/progress";
import { emptyProfile } from "../src/session/progress";

const memoria = (): ProfileStorage & { readonly dados: Map<string, string> } => {
  const dados = new Map<string, string>();
  return {
    dados,
    getItem: (k) => dados.get(k) ?? null,
    setItem: (k, v) => void dados.set(k, v),
  };
};

const HOJE = "2026-12-10";

/** Uma campanha pequena: três níveis no Iniciado, dois no Perito. */
const CAPITULOS = [
  { id: "iniciado", niveis: [{ id: "i1" }, { id: "i2" }, { id: "i3" }] },
  { id: "medio", niveis: [{ id: "m1" }] },
  { id: "avancado", niveis: [{ id: "a1" }] },
  { id: "perito", niveis: [{ id: "p1" }, { id: "p2" }] },
];

const ctx = (
  perfil: Partial<Profile> = {},
  desafios: Desafios = SEM_DESAFIOS,
  estatisticas: Partial<Estatisticas> = {},
  ganhas: Readonly<Record<string, string>> = {},
): ContextoDasMedalhas => ({
  perfil: { ...emptyProfile(), ...perfil },
  desafios,
  estatisticas: { ...SEM_ESTATISTICAS, ...estatisticas },
  ganhas,
  capitulos: CAPITULOS,
  hoje: HOJE,
});

const medalha = (id: string): Medalha => {
  const m = MEDALHAS.find((x) => x.id === id);
  if (m === undefined) throw new Error(`sem medalha ${id}`);
  return m;
};

const ganha = (id: string, c: ContextoDasMedalhas): boolean => atingido(medalha(id).progresso(c));

const niveis = (seal: LevelProgress["seal"], ...ids: string[]): Record<string, LevelProgress> =>
  Object.fromEntries(ids.map((id) => [id, { seal, bestTimeMs: 1000 }]));

const RESULTADO = {
  puzzle: { tempoMs: 60_000, selo: "clean" },
  tempo: { pontos: 900, tabuleiros: 6, saltados: 0 },
  survival: { tempoMs: 100_000, limpou: true, linhas: 12 },
} as const;

/** O desafio de cada um destes dias, feito no dia. */
function feitos(datas: readonly string[], d: Desafios = SEM_DESAFIOS): Desafios {
  let r = d;
  for (const data of datas) {
    const modo: ModoDoDesafio = modoDoDia(data);
    r = registar(r, data, modo, RESULTADO[modo]);
  }
  return r;
}

/** `n` dias seguidos, a acabar em `ultimo`. */
const seguidos = (ultimo: string, n: number): string[] =>
  Array.from({ length: n }, (_, i) => somarDias(ultimo, i - n + 1));

/* ─── O catálogo ──────────────────────────────────────────────────────────── */

describe("o catálogo", () => {
  it("tem ids únicos, e todas as medalhas dizem o que pedem", () => {
    const ids = MEDALHAS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const m of MEDALHAS) {
      expect(t().medalhas.nomes[m.id].length).toBeGreaterThan(0);
      expect(t().medalhas.descricoes[m.id].length).toBeGreaterThan(0);
    }
  });

  it("tem as normais e as premium do plano, e mais nenhuma", () => {
    const de = (tipo: string): string[] =>
      MEDALHAS.filter((m) => m.tipo === tipo).map((m) => m.id);

    expect(de("normal")).toEqual([
      "iniciado", "medio", "avancado", "perito", "primeiro-perfeito",
      "maratona", "sangue-frio", "em-cadeia", "cinco-minutos", "aguentar",
      "semana", "mes-completo", "sete-uns",
    ]);
    expect(de("premium")).toEqual([
      "perito-perfeito", "campanha-perfeita", "recordista", "ultramaratona",
      "dez-minutos", "dez-limpezas", "trinta-dias", "cem-dias",
      "colecionador", "mestre",
    ]);
  });

  it("os números escrevem-se com espaço nos milhares, também com quatro algarismos", () => {
    const { milhares } = t().formato;
    expect(milhares(30_000)).toBe("30 000");
    expect(milhares(3747)).toBe("3 747");
    expect(milhares(999)).toBe("999");
  });
});

/* ─── Os limiares ─────────────────────────────────────────────────────────── */

describe("os Puzzles", () => {
  it("um capítulo é seu quando o último nível dele está feito, e não antes", () => {
    expect(ganha("iniciado", ctx({ levels: niveis("completed", "i1", "i2") }))).toBe(false);
    expect(ganha("iniciado", ctx({ levels: niveis("completed", "i1", "i2", "i3") }))).toBe(true);
  });

  it("o alvo é o tamanho do capítulo montado, e não um número escrito à mão", () => {
    expect(medalha("iniciado").progresso(ctx())).toEqual({ atual: 0, alvo: 3 });
    expect(medalha("perito").progresso(ctx())).toEqual({ atual: 0, alvo: 2 });
  });

  /*
   * Era o perigo de deduzir: um índice que não carregou monta capítulos
   * vazios, e «zero de zero feitos» é um capítulo acabado. Sem a guarda, o
   * primeiro arranque sem rede dava a campanha inteira a quem nunca a jogou.
   */
  it("**um capítulo que não montou não dá medalha nenhuma**", () => {
    const vazio: ContextoDasMedalhas = { ...ctx(), capitulos: [] };
    for (const id of ["iniciado", "medio", "avancado", "perito", "perito-perfeito", "campanha-perfeita"]) {
      expect(ganha(id, vazio)).toBe(false);
    }
  });

  it("a Perfeição pede o selo Perfeito: um Limpo não chega", () => {
    expect(ganha("primeiro-perfeito", ctx({ levels: niveis("clean", "i1", "p1") }))).toBe(false);
    expect(ganha("primeiro-perfeito", ctx({ levels: niveis("perfect", "i1") }))).toBe(true);
  });

  it("o Perito perfeito pede todos os níveis do Perito perfeitos", () => {
    const um = { ...niveis("perfect", "p1"), ...niveis("clean", "p2") };
    expect(ganha("perito-perfeito", ctx({ levels: um }))).toBe(false);
    expect(ganha("perito-perfeito", ctx({ levels: niveis("perfect", "p1", "p2") }))).toBe(true);
  });

  it("a Campanha perfeita pede todos, de todos os capítulos", () => {
    const quase = niveis("perfect", "i1", "i2", "i3", "m1", "a1", "p1");
    expect(medalha("campanha-perfeita").progresso(ctx({ levels: quase }))).toEqual({ atual: 6, alvo: 7 });
    expect(ganha("campanha-perfeita", ctx({ levels: { ...quase, ...niveis("perfect", "p2") } }))).toBe(true);
  });
});

describe("o Contra-Relógio", () => {
  it("a Maratona cai nos tabuleiros do limiar, e não num antes", () => {
    expect(ganha("maratona", ctx({ bestBoardsCleared: LIMIARES.maratona - 1 }))).toBe(false);
    expect(ganha("maratona", ctx({ bestBoardsCleared: LIMIARES.maratona }))).toBe(true);
  });

  it("o Recordista cai nos pontos do limiar", () => {
    expect(ganha("recordista", ctx({ bestTimeAttackScore: LIMIARES.recordista - 1 }))).toBe(false);
    expect(ganha("recordista", ctx({ bestTimeAttackScore: LIMIARES.recordista }))).toBe(true);
  });

  /*
   * Os recordes do perfil deixam o desafio de fora, por terem regras próprias.
   * Uma medalha não: quinze tabuleiros no desafio foram quinze tabuleiros.
   */
  it("**uma corrida oficial do desafio também conta**", () => {
    const data = "2026-10-13"; // um dia de Contra-Relógio
    expect(modoDoDia(data)).toBe("tempo");
    const d = registar(SEM_DESAFIOS, data, "tempo", {
      pontos: LIMIARES.recordista,
      tabuleiros: LIMIARES.maratona,
      saltados: 0,
    });

    expect(ganha("maratona", ctx({}, d))).toBe(true);
    expect(ganha("recordista", ctx({}, d))).toBe(true);
  });
});

describe("o Survival", () => {
  it("os minutos contam-se pelo melhor tempo, ao milissegundo", () => {
    expect(ganha("cinco-minutos", ctx({ bestSurvivalMs: LIMIARES.cincoMinutosMs - 1 }))).toBe(false);
    expect(ganha("cinco-minutos", ctx({ bestSurvivalMs: LIMIARES.cincoMinutosMs }))).toBe(true);
    expect(ganha("dez-minutos", ctx({ bestSurvivalMs: LIMIARES.cincoMinutosMs }))).toBe(false);
  });

  it("as limpezas somam as do modo livre às do desafio", () => {
    const data = "2026-10-14"; // um dia de Survival
    expect(modoDoDia(data)).toBe("survival");
    const d = registar(SEM_DESAFIOS, data, "survival", RESULTADO.survival);

    expect(ganha("dez-limpezas", ctx({ survivalClears: LIMIARES.limpezas - 1 }))).toBe(false);
    expect(ganha("dez-limpezas", ctx({ survivalClears: LIMIARES.limpezas - 1 }, d))).toBe(true);
  });
});

describe("o Desafio do Dia", () => {
  it("uma semana são sete dias seguidos, e seis não chegam", () => {
    expect(ganha("semana", ctx({}, feitos(seguidos("2026-11-20", 6))))).toBe(false);
    expect(ganha("semana", ctx({}, feitos(seguidos("2026-11-20", 7))))).toBe(true);
  });

  it("**conta a maior sequência, mesmo que já tenha partido**", () => {
    // Sete seguidos em novembro, um buraco, e três agora.
    const d = feitos([...seguidos("2026-11-20", 7), ...seguidos(HOJE, 3)]);
    expect(maiorSequencia(d)).toBe(7);
    expect(ganha("semana", ctx({}, d))).toBe(true);
  });

  it("a maior sequência atravessa um dia salvo por uma chave, como a de hoje", () => {
    const d = feitos([...seguidos("2026-11-10", 4), ...seguidos("2026-11-15", 4)]);
    const salvo: Desafios = {
      ...d,
      dias: { ...d.dias, "2026-11-11": { ...d.dias["2026-11-11"], protegido: true } },
    };
    expect(maiorSequencia(d)).toBe(4);
    expect(maiorSequencia(salvo)).toBe(8);
  });

  it("um mês completo é um mês que acabou com todos os desafios feitos", () => {
    const novembro = Array.from({ length: 30 }, (_, i) => `2026-11-${String(i + 1).padStart(2, "0")}`);

    expect(mesCompleto(feitos(novembro), "2026-11", HOJE)).toBe(true);
    expect(mesCompleto(feitos(novembro.slice(1)), "2026-11", HOJE)).toBe(false);
    // O mês de hoje ainda não acabou, por muito feito que esteja.
    expect(mesCompleto(feitos(novembro), "2026-11", "2026-11-30")).toBe(false);

    expect(ganha("mes-completo", ctx({}, feitos(novembro)))).toBe(true);
  });

  it("o mês do #1 só conta a partir dele: outubro de 2026 começa no dia 12", () => {
    const outubro = Array.from({ length: 20 }, (_, i) => `2026-10-${String(i + 12).padStart(2, "0")}`);
    expect(mesCompleto(feitos(outubro), "2026-10", HOJE)).toBe(true);
  });
});

/* ─── O registo ───────────────────────────────────────────────────────────── */

/* ─── As das estatísticas ─────────────────────────────────────────────────── */

describe("as medalhas das estatísticas", () => {
  it("o Sangue-frio cai nas cinco bombas de uma corrida, e não na quarta", () => {
    expect(LIMIARES.sangueFrio).toBe(5);
    expect(ganha("sangue-frio", ctx({}, SEM_DESAFIOS, { bombas: 4 }))).toBe(false);
    expect(ganha("sangue-frio", ctx({}, SEM_DESAFIOS, { bombas: 5 }))).toBe(true);
  });

  /*
   * O limiar sai da pontuação: o multiplicador sobe 0,25 por jogada encadeada
   * até ×3, e chega lá à nona. Se a pontuação mudar, a medalha acompanha.
   */
  it("o Em cadeia pede o combo no teto: nove jogadas encadeadas, que é o ×3", () => {
    expect(LIMIARES.emCadeia).toBe(9);
    expect(ganha("em-cadeia", ctx({}, SEM_DESAFIOS, { combo: 8 }))).toBe(false);
    expect(ganha("em-cadeia", ctx({}, SEM_DESAFIOS, { combo: 9 }))).toBe(true);
  });

  it("o Aguentar cai nas vinte linhas de uma corrida", () => {
    expect(ganha("aguentar", ctx({}, SEM_DESAFIOS, { linhas: 19 }))).toBe(false);
    expect(ganha("aguentar", ctx({}, SEM_DESAFIOS, { linhas: 20 }))).toBe(true);
  });

  it("o Sete uns pede os sete 1, e nenhuma outra composição o dá", () => {
    const sem = COMPOSICOES.filter((c) => c !== SETE_UNS);
    expect(ganha("sete-uns", ctx({}, SEM_DESAFIOS, { composicoes: sem }))).toBe(false);
    expect(ganha("sete-uns", ctx({}, SEM_DESAFIOS, { composicoes: [SETE_UNS] }))).toBe(true);
  });

  it("o Colecionador pede as catorze, e treze não chegam", () => {
    expect(COMPOSICOES).toHaveLength(14);
    expect(ganha("colecionador", ctx({}, SEM_DESAFIOS, { composicoes: COMPOSICOES.slice(1) }))).toBe(false);
    expect(ganha("colecionador", ctx({}, SEM_DESAFIOS, { composicoes: COMPOSICOES }))).toBe(true);
  });

  /*
   * As das estatísticas não são retroativas: um perfil com a campanha inteira
   * e os recordes todos não as dá, porque nada disso diz quantas bombas se
   * desarmaram nem que grupos saíram.
   */
  it("**não são retroativas**: o progresso antigo, por maior que seja, não as dá", () => {
    const veterano = ctx({ bestTimeAttackScore: 99_999, bestBoardsCleared: 99, bestSurvivalMs: 3_600_000 });
    for (const id of ["sangue-frio", "em-cadeia", "aguentar", "sete-uns", "colecionador"]) {
      expect(ganha(id, veterano), id).toBe(false);
    }
  });
});

describe("o Mestre", () => {
  const normais = MEDALHAS.filter((m) => m.tipo === "normal").map((m) => m.id);
  const todas = (ids: readonly string[]): Record<string, string> =>
    Object.fromEntries(ids.map((id) => [id, HOJE]));

  it("pede todas as normais, e nenhuma premium", () => {
    expect(ganha("mestre", ctx({}, SEM_DESAFIOS, {}, todas(normais.slice(1))))).toBe(false);
    expect(ganha("mestre", ctx({}, SEM_DESAFIOS, {}, todas(normais)))).toBe(true);
    expect(medalha("mestre").progresso(ctx()).alvo).toBe(normais.length);
  });

  /*
   * O Mestre conta medalhas, e a última normal pode chegar na mesma partida.
   * Numa ronda só, ficava à espera da partida seguinte.
   */
  it("**chega na mesma avaliação que a última normal**", () => {
    const falta = normais.filter((id) => id !== "sete-uns");
    const registo: RegistoDeMedalhas = { ganhas: todas(falta), porVer: [] };

    const r = avaliar(registo, ctx({}, SEM_DESAFIOS, { composicoes: [SETE_UNS] }));
    expect(r.novas.map((m) => m.id)).toEqual(["sete-uns", "mestre"]);
    expect(r.registo.porVer).toEqual(["sete-uns", "mestre"]);
  });
});

describe("ganhar", () => {
  it("marca as que passaram o alvo, com a data de hoje, e deixa-as por ver", () => {
    const { registo, novas } = avaliar(SEM_MEDALHAS, ctx({ bestBoardsCleared: 40 }));

    expect(novas.map((m) => m.id)).toEqual(["maratona", "ultramaratona"]);
    expect(registo.ganhas).toEqual({ maratona: HOJE, ultramaratona: HOJE });
    expect(registo.porVer).toEqual(["maratona", "ultramaratona"]);
  });

  it("sem nada novo, devolve o mesmo registo — não há nada a gravar", () => {
    const primeiro = avaliar(SEM_MEDALHAS, ctx({ bestBoardsCleared: 40 })).registo;
    const outra = avaliar(primeiro, ctx({ bestBoardsCleared: 41 }));

    expect(outra.registo).toBe(primeiro);
    expect(outra.novas).toEqual([]);
  });

  /*
   * O progresso pode descer: «Apagar o progresso», ou o histórico do desafio
   * cortado aos três anos. A medalha fica — como o selo de um nível.
   */
  it("**uma medalha ganha não se perde, mesmo que o progresso desça**", () => {
    const ganho = avaliar(SEM_MEDALHAS, ctx({ bestBoardsCleared: 20 })).registo;
    const depois = avaliar(ganho, ctx());

    expect(depois.registo.ganhas["maratona"]).toBe(HOJE);
    expect(contarGanhas(depois.registo)).toBe(1);
  });

  it("abrir a página dá-as por vistas, e não toca nas ganhas", () => {
    const { registo } = avaliar(SEM_MEDALHAS, ctx({ bestBoardsCleared: 20 }));
    const vistas = marcarVistas(registo);

    expect(vistas.porVer).toEqual([]);
    expect(vistas.ganhas).toEqual(registo.ganhas);
    expect(marcarVistas(vistas)).toBe(vistas);
  });
});

describe("guardar e ler", () => {
  const REGISTO: RegistoDeMedalhas = {
    ganhas: { maratona: "2026-11-02", semana: "2026-11-20" },
    porVer: ["semana"],
  };

  it("sobrevive a gravar e reler", () => {
    const s = memoria();
    guardarMedalhas(s, REGISTO);
    expect(lerMedalhas(s)).toEqual(REGISTO);
  });

  it("nunca falha: nada, lixo, ou outra versão dão um registo vazio", () => {
    for (const raw of [null, "", "{", "42", "null", JSON.stringify({ versao: 99, ganhas: {} })]) {
      const s = memoria();
      if (raw !== null) s.dados.set(MEDALHAS_KEY, raw);
      expect(lerMedalhas(s)).toEqual(SEM_MEDALHAS);
    }
  });

  it("uma data estragada perde aquela medalha, e só essa", () => {
    const s = memoria();
    s.dados.set(
      MEDALHAS_KEY,
      JSON.stringify({ versao: 1, ganhas: { maratona: "ontem", semana: "2026-11-20" }, porVer: ["maratona", 3] }),
    );
    expect(lerMedalhas(s)).toEqual({ ganhas: { semana: "2026-11-20" }, porVer: [] });
  });

  /*
   * O jogador instala APKs de ramos diferentes por cima uns dos outros. Uma
   * versão mais antiga que apagasse o que não conhece deitava fora as medalhas
   * da mais nova na primeira gravação.
   */
  it("**guarda as medalhas que não conhece, para uma versão mais nova as encontrar**", () => {
    const s = memoria();
    s.dados.set(
      MEDALHAS_KEY,
      JSON.stringify({ versao: 1, ganhas: { "de-uma-versao-futura": "2027-01-01" }, porVer: ["de-uma-versao-futura"] }),
    );

    const lido = lerMedalhas(s);
    expect(lido.ganhas["de-uma-versao-futura"]).toBe("2027-01-01");
    expect(contarGanhas(lido)).toBe(0);
  });
});
