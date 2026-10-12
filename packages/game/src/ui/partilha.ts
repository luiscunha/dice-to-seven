/**
 * O resultado do Desafio do Dia, em texto para colar numa conversa.
 *
 * É o que espalha o jogo sem servidor nenhum: um resultado curto, legível sem
 * contexto, que diz o dia e o número — e por isso convida quem o lê a jogar o
 * mesmo desafio. Sem pontuação inventada nem desenhos: o que lá está é o que
 * aconteceu.
 *
 *   DiceToSeven · Desafio #3 · 14 out
 *   🧱 Survival: 3:42.1 · 18 linhas
 *   🔥 3 dias seguidos
 */

import type { DiaDeDesafio, ModoDoDesafio } from "../session/desafio";
import { modoDoDia, numeroDoDia } from "../session/desafio";
import { botao } from "./dom";
import { iconePartilhar } from "./icones";
import { relogio } from "./tempo";

const MESES = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
] as const;

const MESES_POR_EXTENSO = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
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

const partes = (data: string): readonly [number, number, number] => {
  const [ano, mes, dia] = data.split("-").map(Number);
  return [ano ?? 1970, mes ?? 1, dia ?? 1];
};

/** `2026-10-14` → `14 de outubro`. */
export function dataPorExtenso(data: string): string {
  const [, mes, dia] = partes(data);
  return `${String(dia)} de ${MESES_POR_EXTENSO[mes - 1] ?? ""}`;
}

/** `2026-10-14` → `outubro de 2026`. */
export function mesPorExtenso(data: string): string {
  const [ano, mes] = partes(data);
  return `${MESES_POR_EXTENSO[mes - 1] ?? ""} de ${String(ano)}`;
}

/** O nome de cada modo, como os ecrãs do desafio o escrevem. */
export const NOME_DO_MODO: Readonly<Record<ModoDoDesafio, string>> = {
  puzzle: "Puzzle",
  tempo: "Contra-Relógio",
  survival: "Survival",
};

const plural = (n: number, um: string, varios: string): string =>
  `${String(n)} ${n === 1 ? um : varios}`;

/**
 * O texto a partilhar: o desafio do dia e o resultado, se houver — um «por
 * jogar» numa conversa não diz nada a ninguém —, e a sequência só a partir de
 * dois dias, que é quando já é uma sequência.
 */
export function textoDoDesafio(
  data: string,
  dia: DiaDeDesafio,
  sequencia: number,
): string {
  const linhas = [`DiceToSeven · Desafio #${String(numeroDoDia(data))} · ${dataCurta(data)}`];

  const resultado = linhaDoResultado(modoDoDia(data), dia);
  if (resultado !== undefined) linhas.push(resultado);

  if (sequencia >= 2) linhas.push(`🔥 ${String(sequencia)} dias seguidos`);

  return linhas.join("\n");
}

/**
 * O resultado do desafio do dia, numa linha. Só o do modo do dia: um dia de
 * quando havia três desafios pode ter os outros guardados, e não contam.
 */
function linhaDoResultado(modo: ModoDoDesafio, dia: DiaDeDesafio): string | undefined {
  if (modo === "puzzle") {
    const e = dia.puzzle;
    if (e?.estado !== "feito") return undefined;
    return `🧩 Puzzle: ${relogio(e.resultado.tempoMs)} · ${SELO_PARTILHADO[e.resultado.selo]}`;
  }

  if (modo === "tempo") {
    const e = dia.tempo;
    if (e?.estado !== "feito") return undefined;
    const r = e.resultado;
    return `⏱️ Contra-Relógio: ${plural(r.pontos, "ponto", "pontos")} · ${plural(r.tabuleiros, "tabuleiro", "tabuleiros")}`;
  }

  const e = dia.survival;
  if (e?.estado !== "feito") return undefined;
  const r = e.resultado;
  return r.limpou
    ? `🧱 Survival: limpo em ${relogio(r.tempoMs)}`
    : `🧱 Survival: ${relogio(r.tempoMs)} · ${plural(r.linhas, "linha", "linhas")}`;
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
