/**
 * O resultado do Desafio do Dia, em texto para colar numa conversa.
 *
 * É o que espalha o jogo sem servidor nenhum: um resultado curto, legível sem
 * contexto, que diz o dia e o número — e por isso convida quem o lê a jogar o
 * mesmo desafio. Sem pontuação inventada nem desenhos: o que lá está é o que
 * aconteceu.
 *
 *   DiceToSeven · Desafio #3 · 14 out
 *   🧩 Puzzle: 1:23.4 · ★ perfeito
 *   ⏱️ Contra-Relógio: 1240 pontos · 14 tabuleiros
 *   🧱 Survival: 3:42.1 · 18 linhas
 *   🔥 3 dias seguidos
 */

import type { DiaDeDesafio } from "../session/desafio";
import { numeroDoDia } from "../session/desafio";
import { botao } from "./dom";
import { iconePartilhar } from "./icones";
import { relogio } from "./tempo";

const MESES = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
] as const;

/** O selo do puzzle, com o glifo da grelha de níveis. */
const SELO_PARTILHADO = {
  perfect: "★ perfeito",
  clean: "◆ limpo",
  completed: "concluído",
} as const;

/** `2026-10-14` → `14 out`. */
export function dataCurta(data: string): string {
  const [, mes, dia] = data.split("-").map(Number);
  return `${String(dia ?? 1)} ${MESES[(mes ?? 1) - 1] ?? ""}`;
}

const plural = (n: number, um: string, varios: string): string =>
  `${String(n)} ${n === 1 ? um : varios}`;

/**
 * O texto a partilhar. Só leva os modos feitos — um «por jogar» numa conversa
 * não diz nada a ninguém —, e a sequência só a partir de dois dias, que é
 * quando já é uma sequência.
 */
export function textoDoDesafio(
  data: string,
  dia: DiaDeDesafio,
  sequencia: number,
): string {
  const linhas = [`DiceToSeven · Desafio #${String(numeroDoDia(data))} · ${dataCurta(data)}`];

  const puzzle = dia.puzzle;
  if (puzzle?.estado === "feito") {
    const r = puzzle.resultado;
    linhas.push(`🧩 Puzzle: ${relogio(r.tempoMs)} · ${SELO_PARTILHADO[r.selo]}`);
  }

  const tempo = dia.tempo;
  if (tempo?.estado === "feito") {
    const r = tempo.resultado;
    linhas.push(
      `⏱️ Contra-Relógio: ${plural(r.pontos, "ponto", "pontos")} · ${plural(r.tabuleiros, "tabuleiro", "tabuleiros")}`,
    );
  }

  const survival = dia.survival;
  if (survival?.estado === "feito") {
    const r = survival.resultado;
    linhas.push(
      r.limpou
        ? `🧱 Survival: limpo em ${relogio(r.tempoMs)}`
        : `🧱 Survival: ${relogio(r.tempoMs)} · ${plural(r.linhas, "linha", "linhas")}`,
    );
  }

  if (sequencia >= 2) linhas.push(`🔥 ${String(sequencia)} dias seguidos`);

  return linhas.join("\n");
}

export type DesfechoDaPartilha = "partilhado" | "copiado" | "cancelado" | "falhou";

/**
 * O que um ecrã de corrida precisa de saber quando está a jogar o Desafio do
 * Dia: como se chama a corrida — «Desafio #3», ou «Desafio #3 · treino» — e,
 * se houver resultado oficial para partilhar, como o partilhar.
 */
export interface DesafioNoEcra {
  readonly etiqueta: string;
  readonly aoPartilhar?: () => Promise<DesfechoDaPartilha>;
}

/**
 * Partilha o texto: pela folha de partilha do sistema, se o browser a tiver;
 * senão, copia-o.
 *
 * A folha é o melhor caminho — leva direto à conversa —, mas o WebView do
 * Android não a tem, e muitos browsers de computador também não. Copiar
 * funciona em todos, e o botão diz que copiou.
 *
 * Cancelar a folha **não é falhar**: a pessoa mudou de ideias, e copiar a
 * seguir sem ela pedir era fazer uma coisa que ninguém pediu.
 */
export async function partilhar(texto: string): Promise<DesfechoDaPartilha> {
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ text: texto });
      return "partilhado";
    } catch (erro) {
      if (erro instanceof DOMException && erro.name === "AbortError") return "cancelado";
      // Outra falha (sem permissão, por exemplo): tenta copiar.
    }
  }

  try {
    await navigator.clipboard.writeText(texto);
    return "copiado";
  } catch {
    return copiarAModa(texto) ? "copiado" : "falhou";
  }
}

/**
 * O caminho antigo, para quando a área de transferência assíncrona não está
 * disponível — WebViews mais velhos, ou uma página fora de contexto seguro.
 */
function copiarAModa(texto: string): boolean {
  const area = document.createElement("textarea");
  area.value = texto;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();

  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    area.remove();
  }
}

/**
 * O botão de partilhar, com o desfecho dito **no próprio botão**: «Copiado»
 * durante uns segundos, e volta. Sem isto, copiar era um toque que não fazia
 * nada à vista, e a pessoa tocava outra vez.
 *
 * `compacto` é a versão só com o ícone, para um canto: o desfecho diz-se com
 * um ✓ no lugar do ícone, e no nome acessível.
 */
export function botaoPartilhar(
  aoPartilhar: () => Promise<DesfechoDaPartilha>,
  classe = "primario com-icone",
  compacto = false,
): HTMLButtonElement {
  const NOME = "Partilhar o resultado de hoje";

  const repor = (): void => {
    if (compacto) {
      b.replaceChildren(iconePartilhar());
      b.setAttribute("aria-label", NOME);
      return;
    }
    b.replaceChildren(iconePartilhar(), "Partilhar");
  };

  const b = botao("", classe, () => {
    void aoPartilhar().then((desfecho) => {
      if (desfecho !== "copiado" && desfecho !== "falhou") return;
      const copiado = desfecho === "copiado";

      if (compacto) {
        b.replaceChildren(copiado ? "✓" : "✕");
        b.setAttribute("aria-label", copiado ? "Copiado" : "Não deu para copiar");
      } else {
        b.replaceChildren(copiado ? "Copiado ✓" : "Não deu para copiar");
      }
      b.dataset["desfecho"] = desfecho;
      setTimeout(() => {
        delete b.dataset["desfecho"];
        repor();
      }, 2_500);
    });
  });

  if (compacto) b.title = NOME;
  repor();
  return b;
}
