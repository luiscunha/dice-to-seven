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
 * O joker e os selos vêm no fim, porque nenhum dos dois é preciso para jogar o
 * primeiro nível.
 */

import type { Cell } from "@dicetoseven/engine";

import type { ModoFace } from "./dice";
import { pecaDeAmostra } from "./dice";
import { botao, cabecalho, elemento } from "./dom";

export interface OpcoesComoJogar {
  readonly aoVoltar: () => void;
  /** Abre o tutorial do joker por cima deste ecrã. */
  readonly aoVerTutorialDoJoker?: () => void;
  readonly modoFace?: ModoFace;
}

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
        "A soma vai aparecendo em baixo à medida que tocas. Quando chega a 7, " +
          "as peças saem sozinhas. Se passares de 7 a jogada não entra — e " +
          "tocar outra vez numa peça já escolhida tira-a da conta.",
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
    const el = this.seccao(
      "O joker",
      "A peça cinzenta com um ✳. Há no máximo uma por tabuleiro.",
    );

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
    const el = this.seccao("Os três modos");

    const lista = elemento("ul", "regras-modos");
    const entradas: readonly (readonly [string, string])[] = [
      [
        "Puzzles",
        "A campanha. Tabuleiros feitos à mão pelo gerador, sempre com solução, do mais fácil ao mais difícil.",
      ],
      [
        "Contra-Relógio",
        "Um relógio só, que nunca pára. Cada tabuleiro limpo dá tempo de volta, e os tabuleiros vão crescendo.",
      ],
      [
        "Survival",
        "De vez em quando entra uma linha nova por baixo. Vês qual é antes de ela cair; acaba quando a pilha chega ao teto.",
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

  private seccao(titulo: string, chamada?: string): HTMLElement {
    const el = elemento("section", "regra");
    el.appendChild(elemento("h2", undefined, titulo));
    if (chamada !== undefined) {
      el.appendChild(elemento("p", "regra-chamada", chamada));
    }
    return el;
  }

  private paragrafo(texto: string): HTMLElement {
    return elemento("p", "regra-texto", texto);
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
    linhas: readonly (readonly (Cell | undefined)[])[],
  ): HTMLElement {
    const el = elemento("figure", "regras-exemplo");
    el.dataset["veredito"] = veredito;

    const grelha = elemento("div", "regras-grelha");
    for (const linha of linhas) {
      for (const valor of linha) {
        grelha.appendChild(
          valor === undefined
            ? elemento("span", "regras-vazio")
            : pecaDeAmostra(valor, this.modo),
        );
      }
    }

    el.append(grelha, elemento("figcaption", undefined, rotulo));
    return el;
  }
}
