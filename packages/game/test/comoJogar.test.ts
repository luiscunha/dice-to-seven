// @vitest-environment jsdom

/**
 * A Home nova e o ecrã das regras.
 *
 * Três coisas que a Home passou a prometer, e que só um teste impede de se
 * perderem numa afinação de CSS:
 *
 * - **Os modos são faces.** A cor de cada cartão vem da rampa das peças, e o
 *   `data-modo` é o que liga um ao outro. Um cartão sem ele fica com a cor por
 *   omissão, que é nenhuma.
 * - **Há uma saída para as regras**, e é um botão a sério — não um `?` escondido
 *   num canto.
 * - **As regras explicam a adjacência com peças**, porque a diagonal explica-se
 *   pior em palavras do que em duas peças e duas casas vazias.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { emptyProfile } from "../src/session/progress";
import { DEFAULT_TIME_ATTACK } from "../src/session/TimeAttackSession";
import type { Profile } from "../src/session/progress";
import type { OpcoesComoJogar } from "../src/ui/ComoJogarScreen";
import { ComoJogarScreen } from "../src/ui/ComoJogarScreen";
import type { OpcoesHome } from "../src/ui/HomeScreen";
import { HomeScreen } from "../src/ui/HomeScreen";

let host: HTMLElement;

beforeEach(() => {
  document.body.replaceChildren();
  host = document.createElement("div");
  document.body.appendChild(host);
});

const home = (
  extra: Partial<OpcoesHome> = {},
  perfil: Profile = emptyProfile(),
): HomeScreen =>
  new HomeScreen(host, {
    perfil,
    totalNiveis: 143,
    melhorTempoSurvival: "2:31.4",
    aoEscolherNiveis: () => undefined,
    aoEscolherTempo: () => undefined,
    aoEscolherSurvival: () => undefined,
    aoEscolherDefinicoes: () => undefined,
    aoEscolherComoJogar: () => undefined,
    ...extra,
  });

describe("a Home", () => {
  it("dá a cada modo a sua face, e o cartão dos Puzzles é o largo", () => {
    const ecra = home();

    const modos = [...host.querySelectorAll<HTMLElement>(".home-modo")];
    expect(modos.map((m) => m.dataset["modo"])).toEqual([
      "puzzles",
      "tempo",
      "survival",
    ]);

    // A hierarquia está na forma: um cartão largo, dois mosaicos.
    expect(modos[0]?.classList.contains("primario")).toBe(true);
    expect(modos[1]?.classList.contains("compacto")).toBe(true);
    expect(modos[2]?.classList.contains("compacto")).toBe(true);

    ecra.destruir();
  });

  it("a marca vive na barra, ao lado das definições", () => {
    const ecra = home();

    const barra = host.querySelector(".home-barra");
    expect(barra?.querySelector(".home-titulo")?.textContent).toBe("DiceToSeven");
    expect(barra?.querySelector('[aria-label="Definições"]')).not.toBeNull();

    ecra.destruir();
  });

  /*
   * A pinta faz de «o» aos olhos, mas o «o» tem de continuar escrito: é o que
   * mantém o nome a soletrar-se para quem ouve o ecrã, e a copiar-se inteiro.
   * O teste acima já garante o texto; este garante que não é o desenho a
   * fornecê-lo.
   */
  it("a peça do nome é decoração, e o «o» continua no texto", () => {
    const ecra = home();

    const titulo = host.querySelector(".home-titulo");
    expect(
      titulo?.querySelector(".home-titulo-peca")?.getAttribute("aria-hidden"),
    ).toBe("true");
    expect(titulo?.querySelector(".home-titulo-o")?.textContent).toBe("o");

    ecra.destruir();
  });

  /*
   * Quem joga saiu da barra de cima — partilhava-a com o nome do jogo e os dois
   * cortavam-se com reticências. No rodapé tem a largura toda.
   */
  it("a pastilha do jogador está no rodapé, e não na barra", () => {
    const ecra = home();

    expect(host.querySelector(".home-barra .home-jogador")).toBeNull();
    expect(host.querySelector(".home-rodape .home-jogador")).not.toBeNull();

    ecra.destruir();
  });

  it("o cartão das regras leva às regras, e imprime a conta em peças", () => {
    const aoEscolherComoJogar = vi.fn();
    const ecra = home({ aoEscolherComoJogar });

    const ajuda = host.querySelector<HTMLElement>(".home-ajuda");
    expect(ajuda?.querySelector(".home-ajuda-titulo")?.textContent).toBe(
      "Como jogar?",
    );

    // 3 e 4 — as peças a sério, e não um desenho parecido.
    const faces = [...(ajuda?.querySelectorAll<HTMLElement>(".peca") ?? [])];
    expect(faces.map((p) => p.dataset["valor"])).toEqual(["3", "4"]);
    expect(faces.every((p) => p.classList.contains("amostra"))).toBe(true);

    ajuda?.querySelector("button")?.dispatchEvent(new MouseEvent("click"));
    expect(aoEscolherComoJogar).toHaveBeenCalledOnce();

    ecra.destruir();
  });

  /*
   * As peças de amostra estão fora de qualquer grelha. `role="gridcell"` num
   * cartão anunciava uma célula de uma tabela que não existe, e o texto ao lado
   * já diz o que elas mostram.
   */
  it("as peças de amostra não se anunciam como células de uma tabela", () => {
    const ecra = home();

    for (const p of host.querySelectorAll(".peca.amostra")) {
      expect(p.getAttribute("role")).toBeNull();
      expect(p.getAttribute("aria-hidden")).toBe("true");
    }

    ecra.destruir();
  });
});

describe("o ecrã das regras", () => {
  const abrir = (extra: Partial<OpcoesComoJogar> = {}): ComoJogarScreen =>
    new ComoJogarScreen(host, { aoVoltar: () => undefined, ...extra });

  /** A secção com este título. */
  const seccao = (titulo: string): HTMLElement => {
    const h2 = [...host.querySelectorAll(".regra h2")].find(
      (h) => h.textContent === titulo,
    );
    const el = h2?.closest<HTMLElement>(".regra");
    if (el === null || el === undefined) throw new Error(`sem a secção «${titulo}»`);
    return el;
  };

  const vereditos = (el: HTMLElement): (string | undefined)[] =>
    [...el.querySelectorAll<HTMLElement>(".regras-exemplo")].map(
      (e) => e.dataset["veredito"],
    );

  it("explica a adjacência com um exemplo que vale e outro que não", () => {
    const ecra = abrir();

    const exemplos = [
      ...seccao("Encostadas, não em diagonal").querySelectorAll<HTMLElement>(
        ".regras-exemplo",
      ),
    ];
    expect(exemplos.map((e) => e.dataset["veredito"])).toEqual(["vale", "nao"]);

    // As casas vazias contam: sem elas, a diagonal lê-se como duas peças soltas.
    for (const exemplo of exemplos) {
      expect(exemplo.querySelectorAll(".peca").length).toBe(2);
      expect(exemplo.querySelectorAll(".regras-vazio").length).toBe(2);
    }

    ecra.destruir();
  });

  it("as peças especiais vêm pela ordem em que se encontram, antes dos selos", () => {
    const ecra = abrir();

    const titulos = [...host.querySelectorAll(".regra h2")].map(
      (h) => h.textContent,
    );
    const ordem = ["O joker", "As soldas", "O gelo", "A bomba", "Os selos"];
    expect(titulos.filter((t) => ordem.includes(t ?? ""))).toEqual(ordem);

    ecra.destruir();
  });

  it("as soldas mostram-se com o grampo do jogo, num par que vale e noutro que não", () => {
    const ecra = abrir();
    const el = seccao("As soldas");

    expect(vereditos(el)).toEqual(["vale", "nao"]);
    for (const exemplo of el.querySelectorAll(".regras-exemplo")) {
      // O par é o de cima e o de baixo, com as classes que o tabuleiro usa.
      expect(exemplo.querySelectorAll(".peca.soldada-cima")).toHaveLength(1);
      expect(exemplo.querySelectorAll(".peca.soldada-baixo")).toHaveLength(1);
    }

    ecra.destruir();
  });

  it("o gelo mostra-se com a peça gelada do jogo, a par e com três", () => {
    const ecra = abrir();
    const el = seccao("O gelo");

    expect(vereditos(el)).toEqual(["vale", "nao"]);
    const [aPar, comTres] = [...el.querySelectorAll(".regras-exemplo")];
    expect(aPar?.querySelectorAll(".peca")).toHaveLength(2);
    expect(comTres?.querySelectorAll(".peca")).toHaveLength(3);
    for (const exemplo of [aPar, comTres]) {
      expect(exemplo?.querySelectorAll(".peca.gelada")).toHaveLength(1);
    }

    ecra.destruir();
  });

  it("a bomba mostra-se com o pavio, e diz o castigo dos dois modos", () => {
    const ecra = abrir();
    const el = seccao("A bomba");

    const pavio = el.querySelector(".peca.bomba > .pavio");
    expect(pavio?.textContent).toBe("6");
    // Quem ouve o ecrã recebe a explicação pelo texto ao lado.
    expect(pavio?.getAttribute("aria-hidden")).toBe("true");

    const castigo = DEFAULT_TIME_ATTACK.bomba.penalizacaoMs / 1000;
    expect(el.textContent).toContain(
      `Contra-Relógio, rebentar custa ${String(castigo)} segundos`,
    );
    expect(el.textContent).toContain("No Survival, cai mais uma linha");

    ecra.destruir();
  });

  it("nomeia os três selos pela ordem em que valem", () => {
    const ecra = abrir();

    const nomes = [
      ...host.querySelectorAll(".regras-selos li b"),
    ].map((b) => b.textContent);
    expect(nomes).toEqual(["Perfeito", "Limpo", "Concluído"]);

    ecra.destruir();
  });

  it("o tutorial do joker só se oferece quando há quem o abra", () => {
    const aoVerTutorialDoJoker = vi.fn();
    const comBotao = abrir({ aoVerTutorialDoJoker });

    const b = [...host.querySelectorAll("button")].find(
      (el) => el.textContent === "Ver o tutorial do joker",
    );
    b?.dispatchEvent(new MouseEvent("click"));
    expect(aoVerTutorialDoJoker).toHaveBeenCalledOnce();
    comBotao.destruir();

    const semBotao = abrir();
    expect(
      [...host.querySelectorAll("button")].map((el) => el.textContent),
    ).not.toContain("Ver o tutorial do joker");
    semBotao.destruir();
  });

  it("a seta do cabeçalho volta para trás", () => {
    const aoVoltar = vi.fn();
    const ecra = abrir({ aoVoltar });

    host
      .querySelector<HTMLElement>('[aria-label="voltar"]')
      ?.dispatchEvent(new MouseEvent("click"));
    expect(aoVoltar).toHaveBeenCalledOnce();

    ecra.destruir();
  });
});
