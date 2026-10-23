/**
 * Os ecrãs do jogo como aparecem nas capturas das lojas.
 *
 * Cada um é o ecrã verdadeiro, montado com dados de exemplo e no idioma pedido,
 * e levado até ao momento que vale a pena mostrar: um grupo a meio, um combo, um
 * tabuleiro cheio. **Não há ecrãs de mentira**: o que a loja mostra é o que o
 * jogo faz, e quando o jogo mudar, as capturas refazem-se com ele.
 *
 *   ecra.html?ecra=nivel&lang=pt&tema=claro
 *
 * Quando o ecrã está pronto para a fotografia, `window.__pronto` passa a
 * `true` — é por isso que a `vitrine.html` e o `capturas.mjs` esperam.
 */

import type { Board, Cell, Level, Packed } from "@dicetoseven/engine";
import { findAllGroups } from "@dicetoseven/engine";

import "../src/ui/theme.css";
import "../src/ui/app.css";

import { CAPITULOS, montarCapitulo } from "../src/capitulos";
import type { Idioma } from "../src/i18n";
import { definirIdioma, t } from "../src/i18n";
import type { BandaNoIndice } from "../src/levels";
import type { Desafios, ModoDoDesafio } from "../src/session/desafio";
import { SEM_DESAFIOS, diasDoMes, estadoDoModo, modoDoDia, numeroDoDia, registar } from "../src/session/desafio";
import { SEM_ESTATISTICAS } from "../src/session/estatisticas";
import { MEDALHAS, atingido } from "../src/session/medalhas";
import type { LevelProgress, Profile } from "../src/session/progress";
import { emptyProfile } from "../src/session/progress";
import { DEFAULT_TIME_ATTACK } from "../src/session/TimeAttackSession";
import { DesafioScreen } from "../src/ui/DesafioScreen";
import type { DiaNoTrilho } from "../src/ui/DesafioScreen";
import { MedalhasScreen } from "../src/ui/MedalhasScreen";
import { NiveisScreen } from "../src/ui/NiveisScreen";
import { PuzzleScreen } from "../src/ui/PuzzleScreen";
import { SurvivalScreen } from "../src/ui/SurvivalScreen";
import { TimeAttackScreen } from "../src/ui/TimeAttackScreen";
import { relogio } from "../src/ui/tempo";

declare global {
  interface Window {
    __pronto?: boolean;
  }
}

const IDIOMAS: Readonly<Record<string, Idioma>> = { en: "en-GB", pt: "pt-PT", es: "es-ES", fr: "fr-FR" };

const parametros = new URLSearchParams(location.search);
const idioma = IDIOMAS[parametros.get("lang") ?? "en"] ?? "en-GB";
definirIdioma(idioma);
document.documentElement.lang = idioma;
document.documentElement.dataset["tema"] = parametros.get("tema") === "escuro" ? "escuro" : "claro";

const app = document.getElementById("app") as HTMLElement;
const nada = (): void => undefined;
const esperar = (ms: number): Promise<void> =>
  new Promise((r) => {
    setTimeout(r, ms);
  });

/* ─── Os dados ────────────────────────────────────────────────────────────── */

const pack = async <T>(nome: string): Promise<T> =>
  (await fetch(new URL(`../public/levels/${nome}.json`, import.meta.url))).json() as Promise<T>;

/** O mês do Desafio que as capturas mostram, e o dia de «hoje» dentro dele. */
const HOJE = "2026-11-18";

/** Um jogador que já jogou um bocado: é o que se quer que quem vê a loja imagine. */
async function jogador(): Promise<{ perfil: Profile; bandas: readonly BandaNoIndice[] }> {
  const bandas = await pack<readonly BandaNoIndice[]>("index");
  const niveis: Record<string, LevelProgress> = {};
  const marcar = (capitulo: (typeof CAPITULOS)[number], quantos: number): void => {
    montarCapitulo(capitulo, bandas)
      .slice(0, quantos)
      .forEach((n, i) => {
        const seal = i % 3 === 1 ? "clean" : i % 5 === 4 ? "completed" : "perfect";
        niveis[n.id] = { seal, bestTimeMs: 40_000 + i * 3_100 };
      });
  };
  const [iniciado, medio, avancado] = CAPITULOS;
  if (iniciado !== undefined) marcar(iniciado, 30);
  if (medio !== undefined) marcar(medio, 40);
  if (avancado !== undefined) marcar(avancado, 21);

  return {
    perfil: {
      ...emptyProfile(),
      levels: niveis,
      bestTimeAttackScore: 21_480,
      bestBoardsCleared: 18,
      bestSurvivalMs: 392_000,
      survivalClears: 3,
      sawJokerTutorial: true,
    },
    bandas,
  };
}

/** Os desafios feitos neste mês, com dois dias perdidos pelo caminho. */
function desafiosDoMes(): Desafios {
  const RESULTADOS = {
    puzzle: { tempoMs: 74_300, selo: "perfect" },
    tempo: { pontos: 9_840, tabuleiros: 12, saltados: 0 },
    survival: { tempoMs: 251_600, limpou: true, linhas: 17 },
  } as const;
  let d = SEM_DESAFIOS;
  for (const data of [...diasDoMes("2026-10"), ...diasDoMes(HOJE.slice(0, 7))]) {
    if (data < "2026-10-12") continue;
    if (data >= HOJE) break;
    if (data === "2026-11-04" || data === "2026-11-08") continue;
    const modo: ModoDoDesafio = modoDoDia(data);
    d = registar(d, data, modo, RESULTADOS[modo]);
  }
  return d;
}

/* ─── O tabuleiro, lido do ecrã ───────────────────────────────────────────── */

/** O tabuleiro que o ecrã mostra agora, reconstruído das peças. */
function tabuleiroDoEcra(): Board {
  const colunas: Cell[][] = [];
  for (const el of document.querySelectorAll<HTMLElement>(".tabuleiro .peca[data-pos]")) {
    const p = Number(el.dataset["pos"]);
    const valor = Number(el.dataset["valor"] ?? "0") as Cell;
    const c = p >> 6;
    const r = p & 63;
    (colunas[c] ??= [])[r] = valor;
  }
  return colunas.filter((c) => c !== undefined);
}

/** As peças que não se podem tocar à toa: soldadas, geladas, com bomba. */
const pecaEspecial = (p: Packed): boolean => {
  const el = document.querySelector(`.tabuleiro .peca[data-pos="${String(p)}"]`);
  return el === null || ["soldada", "gelada", "bomba"].some((c) => el.classList.contains(c));
};

const clicar = (p: Packed): void => {
  document
    .querySelector(`.tabuleiro .peca[data-pos="${String(p)}"]`)
    ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
};

/** Um grupo que se joga sem tocar em peças especiais, do tamanho pedido se houver. */
function grupoJogavel(tamanhos: readonly number[]): readonly Packed[] | undefined {
  const grupos = [...findAllGroups(tabuleiroDoEcra())].filter((g) => !g.some(pecaEspecial));
  for (const n of tamanhos) {
    const g = grupos.find((x) => x.length === n);
    if (g !== undefined) return g;
  }
  return grupos[0];
}

/* ─── Os ecrãs ────────────────────────────────────────────────────────────── */

const ECRAS: Readonly<Record<string, () => Promise<void>>> = {
  /** Um nível do Médio, com um grupo de três a meio e a soma à vista. */
  async nivel() {
    const niveis = await pack<readonly Level[]>("meio");
    const nivel = niveis.find((n) => n.id === "meio-000006") ?? niveis[0];
    if (nivel === undefined) throw new Error("sem níveis");
    new PuzzleScreen(app, nivel, {
      titulo: `${t().capitulos.medio.nome} 05`,
      mostrarSoma: true,
      aoVoltar: nada,
    });
    await esperar(200);
    const g = grupoJogavel([3, 4]);
    for (const p of g?.slice(0, -1) ?? []) clicar(p);
  },

  /**
   * A grelha do Médio, com 27 dos 40 feitos: os selos, o nível seguinte
   * destacado, e os que faltam. Enche o ecrã mais do que a lista dos
   * capítulos, que eram quatro cartões e meio ecrã vazio.
   */
  async capitulo() {
    const { perfil, bandas } = await jogador();
    const capitulo = CAPITULOS[1];
    if (capitulo === undefined) throw new Error("sem capítulos");
    const niveis = montarCapitulo(capitulo, bandas);
    const feitos = { ...perfil.levels };
    for (const n of niveis.slice(27)) delete feitos[n.id];
    new NiveisScreen(app, {
      capitulo,
      niveis,
      perfil: { ...perfil, levels: feitos },
      aoEscolher: nada,
      aoVoltar: nada,
    });
  },

  /**
   * O Contra-Relógio a meio de um combo, com uma bomba no tabuleiro. Três
   * jogadas seguidas, depressa — é o que acende a pastilha do combo.
   */
  async tempo() {
    const livres = await pack<readonly Level[]>("tempo-livre");
    const pecas = (n: Level): number => n.board.reduce((k, c) => k + c.length, 0);
    const grandes = [...livres].sort((a, b) => pecas(b) - pecas(a)).slice(0, 12);
    new TimeAttackScreen(app, {
      niveis: grandes,
      melhorPontuacao: 21_480,
      tempoInicial: 60,
      seed: 7,
      afinacao: {
        bomba: { ...DEFAULT_TIME_ATTACK.bomba, desdeTabuleiro: 0, probabilidade: 1, pavioMs: 9_000 },
      },
      aoTerminar: nada,
      aoSair: nada,
    });
    await esperar(300);
    for (let i = 0; i < 2; i++) {
      const g = grupoJogavel([3, 2, 4]);
      if (g === undefined) break;
      for (const p of g) clicar(p);
      await esperar(550);
    }
    const g = grupoJogavel([3, 4]);
    for (const p of g?.slice(0, -1) ?? []) clicar(p);
  },

  /** O Survival com a pilha a subir: três linhas puxadas, e um grupo a meio. */
  async survival() {
    new SurvivalScreen(app, {
      seed: 20_261_118,
      aoGuardar: nada,
      melhorTempo: 392_000,
      aoTerminar: nada,
      aoSair: nada,
      aoRecomecar: nada,
    });
    await esperar(300);
    const puxar = document.querySelector<HTMLButtonElement>(".rodape .btn.primario");
    for (let i = 0; i < 2; i++) {
      puxar?.click();
      await esperar(1_100);
    }
    const g = grupoJogavel([3, 2]);
    for (const p of g?.slice(0, -1) ?? []) clicar(p);
  },

  /** O caminho de novembro: dias feitos, dois perdidos, e o de hoje por jogar. */
  async desafio() {
    const d = desafiosDoMes();
    const casa = (data: string): DiaNoTrilho => {
      const modo = modoDoDia(data);
      const feito = estadoDoModo(d, data, modo)?.estado === "feito";
      const estado: DiaNoTrilho["estado"] =
        data > HOJE
          ? { tipo: "futuro" }
          : data === HOJE
            ? { tipo: "por-jogar" }
            : !feito
              ? { tipo: "perdido" }
              : modo === "puzzle"
                ? { tipo: "feito", texto: `${relogio(74_300)} ★` }
                : modo === "tempo"
                  ? { tipo: "feito", texto: t().comum.pontos(9_840) }
                  : { tipo: "feito", texto: t().desafio.survivalLimpo(relogio(251_600)) };
      return { data, numero: numeroDoDia(data), modo, estado };
    };
    new DesafioScreen(app, {
      trilho: {
        hoje: HOJE,
        sequencia: 9,
        chaves: 2,
        premioDeHoje: 1,
        aoJogar: nada,
        diasDoMes: (mes) => diasDoMes(mes).map(casa),
        primeiroMes: "2026-10",
      },
      aoVoltar: nada,
    });
  },

  /** As medalhas normais, com as do progresso do jogador de exemplo. */
  async medalhas() {
    const { perfil, bandas } = await jogador();
    const ctx = {
      perfil,
      desafios: desafiosDoMes(),
      estatisticas: {
        ...SEM_ESTATISTICAS,
        bombas: 5,
        combo: 7,
        linhas: 22,
        composicoes: ["16", "25", "34", "115", "124", "133", "223", "1114", "1111111"] as const,
      },
      ganhas: {},
      capitulos: CAPITULOS.map((c) => ({ id: c.id, niveis: montarCapitulo(c, bandas) })),
      hoje: HOJE,
    };
    new MedalhasScreen(app, {
      medalhas: MEDALHAS.map((medalha) => {
        const progresso = medalha.progresso(ctx);
        return {
          medalha,
          progresso,
          ...(atingido(progresso) ? { ganhaEm: "2026-11-02" } : {}),
        };
      }),
      composicoes: ctx.estatisticas.composicoes,
      aoVoltar: nada,
    });
  },
};

/* ─── Montar, e avisar quando está pronto ─────────────────────────────────── */

const montar = ECRAS[parametros.get("ecra") ?? "nivel"];
if (montar === undefined) throw new Error(`ecrã desconhecido: ${String(parametros.get("ecra"))}`);

await montar();
await document.fonts.ready;
// As animações das jogadas assentam antes da fotografia.
await esperar(700);
window.__pronto = true;
