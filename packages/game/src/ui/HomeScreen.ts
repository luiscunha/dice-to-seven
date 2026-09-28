/**
 * A Home: os três modos e as definições.
 *
 * É o único ecrã sem seta de voltar, e o único que mostra o nome do jogo. Tudo o
 * resto é uma escolha entre três coisas — e três coisas não precisam de mapa,
 * de metáfora, nem de arte que envelhece (desenho §5.6).
 *
 * O progresso aparece aqui em números e não em barras, e **dentro do cartão do
 * modo a que pertence**. Era um bloco de três linhas soltas por baixo dos
 * cartões, que obrigava a ligar «Survival: 2:31.4» ao cartão três linhas acima;
 * no cartão, o número está onde a decisão se toma. Quem não jogou nada não vê
 * zeros a acusá-lo — o número só aparece quando há o que contar.
 *
 * **As definições saíram do fundo do ecrã para o canto de cima.** São a ação
 * menos frequente da Home, e o fundo de um telemóvel é a zona do polegar — o
 * sítio mais caro do ecrã, que passa a ser todo dos modos.
 */

import type { Profile } from "../session/progress";
import { botaoRedondo, elemento } from "./dom";
import {
  iconeCronometro,
  iconeDefinicoes,
  iconePuzzles,
  iconeSeguir,
  iconeSurvival,
} from "./icones";

export interface OpcoesHome {
  readonly aoEscolherNiveis: () => void;
  readonly aoEscolherTempo: () => void;
  readonly aoEscolherSurvival: () => void;
  readonly aoEscolherDefinicoes: () => void;
  readonly perfil: Profile;
  /** Total de níveis do pack, para o «x de y». */
  readonly totalNiveis: number;
  /** Já formatado: a Home não sabe converter milissegundos em tempo. */
  readonly melhorTempoSurvival: string;
  /**
   * O tempo da corrida de Survival que ficou a meio, já formatado — ou nada.
   *
   * A corrida guarda-se ao sair, e entrar no modo retoma-a. Mas nada o dizia:
   * quem saiu a meio não sabia que tinha uma corrida à espera, e quem
   * procurava uma corrida nova caía na antiga sem aviso.
   */
  readonly corridaAMeio?: string;
}

export class HomeScreen {
  private readonly raiz: HTMLElement;

  constructor(host: HTMLElement, opcoes: OpcoesHome) {
    this.raiz = elemento("div", "ecra home");

    const barra = elemento("div", "home-barra");
    barra.appendChild(
      botaoRedondo(iconeDefinicoes(), "Definições", opcoes.aoEscolherDefinicoes),
    );

    const marca = elemento("div", "home-marca");
    marca.append(
      this.simbolo(),
      elemento("h1", "home-titulo", "DiceToSeven"),
      elemento(
        "p",
        "home-lema",
        "Elimina grupos ligados que somem exatamente 7.",
      ),
    );

    const modos = elemento("nav", "home-modos");
    modos.setAttribute("aria-label", "modos de jogo");
    modos.append(
      this.cartao({
        icone: iconePuzzles(),
        titulo: "Puzzles",
        legenda: "A campanha, capítulo a capítulo",
        estado: this.estadoPuzzles(opcoes),
        aoClicar: opcoes.aoEscolherNiveis,
        primario: true,
      }),
      this.cartao({
        icone: iconeCronometro(),
        titulo: "Contra-Relógio",
        legenda: "Um relógio só, que nunca pára",
        estado:
          opcoes.perfil.bestTimeAttackScore > 0
            ? `Recorde ${String(opcoes.perfil.bestTimeAttackScore)}`
            : undefined,
        aoClicar: opcoes.aoEscolherTempo,
      }),
      this.cartao({
        icone: iconeSurvival(),
        titulo: "Survival",
        legenda: "Vês o que aí vem. Limpa o tabuleiro o mais depressa que consigas",
        ...this.estadoSurvival(opcoes),
        aoClicar: opcoes.aoEscolherSurvival,
      }),
    );

    this.raiz.append(barra, marca, modos);
    host.replaceChildren(this.raiz);
  }

  destruir(): void {
    this.raiz.remove();
  }

  /**
   * O símbolo da marca.
   *
   * `alt` vazio de propósito: é decoração. O nome vem já a seguir no `h1`, e um
   * leitor de ecrã que anunciasse os dois dizia «DiceToSeven» duas vezes.
   *
   * O caminho resolve-se contra `document.baseURI`, como os packs de níveis em
   * `levels.ts`. É o que faz o mesmo bundle servir de `/` e de
   * `/dice-to-seven/` — o Vite não reescreve caminhos construídos em runtime.
   */
  private simbolo(): HTMLImageElement {
    const img = document.createElement("img");
    img.className = "home-simbolo";
    img.src = new URL("marca/icone.svg", document.baseURI).href;
    img.alt = "";
    img.width = 320;
    img.height = 320;
    return img;
  }

  /**
   * Um cartão de modo: ícone, nome, uma linha a dizer o que é, e o estado.
   *
   * O estado é o número que interessa **a quem volta** — quanto já fez, qual é
   * o recorde, se ficou alguma coisa a meio. Fica à direita do nome e não por
   * baixo da legenda, para que a legenda se leia como descrição e o número se
   * leia como número.
   */
  private cartao(c: {
    readonly icone: SVGElement;
    readonly titulo: string;
    readonly legenda: string;
    readonly estado: string | undefined;
    readonly aoMeio?: boolean;
    readonly aoClicar: () => void;
    readonly primario?: boolean;
  }): HTMLElement {
    const b = document.createElement("button");
    b.type = "button";
    b.className = c.primario === true ? "home-modo primario" : "home-modo";

    const icone = elemento("span", "home-modo-icone");
    icone.appendChild(c.icone);

    const texto = elemento("span", "home-modo-texto");
    const cabeca = elemento("span", "home-modo-cabeca");
    cabeca.appendChild(elemento("span", "home-modo-titulo", c.titulo));

    if (c.estado !== undefined) {
      const estado = elemento("span", "home-modo-estado", c.estado);
      if (c.aoMeio === true) estado.dataset["aMeio"] = "sim";
      cabeca.appendChild(estado);
    }

    texto.append(cabeca, elemento("span", "home-modo-legenda", c.legenda));

    b.append(icone, texto, iconeSeguir());
    b.addEventListener("click", c.aoClicar);
    return b;
  }

  /** «12/143 · ★ 3». Só aparece com pelo menos um nível feito. */
  private estadoPuzzles(opcoes: OpcoesHome): string | undefined {
    const niveis = Object.values(opcoes.perfil.levels);
    if (niveis.length === 0) return undefined;

    const perfeitos = niveis.filter((l) => l.seal === "perfect").length;
    const conta = `${String(niveis.length)}/${String(opcoes.totalNiveis)}`;

    return perfeitos > 0 ? `${conta} · ★ ${String(perfeitos)}` : conta;
  }

  /**
   * A corrida a meio ganha ao recorde. É o que muda o que acontece ao tocar no
   * cartão — retoma em vez de começar — e o jogador tem de o saber antes.
   */
  private estadoSurvival(opcoes: OpcoesHome): {
    readonly estado: string | undefined;
    readonly aoMeio?: boolean;
  } {
    if (opcoes.corridaAMeio !== undefined) {
      return { estado: `A meio · ${opcoes.corridaAMeio}`, aoMeio: true };
    }

    if (opcoes.perfil.bestSurvivalMs > 0) {
      return { estado: `Melhor ${opcoes.melhorTempoSurvival}` };
    }

    return { estado: undefined };
  }
}
