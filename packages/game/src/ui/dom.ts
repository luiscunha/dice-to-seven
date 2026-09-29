/**
 * As peças de DOM que todos os ecrãs repetem.
 *
 * Existe porque a partir de seis ecrãs a mesma fábrica de botão estava escrita
 * seis vezes, e seis cópias divergem — foi o que já aconteceu com o `jokerValue`
 * na Fase 7.
 */

import { iconeVoltar } from "./icones";

export const texto = (s: string): Text => document.createTextNode(s);

export function botao(
  rotulo: string,
  extra?: string,
  aoClicar?: () => void,
): HTMLButtonElement {
  const b = document.createElement("button");
  b.type = "button";
  b.className = extra === undefined ? "btn" : `btn ${extra}`;
  b.textContent = rotulo;
  if (aoClicar !== undefined) b.addEventListener("click", aoClicar);
  return b;
}

export function elemento(
  tag: string,
  classe?: string,
  conteudo?: string,
): HTMLElement {
  const el = document.createElement(tag);
  if (classe !== undefined) el.className = classe;
  if (conteudo !== undefined) el.textContent = conteudo;
  return el;
}

/**
 * Faz a animação de entrada correr outra vez, num elemento que já está no ecrã.
 *
 * Trocar o texto de um elemento não reinicia animação nenhuma: a animação
 * pertence ao elemento, e o elemento não mudou. Isto interessa quando a mesma
 * mensagem se repete — dois toques recusados seguidos pela mesma razão são duas
 * recusas, e a segunda tem de se ver como a primeira. Sem isto, era a única vez
 * em que o jogo não respondia a um toque.
 *
 * O `offsetWidth` não é lido por acaso: é ele que obriga o browser a recalcular
 * o estilo entre as duas linhas. Sem essa leitura, remover e voltar a pôr a
 * classe no mesmo instante conta como não ter mexido em nada. É o mesmo truque
 * que o `BoardView` usa para separar as fases da jogada.
 */
export function reanimar(el: HTMLElement, classe: string): void {
  el.classList.remove(classe);
  void el.offsetWidth;
  el.classList.add(classe);
}

/**
 * O cabeçalho de um ecrã que não é a Home: seta para trás e título.
 *
 * A seta chama `aoVoltar` em vez de `history.back()`. Voltar **na hierarquia** e
 * voltar **no histórico** não são a mesma coisa: quem chega a um nível por link
 * direto não tem para onde recuar no histórico, mas tem sempre a lista da banda
 * acima de si.
 */
export function cabecalho(
  titulo: string,
  aoVoltar: () => void,
): { readonly el: HTMLElement; readonly elTitulo: HTMLElement } {
  const el = elemento("header", "topo");

  const voltar = botaoRedondo(iconeVoltar(), "voltar", aoVoltar);

  const elTitulo = elemento("h1", undefined, titulo);

  el.append(voltar, elTitulo);
  return { el, elTitulo };
}

/**
 * O botão redondo do cabeçalho, com um ícone lá dentro.
 *
 * O nome vai para `aria-label` e para `title` — o mesmo contrato dos botões de
 * ícone do rodapé: quem ouve o ecrã ouve o nome, e quem passa o rato e não
 * reconheceu o desenho lê-o.
 */
export function botaoRedondo(
  glifo: SVGElement,
  nome: string,
  aoClicar?: () => void,
): HTMLButtonElement {
  const b = botao("", "redondo", aoClicar);
  b.setAttribute("aria-label", nome);
  b.title = nome;
  b.appendChild(glifo);
  return b;
}

/**
 * Uma confirmação, em pop-up ao meio do ecrã.
 *
 * Existe por causa do telemóvel. Um dedo acerta ao lado do que queria com muito
 * mais frequência do que um rato, e as ações que aqui pede confirmação — sair,
 * reiniciar, recomeçar — deitam fora uma partida inteira. Perguntar custa um
 * toque; não perguntar custa o jogo todo.
 *
 * **Só se pergunta quando há o que perder.** Uma confirmação sobre uma corrida
 * já terminada não protege nada e é ruído — e uma caixa que aparece sempre é
 * uma caixa que se aprende a despachar sem ler, o que a torna pior do que não
 * existir.
 *
 * O botão que confirma **não** é o primário: o realce fica em cancelar, porque
 * quem chegou aqui por engano é quem precisa da saída fácil.
 */
export interface OpcoesConfirmar {
  readonly titulo: string;
  readonly texto?: string;
  /** O rótulo da ação a sério. «Sim» não diz o que vai acontecer. */
  readonly confirmar: string;
  readonly aoConfirmar: () => void;
}

export function confirmar(
  host: HTMLElement,
  opcoes: OpcoesConfirmar,
): HTMLDialogElement {
  const d = document.createElement("dialog");
  // Classe própria: os ecrãs já têm um `.popup` seu, e os dois não se confundem.
  d.className = "popup confirmacao";

  const corpo = elemento("div", "popup-corpo");
  corpo.appendChild(elemento("h2", "popup-titulo", opcoes.titulo));
  if (opcoes.texto !== undefined) {
    corpo.appendChild(elemento("p", "popup-texto", opcoes.texto));
  }

  const fechar = (): void => {
    if (typeof d.close === "function") d.close();
    else d.open = false;
    d.remove();
  };

  const acoes = elemento("div", "acoes");
  acoes.append(
    botao("Cancelar", "primario", fechar),
    botao(opcoes.confirmar, undefined, () => {
      fechar();
      opcoes.aoConfirmar();
    }),
  );
  corpo.appendChild(acoes);

  // Tocar fora cancela: é o gesto de quem percebeu que se enganou.
  d.addEventListener("click", (e) => {
    if (e.target === d) fechar();
  });

  /*
   * O `Esc` do teclado e o botão «para trás» do Android fecham o diálogo sem
   * passar pelos botões. Sem isto a caixa fechada ficava na árvore, e cada
   * confirmação seguinte empilhava-se por cima das mortas.
   */
  d.addEventListener("close", () => {
    d.remove();
  });

  d.appendChild(corpo);
  host.appendChild(d);

  if (typeof d.showModal === "function") d.showModal();
  else d.open = true;

  return d;
}
