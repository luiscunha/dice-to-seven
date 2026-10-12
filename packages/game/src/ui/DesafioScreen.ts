/**
 * O ecrã do Desafio do Dia: o desafio de hoje, e o mês num calendário.
 *
 * **Um desafio por dia, à vez** — Puzzle, Contra-Relógio, Survival. Foram três
 * por dia, um cartão cada, e o desafio passou a ser uma lista de tarefas que
 * tirava o lugar ao resto do jogo. Com um só, o ecrã deixa de ser uma escolha
 * e passa a ser um calendário: o que há hoje, o que se fez este mês, e o que
 * vem amanhã — que é a razão de voltar.
 *
 * **O bilhete**, em cima, é o dia selecionado: o número, a data, o modo com a
 * cor e o ícone que tem na Home, o que é, e o estado. Hoje, é onde se joga —
 * jogar, continuar, ou treinar depois da tentativa que conta. Os outros dias
 * mostram o resultado, ou o que ficou por jogar, ou quando abrem.
 *
 * **O calendário**, por baixo, começa na segunda. Cada dia tem o ícone do seu
 * modo, e enche-se com a cor do modo quando é feito: o mês vai ganhando cor à
 * medida que se joga. Os dias antes do #1 estão lá, vazios, para o mês ter a
 * forma de um mês. Tocar num dia seleciona-o; jogar é sempre pelo bilhete.
 */

import type { ModoDoDesafio } from "../session/desafio";
import { diaDaSemana } from "../session/desafio";
import { botao, cabecalho, elemento } from "./dom";
import { iconeCronometro, iconePuzzles, iconeReiniciar, iconeSurvival } from "./icones";
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
 * Um dia do calendário. Hoje tem os estados do cartão; um dia passado está
 * feito ou perdido — o que ficou a meio ontem já não se acaba —; um dia que
 * ainda não chegou é futuro; e antes do #1 não houve desafio.
 */
export type EstadoNoCalendario =
  | EstadoNoCartao
  | { readonly tipo: "perdido" }
  | { readonly tipo: "futuro" }
  | { readonly tipo: "sem-desafio" };

export interface DiaNoCalendario {
  /** `AAAA-MM-DD`. */
  readonly data: string;
  /** O número do desafio desse dia: o «#12». */
  readonly numero: number;
  readonly modo: ModoDoDesafio;
  readonly estado: EstadoNoCalendario;
}

export interface CalendarioDoDesafio {
  /** «outubro de 2026». */
  readonly mes: string;
  /** Hoje, `AAAA-MM-DD`: um dos dias do mês, e o que abre selecionado. */
  readonly hoje: string;
  /** Os dias do mês, do primeiro ao último. */
  readonly dias: readonly DiaNoCalendario[];
  /** Dias seguidos com o desafio feito. */
  readonly sequencia: number;
  /** Joga o desafio de hoje: a tentativa que conta, ou treino depois dela. */
  readonly aoJogar: () => void;
  /** Só quando o desafio de hoje está feito. */
  readonly aoPartilhar?: () => Promise<DesfechoDaPartilha>;
}

export interface OpcoesDesafio {
  readonly calendario: CalendarioDoDesafio;
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

/** O texto do estado de hoje, igual no cartão da Home e aqui. */
export const textoDoEstado = (estado: EstadoNoCartao): string =>
  estado.tipo === "por-jogar"
    ? "Jogar"
    : estado.tipo === "a-meio"
      ? `Continuar · ${estado.texto}`
      : estado.tipo === "feito"
        ? `✓ ${estado.texto}`
        : "Interrompido";

/** O sinal da sequência: o número que se quer ver crescer. */
export function sinalDaSequencia(sequencia: number): HTMLElement {
  const el = elemento("span", "desafio-sequencia", `🔥 ${String(sequencia)}`);
  el.setAttribute(
    "aria-label",
    sequencia === 1 ? "1 dia seguido" : `${String(sequencia)} dias seguidos`,
  );
  return el;
}

/** As iniciais dos dias da semana, a começar na segunda. */
const SEMANA = ["S", "T", "Q", "Q", "S", "S", "D"] as const;

/** `2026-10-07` → `7`. */
const diaDoMes = (data: string): string => String(Number(data.slice(8)));

/** Quando é o dia, visto de hoje: «Hoje», «Amanhã», «Há 3 dias». */
function quando(numero: number, hoje: number): string {
  const n = numero - hoje;
  if (n === 0) return "Hoje";
  if (n === 1) return "Amanhã";
  if (n === -1) return "Ontem";
  return n > 0 ? `Daqui a ${String(n)} dias` : `Há ${String(-n)} dias`;
}

/** O estado do dia em palavras, para o nome acessível da célula. */
function estadoEmPalavras(e: EstadoNoCalendario): string {
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
    case "sem-desafio":
      return "sem desafio";
  }
}

export class DesafioScreen {
  private readonly raiz: HTMLElement;
  private readonly calendario: CalendarioDoDesafio;
  private readonly bilhete: HTMLElement;
  private readonly celulas = new Map<string, HTMLButtonElement>();
  private selecionado: string;

  constructor(host: HTMLElement, opcoes: OpcoesDesafio) {
    const c = opcoes.calendario;
    this.calendario = c;
    this.selecionado = c.hoje;
    this.raiz = elemento("div", "ecra desafio");

    const { el: topo } = cabecalho("Desafio do dia", opcoes.aoVoltar);

    this.bilhete = elemento("section", "desafio-bilhete");
    this.bilhete.setAttribute("aria-live", "polite");

    const corpo = elemento("div", "desafio-corpo");
    corpo.append(
      this.bilhete,
      this.mes(c),
      elemento(
        "p",
        "desafio-nota",
        "Um desafio por dia, à vez: Puzzle, Contra-Relógio e Survival. Conta a primeira tentativa; depois é treino. Muda à meia-noite.",
      ),
    );

    const rolo = elemento("div", "rolo");
    rolo.appendChild(corpo);

    this.raiz.append(topo, rolo);
    host.replaceChildren(this.raiz);

    this.pintarBilhete();
  }

  destruir(): void {
    this.raiz.remove();
  }

  private selecionar(data: string): void {
    this.selecionado = data;
    for (const [d, celula] of this.celulas) {
      celula.setAttribute("aria-pressed", String(d === data));
    }
    this.pintarBilhete();
  }

  /* ─── O bilhete ─────────────────────────────────────────────────────────── */

  /** O dia selecionado: o número, a data, o modo, e o que se pode fazer. */
  private pintarBilhete(): void {
    const c = this.calendario;
    const dia = c.dias.find((d) => d.data === this.selecionado);
    const deHoje = c.dias.find((d) => d.data === c.hoje);
    if (dia === undefined || deHoje === undefined) return;

    const el = this.bilhete;
    el.dataset["modo"] = dia.modo;
    el.dataset["estado"] = dia.estado.tipo;
    el.setAttribute("aria-label", `Desafio número ${String(dia.numero)}, ${dataPorExtenso(dia.data)}`);

    const numero = elemento("p", "desafio-numero");
    numero.append(
      elemento("span", "desafio-cardinal", `#${String(dia.numero)}`),
      elemento("span", "desafio-data", dataCurta(dia.data)),
    );

    const cabeca = elemento("div", "desafio-bilhete-cabeca");
    cabeca.append(numero, elemento("span", "desafio-quando", quando(dia.numero, deHoje.numero)));

    const icone = elemento("span", "desafio-modo-icone");
    icone.appendChild(iconeDoModo(dia.modo));

    const texto = elemento("span", "desafio-modo-texto");
    texto.append(
      elemento("span", "desafio-modo-nome", NOME_DO_MODO[dia.modo]),
      elemento("span", "desafio-modo-legenda", LEGENDA_DO_MODO[dia.modo]),
    );

    const modo = elemento("div", "desafio-bilhete-modo");
    modo.append(icone, texto);

    el.replaceChildren(cabeca, modo, this.pe(dia, dia.data === c.hoje));
  }

  /**
   * O fundo do bilhete. Hoje é onde se joga; os outros dias só se leem — ontem
   * já não se joga, e amanhã ainda não.
   */
  private pe(dia: DiaNoCalendario, hoje: boolean): HTMLElement {
    const pe = elemento("div", "desafio-bilhete-pe");
    const e = dia.estado;
    const c = this.calendario;

    const resultado = (texto: string): HTMLElement =>
      elemento("p", "desafio-resultado", texto);

    const treinar = (): HTMLButtonElement => {
      const b = botao("Treinar", "com-icone", c.aoJogar);
      b.prepend(iconeReiniciar());
      return b;
    };

    switch (e.tipo) {
      case "por-jogar":
        pe.appendChild(botao("Jogar", "primario desafio-jogar", c.aoJogar));
        break;

      case "a-meio":
        pe.append(
          resultado(`A meio · ${e.texto}`),
          botao("Continuar", "primario desafio-jogar", c.aoJogar),
        );
        break;

      case "feito": {
        pe.appendChild(resultado(`✓ ${e.texto}`));
        if (!hoje) break;

        const acoes = elemento("div", "acoes desafio-acoes");
        acoes.appendChild(treinar());
        if (c.aoPartilhar !== undefined) acoes.appendChild(botaoPartilhar(c.aoPartilhar));
        pe.appendChild(acoes);
        break;
      }

      case "interrompido":
        pe.append(
          resultado("Interrompido. Não conta, e o resto do dia é treino."),
          treinar(),
        );
        break;

      case "perdido":
        pe.appendChild(resultado("Ficou por jogar."));
        break;

      case "futuro":
        pe.appendChild(
          resultado(
            dia.numero - this.numeroDeHoje() === 1
              ? "Abre à meia-noite."
              : `Abre no dia ${diaDoMes(dia.data)}.`,
          ),
        );
        break;

      case "sem-desafio":
        break;
    }

    return pe;
  }

  private numeroDeHoje(): number {
    const c = this.calendario;
    return c.dias.find((d) => d.data === c.hoje)?.numero ?? 0;
  }

  /* ─── O calendário ──────────────────────────────────────────────────────── */

  private mes(c: CalendarioDoDesafio): HTMLElement {
    const el = elemento("section", "desafio-mes");
    el.setAttribute("aria-label", `Os desafios de ${c.mes}`);

    const cabeca = elemento("div", "desafio-mes-cabeca");
    const nome = c.mes.charAt(0).toUpperCase() + c.mes.slice(1);
    cabeca.appendChild(elemento("h2", "desafio-mes-nome", nome));
    if (c.sequencia > 0) cabeca.appendChild(sinalDaSequencia(c.sequencia));

    const semana = elemento("div", "desafio-semana");
    semana.setAttribute("aria-hidden", "true");
    for (const d of SEMANA) semana.appendChild(elemento("span", undefined, d));

    const grelha = elemento("div", "desafio-dias");
    const primeiro = c.dias[0];
    const vazios = primeiro === undefined ? 0 : diaDaSemana(primeiro.data);
    for (let i = 0; i < vazios; i++) {
      grelha.appendChild(elemento("span", "desafio-dia-vazio"));
    }
    for (const dia of c.dias) grelha.appendChild(this.celula(dia, dia.data === c.hoje));

    el.append(cabeca, semana, grelha, this.legenda());
    return el;
  }

  private celula(dia: DiaNoCalendario, hoje: boolean): HTMLButtonElement {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "desafio-dia";
    b.dataset["modo"] = dia.modo;
    b.dataset["estado"] = dia.estado.tipo;
    if (hoje) b.dataset["hoje"] = "";

    b.appendChild(elemento("span", "desafio-dia-numero", diaDoMes(dia.data)));

    if (dia.estado.tipo === "sem-desafio") {
      b.disabled = true;
    } else {
      const icone = elemento("span", "desafio-dia-icone");
      icone.appendChild(iconeDoModo(dia.modo));
      b.appendChild(icone);

      b.setAttribute("aria-pressed", String(hoje));
      b.addEventListener("click", () => {
        this.selecionar(dia.data);
      });
      this.celulas.set(dia.data, b);
    }

    b.setAttribute(
      "aria-label",
      `${dataPorExtenso(dia.data)}${hoje ? ", hoje" : ""}: ${
        dia.estado.tipo === "sem-desafio" ? "" : `${NOME_DO_MODO[dia.modo]}, `
      }${estadoEmPalavras(dia.estado)}`,
    );

    return b;
  }

  /** Os três modos, com o ícone e a cor que têm no calendário. */
  private legenda(): HTMLElement {
    const el = elemento("div", "desafio-legenda");
    el.setAttribute("aria-hidden", "true");

    for (const modo of ["puzzle", "tempo", "survival"] as const) {
      const item = elemento("span", "desafio-legenda-item");
      item.dataset["modo"] = modo;
      const icone = elemento("span", "desafio-dia-icone");
      icone.appendChild(iconeDoModo(modo));
      item.append(icone, NOME_DO_MODO[modo]);
      el.appendChild(item);
    }

    return el;
  }
}
