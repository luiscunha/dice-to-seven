/**
 * O modo tempo.
 *
 * **Um relógio só, sempre à vista e dominante** (desenho §5.3). Não há countdown
 * por tabuleiro: cada tabuleiro limpo *acrescenta* tempo ao mesmo relógio, e a
 * corrida acaba quando o jogador deixa de acompanhar a exigência.
 *
 * **Cada ganho é anunciado onde aconteceu** — o `+3s` sobe da peça que o
 * produziu. O loop de reforço do plano §6.3 só funciona se o jogador ligar a
 * jogada ao prémio, e um número que aparece no cabeçalho não se liga a nada.
 *
 * **Sem undo, e não é restrição escondida.** Os níveis desta banda são
 * greedy-safe: não há como bloquear, portanto não há nada que desfazer.
 *
 * O relógio do sistema entra aqui e só aqui. A `TimeAttackSession` recebe `now`
 * por parâmetro — é o que a torna testável — e é este ecrã que lho dá.
 */

import type { Board, Cell, Level, Packed, Rng } from "@dicetoseven/engine";
import { colOf, mulberry32, rowOf } from "@dicetoseven/engine";

import type {
  Escada,
  TimeAttackConfig,
  TimeAttackState,
} from "../session/TimeAttackSession";
import {
  DEFAULT_TIME_ATTACK,
  armarBomba,
  escadaDeTamanho,
  isOver,
  nextBoard,
  nivelDoTabuleiro,
  pavioRestante,
  remainingMs,
  resolverBomba,
  startTimeAttack,
  tapTimeAttack,
} from "../session/TimeAttackSession";
import { vibrarExplosao, vibrarRecusa } from "../plataforma/nativo";
import { BoardView } from "./BoardView";
import { botao, botaoRedondo, confirmar, elemento, reanimar } from "./dom";
import { iconeReiniciar, iconeVoltar } from "./icones";

/** De quanto em quanto o relógio se repinta. Décimos chegam, e custam pouco. */
const PASSO_RELOGIO = 100;

/** `1500` → `1.5s`, como o relógio e os anúncios o escrevem. */
const segundos = (ms: number): string => `${(ms / 1000).toFixed(1)}s`;

export interface OpcoesTimeAttack {
  readonly niveis: readonly Level[];
  readonly aoTerminar: (info: {
    readonly pontos: number;
    readonly tabuleiros: number;
  }) => void;
  readonly aoSair: () => void;
  /**
   * Outra corrida, a partir do painel de fim. Sem isto o botão não aparece, e o
   * fim tem só a saída — que era o que havia: acabar uma corrida obrigava a
   * voltar à Home para começar outra.
   */
  readonly aoRecomecar?: () => void;
  readonly melhorPontuacao: number;
  /**
   * Segundos de arranque. O plano §6.3 pede um começo generoso, mas quanto é
   * generoso é número de playtest — daí ser uma definição e não uma constante.
   */
  readonly tempoInicial: number;
  /**
   * A economia da corrida, por cima dos valores de partida. O tempo de arranque
   * continua a vir de `tempoInicial`.
   *
   * Existe para os testes poderem armar uma bomba logo no primeiro tabuleiro,
   * sem esperar por três tabuleiros limpos e por um sorteio a favor.
   */
  readonly afinacao?: Partial<Omit<TimeAttackConfig, "initialMs">>;
}

/**
 * Um retângulo do tamanho do maior tabuleiro que a corrida pode mostrar.
 *
 * Largura e altura medidas **em separado**, e não as do mesmo nível: o
 * tabuleiro mais largo do pack não é o mais alto, e dimensionar pelo mais largo
 * deixava o mais alto a transbordar o palco.
 */
function maiorTabuleiro(niveis: readonly Level[]): Board {
  let largura = 1;
  let altura = 1;

  for (const n of niveis) {
    largura = Math.max(largura, n.board.length);
    for (const col of n.board) altura = Math.max(altura, col.length);
  }

  return Array.from({ length: largura }, () =>
    Array.from({ length: altura }, () => 1 as Cell),
  );
}

export class TimeAttackScreen {
  private readonly raiz: HTMLElement;
  private readonly view: BoardView;
  private readonly palco: HTMLElement;
  private readonly opcoes: OpcoesTimeAttack;

  private readonly elRelogio: HTMLElement;
  private readonly elMeta: HTMLElement;
  private readonly elFim: HTMLElement;

  private estado: TimeAttackState;
  private readonly config: TimeAttackConfig;
  private readonly escada: Escada;
  private readonly rng: Rng;
  private indice = 0;
  private cronometro: ReturnType<typeof setInterval> | undefined;
  private readonly aoVoltarAoEcra: () => void;
  private terminado = false;

  constructor(host: HTMLElement, opcoes: OpcoesTimeAttack) {
    this.opcoes = opcoes;

    /*
     * **Os tabuleiros crescem com a corrida.** Um por degrau, do mais pequeno
     * ao maior, e depois do último degrau sai sempre do cume — ver
     * `escadaDeTamanho`. Antes era um baralhar puro de todos os níveis: o
     * quinto tabuleiro podia ser menor do que o primeiro, e a única coisa que
     * endurecia durante a corrida era o relógio.
     *
     * Dentro de cada degrau o nível é sorteado, e a seed vem do relógio: duas
     * corridas seguidas não dão a mesma sequência, que é o que impedia o modo
     * de virar um exercício de memória. Aqui não há nada a reproduzir.
     */
    this.rng = mulberry32(Date.now() >>> 0);
    this.escada = escadaDeTamanho(opcoes.niveis, this.rng);

    const primeiro = this.escada.ordem[0];
    if (primeiro === undefined) throw new Error("não há níveis para o modo tempo");

    this.config = {
      ...DEFAULT_TIME_ATTACK,
      ...opcoes.afinacao,
      initialMs: opcoes.tempoInicial * 1000,
    };

    const arranque = Date.now();
    this.estado = armarBomba(
      startTimeAttack(primeiro, arranque, this.config),
      arranque,
      this.rng,
      this.config,
    );

    this.raiz = elemento("div", "ecra jogo tempo");

    /* ── topo: o relógio manda ── */
    const topo = elemento("header", "topo tempo-topo");

    const sair = botaoRedondo(iconeVoltar(), "sair da corrida", () => {
      this.pedirParaSair();
    });

    this.elRelogio = elemento("div", "relogio");
    this.elRelogio.setAttribute("role", "timer");
    this.elMeta = elemento("div", "meta");

    topo.append(sair, this.elRelogio, this.elMeta);

    /* ── palco ── */
    this.palco = elemento("div", "palco");

    /*
     * O fim abre no palco, por cima do tabuleiro que ficou por acabar — como na
     * campanha. É onde o olho está quando o relógio chega a zero.
     */
    this.elFim = elemento("div", "fim");
    this.elFim.setAttribute("role", "status");
    this.elFim.hidden = true;
    this.palco.appendChild(this.elFim);

    /*
     * ── Sem rodapé ──
     *
     * Tinha um, e tinha lá dentro uma coisa só: «Toca nas peças para somar 7»,
     * que passava a «4 / 7» com a seleção aberta. Andaime a mais para um modo
     * contra o relógio — a conta está nas peças acesas, e relê-la em texto no
     * fundo do ecrã é tempo gasto a olhar para onde não se joga.
     *
     * Sem ele o rodapé ficava vazio a ocupar uma linha da grelha, e na
     * composição deitada uma calha inteira. Sai o elemento, e o tabuleiro fica
     * com o espaço — que num modo em que os tabuleiros crescem é o que vale.
     */
    this.raiz.append(topo, this.palco);
    host.replaceChildren(this.raiz);

    this.view = new BoardView(this.palco, {
      aoTocar: (p) => void this.tocar(p),
    });

    /*
     * **A peça mede-se pelo maior tabuleiro da corrida; a caixa segue o do
     * momento.** São duas coisas, e confundi-las estraga uma delas.
     *
     * Medir a peça pelo tabuleiro do momento destruía a funcionalidade inteira:
     * com a peça a encolher à medida que o tabuleiro cresce, um de dez peças e
     * um de vinte ocupam exatamente a mesma largura no ecrã, e o jogador
     * **nunca vê o tabuleiro crescer**. A escada existia nos números e em mais
     * lado nenhum.
     *
     * Mas fixar também a **caixa** no máximo deixava um tabuleiro de quatro
     * colunas encostado ao canto de um enquadramento feito para sete. As peças
     * ancoram à coluna 0 e isso não se negoceia — é para lá que o colapso
     * empurra as colunas, e centrá-las fazia cada colapso mexer no tabuleiro
     * todo em vez de só à direita do buraco. O que se centra é a caixa, e para
     * isso ela tem de ter o tamanho do tabuleiro que lá está.
     */
    this.view.dimensionarPara(maiorTabuleiro(opcoes.niveis), {
      caixaPorTabuleiro: true,
    });
    this.view.montar(primeiro.board);

    this.cronometro = setInterval(() => {
      this.tique();
    }, PASSO_RELOGIO);

    /*
     * O `setInterval` não é fonte de verdade — é só quem manda repintar. O tempo
     * vive no `deadlineAt` e lê-se sempre de `Date.now()`.
     *
     * A distinção passa a importar quando o separador vai para segundo plano: o
     * browser estrangula os temporizadores, e num telemóvel com o ecrã desligado
     * pára-os de vez. Sem isto, quem volta encontra o relógio congelado no
     * instante em que saiu e uma corrida que já devia ter acabado. Verificar ao
     * regressar resolve-o na hora.
     */
    this.aoVoltarAoEcra = () => {
      this.tique();
    };
    document.addEventListener("visibilitychange", this.aoVoltarAoEcra);

    this.pintar();
  }

  destruir(): void {
    this.pararRelogio();
    document.removeEventListener("visibilitychange", this.aoVoltarAoEcra);
    this.view.destruir();
    this.raiz.remove();
  }

  /**
   * O botão **para trás** do Android: o mesmo caminho da seta.
   *
   * Antes saía direto — sem perguntar, e sem `terminar()`, portanto a
   * pontuação da corrida nunca chegava a ser gravada. Numa corrida acabada não
   * há nada a proteger, e deixa-se navegar.
   */
  interceptarVoltar(): boolean {
    if (this.terminado) return false;

    this.pedirParaSair();
    return true;
  }

  /**
   * Sair acaba a corrida — não há como a retomar, porque o relógio andou.
   * Num telemóvel a seta fica onde o polegar já está, e um toque por engano
   * custava a corrida inteira.
   */
  private pedirParaSair(): void {
    if (this.terminado) {
      this.opcoes.aoSair();
      return;
    }

    confirmar(this.raiz, {
      titulo: "Sair da corrida?",
      texto: "O relógio não pára: a corrida acaba aqui.",
      confirmar: "Sair",
      aoConfirmar: () => {
        this.terminar();
        this.opcoes.aoSair();
      },
    });
  }

  /* ─── jogar ─────────────────────────────────────────────────────────────── */

  private async tocar(p: Packed): Promise<void> {
    if (this.terminado) return;

    const antes = this.estado;

    const r = tapTimeAttack(antes, p, Date.now(), { time: this.config });
    this.estado = r.state;

    // O pavio acabou antes de o toque chegar: a bomba rebenta primeiro, como
    // a sessão decidiu.
    if (r.rebentou !== undefined) this.rebentar(r.rebentou);

    if (r.penalizado) this.multar(p);

    const grupo = r.state.game.lastMove;

    if (r.moved && grupo !== undefined) {
      // A âncora do anúncio calcula-se **antes** de as peças saírem: depois já
      // não há de onde o `+3s` subir.
      if (r.gainedMs > 0) this.anunciar(`+${segundos(r.gainedMs)}`, grupo);
      if (r.desarmou) this.view.desarmarBomba();

      await this.view.aplicarJogada(grupo);

      if (r.cleared) this.avancarTabuleiro();
    }

    this.pintar();
  }

  private avancarTabuleiro(): void {
    this.indice += 1;

    const seguinte = nivelDoTabuleiro(this.escada, this.indice, this.rng);
    if (seguinte === undefined) return;

    // Sem `dimensionarPara`: a peça foi fixada no arranque, e é isso que deixa
    // o tabuleiro crescer à vista. Ver o construtor.
    //
    // O pavio conta a partir de agora, que é quando o jogador vê o tabuleiro —
    // e não do toque que limpou o anterior, que ainda estava a animar.
    const agora = Date.now();
    this.estado = armarBomba(
      nextBoard(this.estado, seguinte),
      agora,
      this.rng,
      this.config,
    );
    this.view.montar(seguinte.board);
  }

  /**
   * A bomba rebentou: o tabuleiro estremece, a perda sobe da peça e o relógio
   * acusa-a.
   *
   * É o acontecimento mais pesado do modo, e é o único com abanão. Um toque
   * errado custa menos e diz-se com menos; ver `multar`.
   */
  private rebentar(at: Packed): void {
    this.anunciar(
      `−${segundos(this.config.bomba.penalizacaoMs)}`,
      [at],
      "perda grande",
    );
    this.view.rebentarBomba(at);
    reanimar(this.elRelogio, "perdeu");
    vibrarExplosao();
  }

  /** O toque passava de 7: a peça diz que não, e a perda sobe dela. */
  private multar(p: Packed): void {
    this.anunciar(`−${segundos(this.config.penalizacaoMs)}`, [p], "perda");
    this.view.recusarPeca(p);
    reanimar(this.elRelogio, "perdeu");
    vibrarRecusa();
  }

  /* ─── relógio ───────────────────────────────────────────────────────────── */

  private tique(): void {
    if (this.terminado) return;

    const agora = Date.now();
    const r = resolverBomba(this.estado, agora, this.config);
    if (r.rebentou !== undefined) {
      this.estado = r.state;
      this.rebentar(r.rebentou);
    }

    this.pintarRelogio();
    this.pintarBomba(agora);
    if (isOver(this.estado, agora)) this.terminar();
  }

  private pararRelogio(): void {
    if (this.cronometro !== undefined) clearInterval(this.cronometro);
    this.cronometro = undefined;
  }

  private terminar(): void {
    if (this.terminado) return;

    this.terminado = true;
    this.pararRelogio();
    this.pintarRelogio();
    // Um pavio parado a meio, por cima do painel de fim, lia-se como uma bomba
    // que ainda ia rebentar.
    this.pintarBomba();

    this.opcoes.aoTerminar({
      pontos: this.estado.score,
      tabuleiros: this.estado.boardsCleared,
    });

    this.pintarFim();
  }

  /* ─── desenho ───────────────────────────────────────────────────────────── */

  private pintar(): void {
    this.pintarRelogio();

    /*
     * Cada contagem num `<span>`: dois nós de texto seguidos não são itens de
     * flex, o `gap` da `.meta` não lhes chegava, e o cabeçalho lia
     * «0 pontos0 tabuleiros». É o mesmo defeito que a campanha já tinha
     * corrigido na contagem de peças.
     */
    this.elMeta.replaceChildren(
      elemento("span", undefined, `${String(this.estado.score)} pontos`),
      elemento("span", undefined, `${String(this.estado.boardsCleared)} tabuleiros`),
    );

    const jogo = this.estado.game;
    this.view.marcarSelecao(new Set(jogo.selection));
    this.pintarBomba();
  }

  /**
   * O pavio, à décima de segundo.
   *
   * A bomba é da sessão e o pavio é desenho: a vista recebe a posição e quanto
   * falta, e não sabe nada de prazos. Depois de uma jogada a posição já é a
   * nova — a sessão segue a peça na gravidade, e a vista segue o elemento.
   */
  private pintarBomba(agora = Date.now()): void {
    const bomba = this.estado.bomba;
    const resta = pavioRestante(this.estado, agora);

    if (this.terminado || bomba === undefined || resta === undefined) {
      this.view.marcarBomba(undefined);
      return;
    }

    this.view.marcarBomba(
      bomba.at,
      resta / this.config.bomba.pavioMs,
      Math.ceil(resta / 1000),
    );
  }

  /**
   * O relógio, em segundos.
   *
   * Abaixo de dez segundos passa a mostrar décimos e ganha a classe `a-acabar`.
   * Não é enfeite: é o único aviso que o modo dá, e sem ele o fim chega sem que
   * o jogador tenha tido hipótese de acelerar.
   */
  private pintarRelogio(): void {
    const ms = remainingMs(this.estado, Date.now());
    const s = ms / 1000;

    this.elRelogio.textContent = s < 10 ? s.toFixed(1) : String(Math.ceil(s));
    this.elRelogio.classList.toggle("a-acabar", s < 10);
  }

  /**
   * O `+3s` a subir do sítio onde foi ganho — e o `−1.5s` do sítio onde foi
   * perdido.
   *
   * Perder diz-se no mesmo sítio e da mesma maneira que ganhar, a vermelho. O
   * relógio só fica a saber o porquê do salto se o jogador ligar o número à
   * peça, e é essa ligação que ensina o que não voltar a fazer.
   */
  private anunciar(
    texto: string,
    selecao: readonly Packed[],
    variante?: string,
  ): void {
    const caixas = selecao
      .map((p) => this.view.caixaDe(p))
      .filter((r): r is DOMRect => r !== undefined);

    if (caixas.length === 0) return;

    const palco = this.palco.getBoundingClientRect();
    const x =
      caixas.reduce((n, r) => n + r.left + r.width / 2, 0) / caixas.length -
      palco.left;
    const y =
      caixas.reduce((n, r) => n + r.top, 0) / caixas.length - palco.top;

    const el = elemento(
      "div",
      variante === undefined ? "ganho" : `ganho ${variante}`,
      texto,
    );
    el.style.left = `${String(Math.round(x))}px`;
    el.style.top = `${String(Math.round(y))}px`;

    this.palco.appendChild(el);
    el.addEventListener("animationend", () => {
      el.remove();
    });
  }

  private pintarFim(): void {
    this.elFim.hidden = false;
    this.palco.classList.toggle("terminado", true);
    this.raiz.dataset["estado"] = "fim";

    const recorde = this.estado.score > this.opcoes.melhorPontuacao;

    const acoes = elemento("div", "acoes fim-acoes");
    acoes.appendChild(
      botao("Sair", undefined, () => {
        this.opcoes.aoSair();
      }),
    );

    const aoRecomecar = this.opcoes.aoRecomecar;
    if (aoRecomecar !== undefined) {
      const outra = botao("Jogar outra vez", "primario com-icone", aoRecomecar);
      outra.prepend(iconeReiniciar());
      acoes.appendChild(outra);
    }

    /*
     * A pontuação é o número do modo, e ganha o tamanho que o tempo tem no fim
     * de um nível da campanha. Os tabuleiros ficam por baixo, como contexto.
     */
    this.elFim.replaceChildren(
      elemento("div", "selo", recorde ? "Novo recorde" : "Acabou o tempo"),
      elemento("div", "fim-tempo", `${String(this.estado.score)} pontos`),
      elemento(
        "div",
        "detalhe",
        this.estado.boardsCleared === 1
          ? "1 tabuleiro limpo"
          : `${String(this.estado.boardsCleared)} tabuleiros limpos`,
      ),
      acoes,
    );

    // Quem jogava por teclado continua no teclado — ver o mesmo no PuzzleScreen.
    if (document.activeElement?.closest(".tabuleiro") != null) {
      acoes.querySelector<HTMLElement>(".primario, .btn")?.focus({ preventScroll: true });
    }
  }

  /** Reexportado para os testes não terem de importar da engine. */
  static posicao(p: Packed): readonly [number, number] {
    return [colOf(p), rowOf(p)];
  }
}
