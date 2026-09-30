// @vitest-environment jsdom

/**
 * Quem joga: o nome e o avatar.
 *
 * Vive nas **preferências** e não no perfil, pela mesma razão que o tema: quem
 * carrega em «apagar o progresso» está a pedir os selos de volta a zero, não a
 * pedir para deixar de ter nome.
 *
 * Três coisas que têm de continuar a valer:
 *
 * - **Não há nome por omissão.** «Jogador» tem género e escolhê-lo por alguém é
 *   errar com metade das pessoas no primeiro ecrã. Vazio, a Home convida.
 * - **O nome limpa-se à leitura**, e não só à gravação: o ficheiro pode vir de
 *   outra versão, editado à mão, ou de outro aparelho.
 * - **Um ficheiro gravado antes disto existir continua a ler-se.** A versão das
 *   preferências não sobe por um campo novo — cada campo cai na sua omissão.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { emptyProfile } from "../src/session/progress";
import {
  AVATARES,
  NOME_MAX,
  SETTINGS_KEY,
  defaultSettings,
  limparNome,
  loadSettings,
  saveSettings,
} from "../src/session/settings";
import { HomeScreen } from "../src/ui/HomeScreen";
import { abrirPerfil } from "../src/ui/PerfilDialog";

/* ─── Onde se guarda ────────────────────────────────────────────────────── */

describe("o nome e o avatar guardados", () => {
  const memoria = new Map<string, string>();
  const armazem = {
    getItem: (k: string) => memoria.get(k) ?? null,
    setItem: (k: string, v: string) => {
      memoria.set(k, v);
    },
  };

  beforeEach(() => {
    memoria.clear();
  });

  it("nascem sem nome — ninguém é baptizado à revelia", () => {
    expect(defaultSettings().nome).toBe("");
    expect(loadSettings(armazem).nome).toBe("");
  });

  it("sobrevivem a gravar e reler", () => {
    saveSettings(armazem, { ...defaultSettings(), nome: "Rita", avatar: 2 });

    const lido = loadSettings(armazem);
    expect(lido.nome).toBe("Rita");
    expect(lido.avatar).toBe(2);
  });

  it("o nome limpa-se: espaços colapsados, aparado, cortado no limite", () => {
    expect(limparNome("  Rita   Silva  ")).toBe("Rita Silva");
    expect(limparNome("linha\nnova")).toBe("linha nova");
    expect(limparNome("x".repeat(100))).toHaveLength(NOME_MAX);
    expect(limparNome("   ")).toBe("");
  });

  /*
   * O limite não vale só no campo: o ficheiro pode ter sido escrito à mão, por
   * uma versão antiga, ou vir de outro aparelho — e um nome de 4000 caracteres
   * não pode ser coisa que a barra da Home tenha de aguentar.
   */
  it("um nome absurdo no ficheiro é aparado à leitura", () => {
    memoria.set(
      SETTINGS_KEY,
      JSON.stringify({ version: 1, nome: `  ${"z".repeat(500)}  ` }),
    );

    expect(loadSettings(armazem).nome).toHaveLength(NOME_MAX);
  });

  it("um avatar que não é face nenhuma volta à omissão", () => {
    for (const lixo of [7, -1, "3", null, { face: 2 }]) {
      memoria.set(SETTINGS_KEY, JSON.stringify({ version: 1, avatar: lixo }));
      expect(AVATARES).toContain(loadSettings(armazem).avatar);
    }
  });

  /*
   * A versão das preferências não sobe por um campo novo — é o que permite
   * acrescentar entradas sem apagar o tema de quem já jogava.
   */
  it("um ficheiro gravado antes disto existir lê-se na mesma", () => {
    memoria.set(
      SETTINGS_KEY,
      JSON.stringify({ version: 1, tema: "escuro", tempoInicial: 90 }),
    );

    const lido = loadSettings(armazem);
    expect(lido.tema).toBe("escuro");
    expect(lido.tempoInicial).toBe(90);
    expect(lido.nome).toBe("");
  });
});

/* ─── A pastilha da Home ────────────────────────────────────────────────── */

let host: HTMLElement;

beforeEach(() => {
  document.body.replaceChildren();
  host = document.createElement("div");
  document.body.appendChild(host);
});

describe("a pastilha do jogador", () => {
  const home = (nome: string, aoEditarPerfil = (): void => undefined): HomeScreen =>
    new HomeScreen(host, {
      perfil: emptyProfile(),
      totalNiveis: 143,
      melhorTempoSurvival: "2:31.4",
      nome,
      avatar: 4,
      aoEditarPerfil,
      aoEscolherNiveis: () => undefined,
      aoEscolherTempo: () => undefined,
      aoEscolherSurvival: () => undefined,
      aoEscolherDefinicoes: () => undefined,
    });

  it("sem nome, convida — e o convite é o próprio botão", () => {
    const ecra = home("");

    const etiqueta = host.querySelector<HTMLElement>(".home-jogador-nome");
    expect(etiqueta?.textContent).toBe("Quem és?");
    expect(etiqueta?.dataset["convite"]).toBe("sim");

    ecra.destruir();
  });

  /*
   * Quem ouve o ecrã não pode ficar com «Rita» e ter de adivinhar que aquilo se
   * toca: o nome do botão diz sempre o que ele faz.
   */
  it("com nome, mostra-o — e diz na mesma o que o botão faz", () => {
    const ecra = home("Rita");

    expect(host.querySelector(".home-jogador-nome")?.textContent).toBe("Rita");
    expect(
      host.querySelector(".home-jogador")?.getAttribute("aria-label"),
    ).toBe("Rita — mudar nome e avatar");

    ecra.destruir();
  });

  it("mostra a face escolhida, e abre o editor ao tocar", () => {
    const aoEditarPerfil = vi.fn();
    const ecra = home("Rita", aoEditarPerfil);

    expect(
      host.querySelector<HTMLElement>(".home-avatar .peca")?.dataset["valor"],
    ).toBe("4");

    host
      .querySelector<HTMLElement>(".home-jogador")
      ?.dispatchEvent(new MouseEvent("click"));
    expect(aoEditarPerfil).toHaveBeenCalledOnce();

    ecra.destruir();
  });
});

/* ─── O editor ──────────────────────────────────────────────────────────── */

describe("o editor do perfil", () => {
  const abrir = (
    aoGuardar: (p: { readonly nome: string; readonly avatar: number }) => void,
  ): HTMLDialogElement =>
    abrirPerfil(host, { nome: "Rita", avatar: 6, aoGuardar });

  const campo = (): HTMLInputElement | null =>
    host.querySelector<HTMLInputElement>(".perfil-nome");

  const carregar = (el: Element | null): void => {
    el?.dispatchEvent(new MouseEvent("click"));
  };

  const acao = (rotulo: string): Element | undefined =>
    [...host.querySelectorAll(".perfil .acoes .btn")].find(
      (b) => b.textContent === rotulo,
    );

  it("oferece as sete faces, com a atual marcada", () => {
    const d = abrir(() => undefined);

    const opcoes = [...host.querySelectorAll<HTMLElement>(".avatar-opcao")];
    expect(opcoes).toHaveLength(AVATARES.length);

    const marcadas = opcoes.filter(
      (b) => b.getAttribute("aria-checked") === "true",
    );
    expect(marcadas).toHaveLength(1);
    expect(marcadas[0]?.getAttribute("aria-label")).toBe("face 6");

    d.remove();
  });

  it("guarda o nome limpo e a face escolhida", () => {
    const aoGuardar = vi.fn();
    abrir(aoGuardar);

    const entrada = campo();
    if (entrada !== null) entrada.value = "  Rita   Silva  ";

    carregar(host.querySelector('[aria-label="face 2"]'));
    carregar(acao("Guardar") ?? null);

    expect(aoGuardar).toHaveBeenCalledWith({ nome: "Rita Silva", avatar: 2 });
  });

  it("cancelar não guarda nada", () => {
    const aoGuardar = vi.fn();
    abrir(aoGuardar);

    const entrada = campo();
    if (entrada !== null) entrada.value = "Outro";

    carregar(acao("Cancelar") ?? null);
    expect(aoGuardar).not.toHaveBeenCalled();
    expect(host.querySelector("dialog.perfil")).toBeNull();
  });

  /* O «concluído» do teclado do telemóvel tem de fazer o que promete. */
  it("o Enter no campo guarda", () => {
    const aoGuardar = vi.fn();
    abrir(aoGuardar);

    const entrada = campo();
    if (entrada !== null) {
      entrada.value = "Zé";
      entrada.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      );
    }

    expect(aoGuardar).toHaveBeenCalledWith({ nome: "Zé", avatar: 6 });
  });
});
