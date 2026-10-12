/**
 * Contagem decrescente — **protótipo de medição**, só no pipeline.
 *
 * Uma peça com um número, por exemplo 3, tem de sair numa das próximas 3
 * jogadas. Se não sair, o tabuleiro está perdido.
 *
 * ── Porque está em `tools` e não no motor ──
 *
 * A pergunta ainda é se a mecânica serve. O problema que ela ataca está medido
 * em `estado-atual.md`: a dificuldade chega sempre aos ~78% do nível, porque
 * com ~33 jogadas por posição nada do que se faz no início importa. A contagem
 * só merece entrar nas `Marcas` do motor — e no solver, no jogo e no formato de
 * nível — se trouxer o primeiro erro para trás. Até lá, nada do que é publicado
 * muda: este ficheiro só lê o pack.
 *
 * **Medido, e não passa como está** — os números e a decisão estão em
 * `estado-atual.md`, "A contagem decrescente". O protótipo fica para que a
 * próxima tentativa (o gerador a construir à volta de uma peça enterrada) parta
 * da mesma régua.
 *
 * ── Como a garantia central sobreviveria ──
 *
 * A contagem escolhe-se **sobre a solução guardada**, como as soldas e o gelo:
 * se a peça sai na jogada *k* da solução, a contagem é *k* mais uma folga. A
 * solução cumpre-a por construção, e `resolveComContagem` volta a confirmá-lo,
 * jogada a jogada.
 *
 * ── A lição das marcas anteriores ──
 *
 * Uma marca que não proíbe nada não é neutra: dilui a medição da mecânica
 * inteira (as soldas que já somavam 7, o 6 gelado). Aqui o equivalente é a
 * contagem numa peça que o jogo ao calhas tira a tempo de qualquer maneira, ou
 * que já se pode tirar na primeira jogada. Ficam de fora as duas.
 */

import type {
  Board,
  Group,
  Level,
  Marcas,
  Packed,
  Rng,
  Verdict,
} from "@dicetoseven/engine";
import {
  JOKER,
  aplicarMarcas,
  applyMove,
  boardKey,
  cellAt,
  celulasMarcadas,
  chaveMarcas,
  deriveSeed,
  gruposMarcados,
  marcasDe,
  mulberry32,
  packed,
  remapearCelula,
} from "@dicetoseven/engine";

/** A peça marcada e quantas jogadas lhe restam, contando com a próxima. */
export interface Contagem {
  readonly peca: Packed;
  readonly restantes: number;
}

/** Tabuleiro, marcas do nível e, se houver, a contagem. */
export interface Estado {
  readonly b: Board;
  readonly m: Marcas;
  readonly c: Contagem | undefined;
}

export const estadoDe = (nivel: Level, c?: Contagem): Estado => ({
  b: nivel.board,
  m: marcasDe(nivel.soldas, nivel.gelo),
  c,
});

/**
 * Aplica a jogada. `undefined` quando a contagem chega a zero com a peça ainda
 * no tabuleiro — o estado em que o nível fica perdido.
 *
 * Com `restantes` a 1, a próxima jogada tem de levar a peça. A peça viaja com
 * a gravidade e o colapso de colunas pelo mesmo `remapearCelula` das outras
 * marcas.
 */
export function jogar(e: Estado, g: Group): Estado | undefined {
  const m = aplicarMarcas(e.b, e.m, g);
  const b = applyMove(e.b, g);
  const c = e.c;

  if (c === undefined || g.includes(c.peca)) return { b, m, c: undefined };
  if (c.restantes <= 1) return undefined;

  // A peça não estava no grupo, portanto continua no tabuleiro.
  const peca = remapearCelula(e.b, g)(c.peca) as Packed;
  return { b, m, c: { peca, restantes: c.restantes - 1 } };
}

const chaveDe = (e: Estado): string =>
  boardKey(e.b) +
  chaveMarcas(e.m) +
  (e.c === undefined ? "" : `@${e.c.peca}:${e.c.restantes}`);

/**
 * As jogadas legais, com as que levam a peça da contagem à frente.
 *
 * A ordem não muda nenhum veredicto, só o tempo até lá chegar: com a contagem a
 * apertar, a solução passa quase sempre por tirar a peça.
 */
function jogadas(e: Estado): Group[] {
  const todas = [...gruposMarcados(e.b, e.m)];
  const c = e.c;
  if (c === undefined) return todas;

  return [
    ...todas.filter((g) => g.includes(c.peca)),
    ...todas.filter((g) => !g.includes(c.peca)),
  ];
}

/* ─── Solver ─────────────────────────────────────────────────────────────── */

/**
 * Estados que se provou não terem solução, partilháveis entre chamadas.
 *
 * Partilhar é seguro pela mesma razão que o memo do solver da engine é correto:
 * só entra aqui um estado cujos sucessores foram **todos** explorados até ao
 * fim, sem esgotar o limite. Insolubilidade provada não depende de quem
 * perguntou.
 */
export type Falhados = Set<string>;

interface Contexto {
  readonly falhados: Falhados;
  readonly max: number;
  estados: number;
  esgotado: boolean;
}

function resolver(e: Estado, ctx: Contexto): boolean {
  if (e.b.length === 0) return true;
  if (ctx.esgotado) return false;
  if (ctx.estados >= ctx.max) {
    ctx.esgotado = true;
    return false;
  }

  const chave = chaveDe(e);
  if (ctx.falhados.has(chave)) return false;
  ctx.estados++;

  for (const g of jogadas(e)) {
    const s = jogar(e, g);
    if (s === undefined) continue;
    if (resolver(s, ctx)) return true;
    // Desistir por limite não prova nada: sai-se sem marcar como falhado.
    if (ctx.esgotado) return false;
  }

  ctx.falhados.add(chave);
  return false;
}

/** O `isSolvable` da engine, com a contagem a contar. `undefined` está perdido. */
export function resolvel(
  e: Estado | undefined,
  maxEstados: number,
  falhados: Falhados = new Set(),
): Verdict {
  if (e === undefined) return "no";

  const ctx: Contexto = { falhados, max: maxEstados, estados: 0, esgotado: false };
  if (resolver(e, ctx)) return "yes";
  return ctx.esgotado ? "inconclusive" : "no";
}

/**
 * Piso de justiça (spec §7.4) com as marcas **e** a contagem.
 *
 * O da engine não conhece marcas: as soldas e o gelo escolhem-se depois de o
 * nível passar o piso. Aqui não chega, porque o que se quer saber é
 * precisamente se a contagem torna fatal alguma das primeiras jogadas.
 */
export function pisoComContagem(
  e0: Estado,
  profundidade: number,
  maxEstados: number,
  falhados: Falhados = new Set(),
): Verdict {
  let fronteira: Estado[] = [e0];
  const vistos = new Set<string>([chaveDe(e0)]);

  for (let nivel = 0; nivel < profundidade; nivel++) {
    const seguinte: Estado[] = [];

    for (const e of fronteira) {
      let temJogada = false;

      for (const g of gruposMarcados(e.b, e.m)) {
        temJogada = true;
        const s = jogar(e, g);
        if (s === undefined) return "no";

        const chave = chaveDe(s);
        if (vistos.has(chave)) continue;
        vistos.add(chave);
        if (s.b.length > 0) seguinte.push(s);
      }

      if (!temJogada && e.b.length > 0) return "no";
    }

    if (seguinte.length === 0) return "yes";
    fronteira = seguinte;
  }

  for (const e of fronteira) {
    const v = resolvel(e, maxEstados, falhados);
    if (v !== "yes") return v;
  }

  return "yes";
}

/** A solução guardada esvazia o tabuleiro, com a contagem a valer? */
export function resolveComContagem(nivel: Level, c: Contagem | undefined): boolean {
  let e: Estado | undefined = estadoDe(nivel, c);

  for (const g of nivel.solution) {
    if (e === undefined) return false;
    if (![...gruposMarcados(e.b, e.m)].some((h) => mesmoGrupo(h, g))) return false;
    e = jogar(e, g);
  }

  return e !== undefined && e.b.length === 0;
}

const mesmoGrupo = (a: Group, b: Group): boolean =>
  a.length === b.length && a.every((p, i) => p === b[i]);

/* ─── Escolher a peça ───────────────────────────────────────────────────── */

/**
 * Em que jogada da solução guardada sai cada peça, indexado pela coordenada
 * **inicial** da peça. Jogadas contadas a partir de 1.
 */
export function passoDeCadaPeca(nivel: Level): Map<Packed, number> {
  const passo = new Map<Packed, number>();
  let b = nivel.board;

  // Coordenada atual → coordenada inicial.
  let origem = new Map<Packed, Packed>();
  for (let c = 0; c < b.length; c++) {
    for (let r = 0; r < (b[c]?.length ?? 0); r++) {
      const p = packed(c, r);
      origem.set(p, p);
    }
  }

  nivel.solution.forEach((g, i) => {
    for (const p of g) {
      const o = origem.get(p);
      if (o !== undefined) passo.set(o, i + 1);
    }

    const para = remapearCelula(b, g);
    const seguinte = new Map<Packed, Packed>();
    for (const [atual, o] of origem) {
      if (g.includes(atual)) continue;
      seguinte.set(para(atual) as Packed, o);
    }

    origem = seguinte;
    b = applyMove(b, g);
  });

  return passo;
}

/**
 * Em cada playout ao calhas (com as marcas, sem contagem), em que jogada saiu
 * cada peça. `Infinity` para as que não chegaram a sair.
 *
 * É a medida de quanto uma contagem aperta: se o jogo ao calhas tira a peça a
 * tempo quase sempre, a contagem não proíbe nada.
 */
function saidasAoCalhas(
  nivel: Level,
  playouts: number,
  seed: number,
): Map<Packed, number>[] {
  const out: Map<Packed, number>[] = [];

  for (let i = 0; i < playouts; i++) {
    const rng = mulberry32(deriveSeed(seed, i));
    const saida = new Map<Packed, number>();
    let e: Estado = estadoDe(nivel);

    let origem = new Map<Packed, Packed>();
    for (let c = 0; c < e.b.length; c++) {
      for (let r = 0; r < (e.b[c]?.length ?? 0); r++) {
        const p = packed(c, r);
        origem.set(p, p);
      }
    }

    for (let jogada = 1; e.b.length > 0; jogada++) {
      const g = sortear(e, rng);
      if (g === undefined) break;

      for (const p of g) {
        const o = origem.get(p);
        if (o !== undefined) saida.set(o, jogada);
      }

      const para = remapearCelula(e.b, g);
      const seguinte = new Map<Packed, Packed>();
      for (const [atual, o] of origem) {
        if (!g.includes(atual)) seguinte.set(para(atual) as Packed, o);
      }
      origem = seguinte;
      e = jogar(e, g) as Estado;
    }

    out.push(saida);
  }

  return out;
}

/**
 * Quem joga nos playouts.
 *
 * - `calhas`: uma jogada legal qualquer, como os playouts da engine.
 * - `atento`: lê o número. Se a peça da contagem já pode sair, tira-a, por um
 *   dos grupos que a levam; senão joga ao calhas.
 *
 * O `atento` existe por causa da primeira medição: o jogo ao calhas ignora a
 * contagem, e por isso uma contagem numa peça que já se podia tirar parecia
 * apertar muito. Um jogador a sério tira-a logo, e o piso de justiça garante que
 * a primeira jogada é sempre segura. É o limite de baixo do que uma pessoa faz,
 * e é contra ele que a mecânica tem de se aguentar.
 */
export type Jogador = "calhas" | "atento";

/** Uma jogada legal, por reservatório — sem materializar a lista. */
function sortear(e: Estado, rng: Rng, jogador: Jogador = "calhas"): Group | undefined {
  const peca = jogador === "atento" ? e.c?.peca : undefined;
  let total = 0;
  let escolhido: Group | undefined;
  let comPeca = 0;
  let escolhidoComPeca: Group | undefined;

  for (const g of gruposMarcados(e.b, e.m)) {
    total++;
    if (rng() * total < 1) escolhido = g;

    if (peca !== undefined && g.includes(peca)) {
      comPeca++;
      if (rng() * comPeca < 1) escolhidoComPeca = g;
    }
  }

  return escolhidoComPeca ?? escolhido;
}

export interface Escolha {
  readonly contagem: Contagem;
  /** A jogada da solução guardada em que a peça sai. */
  readonly passo: number;
  /** Quanto a contagem dá a mais do que a solução precisa. */
  readonly folga: number;
  /** Fração dos playouts ao calhas que tiram a peça a tempo. */
  readonly aTempo: number;
  /** Candidatas que passaram os filtros, antes do piso. */
  readonly candidatas: number;
  /** A peça já se podia tirar na primeira jogada. */
  readonly jaSaia: boolean;
}

export interface OpcoesEscolha {
  /** Tentadas por esta ordem; fica a primeira com que o piso aceita uma peça. */
  readonly folgas: readonly number[];
  /** Só peças que não se podem tirar na primeira jogada. */
  readonly soEnterradas: boolean;
  /** A contagem tem de acabar depois das jogadas que o piso protege. */
  readonly profundidadePiso: number;
  readonly playouts: number;
  readonly maxEstados: number;
  /** Quantas candidatas, das mais apertadas, se tentam no piso, por folga. */
  readonly tentativas: number;
}

/**
 * A contagem mais apertada que o piso de justiça aceita, ou `undefined`.
 *
 * Candidatas: peças sem joker e sem outra marca, que a solução tira na primeira
 * metade, depois das jogadas que o piso protege. Ordenam-se pela fração de
 * playouts ao calhas que as tiram a tempo: quanto menor, mais a contagem obriga
 * a planear. As folgas tentam-se da mais curta para a mais longa.
 *
 * ── Peças que já se podem tirar ──
 *
 * Uma contagem nelas aponta uma jogada pronta, como as soldas que somavam 7. A
 * primeira medição deixava-as entrar, no fim da fila, e mesmo assim foram 26 das
 * 27 escolhidas: com ~33 jogadas por posição quase todas as peças entram nalgum
 * grupo logo no início, e as enterradas não passavam o piso com folga 1. Medidas
 * com o jogador `atento`, mostram se a suspeita se confirma; `soEnterradas`
 * é a alternativa.
 */
export function escolherContagem(
  nivel: Level,
  opcoes: OpcoesEscolha,
  falhados: Falhados = new Set(),
): Escolha | undefined {
  const e0 = estadoDe(nivel);
  const passos = passoDeCadaPeca(nivel);
  const marcadas = celulasMarcadas(e0.m);

  const jaSaem = new Set<Packed>();
  for (const g of gruposMarcados(e0.b, e0.m)) for (const p of g) jaSaem.add(p);

  const minimo = opcoes.profundidadePiso + 1;
  const maximo = Math.ceil(nivel.solution.length / 2);

  const candidatas: { peca: Packed; passo: number }[] = [];
  for (const [peca, passo] of passos) {
    if (passo < minimo || passo > maximo) continue;
    if (cellAt(e0.b, peca) === JOKER) continue;
    if (marcadas.has(peca)) continue;
    if (opcoes.soEnterradas && jaSaem.has(peca)) continue;
    candidatas.push({ peca, passo });
  }

  if (candidatas.length === 0) return undefined;

  const saidas = saidasAoCalhas(nivel, opcoes.playouts, nivel.seed ^ 0xc0_47);
  const aTempo = (peca: Packed, limite: number): number =>
    saidas.filter((s) => (s.get(peca) ?? Infinity) <= limite).length /
    saidas.length;

  for (const folga of opcoes.folgas) {
    const ordenadas = candidatas
      .map((x) => ({ ...x, aTempo: aTempo(x.peca, x.passo + folga) }))
      .sort(
        (a, b) =>
          Number(jaSaem.has(a.peca)) - Number(jaSaem.has(b.peca)) ||
          a.aTempo - b.aTempo ||
          a.peca - b.peca,
      );

    for (const x of ordenadas.slice(0, opcoes.tentativas)) {
      const contagem = { peca: x.peca, restantes: x.passo + folga };
      const piso = pisoComContagem(
        estadoDe(nivel, contagem),
        opcoes.profundidadePiso,
        opcoes.maxEstados,
        falhados,
      );

      if (piso === "yes") {
        return {
          contagem,
          passo: x.passo,
          folga,
          aTempo: x.aTempo,
          candidatas: candidatas.length,
          jaSaia: jaSaem.has(x.peca),
        };
      }
    }
  }

  return undefined;
}

/* ─── Medir ─────────────────────────────────────────────────────────────── */

export interface MedicaoPlayouts {
  readonly runs: number;
  readonly sobreviveram: number;
  /** Jogada, relativa ao comprimento da solução, depois da qual já não há saída. */
  readonly erros: readonly number[];
  /** Jogada, relativa, em que o jogador dá por isso: sem jogadas, ou a contagem a zero. */
  readonly revelacoes: readonly number[];
  readonly inconclusivos: number;
}

/**
 * Playouts com as marcas e a contagem, por um dos dois `Jogador`, e em cada um
 * que falha a jogada exata do erro.
 *
 * A métrica `firstFatalDepth` do pack mede onde o jogo **bloqueia**, que é
 * quando o jogador dá pelo erro — não quando o cometeu. São as duas que se
 * reportam aqui. O erro encontra-se por pesquisa binária no caminho: a
 * insolubilidade herda-se para a frente, portanto o caminho é solúvel até um
 * ponto e insolúvel daí em diante.
 *
 * Um veredicto inconclusivo conta como solúvel, o que empurra o erro para
 * **mais tarde** — contra a hipótese que se está a testar.
 */
export function medirPlayouts(
  nivel: Level,
  c: Contagem | undefined,
  runs: number,
  maxEstados: number,
  falhados: Falhados = new Set(),
  jogador: Jogador = "calhas",
): MedicaoPlayouts {
  const n = nivel.solution.length;
  const erros: number[] = [];
  const revelacoes: number[] = [];
  let sobreviveram = 0;
  let inconclusivos = 0;

  for (let i = 0; i < runs; i++) {
    const rng = mulberry32(deriveSeed(nivel.seed, i));
    const caminho: (Estado | undefined)[] = [estadoDe(nivel, c)];
    let e: Estado | undefined = caminho[0];

    while (e !== undefined && e.b.length > 0) {
      const g = sortear(e, rng, jogador);
      if (g === undefined) break;
      e = jogar(e, g);
      caminho.push(e);
    }

    if (e !== undefined && e.b.length === 0) {
      sobreviveram++;
      continue;
    }

    const fim = caminho.length - 1;
    revelacoes.push(fim / n);

    let lo = 1;
    let hi = fim;
    while (lo < hi) {
      const meio = (lo + hi) >> 1;
      const v = resolvel(caminho[meio], maxEstados, falhados);
      if (v === "inconclusive") inconclusivos++;
      if (v === "no") hi = meio;
      else lo = meio + 1;
    }
    erros.push(lo / n);
  }

  return { runs, sobreviveram, erros, revelacoes, inconclusivos };
}
