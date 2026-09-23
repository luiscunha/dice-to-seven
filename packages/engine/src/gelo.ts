/**
 * Gelo — peças que só saem acompanhadas por **uma** peça.
 *
 * A regra, inteira:
 *
 * > Uma peça gelada só pode ser eliminada num grupo de **exatamente duas
 * > peças**: ela e a que completa 7 com ela.
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
import { colOf, rowOf } from "./types";
import { cellAt } from "./board";
import { remapearCelula } from "./moves";

/** Peças geladas, por ordem crescente. */
export type Gelo = readonly Packed[];

export const SEM_GELO: Gelo = [];

/**
 * O grupo respeita o gelo?
 *
 * Duas saídas rápidas antes do trabalho: sem gelo no tabuleiro nada há a
 * verificar, e um grupo de duas peças é legal seja qual for o gelo — é
 * precisamente o tamanho que o gelo permite.
 */
export function respeitaGelo(g: Group, gelo: Gelo): boolean {
  if (gelo.length === 0) return true;
  if (g.length === 2) return true;

  // Um nível tem duas ou três peças geladas: procurar na lista é mais rápido do
  // que construir um `Set` por grupo, e o grupo tem no máximo sete células.
  for (const p of g) if (gelo.includes(p)) return false;

  return true;
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
 * de ter, em todo o tabuleiro, pelo menos uma peça com o valor que a completa**.
 * Não chega para provar que o nível se resolve — a peça certa pode nunca chegar
 * a encostar-se — mas apanha o caso grosseiro de graça, e um 6 gelado num
 * tabuleiro sem um único 1 é um nível morto à partida.
 *
 * O joker fica de fora do gelo, e não por esquecimento: `joker + v` é sempre
 * grupo legal de duas peças, portanto gelar o joker não lhe proibiria nada — e
 * o desenho do joker é ser flexível em posição (spec §2.6), que é precisamente
 * o que o gelo tira.
 */
export function checkGelo(b: Board, gelo: Gelo): string[] {
  const problemas: string[] = [];
  const vistas = new Set<Packed>();

  // Quantas peças de cada face existem no tabuleiro.
  const faces = new Map<number, number>();
  for (const col of b) for (const v of col) faces.set(v, (faces.get(v) ?? 0) + 1);

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
        `gelo em (${colOf(p)}, ${rowOf(p)}): face ${valor} precisa de um ${precisa}, e não há nenhum no tabuleiro`,
      );
    }
  }

  return problemas;
}
