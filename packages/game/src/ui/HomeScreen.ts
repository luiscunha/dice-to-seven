/**
 * A Home: os três modos, as regras e as definições.
 *
 * É o único ecrã sem seta de voltar, e o único que mostra o nome do jogo. Tudo
 * o resto é uma escolha entre três coisas — e três coisas não precisam de mapa,
 * de metáfora, nem de arte que envelhece (desenho §5.6).
 *
 * **Quem joga está no rodapé, não na barra.** O avatar e o nome não são enfeite
 * nem conta: são o sítio onde o jogo reconhece a pessoa que o abriu, e o único
 * do jogo inteiro que ela escolhe. Estiveram na barra de cima e partilhavam-na
 * com o nome do jogo — dois rótulos a disputar a mesma linha, e um nome comprido
 * cortava os dois com reticências. Em baixo tem a largura toda, fica na zona do
 * polegar, e lê-se como assinatura: *este jogo é jogado por esta pessoa*. Quem
 * não se nomeou vê um convite esmorecido, e o convite é o próprio botão —
 * ninguém é baptizado à revelia com um «Jogador» que tem género.
 *
 * **A marca ocupa a barra de cima por inteiro.** Era um bloco centrado com o
 * símbolo grande, o nome e o lema, e ocupava o terço superior do ecrã a dizer ao
 * jogador o nome da aplicação que ele acabou de abrir. Numa barra, diz o mesmo
 * em 44px de altura — e o que sobra é dos modos, que são a razão de alguém estar
 * aqui. O que ganhou com a mudança foi largura: o nome passou a caber inteiro,
 * e com ele a pinta que lhe faz de «o».
 *
 * **Os três modos não são três linhas iguais.** Os Puzzles são a campanha, têm
 * 143 níveis e progresso para contar: ficam com um cartão largo. O
 * Contra-Relógio e o Survival são uma corrida cada um, sem estado interno a
 * mostrar além do recorde: ficam com dois mosaicos lado a lado. A diferença de
 * tamanho é a hierarquia — quem abre o jogo pela primeira vez vai para os
 * Puzzles, e a Home tem de o dizer sem uma palavra.
 *
 * **Cada modo tem a cor de uma face** (`theme.css`, "Os três modos"). Faces 6, 4
 * e 2, espaçadas na rampa: escura, média, clara. Não é enfeite — é o
 * vocabulário de cor do tabuleiro a estrear-se no primeiro ecrã, e é o que
 * impede a Home de derivar para cores que não existem no jogo.
 *
 * O progresso aparece aqui em números e não em barras, e **dentro do cartão do
 * modo a que pertence**. Quem não jogou nada não vê zeros a acusá-lo — o número
 * só aparece quando há o que contar.
 *
 * **As definições ficam no canto de cima.** São a ação menos frequente da Home,
 * e o fundo de um telemóvel é a zona do polegar — o sítio mais caro do ecrã.
 */

import type { Cell } from "@dicetoseven/engine";

import type { Profile } from "../session/progress";
import type { ModoFace } from "./dice";
import { pecaDeAmostra } from "./dice";
import { botao, botaoRedondo, elemento } from "./dom";
import {
  iconeCronometro,
  iconeDefinicoes,
  iconePuzzles,
  iconeRegras,
  iconeSeguir,
  iconeSurvival,
} from "./icones";

export interface OpcoesHome {
  readonly aoEscolherNiveis: () => void;
  readonly aoEscolherTempo: () => void;
  readonly aoEscolherSurvival: () => void;
  readonly aoEscolherDefinicoes: () => void;
  /** O ecrã das regras, pelo cartão do fundo. */
  readonly aoEscolherComoJogar?: () => void;
  /** Abre o editor do nome e do avatar. */
  readonly aoEditarPerfil?: () => void;
  /** O nome do jogador, ou vazio — ver `Settings.nome`. */
  readonly nome?: string;
  /** A face que ele escolheu para avatar. */
  readonly avatar?: Cell;
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
  readonly modoFace?: ModoFace;
}

export class HomeScreen {
  private readonly raiz: HTMLElement;

  constructor(host: HTMLElement, opcoes: OpcoesHome) {
    this.raiz = elemento("div", "ecra home");

    const modos = elemento("nav", "home-modos");
    modos.setAttribute("aria-label", "modos de jogo");
    modos.append(
      this.cartaoLargo({
        icone: iconePuzzles(),
        titulo: "Puzzles",
        legenda: "A campanha, capítulo a capítulo",
        estado: this.estadoPuzzles(opcoes),
        aoClicar: opcoes.aoEscolherNiveis,
      }),
      this.mosaico(opcoes),
    );

    const lema = elemento("p", "home-lema");
    lema.append(
      elemento("b", "home-lema-forte", "O teu objetivo é simples: Somar 7."),
      " A execução é o verdadeiro desafio.",
    );

    this.raiz.append(
      this.barra(opcoes),
      lema,
      modos,
      this.ajuda(opcoes),
      this.rodape(opcoes),
    );

    host.replaceChildren(this.raiz);
  }

  destruir(): void {
    this.raiz.remove();
  }

  /* ─── A barra ───────────────────────────────────────────────────────────── */

  /**
   * A marca à esquerda, as definições à direita.
   *
   * O símbolo e o nome do jogo vão dentro do mesmo elemento e não em dois: são
   * uma coisa só a olhar, e separá-los deixava o nome a escorregar num ecrã
   * estreito enquanto o símbolo ficava.
   */
  private barra(opcoes: OpcoesHome): HTMLElement {
    const barra = elemento("header", "home-barra");

    const marca = elemento("div", "home-marca");
    marca.append(this.simbolo(), this.wordmark());

    barra.append(
      marca,
      botaoRedondo(iconeDefinicoes(), "Definições", opcoes.aoEscolherDefinicoes),
    );

    return barra;
  }

  /**
   * O nome do jogo, com uma **peça** no lugar do «o» de «To».
   *
   * A palavra estava escrita como qualquer outro título e não dizia nada sobre
   * o jogo. A peça diz: é a face 1 — quadrado arredondado, uma pinta ao centro —
   * com as cores que a rampa já tem, e é o vocabulário do tabuleiro a aparecer
   * na única palavra do ecrã que não é uma instrução. Custa um `span` e não há
   * arte nova a manter.
   *
   * Foi primeiro só a pinta, sem o quadrado à volta. Lia-se como «o» e mais
   * nada; com a peça inteira lê-se como «o» **e** como dado, que era o ponto.
   *
   * **O «o» continua no DOM**, apenas invisível, e a peça é `aria-hidden`.
   * Quem lê pelo ecrã ouve «DiceToSeven» inteiro; quem o vê lê o mesmo, porque
   * um quadrado com uma pinta ao centro, à altura do x, ocupa o lugar do «o» e
   * é isso que o olho completa. Trocar o caráter por um desenho sem deixar o
   * caráter lá seria uma marca que não se consegue soletrar — nem copiar, nem
   * procurar.
   *
   * O «To» inteiro vai destacado, porque o nome do jogo é uma conta e a
   * preposição é a única parte que o diz: dados **para** sete.
   */
  private wordmark(): HTMLElement {
    const h = elemento("h1", "home-titulo");

    const peca = elemento("span", "home-titulo-peca");
    peca.setAttribute("aria-hidden", "true");

    const liga = elemento("span", "home-titulo-liga");
    liga.append("T", peca, elemento("span", "home-titulo-o", "o"));

    h.append("Dice", liga, "Seven");
    return h;
  }

  /* ─── O rodapé ──────────────────────────────────────────────────────────── */

  /**
   * Quem está a jogar, no fundo do ecrã.
   *
   * No fundo e não na barra de cima porque a barra é partilhada com o nome do
   * jogo: dois rótulos de comprimento livre na mesma linha, e um nome de dez
   * letras cortava os dois. Aqui tem a largura toda para si — e é onde o polegar
   * já está, o que é o sítio certo para a única coisa da Home que se personaliza.
   */
  private rodape(opcoes: OpcoesHome): HTMLElement {
    const el = elemento("footer", "home-rodape");
    el.appendChild(this.jogador(opcoes));
    return el;
  }

  /**
   * Quem está a jogar: o avatar e o nome, num botão que abre o editor.
   *
   * **Sem nome é o estado normal**, não um erro: o jogo não pede nada a ninguém
   * para deixar jogar. O botão mostra então o convite, esmorecido — e o convite
   * é o próprio sítio onde se responde, que é a forma mais barata de o explicar.
   *
   * O `aria-label` diz sempre o que o botão faz, com ou sem nome. Quem ouve o
   * ecrã não pode ficar com «✳ Rita» e ter de adivinhar que aquilo se toca.
   */
  private jogador(opcoes: OpcoesHome): HTMLElement {
    const nome = opcoes.nome ?? "";

    const b = botao("", "home-jogador", opcoes.aoEditarPerfil);
    b.setAttribute(
      "aria-label",
      nome === "" ? "escolher nome e avatar" : `${nome} — mudar nome e avatar`,
    );

    const avatar = elemento("span", "home-avatar");
    avatar.appendChild(pecaDeAmostra(opcoes.avatar ?? 6, opcoes.modoFace ?? "pintas"));

    /*
     * «Quem és?» e não «Dá-te um nome»: é a mesma pergunta que o campo do editor
     * faz em seguida, palavra por palavra, e repeti-la é o que faz o toque
     * parecer uma resposta em vez de um formulário novo.
     */
    const etiqueta = elemento(
      "span",
      "home-jogador-nome",
      nome === "" ? "Quem és?" : nome,
    );
    if (nome === "") etiqueta.dataset["convite"] = "sim";

    b.append(avatar, etiqueta);
    return b;
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

  /* ─── Os modos ──────────────────────────────────────────────────────────── */

  /**
   * O cartão dos Puzzles: ícone, nome, uma linha a dizer o que é, e o estado.
   *
   * O estado é o número que interessa **a quem volta** — quanto já fez, quantos
   * já são perfeitos. Fica à direita do nome e não por baixo da legenda, para
   * que a legenda se leia como descrição e o número se leia como número.
   */
  private cartaoLargo(c: {
    readonly icone: SVGElement;
    readonly titulo: string;
    readonly legenda: string;
    readonly estado: string | undefined;
    readonly aoClicar: () => void;
  }): HTMLElement {
    const b = this.botaoDeModo("home-modo primario", "puzzles", c.aoClicar);

    const icone = elemento("span", "home-modo-icone");
    icone.appendChild(c.icone);

    const cabeca = elemento("span", "home-modo-cabeca");
    cabeca.appendChild(elemento("span", "home-modo-titulo", c.titulo));
    if (c.estado !== undefined) {
      cabeca.appendChild(elemento("span", "home-modo-estado", c.estado));
    }

    const texto = elemento("span", "home-modo-texto");
    texto.append(cabeca, elemento("span", "home-modo-legenda", c.legenda));

    b.append(icone, texto, iconeSeguir());
    return b;
  }

  /**
   * Os dois modos de corrida, lado a lado.
   *
   * Lado a lado e não empilhados porque são **alternativas**, não uma lista: um
   * relógio que conta para baixo ou uma linha que sobe, e escolhe-se um dos
   * dois. Empilhados liam-se como o segundo e o terceiro passos de um caminho
   * que começava nos Puzzles.
   */
  private mosaico(opcoes: OpcoesHome): HTMLElement {
    const el = elemento("div", "home-mosaico");

    el.append(
      this.mosaicoDeModo({
        cor: "tempo",
        icone: iconeCronometro(),
        titulo: "Contra-Relógio",
        estado:
          opcoes.perfil.bestTimeAttackScore > 0
            ? `Recorde ${String(opcoes.perfil.bestTimeAttackScore)}`
            : undefined,
        aoClicar: opcoes.aoEscolherTempo,
      }),
      this.mosaicoDeModo({
        cor: "survival",
        icone: iconeSurvival(),
        titulo: "Survival",
        ...this.estadoSurvival(opcoes),
        aoClicar: opcoes.aoEscolherSurvival,
      }),
    );

    return el;
  }

  /**
   * Um mosaico: o ícone em cima, o nome em baixo, o estado por último.
   *
   * De cima para baixo e não numa linha, porque o mosaico tem metade da largura
   * do cartão dos Puzzles — «Contra-Relógio» ao lado de um ícone de 44px não
   * cabia em 375px sem hifenizar. E é a ordem em que se lê: o desenho encontra
   * o modo, o nome confirma-o, o número é para quem voltou.
   *
   * **Sem legenda**, ao contrário do cartão largo. Numa coluna de 160px, uma
   * linha de descrição são três linhas de texto pequeno em cima do número que
   * interessa — e o que ela diria está dito por inteiro no ecrã das regras, que
   * é onde alguém vai quando quer saber o que os modos são.
   */
  private mosaicoDeModo(c: {
    readonly cor: string;
    readonly icone: SVGElement;
    readonly titulo: string;
    readonly estado: string | undefined;
    readonly aoMeio?: boolean;
    readonly aoClicar: () => void;
  }): HTMLElement {
    const b = this.botaoDeModo("home-modo compacto", c.cor, c.aoClicar);

    const icone = elemento("span", "home-modo-icone");
    icone.appendChild(c.icone);

    const texto = elemento("span", "home-modo-texto");
    texto.appendChild(elemento("span", "home-modo-titulo", c.titulo));

    b.append(icone, texto);

    if (c.estado !== undefined) {
      const estado = elemento("span", "home-modo-estado", c.estado);
      if (c.aoMeio === true) estado.dataset["aMeio"] = "sim";
      b.appendChild(estado);
    }

    return b;
  }

  /**
   * O botão por baixo de qualquer cartão de modo.
   *
   * `data-modo` e não uma classe por cor: a cor é o modo, e é o `theme.css` que
   * decide qual — aqui só se diz de que modo se trata.
   */
  private botaoDeModo(
    classe: string,
    modo: string,
    aoClicar: () => void,
  ): HTMLButtonElement {
    const b = document.createElement("button");
    b.type = "button";
    b.className = classe;
    b.dataset["modo"] = modo;
    b.addEventListener("click", aoClicar);
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

    /*
     * O maior tempo aguentado. Era o tempo da melhor **limpeza**, e esse ficava
     * quieto na maioria das corridas, porque a maioria transborda — ver
     * `recordSurvival`.
     */
    if (opcoes.perfil.bestSurvivalMs > 0) {
      return { estado: `Melhor ${opcoes.melhorTempoSurvival}` };
    }

    return { estado: undefined };
  }

  /* ─── As regras ─────────────────────────────────────────────────────────── */

  /**
   * O cartão das regras, no fundo.
   *
   * **A regra inteira está impressa no cartão**, em peças: um 3, um 4 e o 7 que
   * eles fazem. É o jogo todo numa linha, e quem a percebe aqui já não precisa
   * de entrar — que é o melhor desfecho possível para um botão de ajuda.
   *
   * O cartão é a superfície neutra, com borda, e a cor vem só das peças e do
   * número. A alternativa que se recusou foi um painel escuro com dados a
   * brilhar: a direção de arte não tem néon, e um cartão que grita ao lado dos
   * modos rouba-lhes o olho para a única coisa da Home que não é jogar.
   */
  private ajuda(opcoes: OpcoesHome): HTMLElement {
    const el = elemento("section", "home-ajuda");
    el.setAttribute("aria-labelledby", "home-ajuda-titulo");

    const conta = elemento("p", "home-ajuda-conta");
    conta.append(
      pecaDeAmostra(3, opcoes.modoFace ?? "pintas"),
      elemento("span", "home-ajuda-sinal", "+"),
      pecaDeAmostra(4, opcoes.modoFace ?? "pintas"),
      elemento("span", "home-ajuda-sinal", "="),
      elemento("span", "home-ajuda-sete", "7"),
    );

    const titulo = elemento("h2", "home-ajuda-titulo", "Como jogar?");
    titulo.id = "home-ajuda-titulo";

    const b = botao("Ler as regras", "com-icone", opcoes.aoEscolherComoJogar);
    b.prepend(iconeRegras());

    el.append(
      conta,
      titulo,
      elemento(
        "p",
        "home-ajuda-texto",
        "Junta peças encostadas até somarem 7. Em meio minuto sabes tudo.",
      ),
      b,
    );

    return el;
  }
}
