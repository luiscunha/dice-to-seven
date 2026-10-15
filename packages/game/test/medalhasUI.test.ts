// @vitest-environment jsdom

/**
 * As medalhas no ecrã: a página, a entrada na Home, e a linha do painel de fim.
 *
 * O que se protege: **cada cartão diz o seu estado sem se tocar** — ganho ou
 * por ganhar, e quanto falta —, **as premium vivem na sua aba**, **a Home avisa
 * de medalhas novas** até a página abrir, e **o fim de uma partida anuncia a
 * medalha que ela deu**.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Board, Level } from "@dicetoseven/engine";
import { packed } from "@dicetoseven/engine";

import type { Medalha } from "../src/session/medalhas";
import { MEDALHAS } from "../src/session/medalhas";
import { emptyProfile } from "../src/session/progress";
import { emblema } from "../src/ui/emblemas";
import { HomeScreen } from "../src/ui/HomeScreen";
import { linhaDeMedalhas } from "../src/ui/medalhaNova";
import type { MedalhaNoEcra } from "../src/ui/MedalhasScreen";
import { MedalhasScreen, rotuloDaPastilha } from "../src/ui/MedalhasScreen";
import { PuzzleScreen } from "../src/ui/PuzzleScreen";
import { deHash, paraHash, rotaAcima } from "../src/ui/rotas";

let host: HTMLElement;

beforeEach(() => {
  document.body.replaceChildren();
  host = document.createElement("div");
  document.body.appendChild(host);
});

const medalha = (id: string): Medalha => {
  const m = MEDALHAS.find((x) => x.id === id);
  if (m === undefined) throw new Error(`sem medalha ${id}`);
  return m;
};

/* ─── A pastilha ──────────────────────────────────────────────────────────── */

describe("a pastilha", () => {
  it("por ganhar, diz quanto falta, na unidade da medalha", () => {
    expect(rotuloDaPastilha(medalha("medio"), { atual: 2, alvo: 40 }, false)).toBe("2/40 níveis");
    expect(rotuloDaPastilha(medalha("recordista"), { atual: 3747, alvo: 30_000 }, false)).toBe(
      "3 747/30 000 pontos",
    );
    expect(rotuloDaPastilha(medalha("dez-minutos"), { atual: 320_400, alvo: 600_000 }, false)).toBe(
      "5:20/10:00",
    );
  });

  it("ganha, diz o que se fez", () => {
    expect(rotuloDaPastilha(medalha("iniciado"), { atual: 30, alvo: 30 }, true)).toBe("30 níveis");
    expect(rotuloDaPastilha(medalha("trinta-dias"), { atual: 30, alvo: 30 }, true)).toBe(
      "30 dias seguidos",
    );
    expect(rotuloDaPastilha(medalha("cinco-minutos"), { atual: 300_000, alvo: 300_000 }, true)).toBe(
      "5 minutos",
    );
  });

  it("as de sim-ou-não não têm conta: dizem só em que pé estão", () => {
    const m = medalha("mes-completo");
    expect(rotuloDaPastilha(m, { atual: 0, alvo: 1 }, false)).toBe("Por conquistar");
    expect(rotuloDaPastilha(m, { atual: 1, alvo: 1 }, true)).toBe("Conquistada");
  });
});

/* ─── A página ────────────────────────────────────────────────────────────── */

describe("a página das medalhas", () => {
  let ecra: MedalhasScreen | undefined;

  const todas = (extra: (m: Medalha) => Partial<MedalhaNoEcra> = () => ({})): MedalhaNoEcra[] =>
    MEDALHAS.map((m) => ({ medalha: m, progresso: { atual: 0, alvo: 30 }, ...extra(m) }));

  const abrir = (medalhas: readonly MedalhaNoEcra[]): MedalhasScreen =>
    new MedalhasScreen(host, { medalhas, aoVoltar: () => undefined });

  const aba = (tipo: string): HTMLButtonElement | null =>
    host.querySelector<HTMLButtonElement>(`.medalhas-aba[data-tipo="${tipo}"]`);

  const cartoes = (): HTMLButtonElement[] => [...host.querySelectorAll<HTMLButtonElement>(".medalha")];

  const cartao = (nome: string): HTMLButtonElement | undefined =>
    cartoes().find((c) => c.querySelector(".medalha-nome")?.textContent === nome);

  afterEach(() => {
    ecra?.destruir();
    ecra = undefined;
  });

  it("abre nas normais, e as premium vivem na outra aba", () => {
    ecra = abrir(todas());

    expect(aba("normal")?.getAttribute("aria-selected")).toBe("true");
    expect(aba("premium")?.getAttribute("aria-selected")).toBe("false");
    expect(cartoes().every((c) => c.dataset["tipo"] === "normal")).toBe(true);

    aba("premium")?.click();

    expect(aba("premium")?.getAttribute("aria-selected")).toBe("true");
    expect(cartoes().length).toBe(MEDALHAS.filter((m) => m.tipo === "premium").length);
    expect(cartoes().every((c) => c.dataset["tipo"] === "premium")).toBe(true);
  });

  it("cada aba conta as suas: ganhas de quantas", () => {
    ecra = abrir(todas((m) => (m.id === "iniciado" || m.id === "recordista" ? { ganhaEm: "2026-10-14" } : {})));

    const normais = MEDALHAS.filter((m) => m.tipo === "normal").length;
    expect(aba("normal")?.querySelector(".medalhas-aba-conta")?.textContent).toBe(`1/${String(normais)}`);
    expect(aba("premium")?.getAttribute("aria-label")).toMatch(/^Premium: 1 de \d+$/);
  });

  it("uma ganha tem o halo e a pastilha do que se fez; uma por ganhar tem o cadeado e o que falta", () => {
    ecra = abrir(
      todas((m) =>
        m.id === "iniciado"
          ? { progresso: { atual: 30, alvo: 30 }, ganhaEm: "2026-10-14" }
          : m.id === "medio"
            ? { progresso: { atual: 2, alvo: 40 } }
            : {},
      ),
    );

    const ganho = cartao("Iniciado");
    expect(ganho?.dataset["ganha"]).toBe("sim");
    expect(ganho?.querySelector(".emb-halo")).not.toBeNull();
    expect(ganho?.querySelector(".medalha-cadeado")).toBeNull();
    expect(ganho?.querySelector(".medalha-pastilha")?.textContent).toBe("30 níveis");

    const falta = cartao("Médio");
    expect(falta?.dataset["ganha"]).toBe("nao");
    expect(falta?.querySelector(".emb-halo")).toBeNull();
    expect(falta?.querySelector(".medalha-cadeado")).not.toBeNull();
    expect(falta?.querySelector(".medalha-pastilha")?.textContent).toBe("2/40 níveis");
    expect(falta?.getAttribute("aria-label")).toBe("Médio, por conquistar, 2/40 níveis");
  });

  it("as novas levam «Nova»; e se forem todas premium, a página abre nessa aba", () => {
    ecra = abrir(todas((m) => (m.id === "recordista" ? { ganhaEm: "2026-10-14", nova: true } : {})));

    expect(aba("premium")?.getAttribute("aria-selected")).toBe("true");
    expect(cartao("Recordista")?.querySelector(".medalha-nova")?.textContent).toBe("Nova");
    expect(cartao("Recordista")?.getAttribute("aria-label")).toBe(
      "Recordista, medalha premium, conquistada a 14 de outubro, nova",
    );
  });

  it("tocar num cartão abre o pormenor: o que pede, e em que pé está", () => {
    ecra = abrir(todas((m) => (m.id === "medio" ? { progresso: { atual: 2, alvo: 40 } } : {})));

    cartao("Médio")?.click();

    const caixa = host.querySelector("dialog.medalha-caixa");
    expect(caixa?.querySelector(".popup-titulo")?.textContent).toBe("Médio");
    expect(caixa?.querySelector(".popup-texto")?.textContent).toBe("Acabar todos os níveis do Médio.");
    expect(caixa?.querySelector(".medalha-pormenor-estado")?.textContent).toBe("Vais em 2/40 níveis.");
  });

  it("o pormenor de uma ganha diz quando", () => {
    ecra = abrir(todas((m) => (m.id === "semana" ? { progresso: { atual: 7, alvo: 7 }, ganhaEm: "2026-10-20" } : {})));

    cartao("Uma semana")?.click();

    expect(host.querySelector(".medalha-pormenor-estado")?.textContent).toBe(
      "Conquistada a 20 de outubro de 2026.",
    );
  });
});

/* ─── Os emblemas ─────────────────────────────────────────────────────────── */

describe("os emblemas", () => {
  /*
   * Uma medalha sem desenho não rebenta — leva um dado branco genérico —, mas
   * também não devia chegar ao jogo assim. Este teste é o que obriga a fase
   * seguinte a desenhar as medalhas que acrescentar.
   */
  it("**todas as medalhas do catálogo têm desenho próprio**", () => {
    for (const m of MEDALHAS) {
      expect(emblema(m.id, false, m.tipo === "premium").dataset["desenho"], m.id).toBe(m.id);
    }
    expect(emblema("inventada", false, false).dataset["desenho"]).toBe("generico");
  });

  /*
   * Os degradês vivem numa folha só, no `body`. Repetidos em cada emblema, os
   * ids apareciam em dobro, e um emblema retirado do ecrã levava consigo o
   * degradê de que os outros dependiam.
   */
  it("os degradês ficam numa folha só, por muitos emblemas que haja", () => {
    for (const m of MEDALHAS) host.appendChild(emblema(m.id, true, m.tipo === "premium"));

    expect(document.querySelectorAll("#emblemas-definicoes").length).toBe(1);
    expect(document.querySelectorAll("#emb-ouro").length).toBe(1);
    expect(host.querySelector("[id]")).toBeNull();
  });

  it("o halo é das ganhas, e o das premium é de ouro", () => {
    expect(emblema("iniciado", false, false).querySelector(".emb-halo")).toBeNull();
    expect(emblema("iniciado", true, false).querySelector(".emb-halo-ouro")).toBeNull();
    expect(emblema("recordista", true, true).querySelector(".emb-halo-ouro")).not.toBeNull();
  });
});

/* ─── A Home ──────────────────────────────────────────────────────────────── */

describe("a entrada na Home", () => {
  let ecra: HomeScreen | undefined;
  let abriu = 0;

  const home = (novas: boolean): HomeScreen =>
    new HomeScreen(host, {
      perfil: emptyProfile(),
      totalNiveis: 133,
      melhorTempoSurvival: "0:00.0",
      aoEscolherNiveis: () => undefined,
      aoEscolherTempo: () => undefined,
      aoEscolherSurvival: () => undefined,
      aoEscolherDefinicoes: () => undefined,
      medalhas: {
        ganhas: 3,
        total: 17,
        novas,
        aoAbrir: () => {
          abriu++;
        },
      },
    });

  const botao = (): HTMLButtonElement | null => host.querySelector(".home-medalhas");

  beforeEach(() => {
    abriu = 0;
  });

  afterEach(() => {
    ecra?.destruir();
    ecra = undefined;
  });

  it("fica no rodapé, ao lado de quem joga, com ganhas de quantas", () => {
    ecra = home(false);

    expect(botao()?.parentElement?.classList.contains("home-rodape")).toBe(true);
    expect(botao()?.querySelector(".home-medalhas-conta")?.textContent).toBe("3/17");
    expect(botao()?.dataset["novas"]).toBeUndefined();

    botao()?.click();
    expect(abriu).toBe(1);
  });

  it("com medalhas por ver, leva o ponto — e di-lo a quem ouve o ecrã", () => {
    ecra = home(true);

    expect(botao()?.dataset["novas"]).toBe("sim");
    expect(botao()?.getAttribute("aria-label")).toBe("Medalhas: 3 de 17, com novas por ver");
  });
});

/* ─── O painel de fim ─────────────────────────────────────────────────────── */

describe("a linha do painel de fim", () => {
  it("não existe sem medalhas novas", () => {
    expect(linhaDeMedalhas([])).toBeUndefined();
  });

  it("diz uma, ou várias, e marca as premium", () => {
    expect(linhaDeMedalhas([{ id: "perito", tipo: "normal" }])?.textContent).toBe(
      "Nova medalha: Perito",
    );

    const varias = linhaDeMedalhas([
      { id: "maratona", tipo: "normal" },
      { id: "recordista", tipo: "premium" },
    ]);
    expect(varias?.textContent).toBe("Novas medalhas: Maratona, Recordista");
    expect(varias?.dataset["premium"]).toBe("sim");
  });

  /** 3+4 e 2+5: duas jogadas, sem becos. */
  const BOARD: Board = [[3], [4], [2], [5]];
  const NIVEL: Level = { id: "inicio-000001", seed: 0, board: BOARD, solution: [] };

  const clicar = (p: number): void => {
    host
      .querySelector(`.peca[data-pos="${String(p)}"]`)
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  };

  const assentar = (): Promise<void> =>
    new Promise((r) => {
      setTimeout(r, 0);
    });

  const acabar = async (): Promise<void> => {
    clicar(packed(0, 0));
    clicar(packed(1, 0));
    await assentar();
    clicar(packed(0, 0));
    clicar(packed(1, 0));
    await assentar();
  };

  it("**o fim de um nível anuncia a medalha que ele deu**, antes dos botões", async () => {
    const ecra = new PuzzleScreen(host, NIVEL, {
      aoTerminar: () => [{ id: "iniciado", tipo: "normal" }],
    });
    await acabar();

    const linha = host.querySelector(".fim .fim-medalhas");
    expect(linha?.textContent).toBe("Nova medalha: Iniciado");
    expect(linha?.nextElementSibling?.classList.contains("fim-acoes")).toBe(true);

    ecra.destruir();
  });

  it("um nível que não deu medalha não tem linha nenhuma", async () => {
    const ecra = new PuzzleScreen(host, NIVEL, { aoTerminar: () => undefined });
    await acabar();

    expect(host.querySelector<HTMLElement>(".fim")?.hidden).toBe(false);
    expect(host.querySelector(".fim-medalhas")).toBeNull();

    ecra.destruir();
  });
});

/* ─── A rota ──────────────────────────────────────────────────────────────── */

describe("a rota", () => {
  it("tem endereço próprio, e sobe para a Home", () => {
    expect(paraHash({ ecra: "medalhas" })).toBe("#/medalhas");
    expect(deHash("#/medalhas")).toEqual({ ecra: "medalhas" });
    expect(rotaAcima({ ecra: "medalhas" })).toEqual({ ecra: "home" });
  });
});
