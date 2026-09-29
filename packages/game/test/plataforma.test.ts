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
  definirVibracao,
  ligarBotaoDeVoltar,
  vibrarJogada,
  vibrarRecusa,
  vibrarToque,
  vibrarVitoria,
} from "../src/plataforma/nativo";
import { PROFILE_KEY } from "../src/session/progress";
import { CORRIDA_KEY } from "../src/session/corridaSurvival";
import { SETTINGS_KEY } from "../src/session/settings";
import type { Rota } from "../src/ui/rotas";
import { rotaAcima, sentidoEntre } from "../src/ui/rotas";
import {
  SETTINGS_VERSION,
  defaultSettings,
  loadSettings,
  saveSettings,
} from "../src/session/settings";
import type { ProfileStorage } from "../src/session/progress";

/** Um armazenamento de mentira, com um valor inicial ou vazio. */
const memoria = (inicial: string | null): ProfileStorage => {
  let guardado = inicial;
  return {
    getItem: () => guardado,
    setItem: (_chave, valor) => {
      guardado = valor;
    },
  };
};

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

/*
 * ── De que lado o ecrã entra ──
 *
 * A animação de entrada lê a hierarquia, e o que aqui se protege é que a lê **da
 * mesma maneira que a seta de voltar**: se as duas divergirem, o ecrã anima como
 * se estivesse a descer no exato passo em que a seta o fez subir.
 */
describe("o sentido da entrada", () => {
  const TODAS: readonly Rota[] = [
    { ecra: "home" },
    { ecra: "bandas" },
    { ecra: "niveis", capitulo: "final" },
    { ecra: "jogo", banda: "perito", nivel: 3 },
    { ecra: "tempo" },
    { ecra: "survival", seed: 7 },
    { ecra: "definicoes" },
    { ecra: "regras" },
  ];

  it("sem rota anterior — o arranque — não se veio de lado nenhum", () => {
    expect(sentidoEntre(undefined, { ecra: "home" })).toBe("lado");
  });

  it("descer na hierarquia avança", () => {
    expect(sentidoEntre({ ecra: "home" }, { ecra: "bandas" })).toBe("avanca");
    expect(
      sentidoEntre({ ecra: "bandas" }, { ecra: "niveis", capitulo: "final" }),
    ).toBe("avanca");
    expect(
      sentidoEntre(
        { ecra: "niveis", capitulo: "final" },
        { ecra: "jogo", banda: "perito", nivel: 3 },
      ),
    ).toBe("avanca");
  });

  /*
   * A invariante que interessa: para toda a rota que tem uma acima, ir para
   * essa é sempre recuar. É o que mantém as duas leituras da hierarquia — a
   * desta animação e a do `rotaAcima` — a dizer o mesmo.
   */
  it("ir para a rota acima é sempre recuar", () => {
    for (const r of TODAS) {
      const acima = rotaAcima(r, "final");
      if (acima === undefined) continue;
      expect(sentidoEntre(r, acima)).toBe("recua");
    }
  });

  it("os quatro modos estão todos ao mesmo nível: entre eles é de lado", () => {
    const modos: readonly Rota[] = [
      { ecra: "bandas" },
      { ecra: "tempo" },
      { ecra: "survival" },
      { ecra: "definicoes" },
      { ecra: "regras" },
    ];

    for (const de of modos) {
      for (const para of modos) {
        expect(sentidoEntre(de, para)).toBe("lado");
      }
    }
  });

  it("o mesmo ecrã montado de novo entra de lado", () => {
    // Outra corrida, repetir a seed, a Home depois de mudar o nome.
    expect(
      sentidoEntre({ ecra: "survival", seed: 1 }, { ecra: "survival", seed: 2 }),
    ).toBe("lado");
    expect(sentidoEntre({ ecra: "home" }, { ecra: "home" })).toBe("lado");
  });

  it("o nível seguinte é ao lado, não mais um passo para dentro", () => {
    expect(
      sentidoEntre(
        { ecra: "jogo", banda: "perito", nivel: 3 },
        { ecra: "jogo", banda: "perito", nivel: 4 },
      ),
    ).toBe("lado");
  });
});

/*
 * ── A armadilha do monorepo ──
 *
 * O `cap sync` procura plugins nas dependências do pacote **onde vive o
 * `capacitor.config.ts`**, que é o `mobile`. Os `import` do TypeScript resolvem
 * a partir do `game`. Se os plugins estiverem só num dos dois, compila e
 * instala na mesma — e no telemóvel **nada funciona em silêncio**: sem vibração,
 * sem barra de estado, e o pior, sem gravar o progresso.
 *
 * Foi exatamente o que aconteceu no primeiro `.apk`: `Found 0 Capacitor
 * plugins`. Este teste é o que impede a repetição.
 */
describe("os plugins nativos estão nos dois pacotes", async () => {
  const ler = async (caminho: string): Promise<Record<string, string>> => {
    const bruto = await import(caminho, { with: { type: "json" } });
    const j = bruto.default as { dependencies?: Record<string, string> };
    return j.dependencies ?? {};
  };

  const game = await ler("../package.json");
  const mobile = await ler("../../mobile/package.json");

  const plugins = Object.keys(game).filter(
    (d) => d.startsWith("@capacitor/") && d !== "@capacitor/core",
  );

  it("o game declara plugins do Capacitor", () => {
    expect(plugins.length).toBeGreaterThan(0);
  });

  it.each(plugins)("o mobile também declara %s", (plugin) => {
    expect(mobile[plugin]).toBeDefined();
  });
});

/*
 * ── A vibração como preferência ──
 *
 * Pedido de playtest: há quem não goste da sensação e quem desconfie do que ela
 * gasta de bateria. Nenhuma das duas se discute.
 */
describe("a preferência da vibração", () => {
  it("vem ligada por omissão", () => {
    expect(defaultSettings().vibracao).toBe(true);
  });

  it("um ficheiro gravado antes disto existir lê-se com ela ligada", () => {
    // O campo é novo e não sobe a versão: ninguém perde o tema por causa dele.
    const antigo = memoria(
      JSON.stringify({ version: SETTINGS_VERSION, tema: "escuro", tempoInicial: 90 }),
    );

    const lido = loadSettings(antigo);
    expect(lido.vibracao).toBe(true);
    expect(lido.tema).toBe("escuro");
  });

  it("só um `false` explícito a desliga", () => {
    for (const [valor, esperado] of [
      [false, false],
      [true, true],
      ["não", true],
      [undefined, true],
    ] as const) {
      const s = memoria(
        JSON.stringify({ version: SETTINGS_VERSION, vibracao: valor }),
      );
      expect(loadSettings(s).vibracao).toBe(esperado);
    }
  });

  it("vai e volta do armazenamento", () => {
    const s = memoria(null);
    saveSettings(s, { ...defaultSettings(), vibracao: false });
    expect(loadSettings(s).vibracao).toBe(false);
  });

  it("desligada, nenhuma vibração rebenta", () => {
    definirVibracao(false);
    expect(() => {
      vibrarToque();
      vibrarJogada();
      vibrarRecusa();
      vibrarVitoria();
    }).not.toThrow();
    definirVibracao(true);
  });
});
