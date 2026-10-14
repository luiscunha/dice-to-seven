/**
 * O ecrã do Desafio do Dia: um caminho por mês, e os meses numa linha.
 *
 * **Um desafio por dia, à vez** — Puzzle, Contra-Relógio, Survival. Foram três
 * por dia, e o desafio passou a ser uma lista de tarefas que tirava o lugar ao
 * resto do jogo. Com um só, o ecrã deixa de ser uma escolha e passa a ser um
 * caminho, como num jogo de tabuleiro.
 *
 * **Cada mês é um caminho, com início e fim.** O início em baixo — o dia 1, ou
 * o #1 no mês em que o desafio começou —, os dias a subir, e o fim do mês em
 * cima, com a taça. O que já passou tem o visto na cor do modo, ou fica vazio
 * se ficou por jogar; hoje é a casa maior e acesa; o que vem está fechado a
 * cadeado. Foi um trilho só, a crescer para trás sem fim, com placas onde o
 * mês mudava: não tinha onde acabar, e um mês é uma unidade que se percebe —
 * tem um princípio, um fim, e uma conta.
 *
 * **Os meses ficam numa linha no fundo do ecrã**, sempre à vista: os doze do
 * ano, com o visto nos que passaram (a estrela, se ficaram completos), o de
 * agora em destaque, e os que vêm fechados. Tocar num mês mostra o caminho
 * dele; as setas mudam de ano, quando há mais do que um.
 *
 * **O balão** abre por cima da casa selecionada — hoje, ao entrar no mês de
 * hoje. É lá que se joga: jogar, continuar, ou treinar e partilhar depois da
 * tentativa que conta. Tocar noutra casa leva-lhe o balão, com o resultado
 * desse dia, o que ficou por jogar, ou quando abre. **Joga-se o de hoje, e os
 * dias que uma chave abriu.**
 *
 * **As chaves** (ver `session/chaves.ts`) ficam no topo, ao lado da série, e
 * tocar-lhes explica-as. Gastam-se no balão de um dia que ficou por jogar —
 * «Desbloquear» — e, quando ontem falhou, numa pergunta logo ao entrar: salvar
 * a sequência. Quem diz «agora não» encontra a mesma oferta no balão de ontem.
 *
 * **O caminho é desenhado por cima da página já montada**: as casas fazem uma
 * onda (`ONDA`), e o SVG liga os centros delas como os mede o browser. Medir
 * em vez de calcular é o que deixa o balão viver no fluxo da página, a
 * empurrar as casas de baixo, em vez de tapar as de cima.
 */

import { PATAMARES, proximoPatamar } from "../session/chaves";
import type { ModoDoDesafio } from "../session/desafio";
import { mesDe, numeroDoDia } from "../session/desafio";
import { avisar, botao, botaoRedondo, cabecalho, confirmar, elemento } from "./dom";
import {
  iconeCadeado,
  iconeCronometro,
  iconePuzzles,
  iconeReiniciar,
  iconeSeguir,
  iconeSurvival,
  iconeVisto,
  iconeVoltar,
} from "./icones";
import type { DesfechoDaPartilha } from "./partilha";
import {
  NOME_DO_MODO,
  botaoPartilhar,
  dataCurta,
  dataPorExtenso,
  mesCurto,
  mesPorExtenso,
} from "./partilha";

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
 * Uma casa do caminho. Hoje tem os estados do cartão; um dia passado está
 * feito ou perdido — o que ficou a meio ontem já não se acaba —; e um dia que
 * ainda não chegou é futuro.
 */
export type EstadoNoTrilho =
  | EstadoNoCartao
  | { readonly tipo: "perdido" }
  | { readonly tipo: "futuro" };

/**
 * Uma casa do caminho. Um dia passado que uma chave abriu joga-se como hoje, e
 * tem os estados do cartão.
 */
export interface DiaNoTrilho {
  /** `AAAA-MM-DD`. */
  readonly data: string;
  /** O número do desafio desse dia: o «#12». */
  readonly numero: number;
  readonly modo: ModoDoDesafio;
  readonly estado: EstadoNoTrilho;
  /** Ficou por jogar, e uma chave salvou a sequência. */
  readonly protegido?: boolean;
  /** Uma chave abriu-o depois de passar: joga-se, mas não conta para a sequência. */
  readonly desbloqueado?: boolean;
  /** As chaves que a sequência ganhou neste dia. */
  readonly premio?: number;
  /** Ainda se pode abrir com uma chave. */
  readonly desbloqueavel?: boolean;
}

/** A sequência que uma chave pode salvar — ver `sequenciaEmRisco`. */
export interface ProtecaoNoTrilho {
  /** O dia que ficou por jogar: ontem. */
  readonly data: string;
  /** Os dias seguidos que se salvam. */
  readonly sequencia: number;
  /** Perguntar logo ao abrir. Não, depois de um «agora não». */
  readonly perguntar: boolean;
  readonly aoProteger: () => void;
  readonly aoRecusar: () => void;
}

export interface TrilhoDoDesafio {
  /** Hoje, `AAAA-MM-DD`. O ecrã abre no mês dele, com o balão na casa dele. */
  readonly hoje: string;
  /** Dias seguidos com o desafio feito. */
  readonly sequencia: number;
  /** As chaves na carteira. */
  readonly chaves: number;
  /** As chaves que fazer o desafio de hoje dá, se a sequência chegar a um patamar. */
  readonly premioDeHoje?: number;
  /**
   * Joga o desafio desse dia — o de hoje, ou um que uma chave abriu: a
   * tentativa que conta, ou treino depois dela.
   */
  readonly aoJogar: (data: string) => void;
  /** Gasta uma chave a abrir um dia passado, e joga-o. */
  readonly aoDesbloquear?: (data: string) => void;
  /** Ontem ficou por jogar, e há chaves para salvar a sequência. */
  readonly protecao?: ProtecaoNoTrilho;
  /** As chaves que a sequência acabou de dar: celebram-se ao abrir. */
  readonly premio?: { readonly chaves: number; readonly dias: number };
  /** O dia em que o ecrã abre, em vez de hoje — o que se acabou de jogar. */
  readonly foco?: string;
  /** Só quando o desafio de hoje está feito. */
  readonly aoPartilhar?: () => Promise<DesfechoDaPartilha>;
  /** Os dias de um mês, `AAAA-MM`, do primeiro ao último — do #1 em diante. */
  readonly diasDoMes: (mes: string) => readonly DiaNoTrilho[];
  /** O mês mais antigo que se pode ver — ver `primeiroMesDoTrilho`. */
  readonly primeiroMes: string;
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
  el.setAttribute("aria-label", diasSeguidos(sequencia));
  return el;
}

/**
 * A sequência que acaba hoje se ninguém fizer nada: ontem ficou por jogar, e
 * uma chave ainda a salva.
 */
export function sinalDeRisco(sequencia: number): HTMLElement {
  const el = elemento("span", "desafio-sequencia", `🔥 ${String(sequencia)} em risco`);
  el.dataset["risco"] = "";
  el.setAttribute("aria-label", `${diasSeguidos(sequencia)}, em risco`);
  return el;
}

/** As chaves na carteira, num rótulo curto. */
export const sinalDasChaves = (chaves: number): string => `🔑 ${String(chaves)}`;

const diasSeguidos = (n: number): string =>
  n === 1 ? "1 dia seguido" : `${String(n)} dias seguidos`;

const chavesPorExtenso = (n: number): string =>
  n === 1 ? "1 chave" : `${String(n)} chaves`;

/**
 * Um mês na linha dos meses: antes do primeiro que se pode ver, sem desafio;
 * depois, passado, o de agora, ou ainda por vir.
 */
export type EstadoDoMes = "sem-desafio" | "passado" | "atual" | "futuro";

/**
 * A onda do caminho: o desvio de cada casa ao centro, em píxeis, pelo número do
 * dia. Pelo número, e não pela posição na lista: uma casa fica sempre no mesmo
 * sítio do caminho, e o caminho não se mexe todo quando muda o dia.
 *
 * Sessenta píxeis no máximo: é o que deixa o rótulo mais comprido — «28 out ·
 * Contra-Relógio» — caber por baixo da casa mais desviada num ecrã de 375.
 */
const ONDA = [0, 40, 60, 40, 0, -40, -60, -40] as const;

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

/** O nome do mês sozinho: `2026-10` → `outubro`. */
const nomeDoMes = (mes: string): string => mesPorExtenso(mes).split(" de ")[0] ?? "";

const NS = "http://www.w3.org/2000/svg";

/** As contas de um mês: quantos se fizeram, dos que já houve. */
interface Contas {
  readonly feitos: number;
  readonly jogaveis: number;
}

export class DesafioScreen {
  private readonly host: HTMLElement;
  private readonly raiz: HTMLElement;
  private readonly rolo: HTMLElement;
  private readonly trilho: TrilhoDoDesafio;
  private readonly corpo: HTMLElement;
  private readonly elMeses: HTMLElement;
  private readonly casas = new Map<string, HTMLLIElement>();
  private readonly nos = new Map<string, HTMLButtonElement>();
  private readonly observador: ResizeObserver | undefined;

  /** O mês do caminho à vista, `AAAA-MM`. */
  private mes: string;
  /** O ano da linha dos meses — pode não ser o do mês à vista. */
  private ano: number;
  /** Os dias do mês à vista, do primeiro ao último. */
  private dias: readonly DiaNoTrilho[] = [];
  private elTrilho: HTMLElement | undefined;
  private svg: SVGSVGElement | undefined;
  /** De cima para baixo: a taça do fim, as casas, a bandeira do início. */
  private pontos: HTMLElement[] = [];
  private balao: HTMLElement | undefined;
  private selecionado: string | undefined;

  constructor(host: HTMLElement, opcoes: OpcoesDesafio) {
    const t = opcoes.trilho;
    this.host = host;
    this.trilho = t;
    this.mes = mesDe(t.foco ?? t.hoje);
    this.ano = Number(this.mes.slice(0, 4));
    this.raiz = elemento("div", "ecra desafio");

    /* ── o topo: a seta, o título, a série e as chaves — sempre à vista ── */
    const { el: topo } = cabecalho("Desafio do dia", opcoes.aoVoltar);
    // O risco passa à frente da série, como no cartão da Home: com hoje já
    // feito, a série é 1, mas o que está em jogo são os dias de antes de ontem.
    const meta = elemento("div", "meta");
    if (t.protecao !== undefined) meta.appendChild(sinalDeRisco(t.protecao.sequencia));
    else if (t.sequencia > 0) meta.appendChild(sinalDaSequencia(t.sequencia));

    // A pastilha é pequena, e o botão à volta dela tem o alvo de toque inteiro.
    const chaves = botao("", "desafio-chaves-botao", () => {
      this.explicarChaves();
    });
    chaves.appendChild(elemento("span", "desafio-chaves", sinalDasChaves(t.chaves)));
    chaves.setAttribute("aria-label", `${chavesPorExtenso(t.chaves)}. Para que servem?`);
    meta.appendChild(chaves);
    topo.appendChild(meta);

    this.corpo = elemento("div", "desafio-corpo");
    this.rolo = elemento("div", "rolo");
    this.rolo.appendChild(this.corpo);

    this.elMeses = elemento("footer", "desafio-meses");
    this.elMeses.setAttribute("aria-label", "Os meses");

    this.raiz.append(topo, this.rolo, this.elMeses);
    host.replaceChildren(this.raiz);

    this.mostrarMes(this.mes, t.foco);

    /*
     * Ao abrir, uma coisa de cada vez: as chaves que acabaram de chegar, ou a
     * sequência que está para acabar. Na prática nunca são as duas — um prémio
     * só chega com ontem feito, e o risco só existe com ontem por jogar.
     */
    if (t.premio !== undefined) this.celebrar(t.premio);
    else if (t.protecao?.perguntar === true) this.proporProtecao(t.protecao);

    /*
     * O caminho volta a desenhar-se quando muda de tamanho: a letra que chega
     * depois, um ecrã que roda. Não existe nos testes (jsdom), onde também não
     * há medidas para desenhar.
     */
    this.observador =
      typeof ResizeObserver === "function"
        ? new ResizeObserver(() => {
            this.desenharCaminho();
          })
        : undefined;
    this.observador?.observe(this.corpo);
  }

  destruir(): void {
    this.observador?.disconnect();
    this.raiz.remove();
  }

  /* ─── Os meses ──────────────────────────────────────────────────────────── */

  private estadoDoMes(mes: string): EstadoDoMes {
    const agora = mesDe(this.trilho.hoje);
    if (mes > agora) return "futuro";
    if (mes === agora) return "atual";
    if (mes < this.trilho.primeiroMes) return "sem-desafio";
    return "passado";
  }

  private contas(dias: readonly DiaNoTrilho[]): Contas {
    const jogaveis = dias.filter((d) => d.estado.tipo !== "futuro");
    return {
      feitos: jogaveis.filter((d) => d.estado.tipo === "feito").length,
      jogaveis: jogaveis.length,
    };
  }

  /**
   * Mostra o caminho de um mês. No mês de hoje, o balão abre em hoje e o rolo
   * leva-o ao meio do ecrã; nos outros, o rolo volta ao topo — ao fim do mês,
   * com a conta dele. `foco` abre o balão noutro dia: o que se acabou de jogar.
   */
  private mostrarMes(mes: string, foco?: string): void {
    this.mes = mes;
    this.ano = Number(mes.slice(0, 4));
    this.dias = this.trilho.diasDoMes(mes);
    this.selecionado = [foco, this.trilho.hoje].find(
      (data) => data !== undefined && this.dias.some((d) => d.data === data),
    );

    this.corpo.replaceChildren(
      this.cabecaDoMes(),
      this.caminho(),
      this.legenda(),
      elemento(
        "p",
        "desafio-nota",
        "Um desafio por dia, à vez: Puzzle, Contra-Relógio e Survival. Conta a primeira tentativa; depois é treino. Muda à meia-noite. A sequência dá chaves, que abrem os dias que ficaram por jogar.",
      ),
    );
    this.pintarMeses();
    this.abrirBalao();
    this.desenharCaminho();

    const hoje = this.selecionado === undefined ? undefined : this.casas.get(this.selecionado);
    if (hoje !== undefined && typeof hoje.scrollIntoView === "function") {
      hoje.scrollIntoView({ block: "center" });
    } else {
      this.rolo.scrollTop = 0;
    }
  }

  /** O nome do mês à vista, e a conta dele. */
  private cabecaDoMes(): HTMLElement {
    const el = elemento("div", "desafio-mes-cabeca");
    const c = this.contas(this.dias);
    const nome = mesPorExtenso(this.mes);

    el.append(
      elemento("h2", "desafio-mes-nome", nome.charAt(0).toUpperCase() + nome.slice(1)),
      elemento(
        "span",
        "desafio-mes-conta",
        `${String(c.feitos)} de ${String(c.jogaveis)} feitos`,
      ),
    );

    return el;
  }

  /**
   * A linha dos meses, no fundo: os doze do ano, ligados por uma linha — na cor
   * de destaque até ao mês de agora, em cinzento a seguir. As setas mudam de
   * ano; só aparecem quando há outro ano para ver.
   */
  private pintarMeses(): void {
    const primeiroAno = Number(this.trilho.primeiroMes.slice(0, 4));
    const esteAno = Number(this.trilho.hoje.slice(0, 4));

    const cabeca = elemento("div", "desafio-meses-cabeca");
    if (esteAno > primeiroAno) {
      const anterior = botaoRedondo(iconeVoltar(), "ano anterior", () => {
        this.ano -= 1;
        this.pintarMeses();
      });
      anterior.disabled = this.ano <= primeiroAno;
      const seguinte = botaoRedondo(iconeSeguir(), "ano seguinte", () => {
        this.ano += 1;
        this.pintarMeses();
      });
      seguinte.disabled = this.ano >= esteAno;
      cabeca.append(anterior, elemento("span", "desafio-meses-ano", String(this.ano)), seguinte);
    } else {
      cabeca.appendChild(elemento("span", "desafio-meses-ano", String(this.ano)));
    }

    const lista = elemento("ol", "desafio-meses-lista");
    for (let m = 1; m <= 12; m++) {
      lista.appendChild(this.itemDoMes(`${String(this.ano)}-${String(m).padStart(2, "0")}`));
    }

    const faixa = elemento("div", "desafio-meses-faixa");
    faixa.appendChild(lista);
    this.elMeses.replaceChildren(cabeca, faixa);

    // O mês à vista — ou o de agora — ao meio da faixa, se ela rolar.
    const alvo =
      lista.querySelector<HTMLElement>('[aria-pressed="true"]') ??
      lista.querySelector<HTMLElement>('[aria-current="date"]');
    if (alvo !== null) {
      const a = alvo.getBoundingClientRect();
      const f = faixa.getBoundingClientRect();
      faixa.scrollLeft += a.left - f.left - (f.width - a.width) / 2;
    }
  }

  private itemDoMes(mes: string): HTMLLIElement {
    const estado = this.estadoDoMes(mes);
    const li = document.createElement("li");
    li.className = "desafio-meses-item";
    li.dataset["estado"] = estado;

    const b = document.createElement("button");
    b.type = "button";
    b.className = "desafio-meses-botao";
    b.setAttribute("aria-pressed", String(mes === this.mes));
    if (estado === "atual") b.setAttribute("aria-current", "date");

    const no = elemento("span", "desafio-meses-no");
    const nome = elemento("span", "desafio-meses-nome", mesCurto(mes));
    const conta = elemento("span", "desafio-meses-conta");
    let rotulo = `${mesPorExtenso(mes)}: `;

    if (estado === "passado" || estado === "atual") {
      const c = this.contas(this.trilho.diasDoMes(mes));
      const completo = estado === "passado" && c.jogaveis > 0 && c.feitos === c.jogaveis;
      li.dataset["completo"] = String(completo);
      if (estado === "passado") no.appendChild(completo ? document.createTextNode("★") : iconeVisto());
      conta.textContent = `${String(c.feitos)}/${String(c.jogaveis)}`;
      rotulo += `${String(c.feitos)} de ${String(c.jogaveis)} feitos${completo ? ", completo" : ""}`;
      b.addEventListener("click", () => {
        if (mes !== this.mes) this.mostrarMes(mes);
      });
    } else if (estado === "futuro") {
      no.appendChild(iconeCadeado());
      b.disabled = true;
      rotulo += "ainda não começou";
    } else {
      b.disabled = true;
      rotulo += "sem desafio";
    }

    b.setAttribute("aria-label", rotulo);
    b.append(no, nome, conta);
    li.appendChild(b);
    return li;
  }

  /* ─── O caminho do mês ──────────────────────────────────────────────────── */

  /** A taça do fim em cima, as casas do último dia ao primeiro, e a bandeira do início. */
  private caminho(): HTMLElement {
    this.casas.clear();
    this.nos.clear();
    this.pontos = [];

    const elTrilho = elemento("div", "trilho");
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "trilho-caminho");
    svg.setAttribute("aria-hidden", "true");

    const lista = elemento("ol", "trilho-dias");
    lista.setAttribute("aria-label", `Os desafios de ${mesPorExtenso(this.mes)}, do fim para o início`);

    lista.appendChild(this.marcoDoFim());
    for (const dia of [...this.dias].reverse()) lista.appendChild(this.casa(dia));
    lista.appendChild(this.marcoDoInicio());

    elTrilho.append(svg, lista);
    this.elTrilho = elTrilho;
    this.svg = svg;
    return elTrilho;
  }

  /**
   * O fim do mês: a taça. Acesa quando o mês acabou; à espera, em cinzento,
   * no mês de agora — com os dias que faltam.
   */
  private marcoDoFim(): HTMLLIElement {
    const acabou = this.estadoDoMes(this.mes) === "passado";
    const ultimo = this.dias[this.dias.length - 1];
    const faltam =
      ultimo === undefined
        ? 0
        : numeroDoDia(ultimo.data) - numeroDoDia(this.trilho.hoje);

    return this.marco(
      "fim",
      "🏆",
      acabou || faltam <= 0
        ? `Fim de ${nomeDoMes(this.mes)}`
        : `Fim de ${nomeDoMes(this.mes)} · ${faltam === 1 ? "falta 1 dia" : `faltam ${String(faltam)} dias`}`,
      acabou,
    );
  }

  /**
   * O início do mês: a bandeira. **Sem data**: o primeiro dia está logo por
   * cima, na casa dele, e repeti-lo aqui era dizer o mesmo duas vezes. No mês
   * do #1, é o início do desafio de todo.
   */
  private marcoDoInicio(): HTMLLIElement {
    const doPrimeiro = this.dias[0]?.numero === 1;
    return this.marco("inicio", "🏁", doPrimeiro ? "Início do desafio" : "Início", true);
  }

  private marco(qual: "inicio" | "fim", simbolo: string, texto: string, aceso: boolean): HTMLLIElement {
    const li = document.createElement("li");
    li.className = "trilho-marco";
    li.dataset["marco"] = qual;
    li.dataset["aceso"] = String(aceso);

    const no = elemento("span", "trilho-marco-no", simbolo);
    no.setAttribute("aria-hidden", "true");
    li.append(no, elemento("span", "trilho-rotulo", texto));

    this.pontos.push(no);
    return li;
  }

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

    /*
     * Uma chave gasta neste dia — a salvar a sequência, ou a abri-lo — fica no
     * sítio do cadeado, que um dia passado já não tem. O prémio fica no canto
     * de cima, do outro lado.
     */
    const chaveGasta = dia.protegido === true || dia.desbloqueado === true;
    if (chaveGasta) no.appendChild(elemento("span", "trilho-chave", "🔑"));
    if (dia.premio !== undefined) {
      no.appendChild(elemento("span", "trilho-premio", `+${String(dia.premio)} 🔑`));
    }

    const extras = [
      ...(dia.protegido === true ? ["sequência salva com uma chave"] : []),
      ...(dia.desbloqueado === true ? ["aberto com uma chave"] : []),
      ...(dia.premio !== undefined ? [`ganhou ${chavesPorExtenso(dia.premio)}`] : []),
    ];
    no.setAttribute(
      "aria-label",
      `${dataPorExtenso(dia.data)}${hoje ? ", hoje" : ""}: ${NOME_DO_MODO[dia.modo]}, ${[estadoEmPalavras(dia.estado), ...extras].join(", ")}`,
    );

    li.append(
      no,
      elemento("span", "trilho-rotulo", `${dataCurta(dia.data)} · ${NOME_DO_MODO[dia.modo]}`),
    );

    this.casas.set(dia.data, li);
    this.nos.set(dia.data, no);
    this.pontos.push(no);
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
    this.balao = undefined;

    for (const [data, no] of this.nos) {
      no.setAttribute("aria-expanded", String(data === this.selecionado));
    }

    const dia = this.dias.find((d) => d.data === this.selecionado);
    const casa = this.selecionado === undefined ? undefined : this.casas.get(this.selecionado);
    if (dia === undefined || casa === undefined) return;

    this.balao = this.conteudoDoBalao(dia);
    casa.prepend(this.balao);
  }

  /**
   * O balão do dia: quando é e em que pé está, o modo com o que é, e o que se
   * pode fazer. Hoje é onde se joga, e nos dias que uma chave abriu; os outros
   * só se leem — amanhã ainda não se joga, e um dia que passou só com uma
   * chave.
   */
  private conteudoDoBalao(dia: DiaNoTrilho): HTMLElement {
    const t = this.trilho;
    const deHoje = dia.data === t.hoje;
    const jogavel = deHoje || dia.desbloqueado === true;
    const numeroDeHoje = numeroDoDia(t.hoje);
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
    // Fazer o de hoje é o que faz a série crescer: o prémio é esse — e as
    // chaves, se a série chegar hoje a um patamar.
    if (deHoje && (e.tipo === "por-jogar" || e.tipo === "a-meio")) {
      const chaves = t.premioDeHoje ?? 0;
      const premio = elemento(
        "span",
        "trilho-balao-premio",
        chaves > 0 ? `🔥 +1 · 🔑 +${String(chaves)}` : "🔥 +1",
      );
      premio.setAttribute(
        "aria-label",
        chaves > 0 ? `mais um dia na série, e ${chavesPorExtenso(chaves)}` : "mais um dia na série",
      );
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
    const nota = (frase: string): HTMLElement => elemento("p", "desafio-nota-chave", frase);
    const jogar = (): void => {
      t.aoJogar(dia.data);
    };
    const treinar = (): HTMLButtonElement => {
      const b = botao("Treinar", "com-icone", jogar);
      b.prepend(iconeReiniciar());
      return b;
    };

    switch (e.tipo) {
      case "por-jogar":
        corpo.appendChild(botao("Jogar", "primario trilho-jogar", jogar));
        break;

      case "a-meio":
        corpo.appendChild(botao("Continuar", "primario trilho-jogar", jogar));
        break;

      case "feito": {
        el.appendChild(resultado(`✓ ${e.texto}`));
        if (dia.premio !== undefined) {
          el.appendChild(nota(`🔑 +${String(dia.premio)}: a sequência chegou a um patamar.`));
        }
        if (dia.desbloqueado === true) {
          el.appendChild(nota("Jogado depois, com uma chave: conta para o mês, não para a sequência."));
        }
        if (!jogavel) break;

        const acoes = elemento("div", "acoes desafio-acoes");
        acoes.appendChild(treinar());
        if (deHoje && t.aoPartilhar !== undefined) acoes.appendChild(botaoPartilhar(t.aoPartilhar));
        el.appendChild(acoes);
        break;
      }

      case "interrompido":
        el.append(
          resultado(deHoje ? "Não conta, e o resto do dia é treino." : "Não conta: daqui em diante é treino."),
          treinar(),
        );
        break;

      case "perdido":
        el.appendChild(resultado("Ficou por jogar."));
        if (dia.protegido === true) el.appendChild(nota("🔑 Uma chave salvou a sequência."));
        this.acoesDasChaves(el, dia);
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

  /* ─── As chaves ─────────────────────────────────────────────────────────── */

  /**
   * O que uma chave faz num dia que ficou por jogar: salvar a sequência, se é
   * ontem e ela está em risco; e abri-lo, para o jogar. Sem chaves, o botão de
   * abrir fica à vista mas apagado — é assim que se descobre que existem.
   */
  private acoesDasChaves(el: HTMLElement, dia: DiaNoTrilho): void {
    const t = this.trilho;
    const protecao = t.protecao?.data === dia.data ? t.protecao : undefined;
    const aoDesbloquear = dia.desbloqueavel === true ? t.aoDesbloquear : undefined;
    if (protecao === undefined && aoDesbloquear === undefined) return;

    const acoes = elemento("div", "acoes desafio-acoes");

    if (protecao !== undefined) {
      acoes.appendChild(
        botao("Salvar a sequência", "primario", () => {
          this.proporProtecao(protecao);
        }),
      );
    }

    if (aoDesbloquear !== undefined) {
      const abrir = botao(
        `Desbloquear · ${sinalDasChaves(1)}`,
        protecao === undefined ? "primario" : undefined,
        () => {
          this.confirmarDesbloqueio(dia, aoDesbloquear);
        },
      );
      abrir.disabled = t.chaves < 1;
      acoes.appendChild(abrir);
    }

    el.appendChild(acoes);
    if (t.chaves < 1) el.appendChild(this.notaSemChaves());
  }

  private notaSemChaves(): HTMLElement {
    const p = proximoPatamar(this.trilho.sequencia);
    return elemento(
      "p",
      "desafio-nota-chave",
      `Sem chaves. A próxima chega aos ${String(p.dias)} dias seguidos.`,
    );
  }

  /** A pergunta de quem falhou ontem: gastar uma chave para não perder a sequência. */
  private proporProtecao(p: ProtecaoNoTrilho): void {
    confirmar(this.host, {
      titulo: "A tua sequência está em risco",
      texto:
        `Ontem ficou por jogar, e a tua sequência de ${p.sequencia === 1 ? "1 dia" : `${String(p.sequencia)} dias`} acaba aí. ` +
        "Uma chave salva-a: ontem não soma, mas a sequência continua. " +
        `Tens ${chavesPorExtenso(this.trilho.chaves)}.`,
      confirmar: `Usar ${sinalDasChaves(1)}`,
      cancelar: "Agora não",
      realcarConfirmar: true,
      aoConfirmar: p.aoProteger,
      aoCancelar: p.aoRecusar,
    });
  }

  private confirmarDesbloqueio(dia: DiaNoTrilho, aoDesbloquear: (data: string) => void): void {
    confirmar(this.host, {
      titulo: `Desbloquear o desafio #${String(dia.numero)}?`,
      texto:
        `Gastas uma chave e jogas o ${NOME_DO_MODO[dia.modo]} de ${dataPorExtenso(dia.data)}. ` +
        "Conta a primeira tentativa: para o mês, mas não para a sequência. " +
        `Tens ${chavesPorExtenso(this.trilho.chaves)}.`,
      confirmar: "Desbloquear e jogar",
      aoConfirmar: () => {
        aoDesbloquear(dia.data);
      },
    });
  }

  /** As chaves que a sequência acabou de dar. */
  private celebrar(premio: { readonly chaves: number; readonly dias: number }): void {
    avisar(this.host, {
      titulo: `🔑 +${String(premio.chaves)}`,
      texto:
        `${diasSeguidos(premio.dias)}! Ganhaste ${chavesPorExtenso(premio.chaves)}: ` +
        "abre um desafio que ficou por jogar, ou salva a sequência no dia em que falhares.",
      fechar: "Boa!",
      classe: "chaves-premio",
    });
  }

  /** O que são as chaves, como se ganham, e quando chega a próxima. */
  private explicarChaves(): void {
    const t = this.trilho;

    const lista = elemento("ol", "chaves-patamares");
    for (const p of PATAMARES) {
      const li = document.createElement("li");
      li.append(
        elemento("span", undefined, `${String(p.dias)} dias seguidos`),
        elemento("b", undefined, `+${String(p.chaves)} 🔑`),
      );
      lista.appendChild(li);
    }

    const proximo = proximoPatamar(t.sequencia);
    const faltam = proximo.dias - t.sequencia;
    const conteudo = elemento("div", "chaves-ganhar");
    conteudo.append(
      elemento("p", "popup-texto", "Ganham-se com a sequência:"),
      lista,
      elemento(
        "p",
        "popup-texto",
        `Depois dos 30, o ciclo recomeça. A próxima: aos ${String(proximo.dias)} dias, ` +
          `+${String(proximo.chaves)} 🔑 — ${faltam === 1 ? "falta 1 dia" : `faltam ${String(faltam)} dias`}.`,
      ),
    );

    avisar(this.host, {
      titulo: `As chaves · ${sinalDasChaves(t.chaves)}`,
      texto:
        "Uma chave abre um desafio que ficou por jogar — conta para o mês, mas não para " +
        "a sequência — ou salva a sequência quando falhas um dia.",
      conteudo,
      fechar: "Percebi",
      classe: "chaves-explicacao",
    });
  }

  /* ─── A estrada ─────────────────────────────────────────────────────────── */

  /**
   * Liga os centros, da taça à bandeira, com curvas que saem e chegam na
   * vertical. Duas estradas: **a que já se andou**, do início até hoje — ou o
   * mês inteiro, se já acabou —, na cor de destaque; e **a que falta**, de hoje
   * até ao fim, em cinzento. Cada uma é um traço largo com um tracejado claro
   * por cima — a estrada de um jogo de tabuleiro.
   */
  private desenharCaminho(): void {
    const elTrilho = this.elTrilho;
    const svg = this.svg;
    if (elTrilho === undefined || svg === undefined) return;

    const caixa = elTrilho.getBoundingClientRect();
    if (caixa.width === 0 || caixa.height === 0) return;

    const pontos = this.pontos.map((el) => {
      const r = el.getBoundingClientRect();
      return {
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

    // Onde a estrada muda de cor: em hoje, ou no fim, se o mês já acabou. O
    // primeiro ponto é a taça, e as casas vêm a seguir, do último dia ao primeiro.
    const iHoje = [...this.dias].reverse().findIndex((d) => d.data === this.trilho.hoje);
    const corte =
      iHoje >= 0 ? iHoje + 1 : this.estadoDoMes(this.mes) === "passado" ? 0 : pontos.length - 1;

    const porAndar = pontos.slice(0, corte + 1);
    const andado = pontos.slice(corte);

    svg.setAttribute("viewBox", `0 0 ${String(caixa.width)} ${String(caixa.height)}`);
    svg.setAttribute("width", String(caixa.width));
    svg.setAttribute("height", String(caixa.height));

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

    svg.replaceChildren(...estrada(porAndar, "por-andar"), ...estrada(andado, "andado"));
  }

  /* ─── A legenda ─────────────────────────────────────────────────────────── */

  /** Os três modos, com o ícone e a cor que têm no caminho. */
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
