/**
 * Capacitor — o mesmo jogo, embrulhado para iOS e Android (plano fase 9).
 *
 * Não há nada aqui a compensar o build web: o `vite.config.ts` já usa
 * `base: "./"`, e as rotas já vivem no fragmento. As duas decisões foram
 * tomadas na fase 8 por outras razões — servir de uma subpasta, e não precisar
 * de reescritas no servidor — e são exatamente as que a WebView exige.
 */

import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  /**
   * O identificador nas duas lojas, e é **para sempre**: mudá-lo depois de
   * publicar é publicar uma aplicação diferente, sem os utilizadores da
   * anterior.
   */
  appId: "com.luiscunha.dicetoseven",
  appName: "DiceToSeven",

  /**
   * O que o `vite build` deixa, no pacote do lado. Este pacote não tem código —
   * é só a casca nativa, e é por isso que aponta para fora.
   */
  webDir: "../game/dist",

  plugins: {
    SplashScreen: {
      /*
       * Escondido por código, não por tempo: o arranque carrega o índice dos
       * níveis, e uma duração fixa ou tapa a aplicação já pronta, ou descobre o
       * ecrã ainda vazio. Ver `plataforma/nativo.ts`.
       */
      launchAutoHide: false,
      backgroundColor: "#f1f2f0",
    },
  },

  /*
   * As duas plataformas ficam com o esquema por omissão do Capacitor —
   * `capacitor://localhost` no iOS, `https://localhost` no Android. É o que faz
   * o `localStorage` e o `Preferences` terem uma origem estável entre
   * atualizações; mudá-lo depois de publicar apagava o progresso de toda a
   * gente.
   */
};

export default config;
