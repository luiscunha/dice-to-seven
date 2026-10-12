/**
 * O ecrã do Desafio do Dia: um trilho, como num jogo de tabuleiro.
 *
 * **Um desafio por dia, à vez** — Puzzle, Contra-Relógio, Survival. Foram três
 * por dia, e o desafio passou a ser uma lista de tarefas que tirava o lugar ao
 * resto do jogo. Com um só, o ecrã deixa de ser uma escolha e passa a ser um
 * caminho: os dias são casas, e **o caminho sobe** — o que vem está em cima,
 * fechado a cadeado; hoje está no meio, maior e aceso; o que ficou para trás
 * está em baixo, com o visto na cor do modo.
 *
 * Esteve como um calendário do mês. Mostrava tudo, e não dizia nada: trinta
 * casas iguais, em que hoje era uma entre as outras. O trilho diz o que um
 * calendário não diz — **que se está a avançar**, e que a casa seguinte é a
 * de hoje.
 *
 * **O balão** abre por cima da casa selecionada — hoje, ao entrar. É lá que se
 * joga: jogar, continuar, ou treinar e partilhar depois da tentativa que
 * conta. Tocar noutra casa leva-lhe o balão, com o resultado desse dia, o que
 * ficou por jogar, ou quando abre. **Só se joga o de hoje.**
 *
 * **O caminho é desenhado por cima da página já montada**: as casas fazem uma
 * onda (`ONDA`), e o SVG liga os centros delas como os mede o browser. Medir
 * em vez de calcular é o que deixa o balão viver no fluxo da página, a
 * empurrar as casas de baixo, em vez de tapar as de cima.
 */

import type { ModoDoDesafio } from "../session/desafio";
import { botao, cabecalho, elemento } from "./dom";
import {
  iconeCadeado,
  iconeCronometro,
  iconePuzzles,
  iconeReiniciar,
  iconeSurvival,
  iconeVisto,
} from "./icones";
import type { DesfechoDaPartilha } from "./partilha";
import { NOME_DO_MODO, botaoPartilhar, dataCurta, dataPorExtenso } from "./partilha";

/**
 * O desafio de hoje, como os ecrãs o mostram. Os textos vêm feitos: o ecrã não
 * sabe converter milissegundos em tempo, nem pontos em frases.
 */
export type EstadoNoCartao =
  | { readonly tipo: "por-jogar" }
  | { readonly tipo: "a-meio"; readonly texto: string }
  | { readonly tipo: "feito"; readonly texto: string }
  | { readonly tipo: "interrompido" };

/**
 * Uma casa do trilho. Hoje tem os estados do cartão; um dia passado está feito
 * ou perdido — o que ficou a meio ontem já não se acaba —; e um dia que ainda
 * não chegou é futuro.
 */
export type EstadoNoTrilho =
  | EstadoNoCartao
  | { readonly tipo: "perdido" }
  | { readonly tipo: "futuro" };

export interface DiaNoTrilho {
  /** `AAAA-MM-DD`. */
  readonly data: string;
  /** O número do desafio desse dia: o «#12». */
  readonly numero: number;
  readonly modo: ModoDoDesafio;
  readonly estado: EstadoNoTrilho;
}

export interface TrilhoDoDesafio {
  /** Hoje, `AAAA-MM-DD`: um dos dias do trilho, e o que abre selecionado. */
  readonly hoje: string;
  /** Os dias do trilho, do mais antigo ao mais recente. */
  readonly dias: readonly DiaNoTrilho[];
  /** Dias seguidos com o desafio feito. */
  readonly sequencia: number;
  /** Joga o desafio de hoje: a tentativa que conta, ou treino depois dela. */
  readonly aoJogar: () => void;
  /** Só quando o desafio de hoje está feito. */
  readonly aoPartilhar?: () => Promise<DesfechoDaPartilha>;
}

export interface OpcoesDesafio {
  readonly trilho: TrilhoDoDesafio;
  readonly aoVoltar: () => void;
}

/** O que cada desafio é, numa linha. */
export const LEGENDA_DO_MODO: Readonly<Record<ModoDoDesafio, string>> = {
  puzzle: "Um tabuleiro, o mesmo para todos. Resolve-o.",
  tempo: "Sessenta segundos, e os mesmos tabuleiros para todos.",
  survival: "As mesmas linhas para todos. Aguenta o mais que puderes.",
};

/** O ícone do modo — o mesmo do cartão dele na Home. */
export const iconeDoModo = (modo: ModoDoDesafio): SVGElement =>
  modo === "puzzle" ? iconePuzzles() : modo === "tempo" ? iconeCronometro() : iconeSurvival();

/** O sinal da sequência: o número que se quer ver crescer. */
export function sinalDaSequencia(sequencia: number): HTMLElement {
  const el = elemento("span", "desafio-sequencia", `🔥 ${String(sequencia)}`);
  el.setAttribute(
    "aria-label",
    sequencia === 1 ? "1 dia seguido" : `${String(sequencia)} dias seguidos`,
  );
  return el;
}

/**
 * A onda do trilho: o desvio de cada casa ao centro, em píxeis, pelo número do
 * dia. Pelo número, e não pela posição na lista: uma casa fica sempre no mesmo
 * sítio do caminho, e o trilho não se mexe todo quando muda o dia.
 */
const ONDA = [0, 48, 72, 48, 0, -48, -72, -48] as const;

const desvio = (numero: number): number =>
  ONDA[((numero % ONDA.length) + ONDA.length) % ONDA.length] ?? 0;

/** Quando é o dia, visto de hoje: «Hoje», «Amanhã», «Há 3 dias». */
function quando(numero: number, hoje: number): string {
  const n = numero - hoje;
  if (n === 0) return "Hoje";
  if (n === 1) return "Amanhã";
  if (n === -1) return "Ontem";
  return n > 0 ? `Daqui a ${String(n)} dias` : `Há ${String(-n)} dias`;
}

/** O estado do dia em palavras, para o nome acessível da casa. */
function estadoEmPalavras(e: EstadoNoTrilho): string {
  switch (e.tipo) {
    case "por-jogar":
      return "por jogar";
    case "a-meio":
      return "a meio";
    case "feito":
      return `feito, ${e.texto}`;
    case "interrompido":
      return "interrompido";
    case "perdido":
      return "ficou por jogar";
    case "futuro":
      return "ainda não abriu";
  }
}

/** `2026-10-07` → `7`. */
const diaDoMes = (data: string): string => String(Number(data.slice(8)));

const NS = "http://www.w3.org/2000/svg";

export class DesafioScreen {
  private readonly raiz: HTMLElement;
  private readonly rolo: HTMLElement;
  private readonly trilho: TrilhoDoDesafio;
  /** As casas, de cima para baixo: o dia mais distante primeiro. */
  private readonly ordem: readonly DiaNoTrilho[];
  private readonly elTrilho: HTMLElement;
  private readonly svg: SVGSVGElement;
  private readonly casas = new Map<string, HTMLLIElement>();
  private readonly nos = new Map<string, HTMLButtonElement>();
  private balao: HTMLElement | undefined;
  private selecionado: string;
  private readonly observador: ResizeObserver | undefined;

  constructor(host: HTMLElement, opcoes: OpcoesDesafio) {
    const t = opcoes.trilho;
    this.trilho = t;
    this.ordem = [...t.dias].reverse();
    this.selecionado = t.hoje;
    this.raiz = elemento("div", "ecra desafio");

    const { el: topo } = cabecalho("Desafio do dia", opcoes.aoVoltar);

    /* ── o caminho ── */
    this.elTrilho = elemento("div", "trilho");
    this.svg = document.createElementNS(NS, "svg");
    this.svg.setAttribute("class", "trilho-caminho");
    this.svg.setAttribute("aria-hidden", "true");

    const lista = elemento("ol", "trilho-dias");
    lista.setAttribute("aria-label", "Os desafios, de amanhã para trás");
    for (const dia of this.ordem) lista.appendChild(this.casa(dia));

    this.elTrilho.append(this.svg, lista);

    const corpo = elemento("div", "desafio-corpo");
    corpo.append(
      this.faixa(t),
      this.elTrilho,
      this.legenda(),
      elemento(
        "p",
        "desafio-nota",
        "Um desafio por dia, à vez: Puzzle, Contra-Relógio e Survival. Conta a primeira tentativa; depois é treino. Muda à meia-noite.",
      ),
    );

    this.rolo = elemento("div", "rolo");
    this.rolo.appendChild(corpo);

    this.raiz.append(topo, this.rolo);
    host.replaceChildren(this.raiz);

    this.abrirBalao();
    this.desenharCaminho();

    /*
     * O caminho volta a desenhar-se quando o trilho muda de tamanho: a letra
     * que chega depois, um ecrã que roda. Não existe nos testes (jsdom), onde
     * também não há medidas para desenhar.
     */
    this.observador =
      typeof ResizeObserver === "function"
        ? new ResizeObserver(() => {
            this.desenharCaminho();
          })
        : undefined;
    this.observador?.observe(this.elTrilho);
  }

  destruir(): void {
    this.observador?.disconnect();
    this.raiz.remove();
  }

  /* ─── A faixa da série ──────────────────────────────────────────────────── */

  /** A série em cima, e o desafio de hoje: o número e a data. */
  private faixa(t: TrilhoDoDesafio): HTMLElement {
    const el = elemento("section", "desafio-faixa");
    const hoje = t.dias.find((d) => d.data === t.hoje);

    const serie =
      t.sequencia === 0
        ? "🔥 Joga hoje e começa uma série"
        : t.sequencia === 1
          ? "🔥 Série: 1 dia"
          : `🔥 Série: ${String(t.sequencia)} dias seguidos!`;

    el.append(
      elemento("p", "desafio-faixa-serie", serie),
      elemento(
        "p",
        "desafio-faixa-hoje",
        hoje === undefined
          ? "Desafio de hoje"
          : `#${String(hoje.numero)} · Desafio de hoje · ${dataCurta(hoje.data)}`,
      ),
    );

    return el;
  }

  /* ─── As casas ──────────────────────────────────────────────────────────── */

  private casa(dia: DiaNoTrilho): HTMLLIElement {
    const hoje = dia.data === this.trilho.hoje;
    const li = document.createElement("li");
    li.className = "trilho-dia";
    li.dataset["modo"] = dia.modo;
    li.dataset["estado"] = dia.estado.tipo;
    if (hoje) li.dataset["hoje"] = "";
    li.style.setProperty("--x", `${String(desvio(dia.numero))}px`);

    const no = document.createElement("button");
    no.type = "button";
    no.className = "trilho-no";
    no.addEventListener("click", () => {
      this.selecionar(dia.data);
    });

    if (dia.estado.tipo === "feito") {
      no.appendChild(iconeVisto());
    } else {
      no.appendChild(iconeDoModo(dia.modo));
    }
    if (hoje) no.appendChild(elemento("span", "trilho-no-hoje", "Hoje"));
    if (dia.estado.tipo === "futuro") {
      const cadeado = elemento("span", "trilho-cadeado");
      cadeado.appendChild(iconeCadeado());
      no.appendChild(cadeado);
    }

    no.setAttribute(
      "aria-label",
      `${dataPorExtenso(dia.data)}${hoje ? ", hoje" : ""}: ${NOME_DO_MODO[dia.modo]}, ${estadoEmPalavras(dia.estado)}`,
    );

    li.append(
      no,
      elemento("span", "trilho-rotulo", `${dataCurta(dia.data)} · ${NOME_DO_MODO[dia.modo]}`),
    );

    this.casas.set(dia.data, li);
    this.nos.set(dia.data, no);
    return li;
  }

  /**
   * Leva o balão para outra casa. A casa tocada **não sai do sítio**: o balão
   * entra por cima dela e empurra-a, e o rolo desliza o mesmo tanto ao
   * contrário. Sem isso, tocar numa casa por cima do balão fazia-a fugir do
   * dedo.
   */
  private selecionar(data: string): void {
    if (data === this.selecionado) return;

    const no = this.nos.get(data);
    const antes = no?.getBoundingClientRect().top;

    this.selecionado = data;
    this.abrirBalao();

    const depois = no?.getBoundingClientRect().top;
    if (antes !== undefined && depois !== undefined) this.rolo.scrollTop += depois - antes;

    this.desenharCaminho();
  }

  /* ─── O balão ───────────────────────────────────────────────────────────── */

  private abrirBalao(): void {
    this.balao?.remove();

    for (const [data, no] of this.nos) {
      no.setAttribute("aria-expanded", String(data === this.selecionado));
    }

    const dia = this.ordem.find((d) => d.data === this.selecionado);
    const casa = this.casas.get(this.selecionado);
    if (dia === undefined || casa === undefined) return;

    this.balao = this.conteudoDoBalao(dia);
    casa.prepend(this.balao);
  }

  /**
   * O balão do dia: quando é e em que pé está, o modo com o que é, e o que se
   * pode fazer. Hoje é onde se joga; os outros dias só se leem — ontem já não
   * se joga, e amanhã ainda não.
   */
  private conteudoDoBalao(dia: DiaNoTrilho): HTMLElement {
    const t = this.trilho;
    const deHoje = dia.data === t.hoje;
    const numeroDeHoje = t.dias.find((d) => d.data === t.hoje)?.numero ?? dia.numero;
    const e = dia.estado;

    const el = elemento("div", "trilho-balao");
    el.dataset["estado"] = e.tipo;
    el.setAttribute("role", "group");
    el.setAttribute("aria-label", `Desafio número ${String(dia.numero)}, ${dataPorExtenso(dia.data)}`);

    /* ── a cabeça: quando, e o estado de hoje ── */
    const estadoDeHoje =
      e.tipo === "por-jogar"
        ? "por jogar"
        : e.tipo === "a-meio"
          ? `a meio · ${e.texto}`
          : e.tipo === "feito"
            ? "feito"
            : e.tipo === "interrompido"
              ? "interrompido"
              : undefined;

    const cabeca = elemento("div", "trilho-balao-cabeca");
    cabeca.appendChild(
      elemento(
        "span",
        "trilho-balao-quando",
        deHoje && estadoDeHoje !== undefined
          ? `Hoje · ${estadoDeHoje}`
          : `${quando(dia.numero, numeroDeHoje)} · #${String(dia.numero)}`,
      ),
    );
    // Fazer o de hoje é o que faz a série crescer: o prémio é esse.
    if (deHoje && (e.tipo === "por-jogar" || e.tipo === "a-meio")) {
      const premio = elemento("span", "trilho-balao-premio", "🔥 +1");
      premio.setAttribute("aria-label", "mais um dia na série");
      cabeca.appendChild(premio);
    }

    /* ── o corpo: o modo, e a ação principal ao lado ── */
    const icone = elemento("span", "desafio-modo-icone");
    icone.appendChild(iconeDoModo(dia.modo));

    const texto = elemento("span", "desafio-modo-texto");
    texto.append(
      elemento("span", "desafio-modo-nome", NOME_DO_MODO[dia.modo]),
      elemento("span", "desafio-modo-legenda", LEGENDA_DO_MODO[dia.modo]),
    );

    const corpo = elemento("div", "trilho-balao-corpo");
    corpo.append(icone, texto);

    el.append(cabeca, corpo);

    const resultado = (frase: string): HTMLElement => elemento("p", "desafio-resultado", frase);
    const treinar = (): HTMLButtonElement => {
      const b = botao("Treinar", "com-icone", t.aoJogar);
      b.prepend(iconeReiniciar());
      return b;
    };

    switch (e.tipo) {
      case "por-jogar":
        corpo.appendChild(botao("Jogar", "primario trilho-jogar", t.aoJogar));
        break;

      case "a-meio":
        corpo.appendChild(botao("Continuar", "primario trilho-jogar", t.aoJogar));
        break;

      case "feito": {
        el.appendChild(resultado(`✓ ${e.texto}`));
        if (!deHoje) break;

        const acoes = elemento("div", "acoes desafio-acoes");
        acoes.appendChild(treinar());
        if (t.aoPartilhar !== undefined) acoes.appendChild(botaoPartilhar(t.aoPartilhar));
        el.appendChild(acoes);
        break;
      }

      case "interrompido":
        el.append(resultado("Não conta, e o resto do dia é treino."), treinar());
        break;

      case "perdido":
        el.appendChild(resultado("Ficou por jogar."));
        break;

      case "futuro":
        el.appendChild(
          resultado(
            dia.numero - numeroDeHoje === 1
              ? "Abre à meia-noite."
              : `Abre no dia ${diaDoMes(dia.data)}.`,
          ),
        );
        break;
    }

    return el;
  }

  /* ─── O caminho ─────────────────────────────────────────────────────────── */

  /**
   * Liga os centros das casas, de cima para baixo, com curvas que saem e
   * chegam na vertical. Duas estradas: **a que já se andou**, de hoje para
   * trás, na cor de destaque; e **a que falta**, de hoje para cima, em cinzento.
   * Cada uma é um traço largo com um tracejado claro por cima — a estrada de
   * um jogo de tabuleiro.
   */
  private desenharCaminho(): void {
    const caixa = this.elTrilho.getBoundingClientRect();
    if (caixa.width === 0 || caixa.height === 0) return;

    const pontos = this.ordem.map((d) => {
      const r = this.nos.get(d.data)?.getBoundingClientRect();
      return r === undefined
        ? { x: 0, y: 0 }
        : {
            x: Math.round(r.left + r.width / 2 - caixa.left),
            y: Math.round(r.top + r.height / 2 - caixa.top),
          };
    });

    const curva = (pts: readonly { x: number; y: number }[]): string =>
      pts
        .map((p, i) => {
          const a = pts[i - 1];
          if (a === undefined) return `M ${String(p.x)} ${String(p.y)}`;
          const meio = (p.y - a.y) / 2;
          return `C ${String(a.x)} ${String(a.y + meio)} ${String(p.x)} ${String(p.y - meio)} ${String(p.x)} ${String(p.y)}`;
        })
        .join(" ");

    const iHoje = this.ordem.findIndex((d) => d.data === this.trilho.hoje);
    const futuro = pontos.slice(0, iHoje + 1);
    const andado = pontos.slice(iHoje);

    this.svg.setAttribute("viewBox", `0 0 ${String(caixa.width)} ${String(caixa.height)}`);
    this.svg.setAttribute("width", String(caixa.width));
    this.svg.setAttribute("height", String(caixa.height));

    const estrada = (pts: readonly { x: number; y: number }[], classe: string): SVGElement[] => {
      if (pts.length < 2) return [];
      const d = curva(pts);
      return ["trilho-estrada", "trilho-tracejado"].map((parte) => {
        const p = document.createElementNS(NS, "path");
        p.setAttribute("class", `${parte} ${classe}`);
        p.setAttribute("d", d);
        return p;
      });
    };

    this.svg.replaceChildren(...estrada(futuro, "por-andar"), ...estrada(andado, "andado"));
  }

  /* ─── A legenda ─────────────────────────────────────────────────────────── */

  /** Os três modos, com o ícone e a cor que têm no trilho. */
  private legenda(): HTMLElement {
    const el = elemento("div", "desafio-legenda");
    el.setAttribute("aria-hidden", "true");

    for (const modo of ["puzzle", "tempo", "survival"] as const) {
      const item = elemento("span", "desafio-legenda-item");
      item.dataset["modo"] = modo;
      const icone = elemento("span", "desafio-legenda-icone");
      icone.appendChild(iconeDoModo(modo));
      item.append(icone, NOME_DO_MODO[modo]);
      el.appendChild(item);
    }

    return el;
  }
}
