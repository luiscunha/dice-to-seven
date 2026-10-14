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

/** Os três selos, na ordem em que valem. */
const SELOS: readonly {
  readonly glifo: string;
  readonly nome: string;
  readonly texto: string;
}[] = [
  {
    glifo: "★",
    nome: "Perfeito",
    texto: "Limpaste o nível sem desfazer, sem reiniciar e sem pedir dicas.",
  },
  {
    glifo: "◆",
    nome: "Limpo",
    texto: "Limpaste o nível de uma assentada, mas com uma ou mais dicas.",
  },
  {
    glifo: "●",
    nome: "Concluído",
    texto: "Limpaste o nível, com desfazer ou depois de reiniciar.",
  },
];

export class ComoJogarScreen {
  private readonly raiz: HTMLElement;
  private readonly modo: ModoFace;

  constructor(host: HTMLElement, opcoes: OpcoesComoJogar) {
    this.modo = opcoes.modoFace ?? "pintas";
    this.raiz = elemento("div", "ecra");

    const { el: topo } = cabecalho("Como jogar", opcoes.aoVoltar);

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
    const el = this.seccao("O objetivo", "Esvaziar o tabuleiro.");
    el.appendChild(
      this.paragrafo(
        "Não há pontos a fazer nem tempo a bater nos Puzzles: um nível acaba " +
          "quando não sobra uma peça. E todos os níveis que o jogo publica têm " +
          "solução — se ficaste encravado, foi de um caminho, não do nível.",
      ),
    );
    return el;
  }

  private jogada(): HTMLElement {
    const el = this.seccao(
      "Uma jogada",
      "Toca em peças encostadas até somarem exatamente 7.",
    );

    el.appendChild(this.conta([3, 4]));
    el.appendChild(
      this.paragrafo(
        "As peças que tocas ficam marcadas. Quando somarem 7, saem sozinhas. " +
          "Se passares de 7 a jogada não entra — e tocar outra vez numa peça " +
          "já escolhida tira-a da conta.",
      ),
    );
    el.appendChild(
      this.paragrafo(
        "Um grupo tem no máximo sete peças, que é o que dá juntar sete faces " +
          "de 1.",
      ),
    );

    return el;
  }

  /**
   * A regra que toda a gente pergunta. Um exemplo que vale e um que não vale,
   * lado a lado — a diagonal explica-se pior em palavras do que em duas peças.
   */
  private ligadas(): HTMLElement {
    const el = this.seccao(
      "Encostadas, não em diagonal",
      "Duas peças estão ligadas se partilham um lado.",
    );

    const exemplos = elemento("div", "regras-exemplos");
    exemplos.append(
      this.exemplo("vale", "Vale: partilham um lado", [
        [undefined, undefined],
        [2, 5],
      ]),
      this.exemplo("nao", "Não vale: só se tocam no canto", [
        [undefined, 5],
        [2, undefined],
      ]),
    );

    el.appendChild(exemplos);
    el.appendChild(
      this.paragrafo(
        "O grupo todo tem de estar ligado — cada peça encostada a outra do " +
          "grupo. Em L, em T ou em linha: a forma não interessa, a ligação sim.",
      ),
    );

    return el;
  }

  private depois(): HTMLElement {
    const el = this.seccao(
      "O que acontece a seguir",
      "As peças de cima descem, e as colunas vazias desaparecem.",
    );

    el.appendChild(
      this.paragrafo(
        "As colunas que ficam vazias fecham-se para a esquerda, e as que " +
          "estavam de cada lado passam a ser vizinhas. É aqui que nascem " +
          "quase todos os grupos que não estavam lá antes.",
      ),
    );
    el.appendChild(
      this.paragrafo(
        "Grupos novos que se formem ficam disponíveis, mas não saem sozinhos: " +
          "só desaparecem se os escolheres. O jogo nunca joga por ti — seguir " +
          "um caminho que não escolheste podia deixar o tabuleiro sem saída.",
      ),
    );

    return el;
  }

  private joker(opcoes: OpcoesComoJogar): HTMLElement {
    const el = this.seccao("O joker", [
      "A peça cinzenta com um ",
      simboloJoker("asterisco verde"),
      ". Há no máximo uma por tabuleiro.",
    ]);

    const linha = elemento("p", "regras-conta");
    linha.appendChild(pecaDeAmostra(0, this.modo));
    linha.appendChild(
      elemento(
        "span",
        "regras-conta-nota",
        "Toca nele para lhe dares um valor de 1 a 6.",
      ),
    );
    el.appendChild(linha);

    el.appendChild(
      this.paragrafo(
        "O joker nunca forma grupo sozinho: entra sempre com peças fixas, e " +
          "vale o que falta para elas chegarem a 7.",
      ),
    );
    el.appendChild(
      this.paragrafo(
        "Só um dos seis valores esvazia o tabuleiro, e o jogo deixa-te " +
          "escolher outro sem avisar. O tabuleiro não morre logo — falha no " +
          "fim, com peças a sobrar.",
      ),
    );

    if (opcoes.aoVerTutorialDoJoker !== undefined) {
      el.appendChild(
        botao("Ver o tutorial do joker", undefined, opcoes.aoVerTutorialDoJoker),
      );
    }

    return el;
  }

  /**
   * As soldas: o mesmo par de exemplos da adjacência, porque a pergunta é a
   * mesma — que grupos valem —, e a resposta lê-se melhor em peças.
   */
  private soldas(): HTMLElement {
    const el = this.seccao(
      "As soldas",
      "Duas peças unidas por um grampo saem juntas, ou não sai nenhuma.",
    );

    const exemplos = elemento("div", "regras-exemplos");
    exemplos.append(
      this.exemplo("vale", "Vale: 2 + 1 + 4, o par todo", [
        [soldadaCima(2), undefined],
        [soldadaBaixo(1), 4],
      ]),
      this.exemplo("nao", "Não vale: 2 + 5 deixa o 1 para trás", [
        [soldadaCima(2), 5],
        [soldadaBaixo(1), undefined],
      ]),
    );

    el.appendChild(exemplos);
    el.appendChild(
      this.paragrafo(
        "As duas peças contam na soma. Uma solda nunca se parte: o par desce " +
          "junto até sair. Aparecem nos Puzzles, a partir do Avançado.",
      ),
    );

    return el;
  }

  private gelo(): HTMLElement {
    const el = this.seccao(
      "O gelo",
      "Uma peça gelada só sai a par: com uma única peça, que não esteja gelada.",
    );

    const exemplos = elemento("div", "regras-exemplos");
    exemplos.append(
      this.exemplo("vale", "Vale: 5 + 2, a par", [
        [undefined, undefined],
        [gelada(5), 2],
      ]),
      this.exemplo("nao", "Não vale: 5 + 1 + 1", [
        [1, undefined],
        [gelada(5), 1],
      ]),
    );

    el.appendChild(exemplos);
    el.appendChild(
      this.paragrafo(
        "Duas peças geladas também não saem juntas, mesmo que somem 7. O gelo " +
          "não derrete: a peça que solta a gelada vale ouro, e gastá-la noutra " +
          "jogada pode deixar a gelada presa.",
      ),
    );
    el.appendChild(
      this.paragrafo(
        "Aparece nos Puzzles Perito e no Contra-Relógio, a partir do sétimo " +
          "tabuleiro.",
      ),
    );

    return el;
  }

  /**
   * A bomba é a única peça especial com castigo, e o castigo muda com o modo —
   * cada modo pune na sua moeda (`bomba.ts`). Diz-se uma vez cada um, em vez
   * de deixar o jogador descobri-lo a perder.
   */
  private bomba(): HTMLElement {
    const el = this.seccao(
      "A bomba",
      "Uma peça com pavio. Tira-a numa jogada antes de ele acabar.",
    );

    const linha = elemento("p", "regras-conta regras-bomba");
    linha.appendChild(this.pecaComBomba(4));
    linha.appendChild(
      elemento(
        "span",
        "regras-conta-nota",
        "O número no pavio são os segundos que faltam.",
      ),
    );
    el.appendChild(linha);

    el.appendChild(
      this.paragrafo(
        "Para a desarmar, basta que ela entre num grupo de 7, como qualquer " +
          "outra peça. Se o pavio acabar, rebenta — e a peça fica no tabuleiro.",
      ),
    );
    el.appendChild(
      this.paragrafo(
        `No Contra-Relógio, rebentar custa ${String(CASTIGO_BOMBA_S)} segundos. ` +
          "No Survival, cai mais uma linha, e as peças encostadas à bomba " +
          "sobem um ponto: um 1 passa a 2, e um 6 fica 6.",
      ),
    );
    el.appendChild(
      this.paragrafo(
        "Há uma bomba de cada vez. No Contra-Relógio pode aparecer a partir do " +
          "quarto tabuleiro. No Survival vês na linha seguinte se ela traz " +
          "bomba — e mais à frente há bombas que se acendem numa peça que já " +
          "está na pilha.",
      ),
    );

    return el;
  }

  private selos(): HTMLElement {
    const el = this.seccao(
      "Os selos",
      "Cada nível guarda o melhor selo que já lhe deste.",
    );

    const lista = elemento("ul", "regras-selos");
    for (const selo of SELOS) {
      const li = document.createElement("li");
      li.appendChild(elemento("span", "regras-selo-glifo", selo.glifo));

      const texto = elemento("div");
      texto.append(
        elemento("b", undefined, selo.nome),
        elemento("span", "regras-selo-texto", selo.texto),
      );

      li.appendChild(texto);
      lista.appendChild(li);
    }

    el.appendChild(lista);
    el.appendChild(
      this.paragrafo(
        "Um selo nunca desce: voltar a um nível só pode melhorá-lo.",
      ),
    );

    return el;
  }

  private modos(): HTMLElement {
    const el = this.seccao("Os modos");

    const lista = elemento("ul", "regras-modos");
    const entradas: readonly (readonly [string, string])[] = [
      [
        "Puzzles",
        "A campanha. Tabuleiros feitos à mão pelo gerador, sempre com solução, do mais fácil ao mais difícil.",
      ],
      [
        "Contra-Relógio",
        "Um relógio só, que nunca pára. Cada tabuleiro limpo dá tempo de volta, mas cada vez menos, e os tabuleiros vão crescendo. Uma peça que passe de 7 custa tempo. E cuidado com as bombas: tira-as antes de o pavio acabar. Do sétimo tabuleiro em diante, um tabuleiro pode ficar sem jogadas: aí salta-o, por 10 segundos. E aparecem peças geladas, que só saem a par com uma peça que não esteja gelada.",
      ],
      [
        "Survival",
        "De vez em quando cai uma linha nova por cima. Vês qual é antes de ela cair; acaba quando a pilha chega ao teto. Se ficares sem jogadas, a linha cai logo; se passares de 7, chega 3 segundos mais cedo. Algumas linhas trazem uma bomba: tira-a antes de o pavio acabar, ou cai mais uma linha e as peças à volta dela sobem um ponto. Mais à frente, há bombas que se acendem numa peça já na pilha: desenterra-a a tempo.",
      ],
      [
        "Desafio do dia",
        "Todos os dias, um desafio igual para toda a gente: um Puzzle, um Contra-Relógio ou um Survival, à vez. O trilho mostra o caminho — o que já fizeste e o que vem. O Puzzle e o Survival ficam feitos quando limpas o tabuleiro, e podes tentar até lá; no Contra-Relógio, conta a primeira corrida. Depois é treino, com os mesmos tabuleiros. No fim, partilha o resultado — e não deixes partir a sequência de dias. A sequência dá chaves (aos 3, 7, 14 e 30 dias): uma chave abre um desafio que ficou por jogar, ou salva a sequência se falhares um dia.",
      ],
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
