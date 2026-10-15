/**
 * Como jogar: as regras, em texto e em peças.
 *
 * **Não substitui o tutorial do joker**, e não tenta. Aquele existe porque a
 * regra do joker não se aprende a ler — o que ela tem de estranho é que
 * escolher mal *é permitido* e *não avisa*, e isso só se percebe quando
 * acontece à frente do jogador. Este ecrã é o outro problema: quem já jogou
 * três níveis e quer confirmar se as peças contam na diagonal, ou o que é o
 * losango que apareceu ao lado do nível 12. Para isso, uma página que se lê de
 * cima a baixo e não se fecha sozinha vale mais do que uma sequência de passos.
 *
 * **As peças dos exemplos são as peças do jogo** (`pecaDeAmostra`, em
 * `dice.ts`) — a mesma cor, as mesmas pintas, o mesmo rebordo. Uma ilustração
 * parecida diverge da peça no dia em que a paleta mudar, e o sítio onde isso se
 * nota é justamente o ecrã que promete explicar o jogo.
 *
 * A ordem é a de quem está a aprender, e não a da spec: primeiro o que se quer
 * fazer, depois como se faz uma jogada, depois o que o tabuleiro faz a seguir.
 * As peças especiais vêm a seguir, pela ordem em que se encontram — o joker, as
 * soldas, o gelo e a bomba —, e os selos no fim, porque nada disso é preciso
 * para jogar o primeiro nível.
 *
 * As três últimas peças especiais tiveram de entrar aqui porque **não têm
 * tutorial nenhum**: aparecem a meio de um modo, com uma linha de recusa como
 * única explicação. Quem viu uma peça presa num bloco de gelo e quer saber
 * porque é que ela não sai procura a resposta neste ecrã.
 */

import type { Cell } from "@dicetoseven/engine";

import { t } from "../i18n";
import { DEFAULT_TIME_ATTACK } from "../session/TimeAttackSession";
import type { ModoFace } from "./dice";
import { pecaDeAmostra, simboloJoker } from "./dice";
import { botao, cabecalho, elemento } from "./dom";

export interface OpcoesComoJogar {
  readonly aoVoltar: () => void;
  /** Abre o tutorial do joker por cima deste ecrã. */
  readonly aoVerTutorialDoJoker?: () => void;
  readonly modoFace?: ModoFace;
}

/**
 * Uma casa de um exemplo: vazia, uma peça, ou uma peça com marcas — as classes
 * que o `BoardView` lhe daria no tabuleiro, como `gelada` ou `soldada-cima`.
 * São as mesmas classes, e por isso o mesmo desenho.
 */
type Casa =
  | Cell
  | undefined
  | { readonly valor: Cell; readonly marcas: readonly string[] };

const gelada = (valor: Cell): Casa => ({ valor, marcas: ["gelada"] });
const soldadaCima = (valor: Cell): Casa => ({ valor, marcas: ["soldada-cima"] });
const soldadaBaixo = (valor: Cell): Casa => ({ valor, marcas: ["soldada-baixo"] });

/**
 * O que custa a bomba no Contra-Relógio, lido da configuração do modo. É número
 * de playtest e vai mudar; uma regra escrita à mão ficava a mentir no dia em
 * que mudasse.
 */
const CASTIGO_BOMBA_S = DEFAULT_TIME_ATTACK.bomba.penalizacaoMs / 1000;

/** O que custa saltar um tabuleiro no Contra-Relógio, pela mesma razão. */
const SALTAR_S = DEFAULT_TIME_ATTACK.saltarMs / 1000;

/** Os três selos, na ordem em que valem. Os textos estão no dicionário. */
const SELOS = [
  { glifo: "★", selo: "perfect" },
  { glifo: "◆", selo: "clean" },
  { glifo: "●", selo: "completed" },
] as const;

export class ComoJogarScreen {
  private readonly raiz: HTMLElement;
  private readonly modo: ModoFace;

  constructor(host: HTMLElement, opcoes: OpcoesComoJogar) {
    this.modo = opcoes.modoFace ?? "pintas";
    this.raiz = elemento("div", "ecra");

    const { el: topo } = cabecalho(t().comoJogar.titulo, opcoes.aoVoltar);

    const rolo = elemento("div", "rolo");
    const corpo = elemento("div", "regras");
    corpo.append(
      this.objetivo(),
      this.jogada(),
      this.ligadas(),
      this.depois(),
      this.joker(opcoes),
      this.soldas(),
      this.gelo(),
      this.bomba(),
      this.selos(),
      this.modos(),
    );
    rolo.appendChild(corpo);

    this.raiz.append(topo, rolo);
    host.replaceChildren(this.raiz);
  }

  destruir(): void {
    this.raiz.remove();
  }

  /* ─── As secções ────────────────────────────────────────────────────────── */

  /**
   * O objetivo em quatro palavras, e só depois a razão.
   *
   * Um jogo que começa a explicar-se pelas regras deixa o jogador a construir o
   * objetivo a partir delas. É mais barato dizê-lo primeiro: tudo o que vem a
   * seguir passa a ser resposta a uma pergunta que ele já tem.
   */
  private objetivo(): HTMLElement {
    const r = t().comoJogar;
    const el = this.seccao(r.objetivo, r.objetivoChamada);
    el.appendChild(this.paragrafo(r.objetivoTexto));
    return el;
  }

  private jogada(): HTMLElement {
    const r = t().comoJogar;
    const el = this.seccao(r.jogada, r.jogadaChamada);

    el.appendChild(this.conta([3, 4]));
    el.appendChild(this.paragrafo(r.jogadaTexto));
    el.appendChild(this.paragrafo(r.jogadaMaximo));

    return el;
  }

  /**
   * A regra que toda a gente pergunta. Um exemplo que vale e um que não vale,
   * lado a lado — a diagonal explica-se pior em palavras do que em duas peças.
   */
  private ligadas(): HTMLElement {
    const r = t().comoJogar;
    const el = this.seccao(r.ligadas, r.ligadasChamada);

    const exemplos = elemento("div", "regras-exemplos");
    exemplos.append(
      this.exemplo("vale", r.ligadasVale, [
        [undefined, undefined],
        [2, 5],
      ]),
      this.exemplo("nao", r.ligadasNaoVale, [
        [undefined, 5],
        [2, undefined],
      ]),
    );

    el.appendChild(exemplos);
    el.appendChild(this.paragrafo(r.ligadasTexto));

    return el;
  }

  private depois(): HTMLElement {
    const r = t().comoJogar;
    const el = this.seccao(r.depois, r.depoisChamada);

    el.appendChild(this.paragrafo(r.depoisColunas));
    el.appendChild(this.paragrafo(r.depoisGrupos));

    return el;
  }

  private joker(opcoes: OpcoesComoJogar): HTMLElement {
    const r = t().comoJogar;
    const el = this.seccao(r.joker, [
      r.jokerChamadaAntes,
      simboloJoker(r.jokerSimbolo),
      r.jokerChamadaDepois,
    ]);

    const linha = elemento("p", "regras-conta");
    linha.appendChild(pecaDeAmostra(0, this.modo));
    linha.appendChild(elemento("span", "regras-conta-nota", r.jokerNota));
    el.appendChild(linha);

    el.appendChild(this.paragrafo(r.jokerSozinho));
    el.appendChild(this.paragrafo(r.jokerValor));

    if (opcoes.aoVerTutorialDoJoker !== undefined) {
      el.appendChild(botao(r.jokerTutorial, undefined, opcoes.aoVerTutorialDoJoker));
    }

    return el;
  }

  /**
   * As soldas: o mesmo par de exemplos da adjacência, porque a pergunta é a
   * mesma — que grupos valem —, e a resposta lê-se melhor em peças.
   */
  private soldas(): HTMLElement {
    const r = t().comoJogar;
    const el = this.seccao(r.soldas, r.soldasChamada);

    const exemplos = elemento("div", "regras-exemplos");
    exemplos.append(
      this.exemplo("vale", r.soldasVale, [
        [soldadaCima(2), undefined],
        [soldadaBaixo(1), 4],
      ]),
      this.exemplo("nao", r.soldasNaoVale, [
        [soldadaCima(2), 5],
        [soldadaBaixo(1), undefined],
      ]),
    );

    el.appendChild(exemplos);
    el.appendChild(this.paragrafo(r.soldasTexto));

    return el;
  }

  private gelo(): HTMLElement {
    const r = t().comoJogar;
    const el = this.seccao(r.gelo, r.geloChamada);

    const exemplos = elemento("div", "regras-exemplos");
    exemplos.append(
      this.exemplo("vale", r.geloVale, [
        [undefined, undefined],
        [gelada(5), 2],
      ]),
      this.exemplo("nao", r.geloNaoVale, [
        [1, undefined],
        [gelada(5), 1],
      ]),
    );

    el.appendChild(exemplos);
    el.appendChild(this.paragrafo(r.geloTexto));
    el.appendChild(this.paragrafo(r.geloOnde));

    return el;
  }

  /**
   * A bomba é a única peça especial com castigo, e o castigo muda com o modo —
   * cada modo pune na sua moeda (`bomba.ts`). Diz-se uma vez cada um, em vez
   * de deixar o jogador descobri-lo a perder.
   */
  private bomba(): HTMLElement {
    const r = t().comoJogar;
    const el = this.seccao(r.bomba, r.bombaChamada);

    const linha = elemento("p", "regras-conta regras-bomba");
    linha.appendChild(this.pecaComBomba(4));
    linha.appendChild(elemento("span", "regras-conta-nota", r.bombaNota));
    el.appendChild(linha);

    el.appendChild(this.paragrafo(r.bombaDesarmar));
    el.appendChild(this.paragrafo(r.bombaCastigo(CASTIGO_BOMBA_S)));
    el.appendChild(this.paragrafo(r.bombaQuando));

    return el;
  }

  private selos(): HTMLElement {
    const r = t().comoJogar;
    const el = this.seccao(r.selos, r.selosChamada);

    const lista = elemento("ul", "regras-selos");
    for (const selo of SELOS) {
      const li = document.createElement("li");
      li.appendChild(elemento("span", "regras-selo-glifo", selo.glifo));

      const texto = elemento("div");
      texto.append(
        elemento("b", undefined, t().puzzle.selos[selo.selo]),
        elemento("span", "regras-selo-texto", r.selosTextos[selo.selo]),
      );

      li.appendChild(texto);
      lista.appendChild(li);
    }

    el.appendChild(lista);
    el.appendChild(this.paragrafo(r.selosNuncaDescem));

    return el;
  }

  private modos(): HTMLElement {
    const r = t().comoJogar;
    const el = this.seccao(r.modos);

    const lista = elemento("ul", "regras-modos");
    const m = t().modos;
    const entradas: readonly (readonly [string, string])[] = [
      [m.puzzles, r.modoPuzzles],
      [m.tempo, r.modoTempo(SALTAR_S)],
      [m.survival, r.modoSurvival],
      [m.desafio, r.modoDesafio],
    ];

    for (const [nome, texto] of entradas) {
      const li = document.createElement("li");
      li.append(elemento("b", undefined, nome), elemento("span", undefined, texto));
      lista.appendChild(li);
    }

    el.appendChild(lista);
    return el;
  }

  /* ─── As peças de que as secções são feitas ─────────────────────────────── */

  /** A chamada pode trazer o símbolo do joker no meio, e por isso aceita nós. */
  private seccao(
    titulo: string,
    chamada?: string | readonly (string | Node)[],
  ): HTMLElement {
    const el = elemento("section", "regra");
    el.appendChild(elemento("h2", undefined, titulo));
    if (chamada !== undefined) {
      const p = elemento("p", "regra-chamada");
      p.append(...(typeof chamada === "string" ? [chamada] : chamada));
      el.appendChild(p);
    }
    return el;
  }

  private paragrafo(texto: string): HTMLElement {
    return elemento("p", "regra-texto", texto);
  }

  /** Uma peça de amostra, com as marcas que tiver. */
  private amostra(casa: Exclude<Casa, undefined>): HTMLElement {
    if (typeof casa === "number") return pecaDeAmostra(casa, this.modo);

    const el = pecaDeAmostra(casa.valor, this.modo);
    el.classList.add(...casa.marcas);
    return el;
  }

  /**
   * A peça-bomba parada: o pavio a meio, e sem arder.
   *
   * No tabuleiro o pavio pulsa para chamar o olho, porque há pressa. Aqui não
   * há pressa nenhuma, e uma peça a pulsar ao lado de um texto que se está a
   * ler só distrai — o CSS desliga-lhe o pulso (`.amostra .pavio`).
   */
  private pecaComBomba(valor: Cell): HTMLElement {
    const el = pecaDeAmostra(valor, this.modo);
    el.classList.add("bomba");
    el.style.setProperty("--pavio", "0.6");

    const pavio = elemento("span", "pavio", "6");
    pavio.setAttribute("aria-hidden", "true");
    el.appendChild(pavio);
    return el;
  }

  /** `3 + 4 = 7`, com as peças a sério. */
  private conta(valores: readonly Cell[]): HTMLElement {
    const el = elemento("p", "regras-conta");

    valores.forEach((v, i) => {
      if (i > 0) el.appendChild(elemento("span", "regras-sinal", "+"));
      el.appendChild(pecaDeAmostra(v, this.modo));
    });

    el.append(
      elemento("span", "regras-sinal", "="),
      elemento("span", "regras-sete", "7"),
    );

    return el;
  }

  /**
   * Um exemplo de duas peças numa grelha de 2×2, com as casas vazias a contar.
   *
   * A grelha é o que torna o «não vale» legível: sem as duas casas vazias, duas
   * peças em diagonal leem-se como duas peças soltas, e o que se quer mostrar é
   * precisamente que elas estão **no tabuleiro** e mesmo assim não ligam.
   */
  private exemplo(
    veredito: string,
    rotulo: string,
    linhas: readonly (readonly Casa[])[],
  ): HTMLElement {
    const el = elemento("figure", "regras-exemplo");
    el.dataset["veredito"] = veredito;

    const grelha = elemento("div", "regras-grelha");
    for (const linha of linhas) {
      for (const valor of linha) {
        grelha.appendChild(
          valor === undefined
            ? elemento("span", "regras-vazio")
            : this.amostra(valor),
        );
      }
    }

    el.append(grelha, elemento("figcaption", undefined, rotulo));
    return el;
  }
}
