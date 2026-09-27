/**
 * Onde o progresso vive, em cada plataforma.
 *
 * ── O problema que isto resolve ──
 *
 * No iOS, o `localStorage` de uma WKWebView **pode ser apagado pelo sistema**
 * quando o telefone fica com pouco espaço. Quem joga perde o perfil sem ter
 * feito nada e sem aviso. O `Preferences` do Capacitor guarda em
 * `UserDefaults` (iOS) e `SharedPreferences` (Android), que não são despejados.
 *
 * ── Porque não se usa o `Preferences` também na web ──
 *
 * Seria um caminho só, e este projeto prefere caminhos únicos. Mas a
 * implementação web do `Preferences` escreve em `localStorage` com o prefixo
 * `CapacitorStorage.`, portanto a chave mudava — e **toda a gente que já jogou
 * a demo perdia o progresso** na atualização seguinte. Um caminho limpo não
 * vale isso.
 *
 * ── Síncrono por fora, assíncrono por dentro ──
 *
 * O `Preferences` é assíncrono e o `ProfileStorage` é síncrono. Tornar tudo
 * assíncrono espalhava `await` pela sessão inteira — que é código puro e
 * testável, e é assim que se quer.
 *
 * Em vez disso lê-se tudo **uma vez no arranque** para um `Map`, e servem-se as
 * leituras daí. As escritas vão para memória na hora e para o disco atrás, sem
 * ninguém esperar. É o formato certo para o que isto é: um punhado de chaves,
 * lidas a toda a hora e escritas de vez em quando.
 *
 * O preço é que uma escrita que falhe no disco não se nota. É aceitável: já era
 * assim com o `localStorage` cheio, e a alternativa — bloquear o jogo à espera
 * do disco — é pior.
 */

import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

import type { ProfileStorage } from "../session/progress";

/**
 * As chaves que o jogo guarda.
 *
 * A lista é explícita porque no arranque se lê tudo de uma vez, e só se pode
 * ler o que se conhece. Uma chave nova tem de entrar aqui — e um teste garante
 * que nenhuma se esquece.
 */
export const CHAVES = [
  "dicetoseven.profile",
  "dicetoseven.settings",
  "dicetoseven.survival",
] as const;

/**
 * Abre o armazenamento da plataforma. **Nunca falha**: se o disco não
 * responder, o jogo arranca com o perfil vazio em vez de não arrancar.
 */
export async function abrirArmazenamento(): Promise<ProfileStorage | undefined> {
  if (!Capacitor.isNativePlatform()) {
    return typeof localStorage === "undefined" ? undefined : localStorage;
  }

  const memoria = new Map<string, string>();

  for (const chave of CHAVES) {
    try {
      const { value } = await Preferences.get({ key: chave });
      if (value !== null) memoria.set(chave, value);
    } catch {
      // Uma chave que não se lê é uma chave que não existe. Ver a nota do topo.
    }
  }

  return {
    getItem: (chave) => memoria.get(chave) ?? null,

    setItem: (chave, valor) => {
      memoria.set(chave, valor);
      void Preferences.set({ key: chave, value: valor }).catch(() => undefined);
    },
  };
}
