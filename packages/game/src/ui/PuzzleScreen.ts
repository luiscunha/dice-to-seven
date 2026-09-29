/**
 * O ecrã de jogo da campanha.
 *
 * Liga a `PuzzleSession` — que não sabe o que é um pixel — ao `BoardView`. Toda
 * a regra vive na sessão; aqui só se traduz estado em DOM e toques em transições.
 *
 * Duas coisas que vêm do playtest da Fase 6 e não da especificação:
 *
 * - **Tocar no joker abre a escolha do valor**, e é a escolha que faz a jogada.
 *   A eliminação automática ao primeiro grupo válido — o modelo de `[M 3.1]` —
 *   gastava o joker com a primeira peça encostada, ao valor que ela deixasse, e
 *   o tabuleiro ficava insolúvel em silêncio.
 * - **O valor obrigatório do joker nunca é mostrado.** Descobri-lo é a decisão
 *   que o joker oferece. O que se mostra, e só nos três primeiros níveis com
 *   joker, é a soma das faces — o andaime de `session/tutorial.ts`, que poupa a
 *   aritmética e não dá a resposta.
 */

import type { Group, Level, Packed } from "@dicetoseven/engine";
import {
  JOKER,
  cellAt,
  colOf,
  jokerAt,
  marcasDe,
  rowOf,
  totalSum,
} from "@dicetoseven/engine";

import type { PuzzleState } from "../session/PuzzleSession";
import {
  restartPuzzle,
  seal,
  startPuzzle,
  undoPuzzle,
  usePuzzleHint,
} from "../session/PuzzleSession";
import type { JokerValue } from "../session/GameSession";
import {
  isBlocked,
  isFinished,
  remainingToTarget,
  selectionTotal,
  tap,
} from "../session/GameSession";
import { PASSO_RELOGIO, relogio } from "./tempo";
import {
  vibrarJogada,
  vibrarRecusa,
  vibrarToque,
  vibrarVitoria,
} from "../plataforma/nativo";
import { botaoRedondo, confirmar, reanimar } from "./dom";
import {
  iconeDesfazer,
  iconeDica,
  iconeFechar,
  iconeReiniciar,
  iconeSeguir,
  iconeVoltar,
} from "./icones";
import { BoardView } from "./BoardView";
import { JokerPicker } from "./JokerPicker";

const SELO_TEXTO: Readonly<Record<string, string>> = {
  perfect: "Perfeito",
  clean: "Limpo",
  completed: "Concluído",
};

/**
 * O glifo do selo — o mesmo da grelha de níveis.
 *
 * O painel de fim e a grelha dizem a mesma coisa em dois sítios: um `★` aqui
 * tem de ser o `★` que o jogador vai encontrar na célula quando voltar à lista.
 */
const SELO_GLIFO: Readonly<Record<string, string>> = {
  perfect: "★",
  clean: "◆",
  completed: "●",
};

export interface OpcoesPuzzleScreen {
  readonly aoTerminar?: (info: {
    readonly level: Level;
    readonly selo: string;
    /** Quanto demorou, em ms. Zero se o nível não chegou a ser tocado. */
    readonly tempoMs: number;
  }) => void;
  readonly aoPedirSeguinte?: () => void;

  /** Abre o tutorial do joker em revisão. Sem isto o `?` não aparece. */
  readonly aoPedirAjuda?: () => void;

  /**
   * Sobe para a grelha da banda. Sem isto a seta não aparece.
   *
   * Sobe **na hierarquia**, não no histórico: quem chega a um nível por link
   * direto não tem para onde recuar, mas tem sempre a lista acima de si.
   */
  readonly aoVoltar?: () => void;

  /**
   * O andaime dos três primeiros níveis com joker (`session/tutorial.ts`): a
   * soma das faces no cabeçalho, enquanto o joker ainda estiver no tabuleiro.
   */
  readonly mostrarSomaDasFaces?: boolean;

  /**
   * O melhor tempo já feito neste nível, em ms. `0` ou ausente = ainda nenhum.
   *
   * Um recorde que não se mostra é o `bestMoves` outra vez — gravado e
   * invisível, portanto inexistente. Aparece no painel de fim, que é onde há
   * motivo para o bater: acabou-se de jogar e o botão de reiniciar está ali.
   */
  readonly melhorTempoMs?: number;

  /**
   * O nome do nível, como o jogador o conhece: `"Médio 23"`, `"Perito 07"`.
   *
   * Sem isto o cabeçalho mostrava o `id` do pack — `meio-joker-000072` — que é
   * identidade de ficheiro e não nome de coisa. Pior do que feio: o `id` traz a
   * **banda** à frente, e a banda é uma receita de geração que o jogador não
   * conhece; `meio-joker` no cabeçalho de um capítulo chamado Médio contava-lhe
   * de um sítio onde ele não está.
   *
   * Vem de fora porque o número é a **posição no capítulo**, e um capítulo é
   * duas bandas intercaladas (`capitulos.ts`): o ecrã tem o nível, mas só o
   * `main.ts` sabe em que lugar da série ele caiu.
   */
  readonly titulo?: string;

  /**
   * A linha da soma por baixo do tabuleiro — `3 + ✳4 = 7`, e o `faltam 3`.
   *
   * **Desligada por omissão, e ligada só no Tutorial.** É um andaime: faz a
   * conta que o jogo pede ao jogador, e quem a tem à frente deixa de a fazer de
   * cabeça. O sítio dela é onde se está a aprender a regra.
   *
   * Os avisos de recusa ficam sempre — ver `pintarAviso`. Explicar porque é que
   * um toque não entrou não é fazer a conta por ninguém.
   */
  readonly mostrarSoma?: boolean;
}

export class PuzzleScreen {
  private readonly raiz: HTMLElement;
  private readonly view: BoardView;
  private readonly picker: JokerPicker;
  private readonly opcoes: OpcoesPuzzleScreen;

  private estado: PuzzleState;
  private jokerPendente: Packed | undefined;

  /*
   * ── O cronómetro ──
   *
   * Arranca ao **primeiro toque**, não ao abrir o ecrã: ler o tabuleiro antes
   * de jogar é metade do puzzle, e cronometrar a leitura ensinava a não a
   * fazer.
   *
   * Para ao limpar, e recomeça do zero ao reiniciar — é outra tentativa. O undo
   * não lhe toca: é a mesma tentativa, e o preço do erro já está no selo.
   */
  private inicioMs: number | undefined;
  private paradoMs = 0;
  private cronometro: ReturnType<typeof setInterval> | undefined;

  /**
   * O instante em que a aplicação foi para segundo plano, com o cronómetro a
   * andar. Ver `aoMudarVisibilidade`.
   */
  private pausaMs: number | undefined;
  private readonly aoMudarVisibilidade: () => void;

  /**
   * O melhor tempo do nível, e o que valia antes da última vez que o nível
   * acabou.
   *
   * Começam os dois no `melhorTempoMs` que chega de fora, e o `recorde` avança
   * sozinho quando se bate: com o «Repetir» no painel de fim, a segunda partida
   * tem de se comparar com a primeira, e o valor de fora é o de antes das duas.
   */
  private recorde: number;
  private recordeAntes: number;

  private readonly palco: HTMLElement;
  private readonly elTitulo: HTMLElement;
  private readonly elMeta: HTMLElement;
  private readonly elRelogio: HTMLElement;
  private readonly elSoma: HTMLElement;
  private readonly elAviso: HTMLElement;
  private readonly elFim: HTMLElement;
  private readonly elBeco: HTMLDialogElement;

  /** Já foi mostrado para *este* beco. Dispensá-lo não o traz de volta. */
  private becoMostrado = false;

  private readonly btDesfazer: HTMLButtonElement;
  private readonly btReiniciar: HTMLButtonElement;
  private readonly btDica: HTMLButtonElement;

  constructor(host: HTMLElement, level: Level, opcoes: OpcoesPuzzleScreen = {}) {
    this.opcoes = opcoes;
    this.estado = startPuzzle(level);
    this.recorde = opcoes.melhorTempoMs ?? 0;
    this.recordeAntes = this.recorde;

    this.raiz = document.createElement("div");
    // `jogo` é o que dá a este ecrã a composição em calhas em paisagem — ver o
    // fim de `app.css`. Os ecrãs de lista não a têm, e continuam a rolar.
    this.raiz.className = "ecra jogo";
    host.replaceChildren(this.raiz);

    /* ── topo ── */
    const topo = document.createElement("header");
    topo.className = "topo";

    this.elTitulo = document.createElement("h1");
    this.elMeta = document.createElement("div");
    this.elMeta.className = "meta";

    this.elRelogio = document.createElement("div");
    this.elRelogio.className = "relogio";
    // Não é uma corrida contra o relógio — é um recorde pessoal. Um leitor de
    // ecrã não precisa de o ouvir a cada décimo.
    this.elRelogio.setAttribute("aria-hidden", "true");

    const espaco = document.createElement("div");
    espaco.className = "espaco";

    if (opcoes.aoVoltar !== undefined) {
      topo.appendChild(
        botaoRedondo(iconeVoltar(), "voltar à lista", () => {
          this.pedirParaSair();
        }),
      );
    }

    topo.append(this.elTitulo, espaco, this.elRelogio, this.elMeta);

    if (opcoes.aoPedirAjuda !== undefined) {
      const ajuda = botao("?", "redondo");
      ajuda.setAttribute("aria-label", "como funciona o joker");
      ajuda.addEventListener("click", () => {
        opcoes.aoPedirAjuda?.();
      });
      topo.appendChild(ajuda);
    }

    /* ── palco ── */
    const palco = document.createElement("div");
    palco.className = "palco";
    this.palco = palco;

    /* ── rodapé ── */
    const rodape = document.createElement("footer");
    rodape.className = "rodape";

    const linha = document.createElement("div");
    /*
     * A linha continua a existir mesmo sem a soma, e continua a reservar altura:
     * é dela que sai o aviso de recusa, e deixá-la encolher a zero fazia o
     * tabuleiro saltar meia linha de cada vez que um toque não entrava.
     *
     * Sem a soma reserva menos, porque só lá cabe uma linha de aviso — e num
     * telemóvel cada faixa que não é tabuleiro é peça mais pequena.
     */
    linha.className =
      opcoes.mostrarSoma === true
        ? "linha-selecao"
        : "linha-selecao sem-soma";

    this.elSoma = document.createElement("div");
    this.elSoma.className = "soma";
    this.elAviso = document.createElement("div");
    this.elAviso.className = "aviso";
    this.elAviso.setAttribute("role", "status");

    linha.append(this.elSoma, this.elAviso);

    /*
     * ── Os três botões ──
     *
     * Dois grupos, e a divisão diz o que cada um é. À esquerda o que **corrige**
     * — desfazer e reiniciar, ícones sem palavra, encostados um ao outro porque
     * são a mesma família e quem procura um procura o outro. À direita, sozinha,
     * a dica: é a única que **gasta** algo, tem o contador a dizer quantas
     * restam, e por isso é a única que se anuncia pelo nome.
     *
     * Ícones nas duas primeiras porque são gestos universais e o polegar acerta
     * num alvo quadrado melhor do que numa palavra; texto na terceira porque uma
     * lâmpada sozinha não diz que custa uma dica das que ainda há.
     *
     * Cada ícone leva `aria-label` **e** `title`: o primeiro para quem ouve o
     * ecrã, o segundo para quem passa o rato e não reconheceu o desenho.
     */
    const acoes = document.createElement("div");
    acoes.className = "acoes acoes-jogo";

    this.btDesfazer = botaoIcone(iconeDesfazer(), "Desfazer");
    this.btReiniciar = botaoIcone(iconeReiniciar(), "Reiniciar");
    this.btDica = botao("Dica", "com-icone");

    const corrigir = document.createElement("div");
    corrigir.className = "grupo-acoes";
    corrigir.append(this.btDesfazer, this.btReiniciar);

    acoes.append(corrigir, this.btDica);

    /*
     * ── O painel de fim vive no palco ──
     *
     * Estava no rodapé, debaixo dos botões — no canto de baixo do ecrã, com o
     * palco inteiro vazio por cima e o convite «toca nas peças» ainda à vista.
     * O olho está no tabuleiro quando a última peça sai, e é aí que o
     * resultado tem de aparecer: o palco ficou vazio, portanto não tapa nada.
     *
     * É posto antes do `BoardView` e é absoluto: não entra na conta do espaço
     * que o tabuleiro tem para crescer.
     */
    this.elFim = document.createElement("div");
    this.elFim.className = "fim";
    // Anunciado por leitor de ecrã: quem não vê o painel aparecer também tem de
    // saber que o nível acabou.
    this.elFim.setAttribute("role", "status");
    this.elFim.hidden = true;
    palco.appendChild(this.elFim);

    rodape.append(linha, acoes);
    this.elBeco = document.createElement("dialog");
    this.elBeco.className = "popup";
    this.elBeco.addEventListener("click", (e) => {
      if (e.target === this.elBeco) this.esconderBeco();
    });

    this.raiz.append(topo, palco, rodape, this.elBeco);

    this.view = new BoardView(palco, { aoTocar: (p) => void this.tocar(p) });
    this.picker = new JokerPicker(palco, {
      aoEscolher: (valor) => void this.escolherJoker(valor),
    });
    this.view.dimensionarPara(level.board);
    this.view.montar(level.board, marcasDe(level.soldas, level.gelo));

    this.btDesfazer.addEventListener("click", () => {
      this.desfazer();
    });
    this.btReiniciar.addEventListener("click", () => {
      /*
       * Pergunta só quando há o que perder. Num tabuleiro por tocar, reiniciar
       * não faz nada — e uma caixa que aparece sempre aprende-se a despachar
       * sem ler, o que a torna pior do que não existir.
       *
       * Um nível acabado também não tem nada a perder: o selo e o tempo já
       * foram gravados, e reiniciar é jogá-lo outra vez — como tentativa nova,
       * ver `novaTentativa`.
       */
      if (isFinished(this.estado.game)) {
        this.novaTentativa();
        return;
      }

      if (!this.haPartidaEmJogo() && this.estado.game.selection.length === 0) {
        this.reiniciar();
        return;
      }

      confirmar(this.raiz, {
        titulo: "Reiniciar o nível?",
        texto: "As jogadas feitas até aqui perdem-se.",
        confirmar: "Reiniciar",
        aoConfirmar: () => {
          this.reiniciar();
        },
      });
    });
    this.btDica.addEventListener("click", () => {
      this.pedirDica();
    });

    /*
     * ── O cronómetro pára com a aplicação em segundo plano ──
     *
     * É um recorde pessoal, e o recorde mede o tempo a pensar no tabuleiro —
     * não o tempo que o telemóvel passou no bolso. Sem isto, atender uma
     * chamada a meio de um nível dava um «melhor tempo» de cinco minutos. O
     * Survival já fazia o mesmo; a campanha tinha ficado de fora.
     */
    this.aoMudarVisibilidade = () => {
      if (document.visibilityState === "hidden") this.pausarCronometro();
      else this.retomarCronometro();
    };
    document.addEventListener("visibilitychange", this.aoMudarVisibilidade);

    this.pintar();
  }

  /**
   * O botão **para trás** do Android, antes de sair do ecrã.
   *
   * `true` quer dizer que o ecrã tratou do gesto e a navegação não deve
   * acontecer. Duas coisas a tratar, por esta ordem:
   *
   * - **O seletor do joker aberto fecha-se.** É o que se espera de um botão de
   *   voltar, e antes ele saía do nível com a escolha a meio.
   * - **Uma partida a meio pergunta**, como a seta do cabeçalho. O gesto de
   *   voltar dispara-se da borda do ecrã sem querer com muito mais facilidade
   *   do que se carrega num botão, e deitava fora o nível inteiro.
   */
  interceptarVoltar(): boolean {
    if (this.picker.estaAberto) {
      this.picker.fechar();
      return true;
    }

    if (!this.haPartidaEmJogo()) return false;

    this.pedirParaSair();
    return true;
  }

  destruir(): void {
    document.removeEventListener("visibilitychange", this.aoMudarVisibilidade);
    this.pararCronometro();
    /*
     * Fechar antes de remover. Um `<dialog>` modal vive na camada de topo do
     * documento, não no seu lugar na árvore, e sair do nível com ele aberto
     * deixava o escurecimento e o `inert` a cobrir o ecrã seguinte — o jogo
     * parecia ter congelado.
     */
    this.esconderBeco();
    this.picker.destruir();
    this.view.destruir();
    this.raiz.remove();
  }

  /* ─── ações ─────────────────────────────────────────────────────────────── */

  /**
   * Há jogadas feitas que sair deitaria fora?
   *
   * Um nível acabado já não tem: o resultado está gravado. Um nível por tocar
   * também não.
   */
  private haPartidaEmJogo(): boolean {
    const jogo = this.estado.game;
    return !isFinished(jogo) && jogo.moves > 0;
  }

  /**
   * Sair para a lista, perguntando só quando há o que perder.
   *
   * A mesma regra do reiniciar e do Contra-Relógio. Antes a seta saía sempre
   * sem perguntar, e o reiniciar ao lado — que perde exatamente o mesmo —
   * pedia confirmação.
   */
  private pedirParaSair(): void {
    const sair = (): void => {
      this.opcoes.aoVoltar?.();
    };

    if (!this.haPartidaEmJogo()) {
      sair();
      return;
    }

    confirmar(this.raiz, {
      titulo: "Sair do nível?",
      texto: "As jogadas feitas até aqui perdem-se.",
      confirmar: "Sair",
      aoConfirmar: sair,
    });
  }

  private async tocar(p: Packed, jokerAs?: JokerValue): Promise<void> {
    const antes = this.estado.game;
    if (isFinished(antes)) return;

    /*
     * O joker não entra na seleção sem valor: o toque abre a escolha, e é a
     * escolha que faz a jogada. É o que dispensa um botão de confirmação.
     */
    if (cellAt(antes.board, p) === JOKER && jokerAs === undefined) {
      const caixa = this.view.caixaDe(p);
      if (caixa !== undefined) {
        this.jokerPendente = p;
        this.picker.abrir(caixa, antes.jokerAs);
      }
      return;
    }

    const jogo = tap(antes, p, jokerAs);

    // Só o toque que a sessão aceita arranca o relógio: um toque recusado não é
    // uma jogada, e começar a contar nele penalizava quem explora o tabuleiro.
    if (jogo.rejection === undefined) this.arrancarCronometro();

    /*
     * A vibração diz o que aconteceu, e **antes** da animação: é o retorno ao
     * dedo, e chegar depois de meio segundo de peças a cair já não é retorno.
     *
     * Três casos distintos de propósito. Uma vibração sempre igual deixa de
     * informar e passa a incomodar.
     */
    if (jogo.rejection !== undefined) vibrarRecusa();
    else if (jogo.lastMove !== undefined) vibrarJogada();
    else vibrarToque();

    this.estado = { ...this.estado, game: jogo };
    this.view.marcarSugestao(undefined);

    // O grupo vem da sessão, que é quem o decidiu. Reconstruí-lo aqui como "a
    // seleção de antes mais a peça tocada" era duplicar a regra do toque — e
    // deixou de bater assim que um toque passou a trazer duas peças.
    if (jogo.lastMove !== undefined) {
      await this.animarJogada(jogo.lastMove);
    }

    this.pintar();
  }

  private async escolherJoker(valor: JokerValue): Promise<void> {
    const p = this.jokerPendente;
    this.jokerPendente = undefined;
    if (p === undefined) return;

    await this.tocar(p, valor);
  }

  /**
   * A linha do recorde: ou bateu, ou fica a saber o que tem de bater.
   *
   * Compara com o `recordeAntes` — o melhor de **antes** desta partida. É o
   * que permite dizer "novo recorde" sem comparar o tempo consigo próprio.
   */
  private marcaDoRecorde(): HTMLElement {
    const anterior = this.recordeAntes;
    const agora = this.paradoMs;

    const linha = document.createElement("div");
    linha.className = "recorde";

    if (agora <= 0) {
      linha.hidden = true;
      return linha;
    }

    if (anterior === 0 || agora < anterior) {
      linha.dataset["novo"] = "sim";
      linha.textContent =
        anterior === 0 ? "primeiro tempo" : `novo recorde, era ${relogio(anterior)}`;
      return linha;
    }

    linha.textContent = `o teu recorde é ${relogio(anterior)}`;
    return linha;
  }

  private async animarJogada(grupo: Group): Promise<void> {
    await this.view.aplicarJogada(grupo);
  }

  /** Quanto vai o cronómetro, esteja ele a andar, em pausa ou já parado. */
  private decorrido(): number {
    if (this.inicioMs === undefined) return this.paradoMs;
    return (this.pausaMs ?? Date.now()) - this.inicioMs;
  }

  private arrancarCronometro(): void {
    if (this.inicioMs !== undefined) return;

    this.inicioMs = Date.now();
    this.cronometro = setInterval(() => {
      this.pintarRelogio();
    }, PASSO_RELOGIO);
  }

  private pararCronometro(): void {
    if (this.cronometro !== undefined) clearInterval(this.cronometro);
    this.cronometro = undefined;

    if (this.inicioMs !== undefined) {
      this.paradoMs = this.decorrido();
      this.inicioMs = undefined;
    }
    this.pausaMs = undefined;
  }

  /** Congela o decorrido — a aplicação foi para segundo plano. */
  private pausarCronometro(): void {
    if (this.inicioMs === undefined || this.pausaMs !== undefined) return;

    this.pausaMs = Date.now();
    if (this.cronometro !== undefined) clearInterval(this.cronometro);
    this.cronometro = undefined;
  }

  /** Desloca o início pelo tempo parado, e o relógio continua de onde ia. */
  private retomarCronometro(): void {
    if (this.inicioMs === undefined || this.pausaMs === undefined) return;

    this.inicioMs += Date.now() - this.pausaMs;
    this.pausaMs = undefined;
    this.cronometro ??= setInterval(() => {
      this.pintarRelogio();
    }, PASSO_RELOGIO);
  }

  private pintarRelogio(): void {
    this.elRelogio.textContent = relogio(this.decorrido());
  }

  private desfazer(): void {
    this.estado = undoPuzzle(this.estado);
    this.view.montar(this.estado.game.board, this.estado.game.marcas);
    this.view.marcarSugestao(undefined);
    this.pintar();
  }

  /**
   * Recomeçar **a meio**: a mesma tentativa, com o reinício a contar para o
   * selo. É o custo desenhado — quem recomeça para fugir de um erro não sai
   * com «Perfeito» (ver `seal`).
   */
  private reiniciar(): void {
    this.recomecarCom(restartPuzzle(this.estado));
  }

  /**
   * Jogar **outra vez** um nível acabado: uma tentativa nova, com o selo todo
   * em jogo.
   *
   * Não é o mesmo que reiniciar. O `restartPuzzle` guarda os undos e soma um
   * reinício, e com ele o «Repetir» do painel de fim convidava a caçar o
   * «Perfeito» numa partida que já só podia dar «Concluído» — por muito bem que
   * fosse jogada. Acabar o nível fecha a tentativa; a seguinte começa do zero,
   * exatamente como se o jogador tivesse voltado à grelha e entrado outra vez.
   */
  private novaTentativa(): void {
    this.recomecarCom(startPuzzle(this.estado.game.level));
  }

  private recomecarCom(estado: PuzzleState): void {
    this.estado = estado;

    this.pararCronometro();
    this.paradoMs = 0;
    this.pintarRelogio();

    this.view.montar(this.estado.game.board, this.estado.game.marcas);
    this.view.marcarSugestao(undefined);
    this.pintar();
  }

  private pedirDica(): void {
    const { state, result } = usePuzzleHint(this.estado);
    this.estado = state;

    if (result?.group !== undefined) {
      this.view.marcarSugestao(result.group);
    }

    this.pintar();
  }

  /* ─── desenho ───────────────────────────────────────────────────────────── */

  private pintar(): void {
    const jogo = this.estado.game;
    const nivel = jogo.level;

    this.elTitulo.textContent = this.opcoes.titulo ?? nivel.id;

    const restantes = jogo.board.reduce((n, col) => n + col.length, 0);
    const total = nivel.metrics?.pieces ?? restantes;

    /*
     * As peças ficam **em último**, encostadas à direita, e a contagem de
     * jogadas saiu.
     *
     * O número de jogadas não era informação nenhuma: cada jogada tira
     * exatamente 7, portanto `jogadas` é `soma/7` menos o que falta — o mesmo
     * que as peças já dizem, contado por outro lado. Era a última sobra do
     * `bestMoves`, que morreu pela mesma razão.
     *
     * O andaime da soma das faces vai antes, para que o par que sobra acabe na
     * margem: com ele depois, as peças ficavam a meio da linha.
     */
    /*
     * Cada entrada num `<span>` próprio, e não em nós de texto soltos.
     *
     * Um nó de texto **não é um item de flex** — vai para uma caixa anónima, e o
     * `gap: 14px` da `.meta` nunca lhe chegava. Era o que colava `faces somam 62`
     * a `26/26 peças` numa só palavra; passou despercebido enquanto a terceira
     * entrada empurrava as outras.
     */
    this.elMeta.replaceChildren(
      ...this.andaime(),
      spanMeta(`${String(restantes)}/${String(total)} peças`),
    );

    this.pintarRelogio();
    this.pintarSelecao();
    this.view.marcarSelecao(new Set(jogo.selection));

    const joker = jogo.selection.find((p) => cellAt(jogo.board, p) === JOKER);
    this.view.marcarJoker(joker, jogo.jokerAs);

    /*
     * ── Com o nível ganho, o rodapé fecha ──
     *
     * O painel de fim abre no palco, e os botões de corrigir ficavam **por baixo
     * dele, vivos**. Desfazer depois de ganhar desfaz a vitória: o painel
     * continuava aberto a anunciar um selo por cima de um tabuleiro que já não
     * estava vazio. Reiniciar deitava fora a partida que o painel estava a
     * mostrar — e o painel já oferece «Repetir», que faz o mesmo dizendo o que
     * faz.
     *
     * Desativados e não só inertes: um botão que não responde ao toque mas
     * continua com ar de botão lê-se como a aplicação a falhar. A dica já era
     * assim, e agora as três dizem a mesma coisa.
     */
    const ganhou = isFinished(jogo);

    this.btDesfazer.disabled =
      ganhou || (jogo.selection.length === 0 && jogo.history.length === 0);
    this.btReiniciar.disabled = ganhou;
    this.btDica.disabled = this.estado.hintsLeft <= 0 || ganhou;

    this.btDica.replaceChildren(
      iconeDica(),
      texto("Dica"),
      spanContador(String(this.estado.hintsLeft)),
    );

    this.pintarFim();
  }

  /**
   * A soma das faces, enquanto o andaime durar e o joker ainda lá estiver.
   *
   * Lê-se do tabuleiro **atual** e não do inicial: cada jogada tira exatamente
   * 7, portanto o valor do joker não muda, mas o número que o jogador tem à
   * frente sim — e um número desatualizado é pior do que nenhum.
   *
   * Desaparece assim que o joker é gasto, porque a partir daí a soma é múltipla
   * de 7 e não informa nada.
   */
  private andaime(): readonly Node[] {
    if (this.opcoes.mostrarSomaDasFaces !== true) return [];

    const { board } = this.estado.game;
    if (jokerAt(board) === undefined) return [];

    return [spanMeta(`faces somam ${String(totalSum(board))}`)];
  }

  private pintarSelecao(): void {
    const jogo = this.estado.game;

    /*
     * Sem andaime, a linha da soma não existe — nem vazia. O `pintarAviso`
     * continua a correr, porque uma recusa tem de aparecer em todos os
     * capítulos: o que saiu foi a conta, não a explicação.
     */
    if (this.opcoes.mostrarSoma !== true) {
      this.elSoma.replaceChildren();
      this.elSoma.hidden = true;
      this.pintarAviso();
      return;
    }

    if (jogo.selection.length === 0) {
      this.elSoma.replaceChildren(texto("Toca nas peças para somar 7"));
      this.elSoma.classList.add("vazia");
      this.elAviso.replaceChildren();
      return;
    }

    this.elSoma.classList.remove("vazia");

    const parcelas = jogo.selection
      .map((p) => {
        const v = cellAt(jogo.board, p);
        // O joker mostra-se pelo valor que o jogador lhe deu: é isso que conta
        // para a soma, e é isso que ele precisa de reler.
        if (v === JOKER) return jogo.jokerAs === undefined ? "✳" : `✳${String(jogo.jokerAs)}`;
        return String(v ?? "?");
      })
      .join(" + ");

    const soma = selectionTotal(jogo);

    /*
     * Com uma peça só, "3 = 3" não informa ninguém — e com o joker sozinho dava
     * "✳ = 0", que é pior do que inútil. A soma corrente que o plano §3.1 exige
     * aparece a partir da segunda peça, que é quando passa a haver conta.
     */
    if (jogo.selection.length === 1) {
      this.elSoma.replaceChildren(spanParcelas(parcelas));
    } else {
      this.elSoma.replaceChildren(
        spanParcelas(`${parcelas} = `),
        texto(String(soma)),
      );
    }

    this.pintarAviso();
  }

  /**
   * O aviso diz o que falta, e **nunca a resposta**.
   *
   * O valor que o joker *tem* de tomar para o tabuleiro fechar fica de fora de
   * propósito: descobri-lo é o desafio, e revelá-lo anulava a única decisão que
   * o joker oferece (`[M 2.6]`).
   */
  private pintarAviso(): void {
    const jogo = this.estado.game;

    if (jogo.rejection === "over-target") {
      this.elAviso.dataset["tipo"] = "erro";
      this.elAviso.replaceChildren(marca("⚠"), texto("essa peça passava de 7"));
      this.recusou();
      return;
    }

    /*
     * Diz a regra, não a jogada. "Só sai com uma peça" é o que o jogador
     * precisa de saber para perceber a recusa; qual é a peça que completa 7 é
     * aritmética que ele faz, e é o desafio.
     */
    if (jogo.rejection === "gelo-so-a-par") {
      this.elAviso.dataset["tipo"] = "erro";
      this.elAviso.replaceChildren(
        marca("❄"),
        texto("uma peça gelada só sai com uma peça"),
      );
      this.recusou();
      return;
    }

    /*
     * O `faltam N` é a mesma conta da linha da soma, dita por outras palavras, e
     * sai com ela: fora do Tutorial ninguém diz ao jogador quanto falta.
     *
     * Também não faria sentido sozinho — sem seleção `faltam 7` é o alvo do
     * jogo escrito em permanência.
     */
    const falta =
      this.opcoes.mostrarSoma === true && jogo.selection.length > 0
        ? remainingToTarget(jogo)
        : 0;

    if (falta > 0) {
      this.elAviso.dataset["tipo"] = "convite";
      this.elAviso.replaceChildren(texto(`faltam ${String(falta)}`));
      return;
    }

    this.elAviso.replaceChildren();
  }

  /**
   * A recusa aparece, em vez de já estar ali.
   *
   * É a única resposta que o jogo dá a um toque que não muda o tabuleiro: a peça
   * não sai, nada se mexe, e a explicação era uma linha de texto que se
   * materializava debaixo das peças — onde os olhos não estão. No telemóvel há a
   * vibração, mas na web não há nada, e uma recusa que não se vê é
   * indistinguível de um toque que não foi registado.
   *
   * O `faltam N` não passa por aqui de propósito: muda a cada peça que se toca, e
   * um número que pisca a cada toque é um número que se deixa de ler.
   */
  private recusou(): void {
    reanimar(this.elAviso, "surge");
  }

  private pintarFim(): void {
    const jogo = this.estado.game;

    if (isBlocked(jogo)) {
      this.pintarPreso();
      this.elFim.hidden = true;
      return;
    }

    this.fecharBeco();

    if (!isFinished(jogo)) {
      this.elFim.hidden = true;
      delete this.elFim.dataset["tipo"];
      this.marcarTerminado(false);
      return;
    }

    this.elFim.dataset["tipo"] = "ganhou";

    const selo = seal(this.estado) ?? "completed";
    const acabouAgora = this.elFim.hidden;

    if (acabouAgora) {
      this.pararCronometro();
      vibrarVitoria();
      this.opcoes.aoTerminar?.({
        level: jogo.level,
        selo,
        tempoMs: this.paradoMs,
      });

      // O recorde a bater passa a ser o desta partida, se o bateu: quem
      // carregar em «Repetir» compara-se com o que acabou de fazer.
      this.recordeAntes = this.recorde;
      if (this.paradoMs > 0 && (this.recorde === 0 || this.paradoMs < this.recorde)) {
        this.recorde = this.paradoMs;
      }
    }

    this.elFim.hidden = false;
    this.marcarTerminado(true);

    /*
     * O selo é o título, e leva o glifo da grelha à frente — é o que o jogador
     * vai lá encontrar. O tempo vem logo a seguir e em grande, porque é a única
     * coisa do painel que muda de partida para partida sem mudar o selo.
     */
    const cabeca = document.createElement("div");
    cabeca.className = "fim-cabeca";

    const glifo = document.createElement("span");
    glifo.className = "fim-glifo";
    glifo.dataset["selo"] = selo;
    glifo.setAttribute("aria-hidden", "true");
    glifo.textContent = SELO_GLIFO[selo] ?? "";

    const titulo = document.createElement("div");
    titulo.className = "selo";
    titulo.textContent = SELO_TEXTO[selo] ?? selo;

    cabeca.append(glifo, titulo);

    const tempo = document.createElement("div");
    tempo.className = "fim-tempo";
    tempo.textContent = relogio(this.paradoMs);

    /*
     * Os três números em colunas, e não numa frase com pontos a separar: são
     * três contagens que se comparam de relance com as da última vez, e uma
     * frase tem de se ler até ao fim para se chegar à terceira.
     */
    const detalhe = document.createElement("div");
    detalhe.className = "detalhe fim-numeros";
    detalhe.append(
      numeroFim(jogo.moves, "jogadas"),
      numeroFim(jogo.undos, "desfeitas"),
      numeroFim(jogo.hints, "dicas"),
    );

    const acoes = document.createElement("div");
    acoes.className = "acoes fim-acoes";

    const repetir = botao("Repetir", "com-icone");
    repetir.prepend(iconeReiniciar());
    repetir.addEventListener("click", () => {
      this.novaTentativa();
    });
    acoes.appendChild(repetir);

    let principal: HTMLButtonElement = repetir;

    if (this.opcoes.aoPedirSeguinte !== undefined) {
      const seguinte = botao("Nível seguinte", "primario com-icone");
      seguinte.appendChild(iconeSeguir());
      seguinte.addEventListener("click", () => {
        this.opcoes.aoPedirSeguinte?.();
      });
      acoes.appendChild(seguinte);
      principal = seguinte;
    }

    this.elFim.replaceChildren(cabeca, tempo, detalhe, this.marcaDoRecorde(), acoes);

    /*
     * Quem jogou por teclado continua no teclado: o foco passa para a ação
     * principal. Quem jogou com o dedo não ganha anel de foco nenhum — o
     * `:focus-visible` só se acende quando a última interação foi de teclado.
     */
    if (acabouAgora && document.activeElement?.closest(".tabuleiro") != null) {
      principal.focus({ preventScroll: true });
    }
  }

  /**
   * O palco em estado de fim: o tabuleiro recua e o convite para tocar em peças
   * sai. Um convite a jogar debaixo de um nível acabado era uma contradição à
   * vista.
   */
  private marcarTerminado(terminado: boolean): void {
    this.palco.classList.toggle("terminado", terminado);
    if (terminado) this.raiz.dataset["estado"] = "fim";
    else delete this.raiz.dataset["estado"];
  }

  /**
   * O painel de beco sem saída.
   *
   * **Desfazer é o botão principal, e reiniciar o secundário** — ao contrário
   * do que a sugestão pedia. Na campanha o undo é ilimitado e grátis, e é o
   * único caminho que mostra *onde* é que a coisa correu mal: reiniciar deita
   * fora o trabalho todo e não ensina nada. Com joker isto pesa ainda mais,
   * porque a jogada fatal está quase sempre umas quantas atrás e foi invisível
   * quando aconteceu.
   *
   * É um `<dialog>` a meio do ecrã, com escurecimento por trás.
   *
   * **Dispensável.** O tabuleiro encravado é a lição, e um modal que não se
   * pode fechar esconde a única coisa que há para ver. O `✕`, o `Esc` e o clique
   * no escurecimento fecham-no; os botões do rodapé continuam lá, portanto
   * fechar não deixa ninguém sem saída — e `becoMostrado` impede que ele volte
   * a saltar sozinho no mesmo beco.
   *
   * `showModal` dá foco preso e `Esc` de graça, mas não existe em jsdom. O
   * `open = true` é a rede: mostra o mesmo diálogo, só sem o comportamento
   * modal.
   */
  private pintarPreso(): void {
    if (this.becoMostrado) return;
    this.becoMostrado = true;

    const jogo = this.estado.game;
    const restantes = jogo.board.reduce((n, col) => n + col.length, 0);

    const fechar = botaoRedondo(iconeFechar(), "ver o tabuleiro", () => {
      this.esconderBeco();
    });

    const titulo = document.createElement("h2");
    titulo.className = "popup-titulo";
    titulo.textContent = "Ups! Beco sem saída!";

    const detalhe = document.createElement("p");
    detalhe.className = "popup-texto";
    detalhe.textContent =
      restantes === 1
        ? "Sobrou 1 peça, e já não há nenhum grupo que some 7."
        : `Sobraram ${String(restantes)} peças, e já não há nenhum grupo que some 7.`;

    /*
     * O conteúdo vive num invólucro para que o clique no escurecimento seja
     * distinguível: num `<dialog>`, o clique no fundo chega com `target` no
     * próprio diálogo — mas o mesmo aconteceria a um clique no seu enchimento.
     * Com o enchimento no invólucro, `target === elBeco` só sobra para o fundo.
     */
    const corpo = document.createElement("div");
    corpo.className = "popup-corpo";
    corpo.append(fechar, titulo, detalhe);
    this.elBeco.replaceChildren(corpo);

    // Só nos níveis com joker, porque só aí o erro é invisível quando se comete.
    if (jogo.level.joker !== undefined) {
      const nota = document.createElement("p");
      nota.className = "popup-texto";
      nota.textContent = "Com o joker, a jogada fatal costuma estar umas atrás.";
      corpo.appendChild(nota);
    }

    const acoes = document.createElement("div");
    acoes.className = "acoes";

    // Um tabuleiro sem histórico começou encravado, o que seria um defeito de
    // geração. Não se promete um desfazer que não existe.
    if (jogo.history.length > 0) {
      const desfazer = botao("Desfazer", "primario");
      desfazer.addEventListener("click", () => {
        this.esconderBeco();
        this.desfazer();
      });
      acoes.appendChild(desfazer);
    }

    const reiniciar = botao(
      "Reiniciar",
      jogo.history.length > 0 ? undefined : "primario",
    );
    reiniciar.addEventListener("click", () => {
      this.esconderBeco();
      this.reiniciar();
    });
    acoes.appendChild(reiniciar);

    corpo.appendChild(acoes);

    if (typeof this.elBeco.showModal === "function") this.elBeco.showModal();
    else this.elBeco.open = true;
  }

  /**
   * Fecha a caixa e mais nada. **Não mexe em `becoMostrado`** — dispensar o
   * aviso não é sair do beco, e quem o dispensou não quer vê-lo outra vez ao
   * primeiro repintar.
   */
  private esconderBeco(): void {
    if (!this.elBeco.open) return;
    if (typeof this.elBeco.close === "function") this.elBeco.close();
    else this.elBeco.open = false;
  }

  /** Sair do beco fecha a caixa e rearma-a para a próxima vez que aconteça. */
  private fecharBeco(): void {
    this.becoMostrado = false;
    this.esconderBeco();
  }
}

/* ─── fábricas ────────────────────────────────────────────────────────────── */

function botao(rotulo: string, extra?: string): HTMLButtonElement {
  const b = document.createElement("button");
  b.type = "button";
  b.className = extra === undefined ? "btn" : `btn ${extra}`;
  b.textContent = rotulo;
  return b;
}

/**
 * Um botão que é só o ícone.
 *
 * O nome não desaparece — muda de sítio. Vai para `aria-label`, que é o que um
 * leitor de ecrã lê, e para `title`, que é o que aparece a quem passa o rato e
 * não reconheceu o desenho. Um botão de ícone sem nenhum dos dois é um botão que
 * só quem já sabe consegue usar.
 */
function botaoIcone(glifo: SVGElement, nome: string): HTMLButtonElement {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "btn so-icone";
  b.setAttribute("aria-label", nome);
  b.title = nome;
  b.appendChild(glifo);
  return b;
}

const texto = (s: string): Text => document.createTextNode(s);

/** Uma entrada da meta. Ver `pintar`: em texto solto, o `gap` não lhe chega. */
function spanMeta(s: string): HTMLElement {
  const el = document.createElement("span");
  el.textContent = s;
  return el;
}

function marca(s: string): HTMLElement {
  const el = document.createElement("span");
  el.className = "marca";
  el.textContent = s;
  return el;
}

function spanParcelas(s: string): HTMLElement {
  const el = document.createElement("span");
  el.className = "parcelas";
  el.textContent = s;
  return el;
}

/** Uma coluna dos números do fim: o valor em cima, o que ele conta por baixo. */
function numeroFim(n: number, rotulo: string): HTMLElement {
  const el = document.createElement("span");
  el.className = "fim-numero";

  const valor = document.createElement("b");
  valor.textContent = String(n);

  el.append(valor, texto(rotulo));
  return el;
}

function spanContador(s: string): HTMLElement {
  const el = document.createElement("span");
  el.className = "contador";
  el.textContent = s;
  return el;
}

/** Reexportado para os testes não terem de importar da engine. */
export const posicao = (p: Packed): readonly [number, number] => [
  colOf(p),
  rowOf(p),
];
