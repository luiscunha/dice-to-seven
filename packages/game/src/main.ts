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

import type { PreferenciaDeIdioma } from "./i18n";
import { definirIdioma, idioma, resolverIdioma, t } from "./i18n";

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
  CORRIDA_DESAFIO_KEY,
  guardarCorrida,
  lerCorrida,
  limparCorrida,
} from "./session/corridaSurvival";
import {
  chavesGanhas,
  desbloquear,
  podeDesbloquear,
  premiar,
  premioDoLugar,
  proteger,
  sequenciaEmRisco,
} from "./session/chaves";
import type { Desafios, ModoDoDesafio } from "./session/desafio";
import {
  DESAFIO_TEMPO_INICIAL,
  SEM_DESAFIOS,
  comecar,
  dataDe,
  diaAnterior,
  diasDoMes,
  escolherDoDia,
  estadoDoModo,
  guardarDesafios,
  interromper,
  lerDesafios,
  modoDoDia,
  numeroDoDia,
  primeiroMesDoTrilho,
  registar,
  seedDoDia,
  sequencia,
} from "./session/desafio";
import type { Composicao, Estatisticas } from "./session/estatisticas";
import {
  SEM_ESTATISTICAS,
  guardarEstatisticas,
  lerEstatisticas,
  registarComposicao,
  registarCorridaDeSurvival,
  registarCorridaDeTempo,
} from "./session/estatisticas";
import type { RegistoDeMedalhas } from "./session/medalhas";
import {
  MEDALHAS,
  SEM_MEDALHAS,
  avaliar,
  contarGanhas,
  guardarMedalhas,
  lerMedalhas,
  marcarVistas,
} from "./session/medalhas";
import { mostraSomaDasFaces } from "./session/tutorial";
import type { CapituloNaLista } from "./ui/CapitulosScreen";
import { CapitulosScreen } from "./ui/CapitulosScreen";
import { ComoJogarScreen } from "./ui/ComoJogarScreen";
import { DefinicoesScreen } from "./ui/DefinicoesScreen";
import { elemento } from "./ui/dom";
import type {
  DiaNoTrilho,
  EstadoNoCartao,
  EstadoNoTrilho,
  TrilhoDoDesafio,
} from "./ui/DesafioScreen";
import { DesafioScreen } from "./ui/DesafioScreen";
import type { ResumoDoDesafio } from "./ui/HomeScreen";
import { HomeScreen } from "./ui/HomeScreen";
import { JokerTutorial } from "./ui/JokerTutorial";
import type { MedalhaGanha } from "./ui/medalhaNova";
import { MedalhasScreen } from "./ui/MedalhasScreen";
import { NiveisScreen } from "./ui/NiveisScreen";
import type { DesafioNoEcra, DesfechoDaPartilha } from "./ui/partilha";
import { dataCurta, partilhar, textoDoDesafio } from "./ui/partilha";
import { abrirPerfil } from "./ui/PerfilDialog";
import { PuzzleScreen } from "./ui/PuzzleScreen";
import type { Rota } from "./ui/rotas";
import { deHash, paraHash, rotaAcima, rotaLegada, sentidoEntre } from "./ui/rotas";
import { abrirArmazenamento } from "./plataforma/armazenamento";
import {
  ajustarBarras,
  aplicacaoPronta,
  definirVibracao,
  ligarBotaoDeVoltar,
  travarZoom,
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

/**
 * A rota do ecrã que está montado.
 *
 * Só serve à animação de entrada, e é por isso que não se lê do `location.hash`:
 * quando o `hashchange` chega, o endereço já é o do destino, e o de onde se veio
 * está perdido. A rota real continua a vir do hash, como sempre.
 */
let rotaMontada: Rota | undefined;

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

/*
 * ── O Desafio do Dia ──
 *
 * Os resultados de cada dia, e a corrida do Survival do Dia que ficou a meio.
 * A corrida do dia vive à parte da normal: as duas podem estar a meio ao mesmo
 * tempo. Ver `session/desafio.ts`.
 */
let desafios: Desafios = SEM_DESAFIOS;
let corridaDesafio: CorridaGuardada | undefined;

/** As chaves que a sequência deu e o trilho ainda não celebrou. */
let premioPorVer: { readonly chaves: number; readonly dias: number } | undefined;

/**
 * O dia em que se disse «agora não» a salvar a sequência. Só nesta sessão: o
 * trilho não volta a perguntar ao abrir, mas a oferta continua no balão de
 * ontem — e uma pergunta por arranque não é insistir.
 */
let protecaoRecusada: string | undefined;

/** O dia passado que se acabou de jogar: o trilho abre nele, e não em hoje. */
let focoDoTrilho: string | undefined;

const guardarOsDesafios = (): void => {
  if (armazenamento !== undefined) guardarDesafios(armazenamento, desafios);
};

/**
 * Troca os desafios e grava-os. Se a troca deu chaves — um patamar da
 * sequência —, ficam à espera de serem celebradas no trilho, que é para onde
 * todos os desafios voltam.
 */
function mudarDesafios(novos: Desafios): void {
  if (novos === desafios) return;

  const ganhas = chavesGanhas(desafios, novos);
  desafios = novos;
  guardarOsDesafios();

  if (ganhas > 0) {
    premioPorVer = {
      chaves: ganhas + (premioPorVer?.chaves ?? 0),
      dias: sequencia(desafios, hoje()),
    };
  }
}

const guardarCorridaDesafio = (corrida: CorridaGuardada | undefined): void => {
  corridaDesafio = corrida;
  if (armazenamento === undefined) return;

  if (corrida === undefined) limparCorrida(armazenamento, CORRIDA_DESAFIO_KEY);
  else guardarCorrida(armazenamento, corrida, CORRIDA_DESAFIO_KEY);
};

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

/*
 * ── O idioma ──
 *
 * «Sistema» segue o telemóvel, pela lista de idiomas que o browser expõe; um
 * idioma escolhido nas Definições fixa-se. O `lang` do documento acompanha,
 * para o leitor de ecrã ler na voz certa e o browser hifenizar na língua certa.
 */
const idiomasDoSistema = (): readonly string[] =>
  navigator.languages.length > 0 ? navigator.languages : [navigator.language];

function aplicarIdioma(): void {
  definirIdioma(resolverIdioma(preferencias.idioma, idiomasDoSistema()));
  document.documentElement.lang = t().lang;
}

/**
 * O telemóvel mudou de idioma com o jogo aberto. Com «Sistema», o jogo muda
 * com ele — mas **não a meio de uma partida**: montar o ecrã outra vez era
 * recomeçá-la. O ecrã de jogo fica como está, e o idioma novo entra no
 * próximo ecrã que se abrir.
 */
window.addEventListener("languagechange", () => {
  if (preferencias.idioma !== "sistema") return;

  const antes = idioma();
  aplicarIdioma();
  if (idioma() === antes) return;

  const rota = deHash(location.hash);
  const aJogar =
    rota.ecra === "jogo" || rota.ecra === "tempo" || rota.ecra === "survival" ||
    (rota.ecra === "desafio" && rota.modo !== undefined);
  if (!aJogar) void mostrar(rota);
});

/*
 * ── As medalhas ──
 *
 * Deduzem-se do perfil e dos desafios (`session/medalhas.ts`); o registo guarda
 * só as que já se ganharam, e quando. Avalia-se ao arrancar — é aí que chegam as
 * retroativas, que ficam só com o ponto na Home — e no fim de cada partida, que
 * as anuncia no painel.
 */
let medalhas: RegistoDeMedalhas = SEM_MEDALHAS;

const guardarAsMedalhas = (): void => {
  if (armazenamento !== undefined) guardarMedalhas(armazenamento, medalhas);
};

/*
 * ── As estatísticas ──
 *
 * O que as medalhas da segunda fase contam, e que nenhum registo tinha: as
 * bombas e o combo de cada corrida do Contra-Relógio, as linhas do Survival, e
 * as composições do 7 que já saíram (`session/estatisticas.ts`).
 *
 * **O treino do Desafio do Dia não conta.** São os mesmos tabuleiros da
 * tentativa oficial, e decorá-los não é o que uma medalha premeia. Contam a
 * campanha, as corridas livres e a tentativa oficial.
 */
let estatisticas: Estatisticas = SEM_ESTATISTICAS;

/** Grava as estatísticas, se mudaram — os registos devolvem o mesmo objeto quando não. */
function mudarEstatisticas(novas: Estatisticas): void {
  if (novas === estatisticas) return;
  estatisticas = novas;
  if (armazenamento !== undefined) guardarEstatisticas(armazenamento, estatisticas);
}

/**
 * Saiu um grupo. Grava-se logo, e não no fim da partida: quem faz o sete uns e
 * sai a meio do nível fez o sete uns. A medalha chega na avaliação seguinte.
 */
const contarComposicao = (c: Composicao): void => {
  mudarEstatisticas(registarComposicao(estatisticas, c));
};

const contextoDasMedalhas = (): Parameters<typeof avaliar>[1] => ({
  perfil,
  desafios,
  estatisticas,
  ganhas: medalhas.ganhas,
  capitulos: campanha.map((c) => ({ id: c.capitulo.id, niveis: c.niveis })),
  hoje: hoje(),
});

/**
 * Marca as medalhas que o estado de agora já merece, e devolve as que são
 * novas. Os ecrãs de jogo devolvem-nas do `aoTerminar`, para o painel de fim.
 */
function avaliarMedalhas(): readonly MedalhaGanha[] {
  const { registo, novas } = avaliar(medalhas, contextoDasMedalhas());
  if (registo !== medalhas) {
    medalhas = registo;
    guardarAsMedalhas();
  }
  return novas;
}

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

/**
 * O ecrã da rota, montado — e **de que lado entrou**.
 *
 * A marca vai no elemento já montado, e não em cada construtor: são nove a
 * chamar `host.replaceChildren`, e repetir a linha nos nove era garantir que o
 * décimo a nascer se esquecia dela. Aqui é um sítio só, e quem decide o sentido
 * é a rota — que é o que o `sentidoEntre` sabe ler.
 *
 * **Só a entrada se anima.** Animar a saída era atrasar a navegação pelo tempo
 * da animação e manter vivo o ecrã antigo — com o relógio dele a contar — só
 * para o ver a esvair-se. O ecrã que sai desaparece no instante do toque, que é
 * o que faz a navegação parecer imediata.
 */
async function mostrar(rota: Rota): Promise<void> {
  const sentido = sentidoEntre(rotaMontada, rota);

  await montar(rota);
  rotaMontada = rota;

  /*
   * Pode não haver ecrã nenhum: uma rota que se corrige a si mesma — Survival
   * sem seed, um nível que não existe — chama `ir` e devolve sem montar. O
   * `hashchange` que se segue monta o ecrã certo, e anima-se esse.
   */
  const ecra = (app as HTMLElement).querySelector<HTMLElement>(".ecra");
  if (ecra !== null) ecra.dataset["entrada"] = sentido;
}

async function montar(rota: Rota): Promise<void> {
  tutorial?.destruir();
  tutorial = undefined;
  atual?.destruir();
  atual = undefined;

  // O foco do trilho é para quem volta de um dia passado, e não sobrevive a um
  // passeio por outro ecrã.
  if (rota.ecra !== "desafio") focoDoTrilho = undefined;

  switch (rota.ecra) {
    case "home":
      /*
       * Avalia antes de se montar. Uma medalha das estatísticas pode ter
       * chegado numa partida deixada a meio — o sete uns, num nível de que se
       * saiu —, e sem isto o ponto só aparecia no fim da partida seguinte.
       */
      avaliarMedalhas();
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
        nome: preferencias.nome,
        avatar: preferencias.avatar,
        aoEditarPerfil: editarPerfil,
        desafio: resumoDoDesafio(),
        medalhas: {
          ganhas: contarGanhas(medalhas),
          total: MEDALHAS.length,
          novas: medalhas.porVer.length > 0,
          aoAbrir: voltarA({ ecra: "medalhas" }),
        },
      });
      return;

    case "medalhas":
      mostrarMedalhas();
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
        idioma: preferencias.idioma,
        aoMudarIdioma: (escolha: PreferenciaDeIdioma) => {
          preferencias = { ...preferencias, idioma: escolha };
          guardarPreferencias();
          aplicarIdioma();
          // O ecrã monta-se outra vez, já no idioma novo — ver `i18n/index.ts`.
          void mostrar({ ecra: "definicoes" });
        },
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
          // As medalhas são do progresso: vão com ele, e as estatísticas de
          // que se deduzem também. As do desafio, que não se apaga, voltam logo
          // — e voltam por ver.
          mudarEstatisticas(SEM_ESTATISTICAS);
          medalhas = SEM_MEDALHAS;
          guardarAsMedalhas();
          avaliarMedalhas();
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

    case "desafio":
      if (rota.modo === undefined) {
        atual = new DesafioScreen(app as HTMLElement, {
          trilho: trilhoDoDesafio(),
          aoVoltar: voltarA({ ecra: "home" }),
        });
        return;
      }
      return mostrarDesafio(rota.modo, rota.data);
  }
}

/**
 * A página das medalhas. Abri-la é vê-las: as novas perdem a marca a partir
 * daqui — mas mostram-na desta vez, que é para isso que ela existe.
 */
function mostrarMedalhas(): void {
  avaliarMedalhas();
  const ctx = contextoDasMedalhas();
  const porVer = new Set(medalhas.porVer);

  atual = new MedalhasScreen(app as HTMLElement, {
    medalhas: MEDALHAS.map((medalha) => {
      const ganhaEm = medalhas.ganhas[medalha.id];
      return {
        medalha,
        progresso: medalha.progresso(ctx),
        ...(ganhaEm === undefined ? {} : { ganhaEm }),
        nova: porVer.has(medalha.id),
      };
    }),
    composicoes: estatisticas.composicoes,
    aoVoltar: voltarA({ ecra: "home" }),
  });

  const vistas = marcarVistas(medalhas);
  if (vistas !== medalhas) {
    medalhas = vistas;
    guardarAsMedalhas();
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
      ? { titulo: `${t().capitulos[capitulo.id].nome} ${String(posicao + 1).padStart(2, "0")}` }
      : {}),

    // A linha da soma é andaime dos primeiros níveis do Iniciado, e só de lá —
    // ver `niveisComSoma`, em `capitulos.ts`.
    mostrarSoma: posicao >= 0 && posicao < (capitulo?.niveisComSoma ?? 0),
    // O recorde de **antes** desta partida: o painel de fim compara com ele, e
    // o `recordLevel` abaixo é que o atualiza.
    melhorTempoMs: perfil.levels[nivel.id]?.bestTimeMs ?? 0,
    aoEliminar: contarComposicao,
    aoTerminar: ({ level, selo, tempoMs }) => {
      perfil = recordLevel(perfil, level.id, selo as Seal, tempoMs);
      guardarPerfil();
      return avaliarMedalhas();
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

/**
 * Os níveis do Contra-Relógio: a escada com garantia e os livres. `undefined`
 * num índice sem a banda `tempo`.
 */
async function carregarTempo(): Promise<
  { readonly niveis: readonly Level[]; readonly livres: readonly Level[] } | undefined
> {
  if (bandaPorId("tempo") === undefined) return undefined;

  /*
   * A mesma regra de largura da campanha. Hoje a banda do Contra-Relógio não tem
   * um único tabuleiro largo, mas confiar nisso era confiar numa coincidência do
   * pack atual.
   */
  const niveis: readonly Level[] = (await carregarBanda("tempo")).filter((n) =>
    cabeNoEcra(n.board.length),
  );

  /*
   * Os tabuleiros de depois da escada. Um índice sem esta banda — um deploy
   * anterior a ela — dá uma corrida só com a escada com garantia, como antes,
   * em vez de não dar corrida nenhuma.
   */
  const livres: readonly Level[] =
    bandaPorId("tempo-livre") === undefined
      ? []
      : (await carregarBanda("tempo-livre")).filter((n) =>
          cabeNoEcra(n.board.length),
        );

  return { niveis, livres };
}

async function mostrarTempo(): Promise<void> {
  const tempo = await carregarTempo();
  if (tempo === undefined) {
    ir({ ecra: "home" });
    return;
  }

  atual = new TimeAttackScreen(app as HTMLElement, {
    ...tempo,
    melhorPontuacao: perfil.bestTimeAttackScore,
    tempoInicial: preferencias.tempoInicial,
    aoEliminar: contarComposicao,
    aoTerminar: ({ pontos, tabuleiros, bombas, combo }) => {
      perfil = recordTimeAttack(perfil, pontos, tabuleiros);
      guardarPerfil();
      mudarEstatisticas(registarCorridaDeTempo(estatisticas, { bombas, combo }));
      return avaliarMedalhas();
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
    aoEliminar: contarComposicao,
    aoTerminar: ({ limpou, tempoMs, linhas }) => {
      // A corrida acabou: não há nada para retomar.
      guardarSurvival(undefined);
      perfil = recordSurvival(perfil, limpou, tempoMs);
      guardarPerfil();
      mudarEstatisticas(registarCorridaDeSurvival(estatisticas, { linhas }));
      return avaliarMedalhas();
    },
    /*
     * **Repetir a mesma seed não passa pelo endereço.**
     *
     * `ir` escreve o hash e espera que o `hashchange` remonte o ecrã. Com a
     * mesma seed o hash já é aquele, o evento não dispara, e o botão «Repetir
     * esta» ficava sem efeito nenhum — a caixa de fim aberta por cima de um
     * tabuleiro que não recomeçava. É o mesmo caso que o Contra-Relógio já
     * tratava, e pela mesma razão.
     *
     * Montar o ecrã diretamente fecha o buraco: `mostrar` destrói o anterior,
     * portanto não fica relógio nem tabuleiro velho para trás.
     */
    aoRecomecar: (nova) => {
      guardarSurvival(undefined);
      if (nova === seed) {
        void mostrar({ ecra: "survival", seed: nova });
        return;
      }
      ir({ ecra: "survival", seed: nova });
    },
    aoSair: voltarA({ ecra: "home" }),
  });
}

/* ─── O Desafio do Dia ─────────────────────────────────────────────────────── */

/**
 * Os níveis do Puzzle do Dia: os que a campanha **reservou** — os das bandas
 * com joker que a intercalação não chegou a usar (`capitulos.ts`). Nunca
 * aparecem na campanha, portanto o puzzle do dia é sempre um tabuleiro novo.
 *
 * Sempre pela mesma ordem — a dos capítulos, e dentro da banda a do ficheiro —,
 * que é o que deixa `escolherDoDia` dar o mesmo nível a toda a gente.
 */
async function niveisDoPuzzleDoDia(): Promise<readonly Level[]> {
  const pool: Level[] = [];

  for (const { capitulo, niveis } of campanha) {
    const banda = capitulo.joker;
    if (banda === undefined || bandaPorId(banda) === undefined) continue;

    const usados = new Set(niveis.filter((n) => n.banda === banda).map((n) => n.indice));
    const todos = await carregarBanda(banda);
    todos.forEach((nivel, i) => {
      if (!usados.has(i) && cabeNoEcra(nivel.board.length)) pool.push(nivel);
    });
  }

  return pool;
}

/** Hoje, no fuso de quem joga. É o único sítio que lê a data. */
const hoje = (): string => dataDe(new Date());

const partilharDia = (data: string): Promise<DesfechoDaPartilha> =>
  partilhar(textoDoDesafio(data, desafios.dias[data] ?? {}, sequencia(desafios, data)));

/**
 * Um Contra-Relógio oficial que ficou «a jogar» sem ecrã nenhum a jogá-lo é
 * uma tentativa abandonada: a aplicação fechou, ou o browser recuou. Fica
 * interrompido — o resto do dia é treino. O Puzzle e o Survival ficam abertos
 * até se ganharem (ver `mostrarDesafio`), e não se interrompem.
 *
 * Arrumam-se os dias que se jogam: hoje, e os que uma chave abriu.
 *
 * E dão-se os prémios que estejam por dar — de uma sequência que chegou a um
 * patamar numa versão do jogo que ainda não tinha chaves. `premiar` só dá
 * cada um uma vez, portanto pode correr sempre.
 *
 * Devolve hoje, que é o que todos os que arrumam querem saber a seguir.
 */
function arrumarDesafios(): string {
  const data = hoje();
  let d = desafios;

  const jogaveis = [
    data,
    ...Object.keys(d.dias).filter((k) => k < data && d.dias[k]?.desbloqueado === true),
  ];

  for (const dia of jogaveis) {
    if (estadoDoModo(d, dia, "tempo")?.estado === "a-jogar") {
      d = interromper(d, dia, "tempo");
    }
  }

  mudarDesafios(premiar(premiar(d, diaAnterior(data)), data));
  return data;
}

/**
 * A sequência que uma chave pode salvar hoje — só se houver chave para isso.
 * Sem chaves não há nada a oferecer, e avisar do risco era só dar a má notícia.
 */
const emRisco = (data: string): ReturnType<typeof sequenciaEmRisco> =>
  desafios.chaves > 0 ? sequenciaEmRisco(desafios, data) : undefined;

/** O glifo do selo, o mesmo da grelha de níveis. */
const GLIFO_DO_SELO = { perfect: " ★", clean: " ◆", completed: "" } as const;

function estadoNoCartao(data: string, modo: ModoDoDesafio): EstadoNoCartao {
  /*
   * O Puzzle não tem «a meio» nem «interrompido»: não há relógio contra
   * ninguém, e a tentativa oficial fica aberta até ser resolvida — ver
   * `mostrarDesafio`.
   */
  if (modo === "puzzle") {
    const e = estadoDoModo(desafios, data, "puzzle");
    if (e?.estado !== "feito") return { tipo: "por-jogar" };
    const r = e.resultado;
    return { tipo: "feito", texto: `${relogio(r.tempoMs)}${GLIFO_DO_SELO[r.selo]}` };
  }

  if (modo === "tempo") {
    const e = estadoDoModo(desafios, data, "tempo");
    if (e === undefined) return { tipo: "por-jogar" };
    if (e.estado === "feito") {
      const p = e.resultado.pontos;
      return { tipo: "feito", texto: t().comum.pontos(p) };
    }
    return { tipo: "interrompido" };
  }

  /*
   * O Survival também não se interrompe: só fica feito com o tabuleiro limpo,
   * e até lá está a meio — se a corrida guardada for a deste dia — ou por
   * jogar outra vez, do princípio.
   */
  const e = estadoDoModo(desafios, data, "survival");
  if (e?.estado === "feito") return { tipo: "feito", texto: t().desafio.survivalLimpo(relogio(e.resultado.tempoMs)) };
  if (e?.estado === "a-jogar" && corridaDesafio?.estado.seed === seedDoDia(data, "survival")) {
    return { tipo: "a-meio", texto: relogio(corridaDesafio.decorridoMs) };
  }
  return { tipo: "por-jogar" };
}

/** O cartão da Home: só o desafio de hoje. Tocar-lhe abre o trilho. */
function resumoDoDesafio(): ResumoDoDesafio {
  const data = arrumarDesafios();
  const modo = modoDoDia(data);
  const risco = emRisco(data);

  return {
    numero: numeroDoDia(data),
    data: dataCurta(data),
    sequencia: sequencia(desafios, data),
    ...(risco === undefined ? {} : { emRisco: risco.sequencia }),
    chaves: desafios.chaves,
    modo,
    estado: estadoNoCartao(data, modo),
    aoAbrir: voltarA({ ecra: "desafio" }),
  };
}

/**
 * Uma casa do trilho, vista de hoje. Um dia passado está feito ou perdido: a
 * tentativa que ficou a meio ontem — um Survival guardado, um Puzzle aberto —
 * já não se acaba, porque o desafio de hoje é outro. **A não ser que uma chave
 * o tenha aberto**: aí joga-se como hoje, e tem os estados do cartão.
 */
function estadoNoTrilho(data: string, dataDeHoje: string): EstadoNoTrilho {
  if (data > dataDeHoje) return { tipo: "futuro" };

  const estado = estadoNoCartao(data, modoDoDia(data));
  const jogavel = data === dataDeHoje || desafios.dias[data]?.desbloqueado === true;
  if (jogavel || estado.tipo === "feito") return estado;
  return { tipo: "perdido" };
}

/** O endereço do desafio de um dia: sem data, se for hoje. */
const rotaDoDia = (data: string, dataDeHoje: string): Rota =>
  data === dataDeHoje
    ? { ecra: "desafio", modo: modoDoDia(data) }
    : { ecra: "desafio", modo: modoDoDia(data), data };

function trilhoDoDesafio(): TrilhoDoDesafio {
  const data = arrumarDesafios();
  const feito = estadoDoModo(desafios, data, modoDoDia(data))?.estado === "feito";
  const risco = emRisco(data);
  const seq = sequencia(desafios, data);

  // Uma vez cada: o prémio celebra-se ao abrir, e o foco é o do regresso.
  const premio = premioPorVer;
  premioPorVer = undefined;
  const foco = focoDoTrilho;
  focoDoTrilho = undefined;

  const casa = (d: string): DiaNoTrilho => {
    const dia = desafios.dias[d];
    return {
      data: d,
      numero: numeroDoDia(d),
      modo: modoDoDia(d),
      estado: estadoNoTrilho(d, data),
      ...(dia?.protegido === true ? { protegido: true } : {}),
      ...(dia?.desbloqueado === true ? { desbloqueado: true } : {}),
      ...(dia?.premio === undefined ? {} : { premio: dia.premio }),
      ...(podeDesbloquear(desafios, d, data) ? { desbloqueavel: true } : {}),
    };
  };

  return {
    hoje: data,
    sequencia: seq,
    chaves: desafios.chaves,
    // Feito hoje, a sequência passa a ser a de ontem mais um.
    ...(feito ? {} : { premioDeHoje: premioDoLugar(seq + 1) }),
    aoJogar: (dia) => {
      ir(rotaDoDia(dia, data));
    },
    aoDesbloquear: (dia) => {
      const antes = desafios;
      mudarDesafios(desbloquear(desafios, dia, hoje()));
      if (desafios !== antes) ir(rotaDoDia(dia, data));
    },
    ...(risco === undefined
      ? {}
      : {
          protecao: {
            ...risco,
            perguntar: protecaoRecusada !== data,
            aoProteger: () => {
              mudarDesafios(proteger(desafios, hoje()));
              // Ligar duas sequências pode dar uma medalha: fica por ver.
              avaliarMedalhas();
              void mostrar({ ecra: "desafio" });
            },
            aoRecusar: () => {
              protecaoRecusada = data;
            },
          },
        }),
    ...(premio === undefined ? {} : { premio }),
    ...(foco === undefined ? {} : { foco }),
    ...(feito ? { aoPartilhar: () => partilharDia(data) } : {}),
    // Um mês de cada vez: o de hoje ao entrar, e os outros pela linha dos meses.
    diasDoMes: (mes) => diasDoMes(mes).map(casa),
    primeiroMes: primeiroMesDoTrilho(data),
  };
}

/**
 * Um desafio do dia: a mesma corrida para toda a gente, com a seed da data.
 *
 * **A primeira tentativa é a oficial**, e marca-se ao entrar — o
 * Contra-Relógio, no «Começar». No Contra-Relógio acaba com a corrida; no
 * Puzzle e no Survival, só quando se ganha — o tabuleiro resolvido, o
 * tabuleiro limpo. Daí em diante, no mesmo dia, é treino: os mesmos
 * tabuleiros, sem gravar nada. O Survival oficial que ficou a meio retoma-se;
 * um Contra-Relógio oficial abandonado já não volta — ver `arrumarDesafios`.
 *
 * Os recordes normais ficam de fora: o desafio tem as suas regras (o tempo de
 * arranque fixo, por exemplo), e o seu próprio registo.
 *
 * **Um dia passado joga-se da mesma maneira**, se uma chave o abriu: a
 * primeira tentativa conta — para o mês, não para a sequência — e o resto é
 * treino. Só não se partilha: o texto partilhado diz a sequência, e um dia
 * jogado depois não lhe pertence.
 */
async function mostrarDesafio(modo: ModoDoDesafio, dataPedida?: string): Promise<void> {
  const dataDeHoje = arrumarDesafios();
  const data = dataPedida ?? dataDeHoje;
  const passado = data !== dataDeHoje;

  /*
   * Joga-se o desafio de hoje, e os dias passados que uma chave abriu. Um
   * endereço com outro modo — de ontem, de um separador que ficou aberto
   * depois da meia-noite — ou com um dia que nenhuma chave abriu volta ao
   * trilho.
   */
  const aberto = !passado || (data < dataDeHoje && desafios.dias[data]?.desbloqueado === true);
  if (modo !== modoDoDia(data) || !aberto) {
    ir({ ecra: "desafio" });
    return;
  }

  // Ao sair, o trilho abre neste dia, e não em hoje.
  if (passado) focoDoTrilho = data;

  const seed = seedDoDia(data, modo);
  const antes = estadoDoModo(desafios, data, modo);
  const retoma =
    modo === "survival" &&
    antes?.estado === "a-jogar" &&
    corridaDesafio?.estado.seed === seed
      ? corridaDesafio
      : undefined;
  /*
   * O Puzzle oficial fica aberto até ser resolvido: sair para pensar não é
   * desistir. O Survival, até o tabuleiro ficar limpo: transbordar também não
   * fecha a tentativa. Sem corrida para retomar, os dois voltam ao princípio,
   * com o relógio a zero. Um Contra-Relógio «a jogar» já não chega aqui —
   * `arrumarDesafios` interrompeu-o.
   */
  const oficial = antes === undefined || antes.estado === "a-jogar";

  const marcarTentativa = (): void => {
    if (estadoDoModo(desafios, data, modo) !== undefined) return;
    mudarDesafios(comecar(desafios, data, modo));
  };

  /**
   * A tentativa oficial acabou: grava-se, e a sequência pode ter dado chaves —
   * e medalhas, que se devolvem para o painel de fim.
   */
  const terminar = (registo: (d: Desafios) => Desafios): readonly MedalhaGanha[] => {
    if (!oficial) return [];
    mudarDesafios(premiar(registo(desafios), data));
    return avaliarMedalhas();
  };

  /*
   * O Contra-Relógio marca-a no «Começar», e não ao entrar. Marcada ao entrar,
   * abrir o desafio para ver o que era e sair pela seta gastava-o com 0
   * pontos — e a corrida a sério, a seguir, já era treino.
   */
  if (modo !== "tempo") marcarTentativa();

  // Só a tentativa oficial conta para as estatísticas: o treino repete-a.
  const aoEliminar = oficial ? { aoEliminar: contarComposicao } : {};

  const etiqueta = t().desafio.etiqueta(numeroDoDia(data));
  const desafio: DesafioNoEcra = !oficial
    ? { etiqueta: t().desafio.etiquetaTreino(etiqueta) }
    : passado
      ? { etiqueta, oficial: true }
      : { etiqueta, oficial: true, aoPartilhar: () => partilharDia(data) };
  const outraVez = (): void => {
    void mostrar(rotaDoDia(data, dataDeHoje));
  };

  if (modo === "puzzle") {
    const nivel = escolherDoDia(data, await niveisDoPuzzleDoDia());
    if (nivel === undefined) {
      ir({ ecra: "home" });
      return;
    }

    const temJoker = nivel.joker !== undefined;
    atual = new PuzzleScreen(app as HTMLElement, nivel, {
      titulo: etiqueta,
      desafio,
      ...aoEliminar,
      aoTerminar: ({ selo, tempoMs }) =>
        terminar((d) => registar(d, data, "puzzle", { tempoMs, selo: selo as Seal })),
      aoVoltar: voltarA({ ecra: "desafio" }),
      // O joker como na campanha: o `?` depois de o ter visto, e o tutorial
      // obrigatório da primeira vez, por cima do tabuleiro.
      ...(temJoker || perfil.sawJokerTutorial
        ? { aoPedirAjuda: () => { abrirTutorial(true); } }
        : {}),
      mostrarSomaDasFaces: temJoker && mostraSomaDasFaces(countCompleted(perfil, idsComJoker)),
    });

    if (temJoker && !perfil.sawJokerTutorial) abrirTutorial(false);
    return;
  }

  if (modo === "tempo") {
    const tempo = await carregarTempo();
    if (tempo === undefined) {
      ir({ ecra: "home" });
      return;
    }

    atual = new TimeAttackScreen(app as HTMLElement, {
      ...tempo,
      seed,
      desafio,
      // O recorde pessoal não é a comparação do desafio — ver o selo do fim.
      melhorPontuacao: Number.POSITIVE_INFINITY,
      tempoInicial: DESAFIO_TEMPO_INICIAL,
      ...(oficial ? { aoComecar: marcarTentativa } : {}),
      ...aoEliminar,
      aoTerminar: ({ pontos, tabuleiros, saltados, bombas, combo }) => {
        if (oficial) mudarEstatisticas(registarCorridaDeTempo(estatisticas, { bombas, combo }));
        return terminar((d) => registar(d, data, "tempo", { pontos, tabuleiros, saltados }));
      },
      aoSair: voltarA({ ecra: "desafio" }),
      aoRecomecar: outraVez,
    });
    return;
  }

  atual = new SurvivalScreen(app as HTMLElement, {
    seed,
    ...(retoma === undefined ? {} : { retomar: retoma }),
    // Só a corrida oficial se guarda para retomar; o treino perde-se ao sair.
    aoGuardar: oficial ? guardarCorridaDesafio : () => undefined,
    melhorTempo: Number.POSITIVE_INFINITY,
    desafio,
    ...aoEliminar,
    aoTerminar: ({ limpou, tempoMs, linhas }) => {
      if (!oficial) return [];
      guardarCorridaDesafio(undefined);
      mudarEstatisticas(registarCorridaDeSurvival(estatisticas, { linhas }));
      // Transbordar não grava nada (ver `registar`): a tentativa fica aberta,
      // e a próxima corrida começa do princípio.
      return terminar((d) => registar(d, data, "survival", { tempoMs, limpou, linhas }));
    },
    aoRecomecar: outraVez,
    aoSair: voltarA({ ecra: "desafio" }),
  });
}

/**
 * O editor do nome e do avatar, aberto pela barra da Home.
 *
 * Guardar volta a montar a Home — e não a remenda por dentro. É o mesmo
 * princípio do resto do ficheiro: o ecrã é função da rota e do estado, e um
 * caminho que actualiza só o pedaço que mudou é um segundo caminho a manter
 * sincronizado com o primeiro. A Home custa um `replaceChildren`.
 */
function editarPerfil(): void {
  abrirPerfil(app as HTMLElement, {
    nome: preferencias.nome,
    avatar: preferencias.avatar,
    aoGuardar: ({ nome, avatar }) => {
      preferencias = { ...preferencias, nome, avatar };
      guardarPreferencias();
      void mostrar({ ecra: "home" });
    },
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
    desafios = lerDesafios(armazenamento);
    corridaDesafio = lerCorrida(armazenamento, CORRIDA_DESAFIO_KEY);
    medalhas = lerMedalhas(armazenamento);
    estatisticas = lerEstatisticas(armazenamento);
  }

  aplicarIdioma();
  aplicarTema(document.documentElement, preferencias.tema);
  sincronizarCromado();
  definirVibracao(preferencias.vibracao);
  ligarBotaoDeVoltar(subirUmNivel);
  travarZoom();

  try {
    bandas = await carregarIndice();

    campanha = CAPITULOS.map((capitulo) => ({
      capitulo,
      niveis: montarCapitulo(capitulo, bandas),
    })).filter((c) => c.niveis.length > 0);

    idsComJoker = bandas.flatMap((b) =>
      b.niveis.filter((n) => n.joker === true).map((n) => n.id),
    );

    /*
     * As medalhas que o progresso já merece — as de antes de haver medalhas,
     * no primeiro arranque. Só depois da campanha montar: antes disso os
     * capítulos não têm tamanho, e as medalhas deles não têm alvo.
     */
    avaliarMedalhas();

    // Os links antigos, `?banda=perito&nivel=27`, continuam a levar ao sítio.
    const legada = rotaLegada(location.search);
    if (legada !== undefined) {
      history.replaceState(null, "", paraHash(legada));
    }

    window.addEventListener("hashchange", resolver);
    resolver();
  } catch (erro) {
    mostrarMensagem(
      erro instanceof Error ? erro.message : t().comum.semNiveis,
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
