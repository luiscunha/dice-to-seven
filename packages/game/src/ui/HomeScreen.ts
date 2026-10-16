/**
 * A Home: os três modos, o desafio do dia, e o que é de quem joga.
 *
 * É o único ecrã sem seta de voltar, e o único que mostra o nome do jogo. Tudo
 * o resto é uma escolha entre três coisas — e três coisas não precisam de mapa,
 * de metáfora, nem de arte que envelhece (desenho §5.6).
 *
 * ── Quatro faixas, e cada uma com um trabalho ──
 *
 * A Home chegou a ter oito: a barra da marca, o lema, o título «Modos de jogo»,
 * o cartão dos Puzzles, os dois mosaicos, o desafio, o cartão das regras e o
 * rodapé de quem joga. Cada uma tinha a sua razão, e juntas eram um ecrã onde
 * tudo pedia para ser lido ao mesmo tempo. Ficaram quatro:
 *
 *   a barra    o que é de quem joga: o nome, as medalhas, as definições
 *   a marca    o nome do jogo, e a regra inteira por baixo dele
 *   os modos   o jogo
 *   o desafio  a razão de voltar amanhã
 *
 * **O que é de quem joga vive todo na barra de cima.** O jogador, as medalhas e
 * as definições estavam repartidos entre o canto de cima e um rodapé, e o rodapé
 * ocupava a zona do polegar — o sítio mais caro do ecrã — com as três coisas que
 * menos se tocam. A mesma razão que já tinha posto as definições no canto vale
 * para as outras duas: são consultas, não jogo. É também a convenção de todos os
 * jogos de telemóvel — o retrato num canto, os troféus e a roda dentada no
 * outro —, e uma convenção não se aprende.
 *
 * Estiveram juntos na barra uma vez, e saíram porque o nome do jogador e o nome
 * do jogo disputavam a mesma linha. Agora não disputam: **o nome do jogo tem uma
 * faixa sua**, centrada, e a barra é só de quem joga.
 *
 * **A regra substitui o lema e o cartão das regras.** Os dois diziam o mesmo —
 * o lema por palavras, o cartão em peças — e os dois eram para quem chega pela
 * primeira vez, a ocupar espaço a quem já sabe. Fica uma linha só por baixo do
 * nome: 3 + 4 = 7 em peças, e «Como jogar?» ao lado. Lê-se como subtítulo do
 * jogo, e toca-se para as regras inteiras.
 *
 * **O espaço que sobra fica por cima dos cartões, à volta da marca.** Os modos
 * e o desafio assentam em baixo, onde o polegar chega sem esticar; num ecrã
 * alto, é a marca que ganha ar, e não os cartões que esticam até virar painéis.
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
 * **Sem setas nos cartões.** Um cartão com cor, sombra e ícone já se lê como
 * coisa que se toca; a seta à direita é o idioma de uma lista de definições, e
 * num ecrã de jogo fazia-o parecer uma. Fica só na linha da regra, que é texto
 * sem cartão e precisa de dizer que leva a algum lado.
 *
 * **O Desafio do Dia é um cartão, e só um.** É a única coisa da Home que muda
 * todos os dias, e a razão de alguém a abrir amanhã — mas é um cartão entre os
 * outros, e não o ecrã. Diz o desafio de hoje, com o ícone e a cor do modo, e
 * em que pé está; o trilho dos dias vive no ecrã do desafio.
 */

import type { Cell } from "@dicetoseven/engine";

import { t } from "../i18n";
import type { ModoDoDesafio } from "../session/desafio";
import type { Profile } from "../session/progress";
import type { ModoFace } from "./dice";
import { pecaDeAmostra } from "./dice";
import { botao, botaoRedondo, elemento } from "./dom";
import {
  iconeCalendario,
  iconeCronometro,
  iconeDefinicoes,
  iconeMedalha,
  iconePuzzles,
  iconeSeguir,
  iconeSurvival,
} from "./icones";
import type { EstadoNoCartao } from "./DesafioScreen";
import { iconeDoModo, sinalDaSequencia, sinalDasChaves, sinalDeRisco } from "./DesafioScreen";
import { nomeDoModo } from "./partilha";

/**
 * O cartão do Desafio do Dia na Home: só o de hoje. O trilho dos dias vive
 * no ecrã do desafio (`DesafioScreen`).
 */
export interface ResumoDoDesafio {
  readonly numero: number;
  /** Já curta: «12 out». */
  readonly data: string;
  /** Dias seguidos com o desafio feito. */
  readonly sequencia: number;
  /**
   * Os dias seguidos que acabam hoje se ninguém fizer nada: ontem ficou por
   * jogar, e há uma chave para os salvar. O cartão avisa; o ecrã do desafio
   * pergunta.
   */
  readonly emRisco?: number;
  /** As chaves na carteira. */
  readonly chaves: number;
  /** O modo de hoje: um por dia, à vez. */
  readonly modo: ModoDoDesafio;
  readonly estado: EstadoNoCartao;
  readonly aoAbrir: () => void;
}

/** A entrada das medalhas, na barra. */
export interface ResumoDasMedalhas {
  readonly ganhas: number;
  readonly total: number;
  /** Há medalhas que a página ainda não mostrou: o ponto. */
  readonly novas: boolean;
  readonly aoAbrir: () => void;
}

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
  /** O Desafio do Dia. Sem isto, o cartão não aparece. */
  readonly desafio?: ResumoDoDesafio;
  /** As medalhas. Sem isto, a entrada não aparece. */
  readonly medalhas?: ResumoDasMedalhas;
}

export class HomeScreen {
  private readonly raiz: HTMLElement;

  constructor(host: HTMLElement, opcoes: OpcoesHome) {
    this.raiz = elemento("div", "ecra home");

    const modos = elemento("nav", "home-modos");
    modos.setAttribute("aria-label", t().home.modosAria);
    modos.append(
      this.cartaoLargo({
        icone: iconePuzzles(),
        titulo: t().modos.puzzles,
        legenda: t().home.legendaPuzzles,
        estado: this.estadoPuzzles(opcoes),
        aoClicar: opcoes.aoEscolherNiveis,
      }),
      this.mosaico(opcoes),
    );

    /*
     * ── O desafio do dia vem depois dos modos, para toda a gente ──
     *
     * Esteve por cima dos modos para quem já jogava, como a razão de voltar
     * amanhã, e por baixo só para quem ainda não tinha feito um nível. A mesma
     * Home mudava de ordem conforme o perfil, e dois telemóveis lado a lado
     * pareciam duas versões do jogo. Ficou a ordem de quem chega: os modos são
     * o jogo, e o desafio do dia é uma maneira de o jogar.
     */
    const desafio = opcoes.desafio === undefined ? [] : [this.desafio(opcoes.desafio)];

    /*
     * Sem título por cima dos modos. Esteve lá um «Modos de jogo» para separar
     * os modos do desafio; mas três cartões com a cor das faces já são um grupo
     * à vista, e o desafio tem o seu rótulo dentro do bilhete.
     */
    this.raiz.append(this.barra(opcoes), this.marca(opcoes), modos, ...desafio);

    host.replaceChildren(this.raiz);
  }

  destruir(): void {
    this.raiz.remove();
  }

  /* ─── A barra ───────────────────────────────────────────────────────────── */

  /**
   * Quem joga à esquerda; as medalhas e as definições à direita.
   *
   * O nome do jogador é o único rótulo de comprimento livre da barra, e fica
   * com o que sobra das outras duas: as medalhas e a roda dentada têm largura
   * certa, e um nome comprido corta-se com reticências sem empurrar nenhuma.
   */
  private barra(opcoes: OpcoesHome): HTMLElement {
    const barra = elemento("header", "home-barra");

    barra.appendChild(this.jogador(opcoes));
    if (opcoes.medalhas !== undefined) barra.appendChild(this.medalhas(opcoes.medalhas));
    barra.appendChild(
      botaoRedondo(iconeDefinicoes(), t().definicoes.titulo, opcoes.aoEscolherDefinicoes),
    );

    return barra;
  }

  /* ─── A marca ───────────────────────────────────────────────────────────── */

  /**
   * O nome do jogo, centrado, e a regra por baixo.
   *
   * É a faixa elástica da Home: num ecrã alto fica ao meio do espaço que os
   * cartões deixam, e lê-se como o ecrã de título de um jogo. O símbolo e o
   * nome vão no mesmo elemento: são uma coisa só a olhar, e separados o nome
   * escorregava num ecrã estreito enquanto o símbolo ficava.
   */
  private marca(opcoes: OpcoesHome): HTMLElement {
    const el = elemento("div", "home-marca");

    const logotipo = elemento("div", "home-logotipo");
    logotipo.append(this.simbolo(), this.wordmark());

    el.append(logotipo, this.regra(opcoes));
    return el;
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

  /**
   * A regra inteira, numa linha: 3 + 4 = 7 em peças, e «Como jogar?».
   *
   * Ficou no lugar de duas coisas — o lema, que dizia por palavras que o
   * objetivo é somar 7, e o cartão das regras, que o dizia em peças. Por baixo
   * do nome lê-se como subtítulo do jogo: quem a percebe aqui já não precisa
   * de entrar, e quem não percebe tem o botão no sítio onde a dúvida nasce.
   *
   * Sem cartão: é texto, e não compete com os modos. A seta fica, porque sem
   * ela uma linha de texto não diz que leva a algum lado.
   *
   * As peças são `aria-hidden`, e o nome do botão diz a regra por palavras —
   * a mesma frase que estava no cartão.
   */
  private regra(opcoes: OpcoesHome): HTMLButtonElement {
    const face = opcoes.modoFace ?? "pintas";
    const conta = elemento("span", "home-regra-conta");
    conta.setAttribute("aria-hidden", "true");
    conta.append(
      pecaDeAmostra(3, face),
      elemento("span", "home-regra-sinal", "+"),
      pecaDeAmostra(4, face),
      elemento("span", "home-regra-sinal", "="),
      elemento("span", "home-regra-sete", "7"),
    );

    const b = botao("", "home-regra", opcoes.aoEscolherComoJogar);
    b.append(conta, elemento("span", "home-regra-titulo", t().home.comoJogar), iconeSeguir());
    b.setAttribute("aria-label", `${t().home.comoJogar} ${t().home.comoJogarLegenda}`);

    return b;
  }

  /**
   * As medalhas, ao lado das definições.
   *
   * Na barra e não entre os modos, porque não se jogam: são o que ficou de
   * jogar, e consultam-se como o perfil e as definições se consultam.
   *
   * O número é «ganhas/total», e o ponto diz que há medalhas novas por ver — até
   * a página abrir. Um ponto e não um número de novas: a notícia é que há
   * alguma coisa lá dentro, e quantas descobre-se a entrar.
   */
  private medalhas(m: ResumoDasMedalhas): HTMLButtonElement {
    const b = botao("", "home-medalhas", m.aoAbrir);
    if (m.novas) b.dataset["novas"] = "sim";

    const conta = `${String(m.ganhas)}/${String(m.total)}`;
    b.append(iconeMedalha(), elemento("span", "home-medalhas-conta", conta));
    b.setAttribute(
      "aria-label",
      t().paginaMedalhas.ariaEntrada(m.ganhas, m.total, m.novas),
    );

    return b;
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
      nome === "" ? t().home.escolherPerfil : t().home.mudarPerfil(nome),
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
      nome === "" ? t().perfil.quemEs : nome,
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

    b.append(icone, texto);
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
        titulo: t().modos.tempo,
        estado:
          opcoes.perfil.bestTimeAttackScore > 0
            ? t().home.recorde(opcoes.perfil.bestTimeAttackScore)
            : undefined,
        aoClicar: opcoes.aoEscolherTempo,
      }),
      this.mosaicoDeModo({
        cor: "survival",
        icone: iconeSurvival(),
        titulo: t().modos.survival,
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
      return { estado: t().home.aMeio(opcoes.corridaAMeio), aoMeio: true };
    }

    /*
     * O maior tempo aguentado. Era o tempo da melhor **limpeza**, e esse ficava
     * quieto na maioria das corridas, porque a maioria transborda — ver
     * `recordSurvival`.
     */
    if (opcoes.perfil.bestSurvivalMs > 0) {
      return { estado: t().home.melhor(opcoes.melhorTempoSurvival) };
    }

    return { estado: undefined };
  }

  /* ─── O Desafio do Dia ──────────────────────────────────────────────────── */

  /**
   * O cartão do dia: um bilhete pequeno, que se toca inteiro e abre o ecrã do
   * desafio. A faixa com as seis faces, o rótulo e a sequência; por baixo, o
   * desafio de hoje — o ícone na cor do modo, o nome, o número e a data — e o
   * estado, que é o que diz se há alguma coisa a fazer.
   */
  private desafio(d: ResumoDoDesafio): HTMLButtonElement {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "home-desafio";
    b.dataset["modo"] = d.modo;
    b.dataset["estado"] = d.estado.tipo;
    b.addEventListener("click", d.aoAbrir);

    const rotulo = elemento("span", "home-desafio-rotulo");
    rotulo.append(iconeCalendario(), t().modos.desafio);

    // A série e as chaves, do lado de lá do rótulo. Só o que há: zero dias e
    // zero chaves não são notícia.
    const sinais = elemento("span", "home-desafio-sinais");
    if (d.emRisco !== undefined) sinais.appendChild(sinalDeRisco(d.emRisco));
    else if (d.sequencia > 0) sinais.appendChild(sinalDaSequencia(d.sequencia));
    if (d.chaves > 0) {
      const chaves = elemento("span", "desafio-chaves", sinalDasChaves(d.chaves));
      chaves.setAttribute("aria-label", t().comum.chaves(d.chaves));
      sinais.appendChild(chaves);
    }

    const cabeca = elemento("span", "home-desafio-cabeca");
    cabeca.appendChild(rotulo);
    if (sinais.childElementCount > 0) cabeca.appendChild(sinais);

    const icone = elemento("span", "desafio-modo-icone");
    icone.appendChild(iconeDoModo(d.modo));

    const nome = nomeDoModo(d.modo);
    const texto = elemento("span", "home-desafio-texto");
    texto.append(
      elemento("span", "home-desafio-nome", nome),
      elemento("span", "home-desafio-data", `#${String(d.numero)} · ${d.data}`),
    );

    // Na Home, o estado é curto: o tempo da corrida a meio vê-se lá dentro.
    const e = d.estado;
    const estado =
      e.tipo === "por-jogar"
        ? t().comum.jogar
        : e.tipo === "a-meio"
          ? t().desafio.continuar
          : e.tipo === "feito"
            ? `✓ ${e.texto}`
            : t().home.interrompido;

    const linha = elemento("span", "home-desafio-linha");
    linha.append(icone, texto, elemento("span", "desafio-modo-estado", estado));

    b.append(cabeca, linha);
    b.setAttribute(
      "aria-label",
      t().home.ariaDesafio(d.numero, d.data, nome, estado, d.emRisco),
    );

    return b;
  }
}
