/**
 * Definições.
 *
 * Tema, contra-relógio, vibração e apagar o progresso. O desenho §5.8 prevê
 * mais, e o som há de entrar quando existir som; a estrutura é uma lista de
 * secções, para que acrescentar uma entrada não obrigue a mexer nas outras.
 *
 * **A vibração só aparece no telemóvel.** Uma definição que não faz nada é pior
 * do que não existir: quem a desliga fica convencido de que resolveu alguma
 * coisa.
 *
 * **Apagar o progresso pede confirmação no próprio botão**, e não numa caixa de
 * diálogo. Um `confirm()` do browser é feio, bloqueia, e em telemóvel aparece
 * com o nome do domínio — que é o oposto de uma aplicação. Carregar duas vezes
 * resolve o mesmo problema sem sair do ecrã, e o segundo carregar diz claramente
 * o que vai acontecer.
 */

import type { PreferenciaDeIdioma } from "../i18n";
import { IDIOMAS, t } from "../i18n";
import type { Tema, TempoInicial } from "../session/settings";
import { emTelemovel } from "../plataforma/nativo";
import { botao, cabecalho, elemento } from "./dom";

const TEMAS: readonly Tema[] = ["sistema", "claro", "escuro"];

const TEMPOS: readonly TempoInicial[] = [30, 60, 90];

export interface OpcoesDefinicoes {
  /** «Sistema», que segue o telemóvel, ou um dos quatro idiomas. */
  readonly idioma: PreferenciaDeIdioma;
  /** Quem chama muda o idioma e monta o ecrã outra vez, já traduzido. */
  readonly aoMudarIdioma: (idioma: PreferenciaDeIdioma) => void;
  readonly tema: Tema;
  readonly aoMudarTema: (tema: Tema) => void;
  readonly tempoInicial: TempoInicial;
  readonly aoMudarTempoInicial: (segundos: TempoInicial) => void;
  readonly vibracao: boolean;
  readonly aoMudarVibracao: (ligada: boolean) => void;
  readonly aoApagarProgresso: () => void;
  readonly aoVoltar: () => void;
}

export class DefinicoesScreen {
  private readonly raiz: HTMLElement;
  private readonly opcoes: OpcoesDefinicoes;
  private armado = false;

  constructor(host: HTMLElement, opcoes: OpcoesDefinicoes) {
    this.opcoes = opcoes;
    this.raiz = elemento("div", "ecra");

    const { el: topo } = cabecalho(t().definicoes.titulo, opcoes.aoVoltar);

    const rolo = elemento("div", "rolo");
    rolo.append(this.seccaoIdioma(), this.seccaoTema(), this.seccaoContraRelogio());

    /*
     * A vibração só aparece onde existe. Na web não há telemóvel para vibrar, e
     * uma definição que não faz nada é pior do que não ter definição nenhuma —
     * quem a desliga fica convencido de que resolveu alguma coisa.
     */
    if (emTelemovel()) rolo.appendChild(this.seccaoVibracao());

    rolo.appendChild(this.seccaoProgresso());

    this.raiz.append(topo, rolo);
    host.replaceChildren(this.raiz);
  }

  destruir(): void {
    this.raiz.remove();
  }

  private seccao(titulo: string, nota?: string): HTMLElement {
    const el = elemento("section", "definicao");
    el.appendChild(elemento("h2", undefined, titulo));
    if (nota !== undefined) el.appendChild(elemento("p", "nota", nota));
    return el;
  }

  /**
   * O idioma: «Sistema» e os quatro, **cada um com o nome na própria língua**.
   * Quem tem o jogo numa língua que não lê tem de encontrar a sua sem a saber
   * ler na dos outros.
   *
   * Cinco opções não cabem numa fila a 320px, e por isso o segmentado aqui é
   * uma grelha. «Sistema» vem primeiro, como no tema: é a omissão.
   */
  private seccaoIdioma(): HTMLElement {
    const d = t().definicoes;
    const el = this.seccao(d.idioma, d.notaIdioma);

    const grupo = elemento("div", "segmentado grelha-idiomas");
    grupo.setAttribute("role", "radiogroup");
    grupo.setAttribute("aria-label", d.idiomaAria);

    const opcoes: readonly { readonly valor: PreferenciaDeIdioma; readonly rotulo: string }[] = [
      { valor: "sistema", rotulo: d.sistema },
      ...IDIOMAS.map((i) => ({ valor: i.idioma, rotulo: i.nome })),
    ];

    for (const { valor, rotulo } of opcoes) {
      const b = botao(rotulo, "segmento", () => {
        for (const outro of grupo.querySelectorAll("[role=radio]")) {
          outro.setAttribute("aria-checked", String(outro === b));
        }
        this.opcoes.aoMudarIdioma(valor);
      });

      b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", String(valor === this.opcoes.idioma));
      // O nome de cada idioma lê-se na sua língua, também para quem ouve o ecrã.
      const lang = IDIOMAS.find((i) => i.idioma === valor)?.idioma;
      if (lang !== undefined) b.lang = lang;
      grupo.appendChild(b);
    }

    el.appendChild(grupo);
    return el;
  }

  private seccaoTema(): HTMLElement {
    const d = t().definicoes;
    const el = this.seccao(d.tema, d.notaTema);

    const grupo = elemento("div", "segmentado");
    grupo.setAttribute("role", "radiogroup");
    grupo.setAttribute("aria-label", d.temaAria);

    for (const valor of TEMAS) {
      const rotulo = valor === "sistema" ? d.sistema : valor === "claro" ? d.claro : d.escuro;
      const b = botao(rotulo, "segmento", () => {
        this.opcoes.aoMudarTema(valor);
        for (const outro of grupo.querySelectorAll("[role=radio]")) {
          outro.setAttribute(
            "aria-checked",
            String(outro === b),
          );
        }
      });

      b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", String(valor === this.opcoes.tema));
      grupo.appendChild(b);
    }

    el.appendChild(grupo);
    return el;
  }

  /**
   * A vibração ao tocar nas peças.
   *
   * Dois botões em vez de um interruptor, para falar a mesma língua das outras
   * secções — e porque `Ligada`/`Desligada` diz o estado sem ser preciso saber
   * ler a posição de um botão.
   */
  private seccaoVibracao(): HTMLElement {
    const d = t().definicoes;
    const el = this.seccao(d.vibracao, d.notaVibracao);

    const grupo = elemento("div", "segmentado");
    grupo.setAttribute("role", "radiogroup");
    grupo.setAttribute("aria-label", d.vibracaoAria);

    for (const ligada of [true, false]) {
      const b = botao(ligada ? d.ligada : d.desligada, "segmento", () => {
        this.opcoes.aoMudarVibracao(ligada);
        for (const outro of grupo.querySelectorAll("[role=radio]")) {
          outro.setAttribute("aria-checked", String(outro === b));
        }
      });

      b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", String(ligada === this.opcoes.vibracao));
      grupo.appendChild(b);
    }

    el.appendChild(grupo);
    return el;
  }

  /**
   * Quanto tempo o contra-relógio dá à partida.
   *
   * Só afeta a corrida seguinte — mexer no relógio de uma corrida a decorrer
   * seria mudar as regras a meio, e as definições nem sequer são alcançáveis
   * sem sair dela.
   */
  private seccaoContraRelogio(): HTMLElement {
    const d = t().definicoes;
    const el = this.seccao(t().modos.tempo, d.notaTempo);

    const grupo = elemento("div", "segmentado");
    grupo.setAttribute("role", "radiogroup");
    grupo.setAttribute("aria-label", d.tempoAria);

    for (const segundos of TEMPOS) {
      const b = botao(`${String(segundos)}s`, "segmento", () => {
        this.opcoes.aoMudarTempoInicial(segundos);
        for (const outro of grupo.querySelectorAll("[role=radio]")) {
          outro.setAttribute("aria-checked", String(outro === b));
        }
      });

      b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", String(segundos === this.opcoes.tempoInicial));
      grupo.appendChild(b);
    }

    el.appendChild(grupo);
    return el;
  }

  private seccaoProgresso(): HTMLElement {
    const d = t().definicoes;
    const el = this.seccao(d.progresso, d.notaProgresso);

    const b = botao(d.apagar, "perigo");

    b.addEventListener("click", () => {
      if (!this.armado) {
        this.armado = true;
        b.textContent = d.apagarConfirmar;
        return;
      }

      this.opcoes.aoApagarProgresso();
      this.armado = false;
      b.textContent = d.apagado;
      b.disabled = true;
    });

    el.appendChild(b);
    return el;
  }
}
