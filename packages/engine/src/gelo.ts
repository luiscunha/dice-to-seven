/**
 * Gelo — peças que só saem acompanhadas por **uma** peça, e não gelada.
 *
 * A regra, inteira:
 *
 * > Uma peça gelada só pode ser eliminada num grupo de **exatamente duas
 * > peças**: ela e a que completa 7 com ela — **que não pode estar gelada**.
 *
 * ── Que problema é que resolve, e que as soldas não resolvem ──
 *
 * As soldas tiram opções — no `perito`, de 33 jogadas por posição para 22 — mas
 * a fração de jogadas que são erro não se mexe: 92,7% seguras sem soldas, 91,7%
 * com quatro. Arrumam o tabuleiro; não fazem perder.
 *
 * O gelo ataca a outra ponta. Um 5 gelado só sai com um 2 encostado, portanto
 * **o 2 da vizinhança passa a ser um recurso que se guarda**. Gastá-lo noutra
 * jogada qualquer deixa o 5 preso para sempre — e essa é a espécie de erro que
 * faltava ao jogo: um erro que se vê **antes** de o cometer, a olhar para o
 * tabuleiro, e não doze jogadas depois, quando já se lê como azar.
 *
 * ── E é a primeira regra que usa a queda das peças ──
 *
 * Se não houver nenhum 2 encostado ao 5 gelado, é preciso **fazer cair um**:
 * limpar por baixo até um 2 escorregar para o sítio. Até hoje o colapso de
 * colunas era uma consequência das jogadas; com gelo passa a ser uma ferramenta
 * — que é exatamente a pergunta que o gate da Fase 6 deixou em aberto.
 *
 * ── Representação ──
 *
 * As coordenadas empacotadas das peças geladas. Como as soldas, viajam com o
 * tabuleiro por `remapearCelula`, e o gelo **nunca degela**: uma peça gelada
 * sai gelada, ou não sai.
 */

import type { Board, Group, Packed } from "./types";
import { colOf, packed, rowOf } from "./types";
import { cellAt } from "./board";
import { remapearCelula } from "./moves";

/** Peças geladas, por ordem crescente. */
export type Gelo = readonly Packed[];

export const SEM_GELO: Gelo = [];

/**
 * O grupo respeita o gelo?
 *
 * Num grupo de duas peças, **no máximo uma** pode estar gelada. Num grupo maior,
 * nenhuma.
 *
 * ── Porque duas geladas não saem juntas ──
 *
 * A regra dizia «sai a par», e um par de duas geladas é um par. Mas o gelo
 * existe para fazer do parceiro um **recurso que se guarda** — o 2 encostado ao
 * 5 gelado é o único que o solta, e gastá-lo noutra jogada deixa o 5 preso. Se
 * o parceiro também estiver gelado, as duas peças soltam-se uma à outra e
 * nenhuma precisa de nada: o gelo deixa de prender e passa a ser uma ajuda.
 * Visto a jogar, lê-se como defeito — duas peças presas que saem sem esforço.
 *
 * Duas saídas rápidas antes do trabalho: sem gelo no tabuleiro nada há a
 * verificar, e o resto é procurar na lista — um nível tem duas ou três peças
 * geladas, e procurar é mais rápido do que construir um `Set` por grupo.
 */
export function respeitaGelo(g: Group, gelo: Gelo): boolean {
  if (gelo.length === 0) return true;

  let geladas = 0;
  for (const p of g) if (gelo.includes(p)) geladas++;

  return geladas === 0 || (g.length === 2 && geladas === 1);
}

/**
 * Para onde vai o gelo depois da jogada.
 *
 * A peça gelada saiu com o grupo, ou desceu com a gravidade. Não há terceiro
 * caso, porque o gelo não degela.
 */
export function aplicarGelo(b: Board, gelo: Gelo, g: Group): Gelo {
  if (gelo.length === 0) return SEM_GELO;

  const paraOnde = remapearCelula(b, g);
  const out: Packed[] = [];

  for (const p of gelo) {
    const novo = paraOnde(p);
    if (novo !== undefined) out.push(novo);
  }

  return out.sort((x, y) => x - y);
}

/**
 * Invariantes do gelo. Lista vazia = tudo bem, como em `checkInvariants`.
 *
 * A terceira é a que protege contra um nível impossível: **uma peça gelada tem
 * de ter, em todo o tabuleiro, pelo menos uma peça não gelada com o valor que a
 * completa** — uma gelada não solta outra (ver `respeitaGelo`). Não chega para
 * provar que o nível se resolve — a peça certa pode nunca chegar a encostar-se
 * — mas apanha o caso grosseiro de graça, e um 5 gelado num tabuleiro cujo
 * único 2 também está gelado é um nível morto à partida.
 *
 * O joker fica de fora do gelo, e não por esquecimento: `joker + v` é sempre
 * grupo legal de duas peças, portanto gelar o joker não lhe proibiria nada — e
 * o desenho do joker é ser flexível em posição (spec §2.6), que é precisamente
 * o que o gelo tira.
 */
export function checkGelo(b: Board, gelo: Gelo): string[] {
  const problemas: string[] = [];
  const vistas = new Set<Packed>();

  // Quantas peças **não geladas** de cada face existem no tabuleiro: só essas
  // podem soltar uma gelada.
  const faces = new Map<number, number>();
  for (let c = 0; c < b.length; c++) {
    const col = b[c] ?? [];
    for (let r = 0; r < col.length; r++) {
      const v = col[r] as number;
      if (gelo.includes(packed(c, r))) continue;
      faces.set(v, (faces.get(v) ?? 0) + 1);
    }
  }

  let anterior = -1;
  for (const p of gelo) {
    if (p <= anterior) problemas.push(`gelo fora de ordem ou repetido em ${p}`);
    anterior = p;

    if (vistas.has(p)) {
      problemas.push(`peça (${colOf(p)}, ${rowOf(p)}) gelada duas vezes`);
    }
    vistas.add(p);

    const valor = cellAt(b, p);
    if (valor === undefined) {
      problemas.push(`gelo em (${colOf(p)}, ${rowOf(p)}): a peça não existe`);
      continue;
    }

    if (valor === 0) {
      problemas.push(`gelo em (${colOf(p)}, ${rowOf(p)}): é o joker`);
      continue;
    }

    const precisa = 7 - valor;
    const disponiveis = faces.get(precisa) ?? 0;
    if (disponiveis === 0) {
      problemas.push(
        `gelo em (${colOf(p)}, ${rowOf(p)}): face ${valor} precisa de um ${precisa} não gelado, e não há nenhum no tabuleiro`,
      );
    }
  }

  return problemas;
}
