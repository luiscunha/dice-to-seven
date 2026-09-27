// @vitest-environment jsdom

/**
 * A camada da plataforma.
 *
 * O que se testa aqui é a promessa que ela faz ao resto do código: **na web não
 * faz nada, e nunca rebenta**. É o que permite ao `main.ts` chamá-la sem
 * condições e à demo continuar a ser o que era.
 *
 * O caminho nativo não se testa aqui — precisaria de um telemóvel, e o que ele
 * faz é encaminhar para plugins que não são nossos. O que é nosso, e está
 * testado, é a lista de chaves e a navegação para cima.
 */

import { describe, expect, it } from "vitest";

import { CHAVES, abrirArmazenamento } from "../src/plataforma/armazenamento";
import {
  aplicacaoPronta,
  ligarBotaoDeVoltar,
  vibrarJogada,
  vibrarRecusa,
  vibrarToque,
  vibrarVitoria,
} from "../src/plataforma/nativo";
import { PROFILE_KEY } from "../src/session/progress";
import { CORRIDA_KEY } from "../src/session/corridaSurvival";
import { SETTINGS_KEY } from "../src/session/settings";
import { rotaAcima } from "../src/ui/rotas";

describe("o armazenamento", () => {
  it("na web é o localStorage, tal como sempre foi", async () => {
    const s = await abrirArmazenamento();
    expect(s).toBe(localStorage);
  });

  it("conhece **todas** as chaves que o jogo guarda", () => {
    /*
     * No telemóvel lê-se tudo de uma vez no arranque, e só se pode ler o que se
     * conhece: uma chave que não esteja nesta lista carregava sempre vazia, e o
     * jogador perdia esse progresso em silêncio.
     */
    expect([...CHAVES].sort()).toEqual(
      [PROFILE_KEY, SETTINGS_KEY, CORRIDA_KEY].sort(),
    );
  });
});

describe("o nativo é silencioso na web", () => {
  it("nenhuma das vibrações faz nada, nem rebenta", () => {
    expect(() => {
      vibrarToque();
      vibrarJogada();
      vibrarRecusa();
      vibrarVitoria();
    }).not.toThrow();
  });

  it("o botão de voltar não se liga a nada, e não chama o que lhe deram", () => {
    let chamado = false;
    ligarBotaoDeVoltar(() => {
      chamado = true;
      return true;
    });

    expect(chamado).toBe(false);
  });

  it("aplicacaoPronta resolve sem tocar em barra nem em splash", async () => {
    await expect(aplicacaoPronta(true)).resolves.toBeUndefined();
    await expect(aplicacaoPronta(false)).resolves.toBeUndefined();
  });
});

/*
 * ── Subir na hierarquia ──
 *
 * O botão "para trás" do Android sairia da aplicação de onde quer que fosse. A
 * regra aqui é a mesma da seta do cabeçalho, e é outra: sobe-se na hierarquia,
 * não se recua no histórico.
 */
describe("a rota acima", () => {
  it("a home é o topo — é daí que se sai da aplicação", () => {
    expect(rotaAcima({ ecra: "home" })).toBeUndefined();
  });

  it("de um nível sobe-se para a lista do seu capítulo", () => {
    expect(rotaAcima({ ecra: "jogo", banda: "perito", nivel: 3 }, "final")).toEqual(
      { ecra: "niveis", capitulo: "final" },
    );
  });

  it("sem saber o capítulo, sobe-se à lista de capítulos", () => {
    // Acontece com um link direto para um nível que não está em capítulo nenhum.
    expect(rotaAcima({ ecra: "jogo", banda: "perito", nivel: 3 })).toEqual({
      ecra: "bandas",
    });
  });

  it("da lista de níveis sobe-se para os capítulos", () => {
    expect(rotaAcima({ ecra: "niveis", capitulo: "final" })).toEqual({
      ecra: "bandas",
    });
  });

  it("os outros modos sobem direto para a home", () => {
    for (const r of [
      { ecra: "tempo" },
      { ecra: "survival" },
      { ecra: "definicoes" },
      { ecra: "bandas" },
    ] as const) {
      expect(rotaAcima(r)).toEqual({ ecra: "home" });
    }
  });
});
