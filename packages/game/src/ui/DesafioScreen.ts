/**
 * O ecrã do Desafio do Dia: o bilhete do dia e os três desafios, para escolher.
 *
 * Esteve primeiro na Home, inteiro — o bilhete e a lista dos três —, e a Home
 * ficou a ser um ecrã sobre o desafio do dia, com os modos de jogo encostados
 * por baixo. Passou para aqui: a Home leva só um cartão que abre este ecrã, e
 * este ecrã tem o espaço para explicar cada desafio numa linha.
 *
 * **O bilhete** é a cara do dia: a faixa com as seis faces, o número grande na
 * letra da marca, os dados do dia (seis faces da seed, só desenho) e a
 * sequência. Por baixo, **os três desafios**, um cartão cada: o ícone na cor do
 * modo, o nome, o que é, e o estado — por jogar, a meio, feito (com o
 * resultado) ou interrompido. Tocar joga; feito ou interrompido, tocar é
 * treinar. **Partilhar** aparece quando há pelo menos um resultado.
 */

import type { Cell } from "@dicetoseven/engine";

import type { ModoFace } from "./dice";
import { pecaDeAmostra } from "./dice";
import { cabecalho, elemento } from "./dom";
import { iconeCronometro, iconePuzzles, iconeSeguir, iconeSurvival } from "./icones";
import type { DesfechoDaPartilha } from "./partilha";
import { botaoPartilhar } from "./partilha";

/**
 * Um dos desafios do dia, como os ecrãs o mostram. Os textos vêm feitos: o ecrã
 * não sabe converter milissegundos em tempo, nem pontos em frases.
 */
export type EstadoNoCartao =
  | { readonly tipo: "por-jogar" }
  | { readonly tipo: "a-meio"; readonly texto: string }
  | { readonly tipo: "feito"; readonly texto: string }
  | { readonly tipo: "interrompido" };

export interface CartaoDoDesafio {
  readonly numero: number;
  /** Já curta: «12 out». */
  readonly data: string;
  /** Dias seguidos com desafio feito. */
  readonly sequencia: number;
  /** Os dados do dia: seis faces da seed, só para desenho. Ver `dadosDoDia`. */
  readonly dados: readonly Cell[];
  readonly puzzle: EstadoNoCartao;
  readonly tempo: EstadoNoCartao;
  readonly survival: EstadoNoCartao;
  readonly aoJogarPuzzle: () => void;
  readonly aoJogarTempo: () => void;
  readonly aoJogarSurvival: () => void;
  /** Só quando há pelo menos um resultado oficial hoje. */
  readonly aoPartilhar?: () => Promise<DesfechoDaPartilha>;
}

export interface OpcoesDesafio {
  readonly cartao: CartaoDoDesafio;
  readonly aoVoltar: () => void;
  readonly modoFace?: ModoFace;
}

/** O texto do estado, igual no cartão da Home e aqui. */
export const textoDoEstado = (estado: EstadoNoCartao): string =>
  estado.tipo === "por-jogar"
    ? "Jogar"
    : estado.tipo === "a-meio"
      ? `Continuar · ${estado.texto}`
      : estado.tipo === "feito"
        ? `✓ ${estado.texto}`
        : "Interrompido";

/** O sinal da sequência: o número que se quer ver crescer. */
export function sinalDaSequencia(sequencia: number): HTMLElement {
  const el = elemento("span", "desafio-sequencia", `🔥 ${String(sequencia)}`);
  el.setAttribute(
    "aria-label",
    sequencia === 1 ? "1 dia seguido" : `${String(sequencia)} dias seguidos`,
  );
  return el;
}

export class DesafioScreen {
  private readonly raiz: HTMLElement;

  constructor(host: HTMLElement, opcoes: OpcoesDesafio) {
    const c = opcoes.cartao;
    this.raiz = elemento("div", "ecra desafio");

    const { el: topo } = cabecalho("Desafio do dia", opcoes.aoVoltar);

    const corpo = elemento("div", "desafio-corpo");
    corpo.append(this.bilhete(c, opcoes.modoFace ?? "pintas"), this.lista(c));

    if (c.aoPartilhar !== undefined) {
      corpo.appendChild(botaoPartilhar(c.aoPartilhar, "primario com-icone desafio-partilhar"));
    }

    corpo.appendChild(
      elemento("p", "desafio-nota", "Amanhã há outro. O desafio muda à meia-noite."),
    );

    const rolo = elemento("div", "rolo");
    rolo.appendChild(corpo);

    this.raiz.append(topo, rolo);
    host.replaceChildren(this.raiz);
  }

  destruir(): void {
    this.raiz.remove();
  }

  /** A cara do dia: a faixa, o número, os dados do dia e a sequência. */
  private bilhete(c: CartaoDoDesafio, face: ModoFace): HTMLElement {
    const el = elemento("section", "desafio-bilhete");
    el.setAttribute("aria-label", `Desafio número ${String(c.numero)}, ${c.data}`);

    const numero = elemento("p", "desafio-numero");
    numero.append(
      elemento("span", "desafio-cardinal", `#${String(c.numero)}`),
      elemento("span", "desafio-data", c.data),
    );

    const cabeca = elemento("div", "desafio-bilhete-cabeca");
    cabeca.appendChild(numero);
    if (c.sequencia > 0) cabeca.appendChild(sinalDaSequencia(c.sequencia));

    const dados = elemento("div", "desafio-dados");
    dados.setAttribute("aria-hidden", "true");
    for (const v of c.dados) dados.appendChild(pecaDeAmostra(v, face));

    el.append(
      cabeca,
      dados,
      elemento(
        "p",
        "desafio-explicacao",
        "Hoje, os mesmos três desafios para toda a gente. Conta a primeira tentativa de cada um; depois é treino.",
      ),
    );

    return el;
  }

  /** Os três desafios, o Puzzle primeiro: é o que qualquer pessoa consegue jogar. */
  private lista(c: CartaoDoDesafio): HTMLElement {
    const lista = elemento("ul", "desafio-lista");
    lista.setAttribute("aria-label", "Os desafios de hoje");

    const itens = [
      this.desafio("puzzle", "Puzzle", "Um tabuleiro, o mesmo para todos. Resolve-o.", c.puzzle, c.aoJogarPuzzle),
      this.desafio(
        "tempo",
        "Contra-Relógio",
        "Sessenta segundos, e os mesmos tabuleiros para todos.",
        c.tempo,
        c.aoJogarTempo,
      ),
      this.desafio(
        "survival",
        "Survival",
        "As mesmas linhas para todos. Aguenta o mais que puderes.",
        c.survival,
        c.aoJogarSurvival,
      ),
    ];

    for (const item of itens) {
      const li = document.createElement("li");
      li.appendChild(item);
      lista.appendChild(li);
    }

    return lista;
  }

  private desafio(
    modo: "puzzle" | "tempo" | "survival",
    nome: string,
    legenda: string,
    estado: EstadoNoCartao,
    aoJogar: () => void,
  ): HTMLButtonElement {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "desafio-modo";
    b.dataset["modo"] = modo;
    b.dataset["estado"] = estado.tipo;
    b.addEventListener("click", aoJogar);

    // O ícone na cor do modo: o elo com o modo livre do mesmo nome, na Home.
    const icone = elemento("span", "desafio-modo-icone");
    icone.appendChild(
      modo === "puzzle"
        ? iconePuzzles()
        : modo === "tempo"
          ? iconeCronometro()
          : iconeSurvival(),
    );

    const texto = elemento("span", "desafio-modo-texto");
    texto.append(
      elemento("span", "desafio-modo-nome", nome),
      elemento("span", "desafio-modo-legenda", legenda),
    );

    const estadoTexto = textoDoEstado(estado);
    b.append(icone, texto, elemento("span", "desafio-modo-estado", estadoTexto), iconeSeguir());

    /*
     * O nome acessível diz o que o toque faz, que muda com o estado: feito ou
     * interrompido, o toque é treino.
     */
    const acao =
      estado.tipo === "por-jogar"
        ? "jogar"
        : estado.tipo === "a-meio"
          ? "continuar"
          : "treinar";
    b.setAttribute("aria-label", `${nome} do dia: ${estadoTexto}. Tocar para ${acao}.`);

    return b;
  }
}
