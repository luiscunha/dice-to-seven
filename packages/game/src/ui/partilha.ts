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

import { t } from "../i18n";
import type { DiaDeDesafio, ModoDoDesafio } from "../session/desafio";
import { modoDoDia, numeroDoDia } from "../session/desafio";
import { botao } from "./dom";
import { iconePartilhar } from "./icones";
import { relogio } from "./tempo";

const partes = (data: string): readonly [number, number, number] => {
  const [ano, mes, dia] = data.split("-").map(Number);
  return [ano ?? 1970, mes ?? 1, dia ?? 1];
};

/** `2026-10-14` → `14 out`, no idioma do jogo. */
export function dataCurta(data: string): string {
  const [, mes, dia] = partes(data);
  return t().formato.dataCurta(dia, mes);
}

/** `2026-10-14` → `14 de outubro`. */
export function dataPorExtenso(data: string): string {
  const [, mes, dia] = partes(data);
  return t().formato.dataPorExtenso(dia, mes);
}

/** `2026-10-14` → `14 de outubro de 2026`. */
export function dataCompleta(data: string): string {
  const [ano, mes, dia] = partes(data);
  return t().formato.dataCompleta(dia, mes, ano);
}

/** `2026-10` (ou uma data desse mês) → `out`. */
export function mesCurto(mes: string): string {
  const [, m] = partes(mes);
  return t().formato.mesCurto(m);
}

/** `2026-10` (ou uma data desse mês) → `outubro de 2026`. */
export function mesPorExtenso(mes: string): string {
  const [ano, m] = partes(mes);
  return t().formato.mesPorExtenso(m, ano);
}

/** `2026-10` (ou uma data desse mês) → `outubro`. */
export function nomeDoMes(mes: string): string {
  const [, m] = partes(mes);
  return t().formato.nomeDoMes(m);
}

/** O nome de cada modo, como os ecrãs do desafio o escrevem. */
export const nomeDoModo = (modo: ModoDoDesafio): string => t().modos[modo];

/**
 * O texto a partilhar: o desafio do dia e o resultado, se houver — um «por
 * jogar» numa conversa não diz nada a ninguém —, e a sequência só a partir de
 * dois dias, que é quando já é uma sequência.
 *
 * **Sai no idioma do jogo**: é quem partilha que escolhe com quem fala.
 */
export function textoDoDesafio(
  data: string,
  dia: DiaDeDesafio,
  sequencia: number,
): string {
  const p = t().partilha;
  const linhas = [p.cabeca(numeroDoDia(data), dataCurta(data))];

  const resultado = linhaDoResultado(modoDoDia(data), dia);
  if (resultado !== undefined) linhas.push(resultado);

  if (sequencia >= 2) linhas.push(p.sequencia(sequencia));

  return linhas.join("\n");
}

/**
 * O resultado do desafio do dia, numa linha. Só o do modo do dia: um dia de
 * quando havia três desafios pode ter os outros guardados, e não contam.
 */
function linhaDoResultado(modo: ModoDoDesafio, dia: DiaDeDesafio): string | undefined {
  const p = t().partilha;

  if (modo === "puzzle") {
    const e = dia.puzzle;
    if (e?.estado !== "feito") return undefined;
    return p.puzzle(relogio(e.resultado.tempoMs), p.selos[e.resultado.selo]);
  }

  if (modo === "tempo") {
    const e = dia.tempo;
    if (e?.estado !== "feito") return undefined;
    return p.tempo(e.resultado.pontos, e.resultado.tabuleiros);
  }

  // Feito é sempre limpo: transbordar não fecha o Survival do Dia.
  const e = dia.survival;
  if (e?.estado !== "feito") return undefined;
  return p.survival(relogio(e.resultado.tempoMs));
}

export type DesfechoDaPartilha = "partilhado" | "copiado" | "cancelado" | "falhou";

/**
 * O que um ecrã de corrida precisa de saber quando está a jogar o Desafio do
 * Dia: como se chama a corrida — «Desafio #3», ou «Desafio #3 · treino» —, se
 * é a tentativa oficial e, se houver resultado oficial para partilhar, como o
 * partilhar.
 */
export interface DesafioNoEcra {
  readonly etiqueta: string;
  /**
   * A corrida é a tentativa que conta. É o Survival que precisa de o saber:
   * transbordar não a fecha, e o fim oferece tentar outra vez, e não treinar.
   */
  readonly oficial?: true;
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
  const NOME = t().comum.partilharResultado;

  const repor = (): void => {
    if (compacto) {
      b.replaceChildren(iconePartilhar());
      b.setAttribute("aria-label", NOME);
      return;
    }
    b.replaceChildren(iconePartilhar(), t().comum.partilhar);
  };

  const b = botao("", classe, () => {
    void aoPartilhar().then((desfecho) => {
      if (desfecho !== "copiado" && desfecho !== "falhou") return;
      const copiado = desfecho === "copiado";

      if (compacto) {
        b.replaceChildren(copiado ? "✓" : "✕");
        b.setAttribute("aria-label", copiado ? t().comum.copiado : t().comum.naoDeuParaCopiar);
      } else {
        b.replaceChildren(copiado ? t().comum.copiadoComVisto : t().comum.naoDeuParaCopiar);
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
