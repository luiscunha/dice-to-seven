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
 * ── Deduzem-se do que o jogo já guarda ──
 *
 * Nenhuma medalha tem contador próprio: o progresso lê-se do perfil e do
 * histórico do desafio (`progresso`). É o que as torna **retroativas** — quem
 * acabou o Perito antes de haver medalhas recebe a dele no primeiro arranque —,
 * e é o que impede um contador de divergir do número que ele conta.
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
import type { Profile, ProfileStorage } from "./progress";

export type FamiliaDaMedalha = "puzzle" | "tempo" | "survival" | "desafio";
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
  /** `AAAA-MM-DD`. Decide que meses já acabaram. */
  readonly hoje: string;
}

export interface Medalha {
  readonly id: string;
  readonly nome: string;
  readonly descricao: string;
  readonly familia: FamiliaDaMedalha;
  readonly tipo: TipoDeMedalha;
  /**
   * O que se conta, no plural: «níveis», «pontos». Ausente nas medalhas de
   * sim-ou-não, que não têm contagem a mostrar.
   */
  readonly unidade?: string;
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
 */
export const LIMIARES = {
  maratona: 15,
  ultramaratona: 40,
  recordista: 30_000,
  cincoMinutosMs: 5 * 60_000,
  dezMinutosMs: 10 * 60_000,
  limpezas: 10,
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

/**
 * `30000` → `30 000`, com um espaço fino que não parte a linha. O
 * `toLocaleString("pt-PT")` não agrupa números de quatro algarismos, e a
 * página dizia «3747 / 30 000» — dois números do mesmo tipo escritos de duas
 * maneiras.
 */
export const milhares = (n: number): string =>
  String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

/* ─── O catálogo ──────────────────────────────────────────────────────────── */

/**
 * Uma medalha por capítulo. O alvo é o tamanho do capítulo montado, e não um
 * número escrito aqui: o capítulo é o que `montarCapitulo` disser, e um pack
 * novo muda-o sem ninguém ter de se lembrar desta lista.
 */
const capitulo = (id: string, nome: string): Medalha => ({
  id,
  nome,
  descricao: `Acabar todos os níveis do ${nome}.`,
  familia: "puzzle",
  tipo: "normal",
  unidade: "níveis",
  progresso: (ctx) => {
    const niveis = niveisDe(ctx, id);
    return ate(feitos(ctx, niveis), niveis.length);
  },
});

export const MEDALHAS: readonly Medalha[] = [
  /* ── Puzzles ── */
  capitulo("iniciado", "Iniciado"),
  capitulo("medio", "Médio"),
  capitulo("avancado", "Avançado"),
  capitulo("perito", "Perito"),
  {
    id: "primeiro-perfeito",
    nome: "Perfeição",
    descricao: "Acabar um nível com selo Perfeito: sem desfazer, sem reiniciar e sem dicas.",
    familia: "puzzle",
    tipo: "normal",
    progresso: (ctx) => ate(perfeitos(ctx, todosOsNiveis(ctx)), 1),
  },
  {
    id: "perito-perfeito",
    nome: "Perito perfeito",
    descricao: "Todos os níveis do Perito com selo Perfeito.",
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
    nome: "Campanha perfeita",
    descricao: "Todos os níveis da campanha com selo Perfeito.",
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
    nome: "Maratona",
    descricao: `Limpar ${String(LIMIARES.maratona)} tabuleiros numa corrida do Contra-Relógio.`,
    familia: "tempo",
    tipo: "normal",
    unidade: "tabuleiros",
    progresso: (ctx) => ate(melhorTabuleiros(ctx), LIMIARES.maratona),
  },
  {
    id: "recordista",
    nome: "Recordista",
    descricao: `Fazer ${milhares(LIMIARES.recordista)} pontos numa corrida do Contra-Relógio.`,
    familia: "tempo",
    tipo: "premium",
    unidade: "pontos",
    progresso: (ctx) => ate(melhorPontuacao(ctx), LIMIARES.recordista),
  },
  {
    id: "ultramaratona",
    nome: "Ultramaratona",
    descricao: `Limpar ${String(LIMIARES.ultramaratona)} tabuleiros numa corrida do Contra-Relógio.`,
    familia: "tempo",
    tipo: "premium",
    unidade: "tabuleiros",
    progresso: (ctx) => ate(melhorTabuleiros(ctx), LIMIARES.ultramaratona),
  },

  /* ── Survival ── */
  {
    id: "cinco-minutos",
    nome: "Cinco minutos",
    descricao: "Aguentar cinco minutos numa corrida do Survival.",
    familia: "survival",
    tipo: "normal",
    formato: "tempo",
    progresso: (ctx) => ate(melhorSurvival(ctx), LIMIARES.cincoMinutosMs),
  },
  {
    id: "dez-minutos",
    nome: "Dez minutos",
    descricao: "Aguentar dez minutos numa corrida do Survival.",
    familia: "survival",
    tipo: "premium",
    formato: "tempo",
    progresso: (ctx) => ate(melhorSurvival(ctx), LIMIARES.dezMinutosMs),
  },
  {
    id: "dez-limpezas",
    nome: "Dez limpezas",
    descricao: `Limpar o tabuleiro do Survival ${String(LIMIARES.limpezas)} vezes.`,
    familia: "survival",
    tipo: "premium",
    unidade: "limpezas",
    progresso: (ctx) => ate(limpezas(ctx), LIMIARES.limpezas),
  },

  /* ── Desafio do Dia ── */
  {
    id: "semana",
    nome: "Uma semana",
    descricao: `Fazer o Desafio do Dia ${String(LIMIARES.semana)} dias seguidos.`,
    familia: "desafio",
    tipo: "normal",
    unidade: "dias seguidos",
    progresso: (ctx) => ate(maiorSequencia(ctx.desafios), LIMIARES.semana),
  },
  {
    id: "mes-completo",
    nome: "Mês completo",
    descricao: "Fazer todos os desafios de um mês — a ★ no trilho dos meses.",
    familia: "desafio",
    tipo: "normal",
    progresso: (ctx) => ate(mesesCompletos(ctx.desafios, ctx.hoje), 1),
  },
  {
    id: "trinta-dias",
    nome: "Imparável",
    descricao: `Fazer o Desafio do Dia ${String(LIMIARES.trintaDias)} dias seguidos.`,
    familia: "desafio",
    tipo: "premium",
    unidade: "dias seguidos",
    progresso: (ctx) => ate(maiorSequencia(ctx.desafios), LIMIARES.trintaDias),
  },
  {
    id: "cem-dias",
    nome: "Centenário",
    descricao: `Fazer o Desafio do Dia ${String(LIMIARES.cemDias)} dias seguidos.`,
    familia: "desafio",
    tipo: "premium",
    unidade: "dias seguidos",
    progresso: (ctx) => ate(maiorSequencia(ctx.desafios), LIMIARES.cemDias),
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
 * Devolve o **mesmo** registo se nada mudou, para quem chama saber que não há
 * nada a gravar.
 */
export function avaliar(
  registo: RegistoDeMedalhas,
  ctx: ContextoDasMedalhas,
): { readonly registo: RegistoDeMedalhas; readonly novas: readonly Medalha[] } {
  const novas = MEDALHAS.filter(
    (m) => registo.ganhas[m.id] === undefined && atingido(m.progresso(ctx)),
  );
  if (novas.length === 0) return { registo, novas };

  const ganhas = { ...registo.ganhas };
  for (const m of novas) ganhas[m.id] = ctx.hoje;

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
