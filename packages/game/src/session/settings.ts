/**
 * Preferências do jogador.
 *
 * **Guardadas à parte do perfil, e de propósito.** O perfil é progresso — selos,
 * melhores jogadas, recordes — e "apagar o progresso" tem de o apagar inteiro
 * sem levar as preferências à frente. Quem repõe os selos não está a pedir para
 * o jogo voltar ao tema claro.
 *
 * Como em `progress.ts`, o armazenamento entra por interface e a leitura **nunca
 * falha**: um ficheiro corrompido dá preferências por omissão, não um jogo que
 * não abre.
 *
 * O desenho §5.8 prevê mais entradas — som, dígitos nas peças, animações
 * reduzidas. A forma deste módulo é a de crescer por campos, não por reescrita.
 */

import type { Cell } from "@dicetoseven/engine";

import type { ProfileStorage } from "./progress";

export const SETTINGS_VERSION = 1;
export const SETTINGS_KEY = "dicetoseven.settings";

/**
 * `sistema` segue o `prefers-color-scheme` e é a omissão. Os outros dois são o
 * jogador a contrariá-lo — e o CSS já os conhece por `data-tema`.
 */
export type Tema = "sistema" | "claro" | "escuro";

const TEMAS: readonly Tema[] = ["sistema", "claro", "escuro"];

/**
 * Segundos com que o contra-relógio arranca.
 *
 * O plano §6.3 pede um arranque generoso, para o jogador entrar em ritmo antes
 * da pressão — mas quanto é generoso é número de playtest, não de escrivaninha.
 * Fica à escolha em vez de fixo, e o valor por omissão é 60.
 */
export type TempoInicial = 30 | 60 | 90;

const TEMPOS: readonly TempoInicial[] = [30, 60, 90];

/**
 * O avatar é **uma face de dado**, e as sete são as que existem.
 *
 * Não é preguiça de não desenhar bonecos: é a mesma escolha dos cartões da Home.
 * O jogo tem um vocabulário de sete desenhos que o jogador aprende de qualquer
 * maneira, e uma galeria de retratos seria arte nova a envelhecer — a direção de
 * arte recusa ícones ilustrados (desenho §2.1), e um boneco genérico diria
 * menos sobre quem joga do que a face que ele escolheu.
 *
 * As faces primeiro e o joker no fim: é a ordem do seletor do joker, e a única
 * em que o `✳` não parece um zero.
 */
export const AVATARES: readonly Cell[] = [1, 2, 3, 4, 5, 6, 0];

/** A face por omissão: a 6, que é a cor da marca. */
const AVATAR_OMISSAO: Cell = 6;

/**
 * O comprimento do nome.
 *
 * Dezasseis é um tecto, não uma promessa de que cabe: a barra da Home corta com
 * reticências o que não couber ao lado do nome do jogo, e num ecrã de 375 isso
 * acontece por volta dos dez caracteres. O limite existe para o outro problema
 * — um campo sem tecto aceita um parágrafo, e um parágrafo no armazenamento é
 * um parágrafo que alguma coisa vai ter de desenhar.
 */
export const NOME_MAX = 16;

/**
 * O nome como fica guardado: espaços colapsados, aparado, e cortado no limite.
 *
 * Corre à gravação **e** à leitura. À gravação porque é lá que o jogador
 * escreve; à leitura porque o ficheiro pode ter sido escrito por uma versão
 * antiga, editado à mão, ou vir de outro aparelho — e um nome de 4000
 * caracteres não pode ser coisa que a barra da Home tenha de aguentar.
 */
export function limparNome(bruto: string): string {
  return bruto.replace(/\s+/gu, " ").trim().slice(0, NOME_MAX);
}

export interface Settings {
  readonly version: number;
  readonly tema: Tema;
  readonly tempoInicial: TempoInicial;

  /**
   * A vibração ao tocar nas peças. Ligada por omissão, e só existe no telemóvel.
   *
   * Está aqui por pedido de playtest, e por duas razões que são de quem joga e
   * não de quem faz: há quem não goste da sensação, e há quem desconfie do que
   * ela gasta de bateria. Nenhuma das duas se discute — desliga-se.
   *
   * **Ligada por omissão** porque um retorno que é preciso ir procurar é um
   * retorno que quase ninguém encontra, e a vibração é a única coisa que
   * confirma uma recusa a quem não está a olhar para o aviso.
   */
  readonly vibracao: boolean;

  /**
   * O nome do jogador. Vazio é o estado normal de quem ainda não se deu um.
   *
   * **Sem omissão inventada.** «Jogador» tem género em português, e escolhê-lo
   * por alguém é errar com metade das pessoas logo no primeiro ecrã; «Player»
   * num jogo em português é um estrangeirismo posto por preguiça. Vazio, a Home
   * convida em vez de baptizar — e o convite desaparece no instante em que a
   * pessoa se nomeia.
   *
   * Nunca sai deste aparelho: não há conta, não há servidor, não há nada para
   * onde o mandar. É um nome para o jogador se ver, não para ser identificado.
   */
  readonly nome: string;

  /** O avatar: uma das sete faces (ver `AVATARES`). */
  readonly avatar: Cell;
}

export const defaultSettings = (): Settings => ({
  version: SETTINGS_VERSION,
  tema: "sistema",
  tempoInicial: 60,
  vibracao: true,
  nome: "",
  avatar: AVATAR_OMISSAO,
});

export const saveSettings = (
  storage: ProfileStorage,
  settings: Settings,
): void => {
  storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

export function loadSettings(storage: ProfileStorage): Settings {
  const raw = storage.getItem(SETTINGS_KEY);
  if (raw === null) return defaultSettings();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return defaultSettings();
  }

  if (typeof parsed !== "object" || parsed === null) return defaultSettings();

  const s = parsed as Partial<Settings>;
  if (s.version !== SETTINGS_VERSION) return defaultSettings();

  /*
   * Cada campo valida-se sozinho e cai no seu valor por omissão. É o que permite
   * acrescentar preferências **sem subir a versão** — um ficheiro gravado antes
   * de o contra-relógio ser configurável lê-se na mesma, e ninguém perde o tema
   * por causa de um campo novo.
   */
  return {
    version: SETTINGS_VERSION,
    tema: TEMAS.includes(s.tema as Tema) ? (s.tema as Tema) : "sistema",
    tempoInicial: TEMPOS.includes(s.tempoInicial as TempoInicial)
      ? (s.tempoInicial as TempoInicial)
      : 60,
    // Só um `false` explícito desliga. Um ficheiro gravado antes de isto
    // existir não tem o campo, e ligada é a omissão.
    vibracao: s.vibracao !== false,
    nome: typeof s.nome === "string" ? limparNome(s.nome) : "",
    avatar: AVATARES.includes(s.avatar as Cell)
      ? (s.avatar as Cell)
      : AVATAR_OMISSAO,
  };
}

/**
 * Põe o tema no documento.
 *
 * `sistema` **retira** o atributo em vez de lhe pôr um valor: é a ausência que
 * devolve o comando ao `prefers-color-scheme` do CSS. Escrever `data-tema="sistema"`
 * daria uma terceira variante que nenhuma regra conhece, e o jogo ficaria no tema
 * claro para toda a gente.
 */
export function aplicarTema(raiz: HTMLElement, tema: Tema): void {
  if (tema === "sistema") {
    delete raiz.dataset["tema"];
    return;
  }

  raiz.dataset["tema"] = tema;
}
