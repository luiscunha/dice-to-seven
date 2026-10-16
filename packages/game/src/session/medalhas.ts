/**
 * As medalhas: metas de longo prazo, por modo.
 *
 * O jogo já recompensava a partida — o selo de um nível, o recorde de uma
 * corrida, o 🔥 do dia. Faltava o percurso: acabar um capítulo, aguentar cinco
 * minutos, trinta dias seguidos. Uma medalha é uma dessas metas, com o
 * progresso à vista enquanto não se ganha.
 *
 * Duas espécies, e nenhuma se compra (plano §9.1):
 *
 * - **Normais** — metas de progresso, que quem joga com regularidade atinge.
 * - **Premium** — raras, de prestígio. Ganham-se a jogar, como as outras; o que
 *   as distingue é a exigência, e a moldura dourada que a diz.
 *
 * ── Deduzem-se do que o jogo guarda ──
 *
 * Nenhuma medalha tem contador próprio: o progresso lê-se do perfil, do
 * histórico do desafio e das estatísticas (`progresso`). É o que impede um
 * contador de divergir do número que ele conta.
 *
 * As do perfil e do desafio são **retroativas** — quem acabou o Perito antes de
 * haver medalhas recebe a dele no primeiro arranque. As das estatísticas
 * (`estatisticas.ts`) não podem ser: as bombas, o combo, as linhas e os grupos
 * eliminados nunca se tinham contado, e contam a partir de agora.
 *
 * ── Uma medalha ganha não se perde ──
 *
 * Como o selo de um nível (`recordLevel`). O que se guarda é a data em que se
 * ganhou, e não se volta a perguntar ao progresso. Não é só princípio: o
 * histórico do desafio corta-se aos três anos (`DIAS_GUARDADOS`), e uma
 * sequência de trinta dias deduzida de lá desaparecia com ele — é a razão por
 * que as chaves também guardam o saldo em vez de o deduzir.
 *
 * ── As que esperam ser vistas ──
 *
 * Uma medalha nova fica `porVer` até a página das medalhas abrir. É o ponto na
 * entrada da Home. As que se ganham a jogar anunciam-se também no painel de fim
 * — quem chama `avaliar` decide; as retroativas, que chegam todas de uma vez ao
 * arrancar, ficam só com o ponto.
 */

import type { Desafios, ModoDoDesafio } from "./desafio";
import { estadoDoModo, maiorSequencia, mesesCompletos } from "./desafio";
import type { Estatisticas } from "./estatisticas";
import { COMPOSICOES, SETE_UNS } from "./estatisticas";
import type { Profile, ProfileStorage } from "./progress";
import { DEFAULT_SCORING } from "./scoring";

/** `sete`: as que não são de um modo, mas do próprio 7. */
export type FamiliaDaMedalha = "puzzle" | "tempo" | "survival" | "desafio" | "sete";
export type TipoDeMedalha = "normal" | "premium";

export interface Progresso {
  readonly atual: number;
  readonly alvo: number;
}

/** Os capítulos da campanha, já montados — só os ids interessam. */
export interface CapituloDasMedalhas {
  readonly id: string;
  readonly niveis: readonly { readonly id: string }[];
}

export interface ContextoDasMedalhas {
  readonly perfil: Profile;
  readonly desafios: Desafios;
  readonly capitulos: readonly CapituloDasMedalhas[];
  readonly estatisticas: Estatisticas;
  /**
   * As medalhas já ganhas, por id. Só o Mestre as lê: é a única medalha feita
   * de outras medalhas. Em `avaliar`, é o registo a ser avaliado que conta.
   */
  readonly ganhas: Readonly<Record<string, string>>;
  /** `AAAA-MM-DD`. Decide que meses já acabaram. */
  readonly hoje: string;
}

/**
 * Os ids das medalhas. São a identidade de cada uma — no registo gravado, no
 * desenho do emblema e nos textos, que vivem no dicionário de cada idioma
 * (`i18n/`). **A sessão não tem texto nenhum**: diz que medalha é e quanto
 * falta, e o ecrã diz-o na língua de quem joga.
 */
export const IDS_DAS_MEDALHAS = [
  "iniciado",
  "medio",
  "avancado",
  "perito",
  "primeiro-perfeito",
  "perito-perfeito",
  "campanha-perfeita",
  "maratona",
  "sangue-frio",
  "em-cadeia",
  "recordista",
  "ultramaratona",
  "cinco-minutos",
  "aguentar",
  "dez-minutos",
  "dez-limpezas",
  "semana",
  "mes-completo",
  "trinta-dias",
  "cem-dias",
  "sete-uns",
  "colecionador",
  "mestre",
] as const;

export type IdDaMedalha = (typeof IDS_DAS_MEDALHAS)[number];

/** O que uma medalha conta. O nome, em cada língua, está no dicionário. */
export type UnidadeDaMedalha =
  | "niveis"
  | "perfeitos"
  | "tabuleiros"
  | "pontos"
  | "limpezas"
  | "dias"
  | "bombas"
  | "jogadas"
  | "linhas"
  | "composicoes"
  | "medalhas";

export interface Medalha {
  readonly id: IdDaMedalha;
  readonly familia: FamiliaDaMedalha;
  readonly tipo: TipoDeMedalha;
  /**
   * O que se conta: níveis, pontos. Ausente nas medalhas de sim-ou-não, que não
   * têm contagem a mostrar.
   */
  readonly unidade?: UnidadeDaMedalha;
  /** Como se escreve o progresso: um número, ou um tempo em `m:ss`. */
  readonly formato?: "tempo";
  readonly progresso: (ctx: ContextoDasMedalhas) => Progresso;
}

/* ─── Os números ──────────────────────────────────────────────────────────── */

/**
 * Os limiares, à parte do catálogo: são números de afinação, e é aqui que se
 * mexe quando o playtest disser que estão fora.
 *
 * ── Como se chegou ao Contra-Relógio ──
 *
 * Simulado contra o pack publicado, com 60 s de arranque e 1 s de leitura por
 * tabuleiro, por dois jogadores de ritmo constante: um que segue a solução
 * guardada (nunca encrava) e um que escolhe ao calhas, com a bomba primeiro.
 *
 * | ritmo | tabuleiros | pontos |
 * |---|---|---|
 * | 2,5 s/jogada | 8–15 | 8 000–15 000 |
 * | 2 s/jogada | 9–22 | 11 000–25 000 |
 * | 1,5 s/jogada | 11–34 | 18 000–42 000 |
 * | 1,2 s/jogada | 13–48 | 24 000–62 000 |
 *
 * Quinze tabuleiros é um jogador bom, a uns 2 s por jogada sem encravar — a
 * medalha normal. Trinta mil pontos e quarenta tabuleiros já pedem 1,5 s ou
 * menos, a corrida inteira: são as premium.
 *
 * ── E as das estatísticas ──
 *
 * - **Sangue-frio, cinco bombas.** As bombas armam-se a partir do quarto
 *   tabuleiro, em metade deles: cinco desarmadas pedem uns treze tabuleiros. Dez
 *   pediam vinte e três, e eram uma Maratona mais difícil com outro nome.
 * - **Em cadeia, o combo no teto.** O multiplicador sobe um quarto por jogada
 *   encadeada até ×3, e chega lá à nona — tiradas da pontuação, e não escritas
 *   aqui, para a medalha não ficar a pedir um combo que o jogo deixou de dar.
 *   O combo recomeça a cada tabuleiro, portanto são nove jogadas no mesmo: só
 *   os tabuleiros grandes, de meio da corrida para a frente, as têm.
 * - **Aguentar, vinte linhas** — o número que o fim da corrida mostra, que
 *   conta as cinco do arranque e as puxadas. Puxar cedo chega lá mais depressa,
 *   e é essa a estratégia que o Survival quer ensinar.
 */
export const LIMIARES = {
  maratona: 15,
  ultramaratona: 40,
  recordista: 30_000,
  sangueFrio: 5,
  emCadeia: 1 + (DEFAULT_SCORING.comboCap - 1) / DEFAULT_SCORING.comboStep,
  cincoMinutosMs: 5 * 60_000,
  dezMinutosMs: 10 * 60_000,
  limpezas: 10,
  aguentar: 20,
  semana: 7,
  trintaDias: 30,
  cemDias: 100,
} as const;

/* ─── As leituras ─────────────────────────────────────────────────────────── */

const niveisDe = (ctx: ContextoDasMedalhas, capitulo: string): readonly { readonly id: string }[] =>
  ctx.capitulos.find((c) => c.id === capitulo)?.niveis ?? [];

const todosOsNiveis = (ctx: ContextoDasMedalhas): readonly { readonly id: string }[] =>
  ctx.capitulos.flatMap((c) => c.niveis);

const feitos = (ctx: ContextoDasMedalhas, niveis: readonly { readonly id: string }[]): number =>
  niveis.filter((n) => ctx.perfil.levels[n.id] !== undefined).length;

const perfeitos = (ctx: ContextoDasMedalhas, niveis: readonly { readonly id: string }[]): number =>
  niveis.filter((n) => ctx.perfil.levels[n.id]?.seal === "perfect").length;

/**
 * Os resultados oficiais do desafio, num modo.
 *
 * **Uma corrida do desafio também conta para as medalhas do modo.** Os
 * recordes do perfil deixam-na de fora — o desafio tem regras suas, como o
 * arranque fixo —, mas uma medalha diz o que o jogador já fez, e quinze
 * tabuleiros feitos no desafio foram feitos.
 */
const resultadosDe = <M extends ModoDoDesafio>(d: Desafios, modo: M) =>
  Object.keys(d.dias).flatMap((data) => {
    const e = estadoDoModo(d, data, modo);
    return e?.estado === "feito" ? [e.resultado] : [];
  });

const melhorTabuleiros = (ctx: ContextoDasMedalhas): number =>
  Math.max(ctx.perfil.bestBoardsCleared, ...resultadosDe(ctx.desafios, "tempo").map((r) => r.tabuleiros));

const melhorPontuacao = (ctx: ContextoDasMedalhas): number =>
  Math.max(ctx.perfil.bestTimeAttackScore, ...resultadosDe(ctx.desafios, "tempo").map((r) => r.pontos));

const melhorSurvival = (ctx: ContextoDasMedalhas): number =>
  Math.max(ctx.perfil.bestSurvivalMs, ...resultadosDe(ctx.desafios, "survival").map((r) => r.tempoMs));

const limpezas = (ctx: ContextoDasMedalhas): number =>
  ctx.perfil.survivalClears +
  resultadosDe(ctx.desafios, "survival").filter((r) => r.limpou).length;

const ate = (atual: number, alvo: number): Progresso => ({ atual: Math.min(atual, alvo), alvo });

/* ─── O catálogo ──────────────────────────────────────────────────────────── */

/**
 * Uma medalha por capítulo. O alvo é o tamanho do capítulo montado, e não um
 * número escrito aqui: o capítulo é o que `montarCapitulo` disser, e um pack
 * novo muda-o sem ninguém ter de se lembrar desta lista.
 */
const capitulo = (id: "iniciado" | "medio" | "avancado" | "perito"): Medalha => ({
  id,
  familia: "puzzle",
  tipo: "normal",
  unidade: "niveis",
  progresso: (ctx) => {
    const niveis = niveisDe(ctx, id);
    return ate(feitos(ctx, niveis), niveis.length);
  },
});

export const MEDALHAS: readonly Medalha[] = [
  /* ── Puzzles ── */
  capitulo("iniciado"),
  capitulo("medio"),
  capitulo("avancado"),
  capitulo("perito"),
  {
    id: "primeiro-perfeito",
    familia: "puzzle",
    tipo: "normal",
    progresso: (ctx) => ate(perfeitos(ctx, todosOsNiveis(ctx)), 1),
  },
  {
    id: "perito-perfeito",
    familia: "puzzle",
    tipo: "premium",
    unidade: "perfeitos",
    progresso: (ctx) => {
      const niveis = niveisDe(ctx, "perito");
      return ate(perfeitos(ctx, niveis), niveis.length);
    },
  },
  {
    id: "campanha-perfeita",
    familia: "puzzle",
    tipo: "premium",
    unidade: "perfeitos",
    progresso: (ctx) => {
      const niveis = todosOsNiveis(ctx);
      return ate(perfeitos(ctx, niveis), niveis.length);
    },
  },

  /* ── Contra-Relógio ── */
  {
    id: "maratona",
    familia: "tempo",
    tipo: "normal",
    unidade: "tabuleiros",
    progresso: (ctx) => ate(melhorTabuleiros(ctx), LIMIARES.maratona),
  },
  {
    id: "sangue-frio",
    familia: "tempo",
    tipo: "normal",
    unidade: "bombas",
    progresso: (ctx) => ate(ctx.estatisticas.bombas, LIMIARES.sangueFrio),
  },
  {
    id: "em-cadeia",
    familia: "tempo",
    tipo: "normal",
    unidade: "jogadas",
    progresso: (ctx) => ate(ctx.estatisticas.combo, LIMIARES.emCadeia),
  },
  {
    id: "recordista",
    familia: "tempo",
    tipo: "premium",
    unidade: "pontos",
    progresso: (ctx) => ate(melhorPontuacao(ctx), LIMIARES.recordista),
  },
  {
    id: "ultramaratona",
    familia: "tempo",
    tipo: "premium",
    unidade: "tabuleiros",
    progresso: (ctx) => ate(melhorTabuleiros(ctx), LIMIARES.ultramaratona),
  },

  /* ── Survival ── */
  {
    id: "cinco-minutos",
    familia: "survival",
    tipo: "normal",
    formato: "tempo",
    progresso: (ctx) => ate(melhorSurvival(ctx), LIMIARES.cincoMinutosMs),
  },
  {
    id: "aguentar",
    familia: "survival",
    tipo: "normal",
    unidade: "linhas",
    progresso: (ctx) => ate(ctx.estatisticas.linhas, LIMIARES.aguentar),
  },
  {
    id: "dez-minutos",
    familia: "survival",
    tipo: "premium",
    formato: "tempo",
    progresso: (ctx) => ate(melhorSurvival(ctx), LIMIARES.dezMinutosMs),
  },
  {
    id: "dez-limpezas",
    familia: "survival",
    tipo: "premium",
    unidade: "limpezas",
    progresso: (ctx) => ate(limpezas(ctx), LIMIARES.limpezas),
  },

  /* ── Desafio do Dia ── */
  {
    id: "semana",
    familia: "desafio",
    tipo: "normal",
    unidade: "dias",
    progresso: (ctx) => ate(maiorSequencia(ctx.desafios), LIMIARES.semana),
  },
  {
    id: "mes-completo",
    familia: "desafio",
    tipo: "normal",
    progresso: (ctx) => ate(mesesCompletos(ctx.desafios, ctx.hoje), 1),
  },
  {
    id: "trinta-dias",
    familia: "desafio",
    tipo: "premium",
    unidade: "dias",
    progresso: (ctx) => ate(maiorSequencia(ctx.desafios), LIMIARES.trintaDias),
  },
  {
    id: "cem-dias",
    familia: "desafio",
    tipo: "premium",
    unidade: "dias",
    progresso: (ctx) => ate(maiorSequencia(ctx.desafios), LIMIARES.cemDias),
  },

  /* ── O sete ── */
  {
    id: "sete-uns",
    familia: "sete",
    tipo: "normal",
    progresso: (ctx) => ate(ctx.estatisticas.composicoes.includes(SETE_UNS) ? 1 : 0, 1),
  },
  {
    id: "colecionador",
    familia: "sete",
    tipo: "premium",
    unidade: "composicoes",
    progresso: (ctx) => ate(ctx.estatisticas.composicoes.length, COMPOSICOES.length),
  },
  {
    id: "mestre",
    familia: "sete",
    tipo: "premium",
    unidade: "medalhas",
    progresso: (ctx) => {
      const normais = MEDALHAS.filter((m) => m.tipo === "normal");
      return ate(normais.filter((m) => ctx.ganhas[m.id] !== undefined).length, normais.length);
    },
  },
];

/* ─── O registo ───────────────────────────────────────────────────────────── */

export interface RegistoDeMedalhas {
  /** Por id: a data, `AAAA-MM-DD`, em que se ganhou. */
  readonly ganhas: Readonly<Record<string, string>>;
  /** As ganhas que a página das medalhas ainda não mostrou. */
  readonly porVer: readonly string[];
}

export const SEM_MEDALHAS: RegistoDeMedalhas = { ganhas: {}, porVer: [] };

/**
 * Ganhou-se? **Um alvo de zero nunca se atinge.** É o caso de um capítulo que
 * não chegou a montar — um índice que não carregou —, e sem esta guarda o
 * primeiro arranque sem rede dava as quatro medalhas da campanha a quem não
 * jogou nada.
 */
export const atingido = (p: Progresso): boolean => p.alvo > 0 && p.atual >= p.alvo;

/**
 * Marca as medalhas que passaram o alvo desde a última vez, e devolve-as.
 *
 * **Em rondas, até nada mudar**: o Mestre conta as outras medalhas, e a última
 * normal e o Mestre podem chegar na mesma partida. Numa ronda só, o Mestre
 * ficava à espera da partida seguinte para ver a normal que acabou de entrar.
 *
 * Devolve o **mesmo** registo se nada mudou, para quem chama saber que não há
 * nada a gravar.
 */
export function avaliar(
  registo: RegistoDeMedalhas,
  ctx: ContextoDasMedalhas,
): { readonly registo: RegistoDeMedalhas; readonly novas: readonly Medalha[] } {
  const ganhas: Record<string, string> = { ...registo.ganhas };
  const novas: Medalha[] = [];

  for (;;) {
    const daRonda = MEDALHAS.filter(
      (m) => ganhas[m.id] === undefined && atingido(m.progresso({ ...ctx, ganhas })),
    );
    if (daRonda.length === 0) break;
    for (const m of daRonda) {
      ganhas[m.id] = ctx.hoje;
      novas.push(m);
    }
  }

  if (novas.length === 0) return { registo, novas };

  return {
    registo: { ganhas, porVer: [...registo.porVer, ...novas.map((m) => m.id)] },
    novas,
  };
}

/** A página abriu: as novas já foram vistas. */
export const marcarVistas = (registo: RegistoDeMedalhas): RegistoDeMedalhas =>
  registo.porVer.length === 0 ? registo : { ...registo, porVer: [] };

/** Quantas medalhas do catálogo estão ganhas. */
export const contarGanhas = (registo: RegistoDeMedalhas): number =>
  MEDALHAS.filter((m) => registo.ganhas[m.id] !== undefined).length;

/* ─── Guardar e ler ───────────────────────────────────────────────────────── */

export const MEDALHAS_KEY = "dicetoseven.medalhas";
export const MEDALHAS_VERSAO = 1;

export function guardarMedalhas(storage: ProfileStorage, registo: RegistoDeMedalhas): void {
  try {
    storage.setItem(MEDALHAS_KEY, JSON.stringify({ versao: MEDALHAS_VERSAO, ...registo }));
  } catch {
    // Disco cheio ou armazenamento negado: perde-se o registo, não o jogo.
  }
}

const eData = (x: unknown): x is string => typeof x === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x);

/**
 * Lê o registo, ou nenhum. Nunca falha.
 *
 * **Os ids que este jogo não conhece ficam.** Não se mostram, mas também não se
 * apagam: uma versão mais antiga do jogo — um APK de outro ramo, instalado por
 * cima — leria as medalhas de uma mais nova, gravava, e perdia-as.
 */
export function lerMedalhas(storage: ProfileStorage): RegistoDeMedalhas {
  let parsed: unknown;
  try {
    const raw = storage.getItem(MEDALHAS_KEY);
    if (raw === null || raw === "") return SEM_MEDALHAS;
    parsed = JSON.parse(raw);
  } catch {
    return SEM_MEDALHAS;
  }

  if (typeof parsed !== "object" || parsed === null) return SEM_MEDALHAS;
  const env = parsed as { versao?: unknown; ganhas?: unknown; porVer?: unknown };
  if (env.versao !== MEDALHAS_VERSAO) return SEM_MEDALHAS;

  const ganhas: Record<string, string> = {};
  if (typeof env.ganhas === "object" && env.ganhas !== null) {
    for (const [id, data] of Object.entries(env.ganhas as Record<string, unknown>)) {
      if (eData(data)) ganhas[id] = data;
    }
  }

  const porVer = Array.isArray(env.porVer)
    ? env.porVer.filter((id): id is string => typeof id === "string" && ganhas[id] !== undefined)
    : [];

  return { ganhas, porVer };
}
