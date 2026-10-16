/**
 * As medalhas: duas abas, Normais e Premium, e uma grelha de cartões.
 *
 * **Abas e não uma lista com duas secções.** As premium são raras de propósito,
 * e numa lista só ficavam no fundo, por baixo de dez metas que quem joga já
 * está a cumprir — a última coisa que se via, e quase sempre cinzenta. Numa
 * aba própria são um destino: o sítio onde se vai ver o que falta para o ouro.
 *
 * **Cada cartão diz o seu estado sem se tocar.** Ganha: o cartão menta, a luz
 * por trás do emblema e a pastilha escura. Por ganhar: o cartão cinzento, o
 * cadeado em cima, e a pastilha a dizer quanto falta — «2/40 níveis». O emblema
 * mantém as cores nos dois: é a montra do que se pode ganhar. Tocar abre o
 * pormenor: o que pede a medalha, e quando se ganhou — e, no Colecionador, as
 * catorze composições do 7, com as que já saíram acesas.
 *
 * As medalhas que o jogador ainda não tinha visto levam «Nova». A página abriu,
 * portanto da próxima vez já não — quem decide isso é o `main.ts`, que grava.
 */

import type { Cell } from "@dicetoseven/engine";

import { t } from "../i18n";
import type { Composicao } from "../session/estatisticas";
import { COMPOSICOES } from "../session/estatisticas";
import type { Medalha, Progresso, TipoDeMedalha } from "../session/medalhas";
import { pecaDeAmostra } from "./dice";
import { avisar, cabecalho, elemento } from "./dom";
import { emblema } from "./emblemas";
import { iconeCadeado, iconeVisto } from "./icones";
import { dataCompleta, dataPorExtenso } from "./partilha";

export interface MedalhaNoEcra {
  readonly medalha: Medalha;
  readonly progresso: Progresso;
  /** `AAAA-MM-DD`, se ganha. */
  readonly ganhaEm?: string;
  /** Ganha desde a última vez que a página abriu. */
  readonly nova?: boolean;
}

export interface OpcoesMedalhas {
  readonly medalhas: readonly MedalhaNoEcra[];
  /** As composições do 7 que já saíram: a grelha do Colecionador. */
  readonly composicoes?: readonly Composicao[];
  readonly aoVoltar: () => void;
}

const ABAS: readonly TipoDeMedalha[] = ["normal", "premium"];

/** `305000` → `5:05`. Os segundos inteiros: as medalhas contam minutos. */
const minutos = (ms: number): string => {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60))}:${String(s % 60).padStart(2, "0")}`;
};

const numero = (m: Medalha, n: number): string =>
  m.formato === "tempo" ? minutos(n) : t().formato.milhares(n);

/**
 * O texto da pastilha.
 *
 * Ganha, diz o que se fez — «30/30 níveis», «7 dias seguidos». Por ganhar, quanto
 * falta — «2/40 níveis», «3:12/5:00». As de sim-ou-não não têm conta a mostrar,
 * e dizem só em que pé estão.
 */
export function rotuloDaPastilha(m: Medalha, p: Progresso, ganha: boolean): string {
  const conta = m.unidade !== undefined || m.formato === "tempo";

  if (ganha) {
    if (!conta) return t().paginaMedalhas.conquistada;
    if (m.formato === "tempo") return t().paginaMedalhas.minutos(Math.round(p.alvo / 60_000));
    return `${numero(m, p.alvo)} ${unidade(m)}`.trim();
  }

  if (!conta) return t().paginaMedalhas.porConquistar;
  const fracao = `${numero(m, p.atual)}/${numero(m, p.alvo)}`;
  return m.unidade === undefined ? fracao : `${fracao} ${unidade(m)}`;
}

const unidade = (m: Medalha): string =>
  m.unidade === undefined ? "" : t().medalhas.unidades[m.unidade];

/**
 * As catorze composições do 7, em peças, com as que já saíram acesas.
 *
 * A barra «9/14» dizia quantas faltavam e não quais — e procurar sem saber o
 * quê é andar às cegas. Aqui vê-se: as feitas na cor da face, as que faltam
 * esbatidas, e quem quer o Colecionador sabe o que procurar no tabuleiro.
 *
 * Em peças e não em algarismos, porque é assim que o grupo aparece a jogar:
 * «1 1 5» lê-se, três peças com uma, uma e cinco pintas reconhecem-se.
 */
export function grelhaDasComposicoes(feitas: ReadonlySet<Composicao>): HTMLElement {
  const el = elemento("div", "composicoes");
  el.appendChild(
    elemento("p", "composicoes-titulo", t().paginaMedalhas.composicoesTitulo(COMPOSICOES.length)),
  );

  const lista = elemento("ul", "composicoes-lista");
  for (const c of COMPOSICOES) {
    const feita = feitas.has(c);
    const partes = [...c].map((d) => Number(d) as Cell);

    const pecas = elemento("span", "composicao-pecas");
    pecas.setAttribute("role", "img");
    pecas.setAttribute("aria-label", t().paginaMedalhas.composicaoAria(partes.join(" + "), feita));
    pecas.append(...partes.map((v) => pecaDeAmostra(v)));

    const li = elemento("li", "composicao");
    li.dataset["feita"] = feita ? "sim" : "nao";
    li.appendChild(pecas);
    lista.appendChild(li);
  }

  el.appendChild(lista);
  return el;
}

/** O nome da medalha, no idioma do jogo. */
export const nomeDaMedalha = (m: Pick<Medalha, "id">): string => t().medalhas.nomes[m.id];

export class MedalhasScreen {
  private readonly raiz: HTMLElement;
  private readonly opcoes: OpcoesMedalhas;
  private readonly abas = new Map<TipoDeMedalha, HTMLButtonElement>();
  private readonly painel: HTMLElement;
  private aba: TipoDeMedalha;

  constructor(host: HTMLElement, opcoes: OpcoesMedalhas) {
    this.opcoes = opcoes;
    this.raiz = elemento("div", "ecra medalhas");

    const { el: topo } = cabecalho(t().paginaMedalhas.titulo, opcoes.aoVoltar);

    /*
     * Abre na aba das normais — a não ser que as novas sejam todas premium: quem
     * acabou de ganhar o ouro vem cá para o ver, e não para o procurar.
     */
    const novas = opcoes.medalhas.filter((m) => m.nova === true);
    this.aba =
      novas.length > 0 && novas.every((m) => m.medalha.tipo === "premium") ? "premium" : "normal";

    const lista = elemento("div", "medalhas-abas");
    lista.setAttribute("role", "tablist");
    lista.setAttribute("aria-label", t().paginaMedalhas.tipos);
    for (const tipo of ABAS) {
      lista.appendChild(
        this.botaoDaAba(tipo, tipo === "premium" ? t().paginaMedalhas.premium : t().paginaMedalhas.normais),
      );
    }

    this.painel = elemento("div", "medalhas-painel");
    this.painel.setAttribute("role", "tabpanel");

    const rolo = elemento("div", "rolo");
    rolo.append(lista, this.painel);

    this.raiz.append(topo, rolo);
    host.replaceChildren(this.raiz);

    this.mostrarAba(this.aba);
  }

  destruir(): void {
    this.raiz.remove();
  }

  private daAba(tipo: TipoDeMedalha): readonly MedalhaNoEcra[] {
    return this.opcoes.medalhas.filter((m) => m.medalha.tipo === tipo);
  }

  private botaoDaAba(tipo: TipoDeMedalha, rotulo: string): HTMLButtonElement {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "medalhas-aba";
    b.id = `medalhas-aba-${tipo}`;
    b.setAttribute("role", "tab");
    b.dataset["tipo"] = tipo;

    const todas = this.daAba(tipo);
    const ganhas = todas.filter((m) => m.ganhaEm !== undefined).length;

    if (tipo === "premium") b.appendChild(elemento("span", "medalhas-aba-estrela", "★"));
    b.append(
      elemento("span", "medalhas-aba-nome", rotulo),
      elemento("span", "medalhas-aba-conta", `${String(ganhas)}/${String(todas.length)}`),
    );
    b.setAttribute("aria-label", t().paginaMedalhas.contaDaAba(rotulo, ganhas, todas.length));

    b.addEventListener("click", () => {
      this.mostrarAba(tipo);
    });

    this.abas.set(tipo, b);
    return b;
  }

  private mostrarAba(tipo: TipoDeMedalha): void {
    this.aba = tipo;
    for (const [t, b] of this.abas) b.setAttribute("aria-selected", String(t === tipo));
    this.painel.setAttribute("aria-labelledby", `medalhas-aba-${tipo}`);
    this.painel.dataset["tipo"] = tipo;

    const grelha = elemento("ul", "medalhas-grelha");
    for (const m of this.daAba(tipo)) {
      const li = document.createElement("li");
      li.appendChild(this.cartao(m));
      grelha.appendChild(li);
    }

    this.painel.replaceChildren(grelha);
  }

  private cartao(m: MedalhaNoEcra): HTMLButtonElement {
    const { medalha, progresso } = m;
    const ganha = m.ganhaEm !== undefined;

    const b = document.createElement("button");
    b.type = "button";
    b.className = "medalha";
    b.dataset["tipo"] = medalha.tipo;
    b.dataset["familia"] = medalha.familia;
    b.dataset["ganha"] = ganha ? "sim" : "nao";
    if (m.nova === true) b.dataset["nova"] = "sim";

    const figura = elemento("span", "medalha-figura");
    if (!ganha) {
      const cadeado = elemento("span", "medalha-cadeado");
      cadeado.appendChild(iconeCadeado());
      figura.appendChild(cadeado);
    }
    figura.appendChild(emblema(medalha.id, ganha, medalha.tipo === "premium"));

    const pastilha = elemento("span", "medalha-pastilha", rotuloDaPastilha(medalha, progresso, ganha));
    if (ganha) {
      pastilha.appendChild(
        medalha.tipo === "premium"
          ? elemento("span", "medalha-pastilha-estrela", "★")
          : iconeVisto(),
      );
    }

    b.append(figura, elemento("span", "medalha-nome", nomeDaMedalha(medalha)), pastilha);
    if (m.nova === true) b.appendChild(elemento("span", "medalha-nova", t().paginaMedalhas.nova));

    b.setAttribute(
      "aria-label",
      [
        nomeDaMedalha(medalha),
        medalha.tipo === "premium" ? t().paginaMedalhas.ariaPremium : undefined,
        ganha
          ? t().paginaMedalhas.ariaConquistada(dataPorExtenso(m.ganhaEm ?? ""))
          : t().paginaMedalhas.ariaPorConquistar,
        ganha ? undefined : rotuloDaPastilha(medalha, progresso, false),
        m.nova === true ? t().paginaMedalhas.ariaNova : undefined,
      ]
        .filter((s) => s !== undefined)
        .join(", "),
    );

    b.addEventListener("click", () => {
      this.pormenor(m);
    });

    return b;
  }

  /** O pormenor de uma medalha: o que pede, e em que pé está. */
  private pormenor(m: MedalhaNoEcra): void {
    const { medalha, progresso } = m;
    const ganha = m.ganhaEm !== undefined;

    const conteudo = elemento("div", "medalha-pormenor");
    conteudo.dataset["tipo"] = medalha.tipo;
    conteudo.dataset["ganha"] = ganha ? "sim" : "nao";
    conteudo.appendChild(emblema(medalha.id, ganha, medalha.tipo === "premium"));

    const conta = medalha.unidade !== undefined || medalha.formato === "tempo";
    const estado =
      m.ganhaEm !== undefined
        ? t().paginaMedalhas.estadoGanha(dataCompleta(m.ganhaEm))
        : conta && progresso.atual > 0
          ? t().paginaMedalhas.estadoProgresso(rotuloDaPastilha(medalha, progresso, false))
          : t().paginaMedalhas.estadoPorGanhar;
    conteudo.appendChild(elemento("p", "medalha-pormenor-estado", estado));
    if (medalha.id === "colecionador") {
      conteudo.appendChild(grelhaDasComposicoes(new Set(this.opcoes.composicoes ?? [])));
    }

    avisar(this.raiz, {
      titulo: nomeDaMedalha(medalha),
      texto: t().medalhas.descricoes[medalha.id],
      conteudo,
      fechar: t().paginaMedalhas.fechar,
      classe: "medalha-caixa",
    });
  }
}
