/**
 * Os idiomas do jogo, e qual deles usar.
 *
 * Quatro, cada um numa variante só: português de Portugal, inglês britânico,
 * espanhol de Espanha e francês de França. Um telemóvel numa variante vizinha
 * — pt-BR, en-US, es-MX, fr-CA — fica na que existe: é a mesma língua, e uma
 * pessoa lê-a melhor do que a de um idioma que não fala.
 *
 * **Sem nenhum dos quatro, inglês.** É o idioma que mais gente percebe fora
 * deles, e um jogo que arranca em português num telemóvel alemão lê-se como
 * defeito.
 *
 * Nada aqui toca no DOM nem no `navigator`: quem pergunta passa a lista de
 * idiomas do sistema. É o que deixa isto testar-se sem browser.
 */

export type Idioma = "pt-PT" | "en-GB" | "es-ES" | "fr-FR";

/** O idioma por omissão quando o sistema não diz nenhum que o jogo tenha. */
export const IDIOMA_DE_RECURSO: Idioma = "en-GB";

/**
 * Os quatro, pela ordem do seletor, cada um **com o nome na própria língua**:
 * quem não percebe a língua em que o jogo está tem de encontrar a sua sem a
 * saber ler na dos outros.
 */
export const IDIOMAS: readonly { readonly idioma: Idioma; readonly nome: string }[] = [
  { idioma: "pt-PT", nome: "Português" },
  { idioma: "en-GB", nome: "English" },
  { idioma: "es-ES", nome: "Español" },
  { idioma: "fr-FR", nome: "Français" },
];

const POR_LINGUA: Readonly<Record<string, Idioma>> = {
  pt: "pt-PT",
  en: "en-GB",
  es: "es-ES",
  fr: "fr-FR",
};

/**
 * O idioma do jogo para uma lista de idiomas do sistema, por ordem de
 * preferência — a de `navigator.languages`.
 *
 * Vale o primeiro que o jogo tenha, pela língua e não pela variante: quem tem o
 * telemóvel em alemão e depois em espanhol joga em espanhol, e não em inglês.
 */
export function idiomaDoSistema(preferidos: readonly string[]): Idioma {
  for (const etiqueta of preferidos) {
    const lingua = etiqueta.toLowerCase().split(/[-_]/)[0] ?? "";
    const idioma = POR_LINGUA[lingua];
    if (idioma !== undefined) return idioma;
  }
  return IDIOMA_DE_RECURSO;
}

/** O que se escolhe nas Definições: seguir o sistema, ou um dos quatro. */
export type PreferenciaDeIdioma = "sistema" | Idioma;

export const eIdioma = (x: unknown): x is Idioma => IDIOMAS.some((i) => i.idioma === x);

/** O idioma a usar, dada a preferência e os idiomas do sistema. */
export const resolverIdioma = (
  preferencia: PreferenciaDeIdioma,
  preferidos: readonly string[],
): Idioma => (preferencia === "sistema" ? idiomaDoSistema(preferidos) : preferencia);
