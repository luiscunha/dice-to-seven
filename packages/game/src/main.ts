/**
 * Arranque e navegação.
 *
 * O jogo é uma função da rota para um ecrã, e mais nada. Não há framework nem
 * router de biblioteca: são seis ecrãs e uma máquina de estados que cabe num
 * `switch` — e um router traria consigo a reconciliação por posição, que é
 * exatamente o que o `BoardView` precisa que não aconteça.
 *
 * O perfil e as preferências carregam-se uma vez e vivem aqui. Os ecrãs recebem
 * o que precisam e devolvem intenções; nenhum deles sabe gravar nada.
 */

import type { Level } from "@dicetoseven/engine";

import type { Capitulo, NivelDoCapitulo } from "./capitulos";
import { CAPITULOS, capituloDaBanda, capituloPorId, montarCapitulo } from "./capitulos";
import type { BandaNoIndice } from "./levels";
import { cabeNoEcra, carregarBanda, carregarIndice } from "./levels";
import {
  countCompleted,
  emptyProfile,
  load,
  markJokerTutorialSeen,
  recordLevel,
  recordSurvival,
  recordTimeAttack,
  save,
} from "./session/progress";
import type { Profile, ProfileStorage } from "./session/progress";
import type { Seal } from "./session/PuzzleSession";
import type { Settings, Tema, TempoInicial } from "./session/settings";
import {
  aplicarTema,
  defaultSettings,
  loadSettings,
  saveSettings,
} from "./session/settings";
import type { CorridaGuardada } from "./session/corridaSurvival";
import {
  guardarCorrida,
  lerCorrida,
  limparCorrida,
} from "./session/corridaSurvival";
import { mostraSomaDasFaces } from "./session/tutorial";
import type { CapituloNaLista } from "./ui/CapitulosScreen";
import { CapitulosScreen } from "./ui/CapitulosScreen";
import { ComoJogarScreen } from "./ui/ComoJogarScreen";
import { DefinicoesScreen } from "./ui/DefinicoesScreen";
import { elemento } from "./ui/dom";
import { HomeScreen } from "./ui/HomeScreen";
import { JokerTutorial } from "./ui/JokerTutorial";
import { NiveisScreen } from "./ui/NiveisScreen";
import { PuzzleScreen } from "./ui/PuzzleScreen";
import type { Rota } from "./ui/rotas";
import { deHash, paraHash, rotaAcima, rotaLegada } from "./ui/rotas";
import { abrirArmazenamento } from "./plataforma/armazenamento";
import {
  ajustarBarras,
  aplicacaoPronta,
  definirVibracao,
  ligarBotaoDeVoltar,
} from "./plataforma/nativo";
import { SurvivalScreen, novaSeed } from "./ui/SurvivalScreen";
import { relogio } from "./ui/tempo";
import { TimeAttackScreen } from "./ui/TimeAttackScreen";

const app = document.querySelector<HTMLElement>("#app");
if (app === null) throw new Error("não encontrei #app");

/*
 * O armazenamento abre-se no `arrancar()`, porque no telemóvel a leitura é
 * assíncrona — ver `plataforma/armazenamento.ts`. Até lá o jogo tem o perfil
 * vazio, e nada corre antes disso: os ecrãs só se montam depois do
 * `resolver()`, lá no fim.
 */
let armazenamento: ProfileStorage | undefined;
let perfil: Profile = emptyProfile();
let preferencias: Settings = defaultSettings();

/** Todas as bandas do índice, incluindo a do modo tempo. */
let bandas: readonly BandaNoIndice[] = [];

/**
 * A campanha, já em capítulos.
 *
 * Cinco entradas e não oito bandas: uma banda é uma receita de geração, e o
 * jogador não tem que saber que existem duas maneiras de fazer um nível médio
 * (ver `capitulos.ts`). A banda do modo tempo não entra em nenhum capítulo —
 * o corpus dos dois modos é oposto por desenho (plano §6.1).
 */
let campanha: readonly CapituloNaLista[] = [];

let idsComJoker: readonly string[] = [];

const niveisDoCapitulo = (id: string): readonly NivelDoCapitulo[] =>
  campanha.find((c) => c.capitulo.id === id)?.niveis ?? [];

/**
 * O ecrã montado. Só um de cada vez, e é sempre este que se destrói.
 *
 * `interceptarVoltar` é a pergunta que o botão «para trás» do Android faz ao
 * ecrã antes de navegar: um seletor aberto fecha-se, uma partida a meio pede
 * confirmação. Só os ecrãs de jogo a têm — os de lista não guardam nada que se
 * perca ao subir.
 */
let atual:
  | { readonly destruir: () => void; readonly interceptarVoltar?: () => boolean }
  | undefined;
let tutorial: JokerTutorial | undefined;

/** O tutorial aberto pelo `?`, que se pode fechar — ao contrário do primeiro. */
let tutorialEmRevisao = false;

/**
 * A corrida de Survival a meio.
 *
 * Vive aqui e não no ecrã porque o ecrã é destruído a cada navegação, e vai a
 * disco porque a página também é: num telemóvel, trocar de aplicação e voltar
 * basta para o browser a montar de novo.
 */
let corridaSurvival: CorridaGuardada | undefined;

const guardarSurvival = (corrida: CorridaGuardada | undefined): void => {
  corridaSurvival = corrida;
  if (armazenamento === undefined) return;

  if (corrida === undefined) limparCorrida(armazenamento);
  else guardarCorrida(armazenamento, corrida);
};

const guardarPerfil = (): void => {
  if (armazenamento !== undefined) save(armazenamento, perfil);
};

const guardarPreferencias = (): void => {
  if (armazenamento !== undefined) saveSettings(armazenamento, preferencias);
};

/* ─── navegação ─────────────────────────────────────────────────────────────
 *
 * `ir` escreve no histórico; a rota real vem sempre do `hashchange` que se
 * segue. Um só caminho de entrada — sem isto, navegar por código e navegar pelo
 * botão de retroceder seriam dois fluxos a manter em sincronia.
 */

const ir = (r: Rota): void => {
  location.hash = paraHash(r);
};

const voltarA = (r: Rota): (() => void) => () => {
  ir(r);
};

function resolver(): void {
  const rota = deHash(location.hash);
  void mostrar(rota);
}

/**
 * Um passo para cima, para o botão "para trás" do Android. `false` = já não há
 * para onde ir, e quem chamou decide se sai da aplicação.
 *
 * Uma caixa aberta fecha-se primeiro. É o que se espera de um botão de voltar —
 * e evita que um toque para fechar uma confirmação salte dois ecrãs de uma vez.
 */
function subirUmNivel(): boolean {
  const aberta = document.querySelector<HTMLDialogElement>("dialog[open]");
  if (aberta !== null) {
    // Uma confirmação remove-se sozinha ao fechar — ver `confirmar`, em `dom.ts`.
    if (typeof aberta.close === "function") aberta.close();
    else aberta.open = false;
    return true;
  }

  // O tutorial relido pelo `?` fecha-se, e o nível continua por trás dele. O
  // primeiro, o obrigatório, não: sair dele é sair do nível.
  if (tutorial !== undefined && tutorialEmRevisao) {
    fecharTutorial();
    return true;
  }

  if (atual?.interceptarVoltar?.() === true) return true;

  const rota = deHash(location.hash);

  const capitulo =
    rota.ecra === "jogo"
      ? campanha.find((c) =>
          c.niveis.some((n) => n.banda === rota.banda && n.indice === rota.nivel),
        )?.capitulo.id
      : undefined;

  const acima = rotaAcima(rota, capitulo);
  if (acima === undefined) return false;

  ir(acima);
  return true;
}

async function mostrar(rota: Rota): Promise<void> {
  tutorial?.destruir();
  tutorial = undefined;
  atual?.destruir();
  atual = undefined;

  switch (rota.ecra) {
    case "home":
      atual = new HomeScreen(app as HTMLElement, {
        perfil,
        totalNiveis: campanha.reduce((n, c) => n + c.niveis.length, 0),
        melhorTempoSurvival: relogio(perfil.bestSurvivalMs),
        /*
         * Só conta como «a meio» uma corrida que chegou a começar. Entrar no
         * modo e sair sem tocar também grava — é o mesmo tabuleiro de partida,
         * e anunciá-lo como uma corrida à espera era prometer o que não há.
         */
        ...(corridaSurvival !== undefined && corridaSurvival.decorridoMs > 0
          ? { corridaAMeio: relogio(corridaSurvival.decorridoMs) }
          : {}),
        aoEscolherNiveis: voltarA({ ecra: "bandas" }),
        aoEscolherTempo: voltarA({ ecra: "tempo" }),
        aoEscolherSurvival: voltarA({ ecra: "survival" }),
        aoEscolherDefinicoes: voltarA({ ecra: "definicoes" }),
        aoEscolherComoJogar: voltarA({ ecra: "regras" }),
      });
      return;

    case "regras":
      atual = new ComoJogarScreen(app as HTMLElement, {
        aoVoltar: voltarA({ ecra: "home" }),
        /*
         * O tutorial do joker abre-se **por cima** das regras, em revisão — e
         * não numa rota própria. É um tabuleiro a sério com estado a meio; dar-
         * lhe endereço era prometer que recarregar a página o devolvia onde
         * estava, e não devolve.
         */
        aoVerTutorialDoJoker: () => {
          abrirTutorial(true);
        },
      });
      return;

    case "bandas":
      atual = new CapitulosScreen(app as HTMLElement, {
        capitulos: campanha,
        perfil,
        aoEscolher: (capitulo) => {
          ir({ ecra: "niveis", capitulo });
        },
        aoVoltar: voltarA({ ecra: "home" }),
      });
      return;

    case "definicoes":
      atual = new DefinicoesScreen(app as HTMLElement, {
        tema: preferencias.tema,
        aoMudarTema: (tema: Tema) => {
          preferencias = { ...preferencias, tema };
          aplicarTema(document.documentElement, tema);
          sincronizarCromado();
          guardarPreferencias();
        },
        tempoInicial: preferencias.tempoInicial,
        aoMudarTempoInicial: (segundos: TempoInicial) => {
          preferencias = { ...preferencias, tempoInicial: segundos };
          guardarPreferencias();
        },
        vibracao: preferencias.vibracao,
        aoMudarVibracao: (ligada: boolean) => {
          preferencias = { ...preferencias, vibracao: ligada };
          definirVibracao(ligada);
          guardarPreferencias();
        },
        aoApagarProgresso: () => {
          perfil = emptyProfile();
          guardarPerfil();
        },
        aoVoltar: voltarA({ ecra: "home" }),
      });
      return;

    case "niveis":
      return mostrarNiveis(rota.capitulo);

    case "jogo":
      return mostrarJogo(rota.banda, rota.nivel);

    case "tempo":
      return mostrarTempo();

    case "survival":
      return mostrarSurvival(rota.seed);
  }
}

function bandaPorId(id: string): BandaNoIndice | undefined {
  return bandas.find((b) => b.id === id);
}

function mostrarNiveis(id: string): void {
  const capitulo = capituloPorId(id);
  if (capitulo === undefined) {
    ir({ ecra: "bandas" });
    return;
  }

  atual = new NiveisScreen(app as HTMLElement, {
    capitulo,
    niveis: niveisDoCapitulo(id),
    perfil,
    aoEscolher: (nivel) => {
      ir({ ecra: "jogo", banda: nivel.banda, nivel: nivel.indice });
    },
    aoVoltar: voltarA({ ecra: "bandas" }),
  });
}

async function mostrarJogo(id: string, indice: number): Promise<void> {
  const banda = bandaPorId(id);
  if (banda === undefined) {
    ir({ ecra: "bandas" });
    return;
  }

  const niveis = await carregarBanda(id);
  const nivel = niveis[indice];

  if (nivel === undefined) {
    const cap = capituloDaBanda(id);
    ir(cap === undefined ? { ecra: "bandas" } : { ecra: "niveis", capitulo: cap.id });
    return;
  }

  const temJoker = nivel.joker !== undefined;
  const feitos = countCompleted(perfil, idsComJoker);

  /*
   * O capítulo é quem manda no «seguinte» e no «voltar». Uma banda com joker
   * está intercalada noutra, portanto seguir a ordem da banda saltaria por cima
   * de metade do capítulo — e a seta de voltar levaria a uma lista onde este
   * nível nem aparece.
   */
  const capitulo: Capitulo | undefined = capituloDaBanda(id);
  const sequencia = capitulo === undefined ? [] : niveisDoCapitulo(capitulo.id);
  const posicao = sequencia.findIndex(
    (n) => n.banda === id && n.indice === indice,
  );

  const paraALista: Rota =
    capitulo === undefined
      ? { ecra: "bandas" }
      : { ecra: "niveis", capitulo: capitulo.id };

  atual = new PuzzleScreen(app as HTMLElement, nivel, {
    /*
     * O nome que o jogador conhece: `Médio 23`, e não `meio-joker-000072`.
     *
     * A posição é a do **capítulo**, que é a lista onde ele escolheu o nível —
     * não o índice na banda, que salta de três em três por causa do joker
     * intercalado e daria dois níveis seguidos com o mesmo número.
     *
     * Dois dígitos sempre, porque a coluna do relógio ao lado não deve dançar
     * ao passar do nível 9 para o 10.
     */
    ...(capitulo !== undefined && posicao >= 0
      ? { titulo: `${capitulo.nome} ${String(posicao + 1).padStart(2, "0")}` }
      : {}),

    // A linha da soma é o andaime do Tutorial, e só de lá — ver `mostrarSoma`.
    mostrarSoma: capitulo?.id === "tutorial",
    // O recorde de **antes** desta partida: o painel de fim compara com ele, e
    // o `recordLevel` abaixo é que o atualiza.
    melhorTempoMs: perfil.levels[nivel.id]?.bestTimeMs ?? 0,
    aoTerminar: ({ level, selo, tempoMs }) => {
      perfil = recordLevel(perfil, level.id, selo as Seal, tempoMs);
      guardarPerfil();
    },
    aoPedirSeguinte: () => {
      const seguinte = posicao < 0 ? undefined : sequencia[posicao + 1];

      // No último nível do capítulo, o seguinte é a própria lista.
      if (seguinte === undefined) ir(paraALista);
      else ir({ ecra: "jogo", banda: seguinte.banda, nivel: seguinte.indice });
    },
    aoVoltar: voltarA(paraALista),
    /*
     * O `?` só depois de o joker aparecer: num nível com ele, ou em qualquer
     * nível depois do tutorial. Antes disso abria a explicação de uma peça que
     * o jogador nunca viu — e a grelha esconde de propósito quais os níveis
     * com joker, para que ele seja um encontro e não um aviso.
     */
    ...(temJoker || perfil.sawJokerTutorial
      ? {
          aoPedirAjuda: () => {
            abrirTutorial(true);
          },
        }
      : {}),
    mostrarSomaDasFaces: temJoker && mostraSomaDasFaces(feitos),
  });

  /*
   * O tutorial é obrigatório à primeira, e abre **por cima** do nível em vez de
   * o preceder: o jogador vê o tabuleiro que vai jogar por trás, e o tutorial
   * deixa de parecer um ecrã que se atravessa para chegar ao jogo.
   */
  if (temJoker && !perfil.sawJokerTutorial) abrirTutorial(false);
}

async function mostrarTempo(): Promise<void> {
  const banda = bandaPorId("tempo");
  if (banda === undefined) {
    ir({ ecra: "home" });
    return;
  }

  /*
   * A mesma regra de largura da campanha. Hoje a banda do Contra-Relógio não tem
   * um único tabuleiro largo, mas confiar nisso era confiar numa coincidência do
   * pack atual.
   */
  const niveis: readonly Level[] = (await carregarBanda("tempo")).filter((n) =>
    cabeNoEcra(n.board.length),
  );

  atual = new TimeAttackScreen(app as HTMLElement, {
    niveis,
    melhorPontuacao: perfil.bestTimeAttackScore,
    tempoInicial: preferencias.tempoInicial,
    aoTerminar: ({ pontos, tabuleiros }) => {
      perfil = recordTimeAttack(perfil, pontos, tabuleiros);
      guardarPerfil();
    },
    aoSair: voltarA({ ecra: "home" }),
    /*
     * Outra corrida é o mesmo ecrã montado de novo. Não passa pelo `ir`: a rota
     * não muda, e sem mudança de rota não há `hashchange` que o monte.
     */
    aoRecomecar: () => {
      void mostrar({ ecra: "tempo" });
    },
  });
}

/**
 * O Survival.
 *
 * Não carrega pack nenhum — o tabuleiro nasce da seed. É o único modo assim, e
 * é o que o torna partilhável: a seed vai no endereço, portanto passar o link é
 * passar a corrida exata.
 *
 * Sem seed no URL sorteia-se uma e **reescreve-se o endereço**, para que a
 * corrida que está a acontecer tenha sempre nome. Sem isso, acabar uma corrida
 * boa e não a poder mostrar a ninguém era o desperdício óbvio.
 */
function mostrarSurvival(seed: number | undefined): void {
  /*
   * **Entrar sem seed retoma a corrida a meio**, se houver.
   *
   * Era aqui que o estado se perdia: o cartão da Home aponta para `#/survival`
   * sem seed, e sortear sempre uma nova fazia com que a corrida guardada — que
   * tem a seed antiga — nunca casasse com a do endereço. O jogador saía a meio
   * e voltava a um tabuleiro novo em folha.
   */
  if (seed === undefined) {
    ir({ ecra: "survival", seed: corridaSurvival?.estado.seed ?? novaSeed() });
    return;
  }

  atual = new SurvivalScreen(app as HTMLElement, {
    seed,
    // `exactOptionalPropertyTypes`: a chave omite-se, não se põe a `undefined`.
    ...(corridaSurvival?.estado.seed === seed ? { retomar: corridaSurvival } : {}),
    aoGuardar: guardarSurvival,
    melhorTempo: perfil.bestSurvivalMs,
    aoTerminar: ({ limpou, tempoMs, linhas }) => {
      // A corrida acabou: não há nada para retomar.
      guardarSurvival(undefined);
      perfil = recordSurvival(perfil, limpou, tempoMs, linhas);
      guardarPerfil();
    },
    aoRecomecar: (nova) => {
      guardarSurvival(undefined);
      ir({ ecra: "survival", seed: nova });
    },
    aoSair: voltarA({ ecra: "home" }),
  });
}

function abrirTutorial(revisao: boolean): void {
  tutorial?.destruir();

  tutorialEmRevisao = revisao;
  tutorial = new JokerTutorial(app as HTMLElement, {
    revisao,
    aoFechar: fecharTutorial,
  });
}

function fecharTutorial(): void {
  tutorial?.destruir();
  tutorial = undefined;
  tutorialEmRevisao = false;

  perfil = markJokerTutorialSeen(perfil);
  guardarPerfil();
}

/*
 * ── O cromado do sistema segue o tema ──
 *
 * Três coisas fora do documento dependem de o jogo estar claro ou escuro, e
 * nenhuma o sabia depois do arranque:
 *
 * - **As barras do Android** (`ajustarBarras`). Com a aplicação de ponta a
 *   ponta, os ícones da barra de estado desenham-se sobre o `--ground`, e têm
 *   de mudar de tinta com ele.
 * - **O `theme-color`**, que pinta a barra do browser no telemóvel. As duas
 *   entradas do `index.html` seguem o sistema; com o tema forçado nas
 *   Definições, a barra ficava da cor do outro tema.
 * - **O `color-scheme`**, que decide a cor das barras de rolagem das listas.
 *
 * Corre ao arrancar, ao mudar o tema nas Definições, e quando o sistema muda de
 * claro para escuro com o tema em «Sistema».
 */
const sistemaEscuro =
  typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : undefined;

function temaEscuro(): boolean {
  if (preferencias.tema === "sistema") return sistemaEscuro?.matches ?? false;
  return preferencias.tema === "escuro";
}

function sincronizarCromado(): void {
  const escuro = temaEscuro();
  const raiz = document.documentElement;

  raiz.style.colorScheme = escuro ? "dark" : "light";

  const fundo = getComputedStyle(raiz).getPropertyValue("--ground").trim();
  if (fundo !== "") {
    for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
      meta.setAttribute("content", fundo);
    }
  }

  void ajustarBarras(escuro);
}

sistemaEscuro?.addEventListener("change", () => {
  if (preferencias.tema === "sistema") sincronizarCromado();
});

function mostrarMensagem(texto: string): void {
  const el = elemento("div", "ecra", texto);
  el.style.placeContent = "center";
  (app as HTMLElement).replaceChildren(el);
}

async function arrancar(): Promise<void> {
  /*
   * O perfil antes de tudo o resto, e o tema logo a seguir: montar o primeiro
   * ecrã com o tema errado e corrigi-lo a seguir é um piscar que se vê.
   */
  armazenamento = await abrirArmazenamento();

  if (armazenamento !== undefined) {
    perfil = load(armazenamento);
    preferencias = loadSettings(armazenamento);
    corridaSurvival = lerCorrida(armazenamento);
  }

  aplicarTema(document.documentElement, preferencias.tema);
  sincronizarCromado();
  definirVibracao(preferencias.vibracao);
  ligarBotaoDeVoltar(subirUmNivel);

  try {
    bandas = await carregarIndice();

    campanha = CAPITULOS.map((capitulo) => ({
      capitulo,
      niveis: montarCapitulo(capitulo, bandas),
    })).filter((c) => c.niveis.length > 0);

    idsComJoker = bandas.flatMap((b) =>
      b.niveis.filter((n) => n.joker === true).map((n) => n.id),
    );

    // Os links antigos, `?banda=perito&nivel=27`, continuam a levar ao sítio.
    const legada = rotaLegada(location.search);
    if (legada !== undefined) {
      history.replaceState(null, "", paraHash(legada));
    }

    window.addEventListener("hashchange", resolver);
    resolver();
  } catch (erro) {
    mostrarMensagem(
      erro instanceof Error ? erro.message : "não consegui carregar os níveis",
    );
  } finally {
    /*
     * `finally`: o ecrã de arranque esconde-se mesmo quando os níveis não
     * carregam. Senão a aplicação ficava tapada por ele e nem a mensagem de
     * erro se via — que é o pior desfecho possível.
     */
    void aplicacaoPronta(temaEscuro());
  }
}

void arrancar();
