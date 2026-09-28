/**
 * O tabuleiro em DOM.
 *
 * Cada peça é **um elemento com identidade estável**: o mesmo nó antes e depois
 * da jogada. É isso que permite animá-la de uma posição para a outra, e é a
 * razão de não haver framework aqui — um virtual DOM que reconcilia por posição
 * trabalharia contra exatamente esta propriedade.
 *
 * As peças são posicionadas por `transform` sobre posição absoluta, não por
 * layout de fluxo: cada movimento é a transição de uma só propriedade, que o
 * browser anima sem reflow.
 *
 * **O estado lógico avança de imediato; a animação é decoração por cima.** Uma
 * jogada nova tem de encontrar o tabuleiro certo mesmo que a anterior ainda
 * esteja a correr — senão calcularia a transição contra um tabuleiro que já não
 * existe.
 *
 * As durações vêm do CSS, não daqui. É o que faz `prefers-reduced-motion`
 * funcionar de graça: o media query põe-nas a zero e este código não precisa de
 * saber que isso aconteceu.
 */

import type { Board, Cell, Group, Marcas, Packed } from "@dicetoseven/engine";
import {
  JOKER,
  SEM_MARCAS,
  applyMove,
  colOf,
  packed,
  parDe,
  rowOf,
  width,
} from "@dicetoseven/engine";

import type { PieceMove } from "../session/transition";
import { midpointOf, transition } from "../session/transition";
import type { ModoFace } from "./dice";
import { criarPeca, desenharFace, marcaDeJoker } from "./dice";

/** Lado máximo de uma peça. Acima disto o tabuleiro fica esparso e estranho. */
const LADO_MAX = 72;

/** Piso de toque da acessibilidade. Abaixo disto marca-se, não se impede. */
export const LADO_MIN_TOQUE = 44;

/**
 * Linhas acima do tabuleiro de onde a linha injetada parte.
 *
 * **Uma, e não três.** No Survival o tabuleiro ocupa a altura máxima desde o
 * primeiro instante — a caixa é dimensionada para `alturaMaxima` e não para as
 * peças que lá estão. Três linhas acima do topo punham as peças novas fora do
 * palco durante quase toda a queda: caíam, mas caíam onde ninguém as via, e a
 * linha parecia aparecer do nada.
 *
 * A uma linha, o percurso passa pela faixa da fila — que é de onde as peças
 * dizem vir — e vê-se de ponta a ponta.
 */
const ALTURA_DA_QUEDA = 1;

/**
 * Desfasamento entre colunas na queda, em ms.
 *
 * A linha aterra como uma onda da esquerda para a direita, em vez de sete peças
 * a bater ao mesmo instante. Sete impactos simultâneos lêem-se como um corte de
 * imagem; sete a seguir uns aos outros lêem-se como queda.
 */
const ATRASO_POR_COLUNA = 28;

/**
 * Folga entre o fim da transição e o fim da espera.
 *
 * Sem ela, quem chamou repinta exatamente no instante em que a última peça
 * assenta — e um repinte um fotograma cedo corta o fim da queda. É o defeito
 * que fazia a linha injetada parecer instantânea.
 */
const MARGEM_DA_QUEDA = 60;

/**
 * Contador dos `id` das peças. Global ao módulo porque o tutorial do joker abre
 * um segundo tabuleiro por cima do nível, e dois `id` iguais no mesmo
 * documento fariam o leitor de ecrã anunciar a peça errada.
 */
let idsDePeca = 0;

export interface OpcoesBoardView {
  readonly aoTocar: (p: Packed) => void;
  readonly modoFace?: ModoFace;
}

interface Movimento {
  readonly m: PieceMove;
  readonly el: HTMLElement;
}

export class BoardView {
  private readonly host: HTMLElement;
  private readonly grelha: HTMLElement;
  private readonly aoTocar: (p: Packed) => void;

  private pecas = new Map<Packed, HTMLElement>();
  private board: Board = [];
  private modo: ModoFace;

  /**
   * A **extensão da caixa** — quanto espaço o tabuleiro ocupa no palco.
   *
   * Não encolhe a meio de um nível: o colapso tira colunas, e uma caixa que as
   * seguisse fazia o tabuleiro inteiro andar de lado a cada jogada, porque o
   * palco a centra.
   */
  private colunas = 0;
  private linhas = 0;

  /**
   * A **referência do tamanho da peça**, que é outra coisa.
   *
   * Separou-se da caixa quando o Contra-Relógio passou a crescer. Ali a peça
   * tem de ser medida pelo maior tabuleiro da corrida — senão ela encolhe à
   * medida que o tabuleiro cresce, os dois efeitos anulam-se e o crescimento
   * nunca se vê. Mas a **caixa** tem de seguir o tabuleiro do momento, senão um
   * tabuleiro de quatro colunas fica encostado ao canto de um enquadramento
   * feito para sete.
   *
   * No Survival é ao contrário e de propósito: a caixa é a do tamanho máximo
   * porque o topo dela **é** o teto, e é onde a linha de fogo mora.
   *
   * Zero quer dizer «mede pela caixa», que é o que todos os modos faziam antes.
   */
  private colunasMedida = 0;
  private linhasMedida = 0;

  /** A caixa segue cada tabuleiro montado, em vez de ficar no máximo. */
  private caixaPorTabuleiro = false;

  /**
   * Fecha a animação em curso, saltando para o estado final.
   *
   * Corre **sincronamente** no início da jogada seguinte. Fazê-lo por
   * temporizador deixava as duas animações a disputar as posições dos mesmos
   * elementos, e quem chegasse ao fim por último ganhava.
   */
  private fecharAnimacao: (() => void) | undefined;

  /** A linha de fogo, quando o modo a pede. Ver `marcarTeto`. */
  private teto: HTMLElement | undefined;

  /**
   * O cursor do teclado: a peça onde o Enter toca.
   *
   * Guarda-se a **posição**, não o elemento. Depois de uma jogada a peça
   * debaixo do cursor saiu ou caiu, e o que o jogador espera é que o cursor
   * fique onde estava no tabuleiro — em cima da peça que ocupou o lugar.
   */
  private cursor: Packed | undefined;

  private geracao = 0;
  private readonly observador: ResizeObserver | undefined;

  constructor(host: HTMLElement, opcoes: OpcoesBoardView) {
    this.host = host;
    this.aoTocar = opcoes.aoTocar;
    this.modo = opcoes.modoFace ?? "pintas";

    this.grelha = document.createElement("div");
    this.grelha.className = "tabuleiro";
    this.grelha.setAttribute("role", "grid");
    this.grelha.setAttribute("aria-label", "tabuleiro");
    /*
     * ── O tabuleiro joga-se por teclado ──
     *
     * Um só ponto de tabulação para o tabuleiro inteiro, e as setas lá dentro:
     * cinquenta peças na ordem do Tab seriam cinquenta paragens até chegar ao
     * desfazer. É o desenho do §7 — setas movem, Enter ou espaço tocam — e sai
     * de graça das coordenadas, porque a vizinhança é a do próprio jogo.
     */
    this.grelha.tabIndex = 0;
    this.host.appendChild(this.grelha);

    this.grelha.addEventListener("click", (ev) => {
      const alvo = (ev.target as HTMLElement | null)?.closest(".peca");
      if (!(alvo instanceof HTMLElement)) return;

      const chave = alvo.dataset["pos"];
      if (chave === undefined) return;

      // Um clique também leva o cursor: quem alterna entre rato e teclado
      // continua do sítio onde tocou.
      this.moverCursor(Number(chave) as Packed);
      this.aoTocar(Number(chave) as Packed);
    });

    this.grelha.addEventListener("keydown", (ev) => {
      this.teclar(ev);
    });

    this.grelha.addEventListener("focus", () => {
      this.moverCursor(this.cursor ?? packed(0, 0));
    });

    this.observador =
      typeof ResizeObserver === "undefined"
        ? undefined
        : new ResizeObserver(() => {
            this.redimensionar();
          });
    this.observador?.observe(this.host);
  }

  /**
   * Monta um tabuleiro de raiz. Usa-se por nível, no reinício e no undo.
   *
   * ── As marcas não precisam de manutenção ──
   *
   * O traço da solda e a casca do gelo são pseudo-elementos da própria peça,
   * portanto viajam com ela: caem com a gravidade, deslizam no colapso e
   * desaparecem quando a peça sai, tudo sem uma linha de código por jogada. Por
   * isso `aplicarJogada` não sabe que as marcas existem.
   *
   * A solda desenha-se na peça **de cima** e não na de baixo, por uma razão de
   * pintura: as peças são criadas de baixo para cima, portanto a de cima vem
   * depois no DOM e o traço cobre as duas sem precisar de `z-index`.
   */
  montar(board: Board, marcas: Marcas = SEM_MARCAS): void {
    this.fecharAnimacao?.();
    this.geracao++;

    this.board = board;
    this.pecas = new Map();
    this.grelha.replaceChildren();

    const largura = width(board);
    const altura = board.reduce((m, col) => Math.max(m, col.length), 0);

    /*
     * Montar é o início de um tabuleiro novo, e é o único momento em que a
     * caixa pode encolher. Durante o nível só cresce — ver `colunas`.
     */
    if (this.caixaPorTabuleiro) {
      this.colunas = largura;
      this.linhas = altura;
    } else {
      this.colunas = Math.max(this.colunas, largura);
      this.linhas = Math.max(this.linhas, altura);
    }

    for (let c = 0; c < board.length; c++) {
      const coluna = board[c];
      if (coluna === undefined) continue;

      for (let r = 0; r < coluna.length; r++) {
        const valor = coluna[r];
        if (valor === undefined) continue;

        const p = packed(c, r);
        const el = this.novaPeca(valor);
        el.dataset["pos"] = String(p);
        this.posicionar(el, p);

        this.pecas.set(p, el);
        this.grelha.appendChild(el);
      }
    }

    for (const baixo of marcas.soldas) {
      const [a, b] = parDe(baixo);
      this.pecas.get(a)?.classList.add("soldada-baixo");
      this.pecas.get(b)?.classList.add("soldada-cima");
    }

    for (const p of marcas.gelo) this.pecas.get(p)?.classList.add("gelada");

    // O `replaceChildren` acima levou a linha de fogo à frente. Ela é do
    // tabuleiro, não da montagem: volta, e volta por cima das peças.
    if (this.teto !== undefined) this.grelha.appendChild(this.teto);

    this.moverCursor(this.cursor);
    this.redimensionar();
  }

  /**
   * Fixa por que tabuleiro se mede a peça.
   *
   * Por omissão a caixa fica igual à medida, que é o que a campanha e o
   * Survival querem: o nível não muda de tamanho, ou a caixa **é** o limite.
   *
   * Com `caixaPorTabuleiro`, a peça continua medida por este tabuleiro mas a
   * caixa passa a seguir cada montagem. É o que o Contra-Relógio precisa para
   * os tabuleiros crescerem à vista sem ficarem encostados ao canto de um
   * enquadramento que ainda não é deles.
   */
  dimensionarPara(
    board: Board,
    opcoes: { readonly caixaPorTabuleiro?: boolean } = {},
  ): void {
    this.colunasMedida = width(board);
    this.linhasMedida = board.reduce((m, col) => Math.max(m, col.length), 0);
    this.caixaPorTabuleiro = opcoes.caixaPorTabuleiro === true;

    if (!this.caixaPorTabuleiro) {
      this.colunas = this.colunasMedida;
      this.linhas = this.linhasMedida;
    }

    /*
     * Repõe já, em vez de esperar pela montagem seguinte. O Survival chama isto
     * a cada pintura porque o tabuleiro alarga durante a corrida, e sem esta
     * linha a peça só mudava de tamanho na jogada a seguir àquela em que a
     * coluna nova entrou — um passo atrás do que está no ecrã.
     */
    this.redimensionar();
  }

  get tabuleiro(): Board {
    return this.board;
  }

  /**
   * A jogada, em três tempos: o grupo sai, a gravidade cai, as colunas deslizam.
   *
   * As três fases existem porque ver as duas transformações ao mesmo tempo era o
   * risco nº 1 do plano. O gate da Fase 6 fechou a Verde sem elas, portanto isto
   * é a mitigação desenhada e não um requisito — mas é barata.
   */
  async aplicarJogada(grupo: Group): Promise<void> {
    this.fecharAnimacao?.();

    const minha = ++this.geracao;
    const t = transition(this.board, grupo);
    const depois = applyMove(this.board, grupo);

    const aSair: HTMLElement[] = [];
    for (const p of t.removed) {
      const el = this.pecas.get(p);
      if (el !== undefined) {
        aSair.push(el);
        this.pecas.delete(p);
      }
    }

    const aMover: Movimento[] = [];
    for (const m of t.moved) {
      const el = this.pecas.get(m.from);
      if (el !== undefined) aMover.push({ m, el });
    }

    // O estado lógico avança já — ver a nota no topo do ficheiro.
    this.reindexar(t.moved);
    this.board = depois;
    this.moverCursor(this.cursor);

    this.fecharAnimacao = () => {
      this.fecharAnimacao = undefined;
      for (const el of aSair) el.remove();
      for (const { m, el } of aMover) this.posicionar(el, m.to);
    };

    for (const el of aSair) el.classList.add("a-sair");
    if (!(await this.espera("--t-saida", minha))) return;

    for (const el of aSair) el.remove();
    aSair.length = 0;

    for (const { m, el } of aMover) this.posicionar(el, midpointOf(m));
    if (!(await this.espera("--t-gravidade", minha))) return;

    for (const { m, el } of aMover) this.posicionar(el, m.to);
    if (!(await this.espera("--t-colapso", minha))) return;

    this.fecharAnimacao = undefined;
  }

  /**
   * Faz cair uma linha nova por cima do que já lá está.
   *
   * As peças nascem **acima do tabuleiro** e só depois recebem a posição final.
   * São duas escritas do mesmo `transform` com um reflow pelo meio: a primeira
   * não anima, porque o elemento acabou de entrar e não tem valor anterior; a
   * segunda anima, pela transição que a `.peca` já traz. Sem o reflow o browser
   * junta as duas e a peça aparece no sítio, sem queda nenhuma.
   *
   * `depois` é o tabuleiro já com a linha — a vista não calcula nada, só mostra
   * o que a sessão decidiu.
   */
  async injetarLinha(depois: Board): Promise<void> {
    this.fecharAnimacao?.();
    const minha = ++this.geracao;

    const antes = this.board;
    this.board = depois;
    this.colunas = Math.max(this.colunas, width(depois));
    this.linhas = Math.max(
      this.linhas,
      depois.reduce((m, col) => Math.max(m, col.length), 0),
    );

    const novas: { readonly el: HTMLElement; readonly p: Packed }[] = [];
    let ultimaColuna = 0;

    for (let c = 0; c < depois.length; c++) {
      const col = depois[c];
      if (col === undefined) continue;

      for (let r = antes[c]?.length ?? 0; r < col.length; r++) {
        const valor = col[r];
        if (valor === undefined) continue;

        const p = packed(c, r);
        const el = this.novaPeca(valor);
        el.dataset["pos"] = String(p);

        /*
         * A peça em queda tem transição própria — mais lenta do que a
         * gravidade, e com atraso por coluna. Ver `.peca.a-cair`.
         *
         * A classe sai no fim. Uma peça que ficasse `a-cair` para sempre levava
         * o atraso da coluna para todas as jogadas seguintes, e a gravidade de
         * meio tabuleiro começava a arrastar-se sem razão visível.
         */
        el.classList.add("a-cair");
        el.style.setProperty("--atraso", `${String(c * ATRASO_POR_COLUNA)}ms`);
        this.posicionar(el, packed(c, r + ALTURA_DA_QUEDA));

        this.pecas.set(p, el);
        this.grelha.appendChild(el);
        novas.push({ el, p });
        ultimaColuna = Math.max(ultimaColuna, c);
      }
    }

    if (novas.length === 0) return;

    this.moverCursor(this.cursor);
    this.redimensionar();

    // Força o layout, para que a posição de partida conte como valor anterior.
    void this.grelha.offsetHeight;

    for (const { el, p } of novas) this.posicionar(el, p);

    /*
     * A espera cobre a queda **inteira**: a duração, mais o atraso da última
     * coluna, mais a margem. Esperar só a duração devolvia o controlo a meio da
     * onda, e quem chamou repintava por cima dela.
     */
    const queda = this.varNum("--t-queda");
    const total =
      queda <= 0 ? 0 : queda + ultimaColuna * ATRASO_POR_COLUNA + MARGEM_DA_QUEDA;

    if (!(await this.esperaMs(total, minha))) return;

    for (const { el } of novas) {
      el.classList.remove("a-cair");
      el.style.removeProperty("--atraso");
    }
  }

  /**
   * A linha de fogo: onde o tabuleiro transborda.
   *
   * **Está sempre lá, e só muda de intensidade.** Um aviso que aparece quando
   * já não há nada a fazer não é um aviso — é um obituário. O Survival tinha
   * exatamente isso: a caixa de fim a dizer que transbordou, sem que nada antes
   * dissesse onde ficava o limite.
   *
   * Fica no topo da caixa do tabuleiro, e é aí que é literalmente verdade: a
   * caixa é dimensionada para `alturaMaxima` linhas, portanto o seu topo **é** o
   * teto. Uma peça que encoste à linha está na última linha permitida.
   *
   * Vive dentro da grelha e é reposta pelo `montar`, porque é parte do
   * tabuleiro e não do ecrã — só o tabuleiro sabe onde está o seu topo.
   */
  marcarTeto(grau: "escondido" | "folgado" | "aviso" | "critico"): void {
    if (grau === "escondido") {
      this.teto?.remove();
      this.teto = undefined;
      return;
    }

    if (this.teto === undefined) {
      const el = document.createElement("div");
      el.className = "linha-fogo";
      el.setAttribute("aria-hidden", "true");
      this.teto = el;
    }

    this.teto.dataset["grau"] = grau;
    // Sempre o último filho: a linha passa por cima das peças, e o topo do
    // tabuleiro é o sítio onde as peças mais altas lhe encostam.
    this.grelha.appendChild(this.teto);
  }

  /** Retângulo de uma peça no ecrã — o seletor do joker ancora-se nele. */
  caixaDe(p: Packed): DOMRect | undefined {
    return this.pecas.get(p)?.getBoundingClientRect();
  }

  /**
   * Mostra no joker o valor que o jogador lhe deu nesta seleção.
   *
   * Sem isto o jogador escolhe 5, junta peças, e a meio já não se lembra do que
   * escolheu — que é precisamente a decisão que o nível inteiro depende.
   */
/**
   * O joker com valor escolhido mostra **a face desse valor**, em pintas, como
   * qualquer outra peça.
   *
   * Antes era um dígito desenhado por CSS com `content: attr(...)`. Num jogo
   * em que as pintas são a identidade e os dígitos são uma definição que o
   * jogador escolhe, o joker era a única peça que não respeitava nem uma coisa
   * nem outra — aparecia em número mesmo para quem joga com pintas.
   *
   * Fica um `✳` pequeno no canto, senão perdia-se de vista qual das peças é o
   * joker, que é o que diz ao jogador que ainda pode mudar de ideias.
   */
  marcarJoker(p: Packed | undefined, valor: number | undefined): void {
    // Quem já tinha valor volta ao ✳ — e só esses, para não redesenhar o
    // tabuleiro inteiro a cada toque.
    for (const [q, el] of this.pecas) {
      if (!el.classList.contains("joker-escolhido")) continue;

      el.classList.remove("joker-escolhido");
      delete el.dataset["jokerAs"];
      desenharFace(el, this.valorEm(q) ?? JOKER, this.modo);
    }

    if (p === undefined || valor === undefined) return;

    const el = this.pecas.get(p);
    if (el === undefined) return;

    el.classList.add("joker-escolhido");
    el.dataset["jokerAs"] = String(valor);

    desenharFace(el, valor as Cell, this.modo);
    el.appendChild(marcaDeJoker());
  }

  marcarSelecao(selecao: ReadonlySet<Packed>): void {
    for (const [p, el] of this.pecas) {
      el.classList.toggle("selecionada", selecao.has(p));
    }
  }

  /** Realce temporário — a dica usa-o. */
  marcarSugestao(grupo: readonly Packed[] | undefined): void {
    for (const el of this.pecas.values()) el.classList.remove("sugerida");
    for (const p of grupo ?? []) this.pecas.get(p)?.classList.add("sugerida");
  }

  trocarModoFace(modo: ModoFace): void {
    this.modo = modo;
    for (const [p, el] of this.pecas) {
      const valor = this.valorEm(p);
      if (valor !== undefined) desenharFace(el, valor, modo);
    }
  }

  /**
   * O lado da peça sai do espaço disponível e das dimensões do tabuleiro —
   * **nunca é fixo em pixels**. É a mitigação assumida do "desktop primeiro": no
   * telemóvel fica desconfortável em vez de impossível.
   */
  redimensionar(): void {
    if (this.colunas === 0 || this.linhas === 0) return;

    const gap = this.varNum("--gap-peca");
    const caixa = this.host.getBoundingClientRect();
    if (caixa.width === 0 || caixa.height === 0) return;

    /*
     * O espaço útil é a **caixa de conteúdo**, e `getBoundingClientRect` devolve
     * a de bordo — com o padding lá dentro.
     *
     * Sem descontar, o tabuleiro é dimensionado para um espaço que não tem, e o
     * `place-items: center` do palco reparte o excesso pelos dois lados: as peças
     * saem por cima e por baixo da bandeja. Medido num 7×7 a 1080×610, com o
     * palco a 888×394 e 20px de padding: davam peças de 51px e uma grelha de
     * 393px onde só cabem 354.
     */
    const espaco = this.paddingDoHost();
    const largura = caixa.width - espaco.horizontal;
    const altura = caixa.height - espaco.vertical;

    /*
     * A peça mede-se pela **medida** e a caixa desenha-se pela **caixa**. São a
     * mesma coisa em todos os modos menos no Contra-Relógio — ver
     * `colunasMedida`.
     */
    const medidaC = this.colunasMedida === 0 ? this.colunas : this.colunasMedida;
    const medidaL = this.linhasMedida === 0 ? this.linhas : this.linhasMedida;

    const porLargura = (largura - gap * (medidaC - 1)) / medidaC;
    const porAltura = (altura - gap * (medidaL - 1)) / medidaL;

    const lado = Math.max(
      12,
      Math.floor(Math.min(porLargura, porAltura, LADO_MAX)),
    );

    this.grelha.style.setProperty("--lado", `${String(lado)}px`);
    this.grelha.style.width = `${String(this.colunas * (lado + gap) - gap)}px`;
    this.grelha.style.height = `${String(this.linhas * (lado + gap) - gap)}px`;
    this.grelha.classList.toggle("apertado", lado < LADO_MIN_TOQUE);
  }

  destruir(): void {
    this.observador?.disconnect();
    this.grelha.remove();
  }

  /* ─── privados ──────────────────────────────────────────────────────────── */

  private valorEm(p: Packed): Cell | undefined {
    return this.board[colOf(p)]?.[rowOf(p)];
  }

  /**
   * Uma peça do tabuleiro, com `id` próprio.
   *
   * O `id` é o que o `aria-activedescendant` aponta: com o foco preso na
   * grelha, é assim que um leitor de ecrã anuncia a peça debaixo do cursor. É
   * da **peça** e não da posição, porque a peça muda de posição a cada jogada
   * e o `id` tem de viajar com ela.
   */
  private novaPeca(valor: Cell): HTMLElement {
    const el = criarPeca(valor, this.modo);
    el.id = `peca-${String(++idsDePeca)}`;
    return el;
  }

  /** A posição válida mais próxima de `p` no tabuleiro atual. */
  private dentro(p: Packed): Packed | undefined {
    const largura = this.board.length;
    if (largura === 0) return undefined;

    const c = Math.min(colOf(p), largura - 1);
    const altura = this.board[c]?.length ?? 0;
    if (altura === 0) return undefined;

    return packed(c, Math.min(rowOf(p), altura - 1));
  }

  /**
   * Põe o cursor em `p`, ou na peça mais próxima se `p` já não existir.
   *
   * Corre depois de cada mudança do tabuleiro: uma coluna que desapareceu no
   * colapso não pode deixar o cursor a apontar para o vazio.
   */
  private moverCursor(p: Packed | undefined): void {
    this.grelha.querySelector(".peca.cursor")?.classList.remove("cursor");

    const alvo = p === undefined ? undefined : this.dentro(p);
    const el = alvo === undefined ? undefined : this.pecas.get(alvo);

    if (alvo === undefined || el === undefined) {
      this.grelha.removeAttribute("aria-activedescendant");
      return;
    }

    this.cursor = alvo;
    el.classList.add("cursor");
    this.grelha.setAttribute("aria-activedescendant", el.id);
  }

  /**
   * Setas movem, Enter e espaço tocam.
   *
   * Cima e baixo andam **dentro da coluna**, e as linhas contam-se da base —
   * é a mesma geometria da adjacência. Esquerda e direita mudam de coluna à
   * mesma altura, e descem até ao topo da coluna de chegada se ela for mais
   * baixa: numa silhueta, ir para o lado nunca pode cair no vazio.
   */
  private teclar(ev: KeyboardEvent): void {
    const atual = this.dentro(this.cursor ?? packed(0, 0));
    if (atual === undefined) return;

    const c = colOf(atual);
    const r = rowOf(atual);
    let destino: Packed;

    switch (ev.key) {
      case "ArrowLeft":
        destino = packed(Math.max(0, c - 1), r);
        break;
      case "ArrowRight":
        destino = packed(c + 1, r);
        break;
      case "ArrowUp":
        destino = packed(c, Math.min(r + 1, 63));
        break;
      case "ArrowDown":
        destino = packed(c, Math.max(0, r - 1));
        break;
      case "Enter":
      case " ":
        ev.preventDefault();
        this.moverCursor(atual);
        this.aoTocar(atual);
        return;
      default:
        return;
    }

    ev.preventDefault();
    this.moverCursor(destino);
  }

  private posicionar(el: HTMLElement, p: Packed): void {
    el.style.setProperty("--c", String(colOf(p)));
    el.style.setProperty("--r", String(rowOf(p)));
  }

  /** `false` significa que outra jogada chegou e esta deve desistir. */
  private espera(token: string, minha: number): Promise<boolean> {
    return this.esperaMs(this.varNum(token), minha);
  }

  /** `false` significa que outra jogada chegou e esta deve desistir. */
  private esperaMs(ms: number, minha: number): Promise<boolean> {
    if (ms <= 0) return Promise.resolve(this.geracao === minha);

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(this.geracao === minha);
      }, ms);
    });
  }

  /**
   * Reindexa em duas passagens: primeiro tira todos os que se movem, só depois
   * os põe nos destinos. Uma passagem só corromperia as cadeias, em que o
   * destino de uma peça é a origem de outra.
   */
  private reindexar(movimentos: readonly PieceMove[]): void {
    const soltos = new Map<Packed, HTMLElement>();

    for (const m of movimentos) {
      const el = this.pecas.get(m.from);
      if (el !== undefined) {
        soltos.set(m.from, el);
        this.pecas.delete(m.from);
      }
    }

    for (const m of movimentos) {
      const el = soltos.get(m.from);
      if (el === undefined) continue;
      el.dataset["pos"] = String(m.to);
      this.pecas.set(m.to, el);
    }
  }

  /**
   * O padding do palco, nos dois eixos.
   *
   * Em jsdom `getComputedStyle` devolve string vazia para estas propriedades e
   * `parseFloat` dá `NaN` — que envenenaria o cálculo inteiro em silêncio. Zero é
   * a resposta certa aí: sem layout a sério, não há padding a descontar.
   */
  private paddingDoHost(): { horizontal: number; vertical: number } {
    const estilo = getComputedStyle(this.host);
    const px = (v: string): number => {
      const n = Number.parseFloat(v);
      return Number.isFinite(n) ? n : 0;
    };

    return {
      horizontal: px(estilo.paddingLeft) + px(estilo.paddingRight),
      vertical: px(estilo.paddingTop) + px(estilo.paddingBottom),
    };
  }

  private varNum(nome: string): number {
    const bruto = getComputedStyle(document.documentElement)
      .getPropertyValue(nome)
      .trim();
    const n = Number.parseFloat(bruto);
    return Number.isFinite(n) ? n : 0;
  }
}
