/**
 * O que faz a aplicação saber a aplicação, e não a um site embrulhado.
 *
 * Tudo aqui é **silencioso na web**: cada função verifica a plataforma e não faz
 * nada fora do telemóvel. É o que permite ao `main.ts` chamá-las sem condições,
 * e à demo continuar a ser a mesma coisa que sempre foi.
 *
 * Os plugins do Capacitor também não falham na web — devolvem implementações
 * vazias — mas a verificação fica na mesma, porque uma vibração pedida num
 * portátil é uma pergunta que não se devia ter feito.
 */

import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { SplashScreen } from "@capacitor/splash-screen";
import { Style, StatusBar } from "@capacitor/status-bar";

const nativo = (): boolean => Capacitor.isNativePlatform();

/* ─── Vibração ──────────────────────────────────────────────────────────────
 *
 * Três intensidades, e cada uma diz uma coisa diferente. A regra é a mesma do
 * som num jogo: se vibrar sempre igual, deixa de informar e passa a incomodar.
 *
 * Nenhuma delas espera pelo resultado. Uma vibração que chega tarde é pior do
 * que nenhuma, e travar o toque à espera dela seria trocar resposta por
 * fidelidade.
 */

/** Uma peça entrou ou saiu da seleção. O mais leve que há. */
export function vibrarToque(): void {
  if (!nativo()) return;
  void Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
}

/** O grupo fechou e a jogada aconteceu. */
export function vibrarJogada(): void {
  if (!nativo()) return;
  void Haptics.impact({ style: ImpactStyle.Medium }).catch(() => undefined);
}

/**
 * O toque foi recusado — passava de 7, ou era meia solda, ou a terceira peça
 * numa seleção com gelo.
 *
 * É o padrão de erro do sistema e não um impacto, porque é o único caso em que
 * a vibração substitui uma leitura: quem não está a olhar para o aviso fica a
 * saber na mesma que a jogada não entrou.
 */
export function vibrarRecusa(): void {
  if (!nativo()) return;
  void Haptics.notification({ type: NotificationType.Warning }).catch(
    () => undefined,
  );
}

/** O tabuleiro ficou limpo. */
export function vibrarVitoria(): void {
  if (!nativo()) return;
  void Haptics.notification({ type: NotificationType.Success }).catch(
    () => undefined,
  );
}

/* ─── Arranque e aparência ─────────────────────────────────────────────────── */

/**
 * O botão **para trás** do Android.
 *
 * Por omissão sai da aplicação, esteja onde estiver. Aqui sobe na hierarquia,
 * como a seta do cabeçalho — e é a mesma regra que o `PuzzleScreen` já segue:
 * quem chega a um nível por link direto não tem para onde recuar, mas tem
 * sempre a lista acima de si.
 *
 * Só sai da aplicação quando já está no topo. Sair de um nível a meio por causa
 * de um toque no botão errado seria exatamente o acidente que as caixas de
 * confirmação existem para evitar.
 */
export function ligarBotaoDeVoltar(subir: () => boolean): void {
  if (!nativo()) return;

  void App.addListener("backButton", () => {
    // `subir()` devolve `false` quando já não há para onde ir.
    if (!subir()) void App.exitApp();
  });
}

/**
 * Acerta a barra de estado com o tema, e só depois esconde o ecrã de arranque.
 *
 * Por esta ordem: esconder primeiro deixava ver uma barra da cor errada durante
 * um piscar. E o ecrã de arranque está configurado para **não** se esconder
 * sozinho (`launchAutoHide: false`), porque uma duração fixa ou tapa a
 * aplicação já pronta, ou descobre o ecrã ainda vazio — só quem carregou os
 * níveis sabe quando é a altura.
 */
export async function aplicacaoPronta(escuro: boolean): Promise<void> {
  if (!nativo()) return;

  try {
    await StatusBar.setStyle({ style: escuro ? Style.Dark : Style.Light });
  } catch {
    // O Android antigo não deixa mudar o estilo. Não é motivo para não arrancar.
  }

  try {
    await SplashScreen.hide();
  } catch {
    // Idem: sem ecrã de arranque, a aplicação aparece direta.
  }
}
