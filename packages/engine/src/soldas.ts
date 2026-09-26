/**
 * Soldas — peças unidas que saem juntas ou não saem (plano §7.1).
 *
 * A regra, inteira:
 *
 * > Duas peças soldadas ou entram ambas na jogada, ou não entra nenhuma.
 *
 * Serve um defeito medido: no `perito` há 35 jogadas disponíveis por posição mas
 * só 6 combinações diferentes — as outras 29 são cópias da mesma soma noutros
 * sítios. A decisão que interessa é **geométrica** (qual dos seis `5+2` tiras) e
 * hoje nada no jogo a torna visível. Uma solda transforma o par óbvio em jogada
 * ilegal e obriga a olhar para a forma à volta.
 *
 * ── Porque só há soldas verticais ──
 *
 * Não é uma limitação de âmbito, é o que a representação permite. Uma solda
 * vertical liga `(c, r)` a `(c, r+1)`; depois de uma jogada, ambas descem o
 * mesmo número de linhas — a gravidade é um `filter`, que preserva a ordem —
 * portanto continuam encostadas, para sempre.
 *
 * Uma solda horizontal ligaria `(c, r)` a `(c+1, r)`. Basta remover uma célula
 * por baixo de uma delas e só essa desce: o par deixa de ser adjacente e a
 * solda passa a ligar peças que não se tocam. Teria de haver uma regra para a
 * quebrar, e um estado que muda a meio do nível é um estado que o gerador tem de
 * reconstruir em reverso — precisamente o que a garantia central não tolera de
 * ânimo leve.
 *
 * Portanto: **soldas verticais, e uma solda nunca se quebra**. Um par soldado é
 * um bloco que desce inteiro até ser eliminado inteiro.
 *
 * ── Representação ──
 *
 * A coordenada empacotada da célula **de baixo** de cada par. É a forma mais
 * pequena que existe, é exatamente o que vai no ficheiro de nível, e não duplica
 * nada do tabuleiro.
 *
 * A transformação depois de uma jogada usa `linhasRemovidas` de `moves.ts` — a
 * mesma travessia que o tabuleiro sofre, não uma cópia dela.
 */

import type { Board, Group, Packed } from "./types";
import { MAX_ROWS, colOf, packed, rowOf } from "./types";
import { cellAt, height, width } from "./board";
import { remapearCelula } from "./moves";

/**
 * Células **de baixo** dos pares soldados, por ordem crescente.
 *
 * `soldas` contém `p` ⟺ a peça em `p` está soldada à que está imediatamente
 * por cima dela.
 */
export type Soldas = readonly Packed[];

/** Um tabuleiro sem soldas nenhumas. O caso normal, e o que todo o código antigo vê. */
export const SEM_SOLDAS: Soldas = [];

export const temSoldas = (s: Soldas): boolean => s.length > 0;

/** O par que a solda em `p` une: a célula de baixo e a de cima. */
export const parDe = (p: Packed): readonly [Packed, Packed] => [
  p,
  packed(colOf(p), rowOf(p) + 1),
];

/**
 * Todas as células que participam nalguma solda.
 *
 * Usado pelo filtro e pela UI; `Set` porque a pergunta é sempre de pertença.
 */
export function celulasSoldadas(s: Soldas): ReadonlySet<Packed> {
  const out = new Set<Packed>();
  for (const p of s) {
    out.add(p);
    out.add(packed(colOf(p), rowOf(p) + 1));
  }
  return out;
}

/**
 * O grupo respeita as soldas?
 *
 * Um par soldado tem de estar inteiro dentro do grupo ou inteiro fora. Não há
 * terceira hipótese: é literalmente a regra.
 */
export function respeitaSoldas(g: Group, s: Soldas): boolean {
  if (s.length === 0) return true;

  const dentro = new Set<Packed>(g);
  for (const baixo of s) {
    const cima = packed(colOf(baixo), rowOf(baixo) + 1);
    if (dentro.has(baixo) !== dentro.has(cima)) return false;
  }

  return true;
}

/**
 * Para onde vão as soldas depois da jogada.
 *
 * O par saiu inteiro e a solda desaparece com ele, ou ficou e desce com a
 * gravidade. Não há terceiro caso: sair meio par é impossível, porque
 * `respeitaSoldas` já o proibiu.
 *
 * A travessia é a de `remapearCelula`, partilhada com o gelo — duas
 * implementações da mesma conta seriam duas oportunidades de divergir.
 */
export function aplicarSoldas(b: Board, s: Soldas, g: Group): Soldas {
  if (s.length === 0) return SEM_SOLDAS;

  const paraOnde = remapearCelula(b, g);
  const out: Packed[] = [];

  for (const baixo of s) {
    // Sair meio par é impossível — `respeitaSoldas` já o proibiu — portanto se a
    // de baixo ficou, a de cima ficou com ela, e continuam encostadas.
    const novo = paraOnde(baixo);
    if (novo !== undefined) out.push(novo);
  }

  return out.sort((x, y) => x - y);
}

/**
 * Invariantes das soldas. Lista vazia = tudo bem, como em `checkInvariants`.
 *
 * A quarta é a que mais custa a respeitar e a que mais protege: **uma célula só
 * pode estar numa solda**. Uma corrente de três peças é um bloco de três que só
 * sai com quatro pontos ao lado — formas assim entopem o tabuleiro e o gerador
 * tem muito mais dificuldade em provar que saem. Fica de fora por decisão, não
 * por esquecimento.
 */
export function checkSoldas(b: Board, s: Soldas): string[] {
  const problemas: string[] = [];
  const vistas = new Set<Packed>();

  let anterior = -1;
  for (const baixo of s) {
    if (baixo <= anterior) {
      problemas.push(`soldas fora de ordem ou repetidas em ${baixo}`);
    }
    anterior = baixo;

    const c = colOf(baixo);
    const r = rowOf(baixo);

    if (c >= width(b) || r + 1 >= MAX_ROWS) {
      problemas.push(`solda ${baixo} fora do tabuleiro`);
      continue;
    }

    if (cellAt(b, baixo) === undefined) {
      problemas.push(`solda em (${c}, ${r}): a célula de baixo não existe`);
      continue;
    }

    if (r + 1 >= height(b, c)) {
      problemas.push(`solda em (${c}, ${r}): não há célula por cima`);
      continue;
    }

    const cima = packed(c, r + 1);
    for (const p of [baixo, cima]) {
      if (vistas.has(p)) {
        problemas.push(`célula (${colOf(p)}, ${rowOf(p)}) está em duas soldas`);
      }
      vistas.add(p);
    }
  }

  return problemas;
}
