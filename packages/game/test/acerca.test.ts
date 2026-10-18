// @vitest-environment jsdom

/**
 * O «Acerca», no fim das Definições.
 *
 * O que se protege: **a versão que se lê é a do pacote** — a mesma do
 * `package.json` do `mobile`, que vai escrita nos projetos nativos —; **o
 * contacto é o do jogo**; e **as páginas do site abrem no idioma do jogo**, e
 * fora dele.
 */

import { afterEach, describe, expect, it } from "vitest";

import { version } from "../../mobile/package.json";
import { definirIdioma } from "../src/i18n";
import { DefinicoesScreen } from "../src/ui/DefinicoesScreen";

afterEach(() => {
  definirIdioma("pt-PT");
  document.body.replaceChildren();
});

const abrir = (): DefinicoesScreen => {
  const host = document.createElement("div");
  document.body.appendChild(host);
  return new DefinicoesScreen(host, {
    idioma: "sistema",
    aoMudarIdioma: () => undefined,
    tema: "sistema",
    aoMudarTema: () => undefined,
    tempoInicial: 60,
    aoMudarTempoInicial: () => undefined,
    vibracao: true,
    aoMudarVibracao: () => undefined,
    aoApagarProgresso: () => undefined,
    aoVoltar: () => undefined,
  });
};

const links = (): HTMLAnchorElement[] => [...document.querySelectorAll<HTMLAnchorElement>(".acerca a")];

describe("o Acerca", () => {
  it("é a última secção, e diz a versão do pacote", () => {
    const ecra = abrir();

    const seccoes = [...document.querySelectorAll(".definicao")];
    expect(seccoes.at(-1)?.classList.contains("acerca")).toBe(true);
    expect(document.querySelector(".acerca-versao")?.textContent).toBe(`Versão ${version}`);

    ecra.destruir();
  });

  it("o contacto é o e-mail do jogo, e abre o programa de correio", () => {
    const ecra = abrir();

    const correio = links().find((a) => a.href.startsWith("mailto:"));
    expect(correio?.href).toBe("mailto:dicetoseven@gmail.com");
    expect(correio?.target).toBe("");

    ecra.destruir();
  });

  it("a privacidade e o suporte abrem fora do jogo, no idioma dele", () => {
    definirIdioma("fr-FR");
    const ecra = abrir();

    const paginas = links().filter((a) => a.href.startsWith("https://"));
    expect(paginas.map((a) => [a.textContent, a.href])).toEqual([
      ["Politique de confidentialité", "https://luiscunha.github.io/dicetoseven-site/privacy.html?lang=fr"],
      ["Assistance", "https://luiscunha.github.io/dicetoseven-site/support.html?lang=fr"],
    ]);
    expect(paginas.every((a) => a.target === "_blank" && a.rel === "noopener")).toBe(true);

    ecra.destruir();
  });
});
