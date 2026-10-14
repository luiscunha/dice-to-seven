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
import { Capacitor, SystemBars, SystemBarsStyle } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { SplashScreen } from "@capacitor/splash-screen";

const nativo = (): boolean => Capacitor.isNativePlatform();

/** Há telemóvel a sério por baixo? É o que decide se a definição aparece. */
export const emTelemovel = (): boolean => Capacitor.isNativePlatform();

/*
 * ── A vibração é uma preferência, e vive aqui ──
 *
 * Podia ir por parâmetro até ao `PuzzleScreen`, mas então cada ecrã que vibre
 * teria de a receber e de a fazer chegar ao sítio certo — e são quatro, a contar
 * com o Survival e o modo tempo. Uma variável neste módulo é o mesmo alcance com
 * um sítio só para esquecer.
 *
 * Arranca ligada porque é o valor por omissão das preferências; o `main.ts`
 * corrige-a mal as leia.
 */
let vibracaoLigada = true;

export function definirVibracao(ligada: boolean): void {
  vibracaoLigada = ligada;
}

const podeVibrar = (): boolean => vibracaoLigada && nativo();

/* ─── Vibração ──────────────────────────────────────────────────────────────
 *
 * Três intensidades, e cada uma diz uma coisa diferente. A regra é a mesma do
 * som num jogo: se vibrar sempre igual, deixa de informar e passa a incomodar.
 *
 * Todas passam pelo `podeVibrar`, que junta a plataforma à preferência do
 * jogador — ver `definirVibracao`.
 *
 * Nenhuma delas espera pelo resultado. Uma vibração que chega tarde é pior do
 * que nenhuma, e travar o toque à espera dela seria trocar resposta por
 * fidelidade.
 */

/** Uma peça entrou ou saiu da seleção. O mais leve que há. */
export function vibrarToque(): void {
  if (!podeVibrar()) return;
  void Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
}

/** O grupo fechou e a jogada aconteceu. */
export function vibrarJogada(): void {
  if (!podeVibrar()) return;
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
  if (!podeVibrar()) return;
  void Haptics.notification({ type: NotificationType.Warning }).catch(
    () => undefined,
  );
}

/**
 * A bomba do Contra-Relógio rebentou.
 *
 * O padrão de erro, e não o de recusa: custa cinco segundos, mais do que três
 * toques errados juntos, e o dedo tem de sentir a diferença sem olhar.
 */
export function vibrarExplosao(): void {
  if (!podeVibrar()) return;
  void Haptics.notification({ type: NotificationType.Error }).catch(
    () => undefined,
  );
}

/** O tabuleiro ficou limpo. */
export function vibrarVitoria(): void {
  if (!podeVibrar()) return;
  void Haptics.notification({ type: NotificationType.Success }).catch(
    () => undefined,
  );
}

/**
 * ── Um toque no tabuleiro vibra igual em todos os modos ──
 *
 * Cada ecrã decidia a sua vibração, e só a campanha vibrava a cada toque: no
 * Survival e no Contra-Relógio, um toque que passava de 7 não vibrava — com a
 * vibração ligada. A regra passou a viver aqui, num sítio só, e os ecrãs só
 * dizem o que aconteceu.
 */
export interface ToqueVibrado {
  /** A sessão recusou o toque: passava de 7, era meia solda, ou gelo. */
  readonly recusado: boolean;
  /** O toque fechou um grupo, e a jogada aconteceu. */
  readonly jogou: boolean;
  /** A jogada deixou o tabuleiro vazio. */
  readonly limpou?: boolean;
}

export type Vibracao = "toque" | "jogada" | "recusa" | "vitoria";

/** Qual das vibrações um toque pede. Pura, para se poder testar sem telemóvel. */
export const vibracaoDoToque = (t: ToqueVibrado): Vibracao =>
  t.recusado
    ? "recusa"
    : t.limpou === true
      ? "vitoria"
      : t.jogou
        ? "jogada"
        : "toque";

export function vibrarPeloToque(t: ToqueVibrado): void {
  switch (vibracaoDoToque(t)) {
    case "recusa":
      vibrarRecusa();
      return;
    case "vitoria":
      vibrarVitoria();
      return;
    case "jogada":
      vibrarJogada();
      return;
    case "toque":
      vibrarToque();
      return;
  }
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
 * Desliga o zoom de pinça — só no telemóvel.
 *
 * O `touch-action: manipulation` do `body` já tira o zoom por duplo toque, mas
 * a pinça continua. No iOS, uma pinça amplia a interface inteira, com o
 * tabuleiro a sair do ecrã. É o gesto que denuncia uma página dentro de uma
 * caixa, e é exatamente isso que a Apple recusa pela diretriz 4.2.
 *
 * Por código, e não no `index.html`, porque a demo web é a mesma página: num
 * browser, tirar o zoom é tirá-lo a quem precisa dele para ler. O Safari ignora
 * o `user-scalable=no` por essa razão, mas a WebView da aplicação respeita-o.
 * No Android a WebView já não tem pinça, portanto na prática isto só muda o
 * iOS — mas distinguir as duas plataformas seria código para não mudar nada.
 */
export function travarZoom(): void {
  if (!nativo()) return;

  const viewport = document.querySelector('meta[name="viewport"]');
  viewport?.setAttribute(
    "content",
    "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover",
  );
}

/**
 * Acerta a tinta das barras do sistema com o fundo do jogo.
 *
 * **As duas barras, e sempre que o tema muda** — não só no arranque. Com o
 * `targetSdk` 36 a aplicação desenha de ponta a ponta: a barra de estado e a
 * de navegação são transparentes e o que se vê por trás delas é o `--ground`
 * do jogo. A tinta dos ícones tem de contrastar com esse fundo, e esse fundo
 * muda quando o jogador troca de tema nas Definições, ou quando o sistema passa
 * a escuro com o tema em «Sistema».
 *
 * Antes lia-se o `data-tema` do documento, que só existe quando o tema é
 * forçado. Com a omissão, «Sistema», num telemóvel escuro, a barra ficava com
 * ícones escuros sobre o fundo escuro do jogo: as horas e a bateria
 * desapareciam.
 *
 * `SystemBars` vem do núcleo do Capacitor 8 e cobre as duas barras de uma vez.
 * É a mesma chamada nas duas plataformas, portanto não há aqui nada que tenha
 * de ser refeito quando o iOS chegar.
 *
 * `escuro` quer dizer **fundo escuro**, e portanto tinta clara — é o estilo
 * `Dark` do Capacitor.
 */
export async function ajustarBarras(escuro: boolean): Promise<void> {
  if (!nativo()) return;

  try {
    await SystemBars.setStyle({
      style: escuro ? SystemBarsStyle.Dark : SystemBarsStyle.Light,
    });
  } catch {
    // O Android antigo não deixa mudar o estilo. Não é motivo para não arrancar.
  }
}

/**
 * Acerta as barras do sistema com o tema, e só depois esconde o ecrã de
 * arranque.
 *
 * Por esta ordem: esconder primeiro deixava ver uma barra da cor errada durante
 * um piscar. E o ecrã de arranque está configurado para **não** se esconder
 * sozinho (`launchAutoHide: false`), porque uma duração fixa ou tapa a
 * aplicação já pronta, ou descobre o ecrã ainda vazio — só quem carregou os
 * níveis sabe quando é a altura.
 */
export async function aplicacaoPronta(escuro: boolean): Promise<void> {
  if (!nativo()) return;

  await ajustarBarras(escuro);

  try {
    await SplashScreen.hide();
  } catch {
    // Sem ecrã de arranque, a aplicação aparece direta.
  }
}
