// @vitest-environment jsdom

/**
 * Os idiomas.
 *
 * O que se protege: **o idioma do telemóvel escolhe o do jogo**, pela língua e
 * não pela variante, e com inglês para as que o jogo não tem; **a escolha das
 * Definições guarda-se**; **nenhum idioma tem um texto vazio ou partido** — o
 * compilador já garante que nenhum falta, e isto garante que todos se leem; e
 * **o jogo fala mesmo a língua escolhida**, sem português esquecido pelo meio.
 */

import { afterEach, describe, expect, it } from "vitest";

import type { Idioma } from "../src/i18n";
import { IDIOMAS, definirIdioma, idiomaDoSistema, resolverIdioma, t, textosDe } from "../src/i18n";
import { emptyProfile } from "../src/session/progress";
import { defaultSettings, loadSettings, saveSettings, SETTINGS_KEY } from "../src/session/settings";
import { DefinicoesScreen } from "../src/ui/DefinicoesScreen";
import { HomeScreen } from "../src/ui/HomeScreen";
import { dataCurta, dataPorExtenso, textoDoDesafio } from "../src/ui/partilha";

afterEach(() => {
  definirIdioma("pt-PT");
  document.body.replaceChildren();
});

/* ─── O idioma do telemóvel ───────────────────────────────────────────────── */

describe("o idioma do telemóvel", () => {
  it("escolhe pela língua, e não pela variante", () => {
    expect(idiomaDoSistema(["pt-BR"])).toBe("pt-PT");
    expect(idiomaDoSistema(["en-US"])).toBe("en-GB");
    expect(idiomaDoSistema(["es-MX"])).toBe("es-ES");
    expect(idiomaDoSistema(["fr-CA"])).toBe("fr-FR");
    expect(idiomaDoSistema(["PT_pt"])).toBe("pt-PT");
  });

  it("**sem nenhum dos quatro, inglês**", () => {
    expect(idiomaDoSistema(["de-DE"])).toBe("en-GB");
    expect(idiomaDoSistema(["ja"])).toBe("en-GB");
    expect(idiomaDoSistema([])).toBe("en-GB");
  });

  it("vale o primeiro da lista que o jogo tenha: alemão e depois espanhol dá espanhol", () => {
    expect(idiomaDoSistema(["de-DE", "es-ES", "en-GB"])).toBe("es-ES");
  });

  it("«Sistema» segue o telemóvel; um idioma escolhido fica, diga o telemóvel o que disser", () => {
    expect(resolverIdioma("sistema", ["fr-FR"])).toBe("fr-FR");
    expect(resolverIdioma("pt-PT", ["fr-FR"])).toBe("pt-PT");
  });
});

/* ─── A preferência ───────────────────────────────────────────────────────── */

describe("a preferência de idioma", () => {
  const memoria = (): { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void } => {
    const m = new Map<string, string>();
    return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
  };

  it("nasce em «Sistema»", () => {
    expect(defaultSettings().idioma).toBe("sistema");
  });

  it("sobrevive a gravar e reler", () => {
    const s = memoria();
    saveSettings(s, { ...defaultSettings(), idioma: "fr-FR" });
    expect(loadSettings(s).idioma).toBe("fr-FR");
  });

  it("um ficheiro de antes dos idiomas, ou com um idioma inventado, segue o sistema", () => {
    const s = memoria();
    const { idioma: _fora, ...antigo } = defaultSettings();
    s.setItem(SETTINGS_KEY, JSON.stringify({ ...antigo, tema: "escuro" }));
    expect(loadSettings(s).idioma).toBe("sistema");
    expect(loadSettings(s).tema).toBe("escuro");

    s.setItem(SETTINGS_KEY, JSON.stringify({ ...defaultSettings(), idioma: "klingon" }));
    expect(loadSettings(s).idioma).toBe("sistema");
  });
});

/* ─── Os dicionários ──────────────────────────────────────────────────────── */

/**
 * Todos os textos de um dicionário, já escritos. As funções chamam-se com
 * argumentos de exemplo — um número, que também serve onde se espera texto —,
 * com 1 e com 2, para passar pelos dois lados de cada plural.
 */
function todosOsTextos(x: unknown, caminho: string, fora: [string, string][]): void {
  if (typeof x === "string") {
    fora.push([caminho, x]);
    return;
  }
  if (typeof x === "function") {
    const f = x as (...a: unknown[]) => unknown;
    for (const n of [1, 2]) {
      todosOsTextos(f(...Array.from({ length: f.length }, () => n)), `${caminho}(${String(n)})`, fora);
    }
    return;
  }
  if (typeof x === "object" && x !== null) {
    for (const [k, v] of Object.entries(x)) todosOsTextos(v, `${caminho}.${k}`, fora);
  }
}

describe("os dicionários", () => {
  const idiomas = IDIOMAS.map((i) => i.idioma);

  it.each(idiomas)("%s: nenhum texto vazio, «undefined» ou «NaN»", (idioma: Idioma) => {
    const textos: [string, string][] = [];
    todosOsTextos(textosDe(idioma), idioma, textos);

    expect(textos.length).toBeGreaterThan(250);
    for (const [caminho, texto] of textos) {
      expect(texto.trim().length, caminho).toBeGreaterThan(0);
      expect(texto, caminho).not.toMatch(/undefined|NaN|\[object/);
    }
  });

  /*
   * A outra metade do que o compilador não vê: um texto copiado do português
   * e esquecido. Os textos curtos e os que são iguais em várias línguas
   * («Survival», «Puzzle», «joker») ficam de fora; uma frase inteira igual à
   * portuguesa é quase sempre uma tradução que não se fez.
   */
  it.each(idiomas.filter((i) => i !== "pt-PT"))(
    "%s: nenhuma frase ficou em português",
    (idioma: Idioma) => {
      const pt: [string, string][] = [];
      const outro: [string, string][] = [];
      todosOsTextos(textosDe("pt-PT"), "", pt);
      todosOsTextos(textosDe(idioma), "", outro);
      const portugues = new Map(pt);

      // Uma frase é um texto com pelo menos três palavras de verdade — não
      // «1: 1 de 1», que é número em todas as línguas.
      const palavras = (s: string): number => (s.match(/\p{L}{3,}/gu) ?? []).length;
      const iguais = outro.filter(
        ([caminho, texto]) => palavras(texto) >= 3 && portugues.get(caminho) === texto,
      );
      expect(iguais).toEqual([]);
    },
  );

  it("cada idioma diz o seu `lang`, e os nomes do seletor estão na própria língua", () => {
    for (const { idioma } of IDIOMAS) expect(textosDe(idioma).lang).toBe(idioma);
    expect(IDIOMAS.map((i) => i.nome)).toEqual(["Português", "English", "Español", "Français"]);
  });

  it("o francês leva o espaço fino antes da pontuação alta, também nos textos com números", () => {
    const fr = textosDe("fr-FR");
    expect(fr.perfil.quemEs).toBe("Qui es-tu ?");
    expect(fr.puzzle.becoTitulo).toBe("Oups ! Impasse !");
    expect(fr.paginaMedalhas.contaDaAba("Premium", 3, 8)).toBe("Premium : 3 sur 8");
  });

  it("os números e as datas escrevem-se à maneira de cada língua", () => {
    expect(textosDe("pt-PT").formato.milhares(30_000)).toBe("30 000");
    expect(textosDe("en-GB").formato.milhares(30_000)).toBe("30,000");
    expect(textosDe("es-ES").formato.milhares(30_000)).toBe("30.000");
    expect(textosDe("fr-FR").formato.milhares(30_000)).toBe("30 000");

    definirIdioma("en-GB");
    expect(dataCurta("2026-10-14")).toBe("14 Oct");
    expect(dataPorExtenso("2026-10-14")).toBe("14 October");
    definirIdioma("es-ES");
    expect(dataPorExtenso("2026-10-14")).toBe("14 de octubre");
    definirIdioma("fr-FR");
    expect(dataCurta("2026-10-01")).toBe("1er oct.");
  });
});

/* ─── O jogo noutra língua ────────────────────────────────────────────────── */

describe("o jogo noutra língua", () => {
  const host = (): HTMLElement => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    return el;
  };

  const home = (): HomeScreen =>
    new HomeScreen(host(), {
      perfil: emptyProfile(),
      totalNiveis: 133,
      melhorTempoSurvival: "0:00.0",
      aoEscolherNiveis: () => undefined,
      aoEscolherTempo: () => undefined,
      aoEscolherSurvival: () => undefined,
      aoEscolherDefinicoes: () => undefined,
      medalhas: { ganhas: 3, total: 17, novas: false, aoAbrir: () => undefined },
    });

  it.each([
    ["en-GB", "Time Attack", "Who are you?"],
    ["es-ES", "Contrarreloj", "¿Quién eres?"],
    ["fr-FR", "Contre-la-montre", "Qui es-tu ?"],
  ] as const)("a Home em %s diz o nome do modo e convida na língua dela", (idioma, modo, convite) => {
    definirIdioma(idioma);
    const ecra = home();

    const texto = document.body.textContent ?? "";
    expect(texto).toContain(modo);
    expect(texto).toContain(convite);
    expect(texto).not.toContain("Modos de jogo");
    expect(texto).not.toContain("Quem és?");

    ecra.destruir();
  });

  it("o texto partilhado sai no idioma do jogo", () => {
    definirIdioma("en-GB");
    const texto = textoDoDesafio(
      "2026-10-14",
      { survival: { estado: "feito", resultado: { tempoMs: 222_100, limpou: true, linhas: 18 } } },
      3,
    );
    expect(texto).toBe(
      "DiceToSeven · Challenge #3 · 14 Oct\n🧱 Survival: cleared in 3:42.1\n🔥 3 days in a row",
    );
  });

  it("as Definições mostram «Sistema» e os quatro idiomas, e marcam o escolhido", () => {
    let escolhido: string | undefined;
    const ecra = new DefinicoesScreen(host(), {
      idioma: "es-ES",
      aoMudarIdioma: (i) => {
        escolhido = i;
      },
      tema: "sistema",
      aoMudarTema: () => undefined,
      tempoInicial: 60,
      aoMudarTempoInicial: () => undefined,
      vibracao: true,
      aoMudarVibracao: () => undefined,
      aoApagarProgresso: () => undefined,
      aoVoltar: () => undefined,
    });

    const opcoes = [...document.querySelectorAll<HTMLButtonElement>(".grelha-idiomas [role=radio]")];
    expect(opcoes.map((b) => b.textContent)).toEqual([
      t().definicoes.sistema,
      "Português",
      "English",
      "Español",
      "Français",
    ]);
    expect(opcoes.find((b) => b.getAttribute("aria-checked") === "true")?.textContent).toBe("Español");
    expect(opcoes[4]?.lang).toBe("fr-FR");

    opcoes[2]?.click();
    expect(escolhido).toBe("en-GB");

    ecra.destruir();
  });
});
