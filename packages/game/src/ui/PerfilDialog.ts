/**
 * Quem és: o nome e o avatar.
 *
 * **Um diálogo e não um ecrã.** São dois campos, abrem-se do sítio onde o
 * resultado se vê — a barra da Home — e fecham-se para lá. Um ecrã próprio
 * obrigava a uma rota, a uma seta de voltar e a um título a repetir o que o
 * cabeçalho já dizia, para duas decisões que se tomam em dez segundos.
 *
 * **O avatar é uma face de dado** (ver `AVATARES`, em `settings.ts`). O seletor
 * é o mesmo do joker, e é de propósito: quem já escolheu um valor para um joker
 * reconhece a grelha, e quem ainda não vai reconhecê-la quando lá chegar.
 *
 * Nada disto sai do aparelho. Não há conta nem servidor — é um nome para o
 * jogador se ver, e é por isso que não se pede nem se valida como uma
 * identidade.
 */

import type { Cell } from "@dicetoseven/engine";
import { JOKER } from "@dicetoseven/engine";

import { AVATARES, NOME_MAX, limparNome } from "../session/settings";
import type { ModoFace } from "./dice";
import { pecaDeAmostra } from "./dice";
import { botao, botaoRedondo, elemento } from "./dom";
import { iconeFechar } from "./icones";

export interface OpcoesPerfil {
  readonly nome: string;
  readonly avatar: Cell;
  readonly modoFace?: ModoFace;
  readonly aoGuardar: (perfil: {
    readonly nome: string;
    readonly avatar: Cell;
  }) => void;
}

const nomeDaFace = (v: Cell): string =>
  v === JOKER ? "joker" : `face ${String(v)}`;

export function abrirPerfil(
  host: HTMLElement,
  opcoes: OpcoesPerfil,
): HTMLDialogElement {
  const d = document.createElement("dialog");
  d.className = "popup perfil";

  const corpo = elemento("div", "popup-corpo");
  corpo.appendChild(elemento("h2", "popup-titulo", "Quem és?"));

  let avatar = opcoes.avatar;

  /* ─── O nome ──────────────────────────────────────────────────────────── */

  const campo = elemento("label", "perfil-campo");
  campo.appendChild(elemento("span", "perfil-rotulo", "O teu nome"));

  const entrada = document.createElement("input");
  entrada.type = "text";
  entrada.className = "perfil-nome";
  entrada.value = opcoes.nome;
  entrada.maxLength = NOME_MAX;
  /*
   * O convite é o mesmo texto que a Home mostra a quem não se nomeou. Dois
   * textos diferentes para o mesmo estado obrigavam a perceber que são a mesma
   * coisa.
   */
  entrada.placeholder = "Quem és?";
  entrada.autocomplete = "off";
  entrada.spellcheck = false;
  /*
   * `enterkeyhint` muda a tecla do teclado do telemóvel para «concluído». Sem
   * ela vem «seguir», que promete um campo a seguir que não existe.
   */
  entrada.setAttribute("enterkeyhint", "done");

  campo.appendChild(entrada);
  corpo.appendChild(campo);

  /* ─── O avatar ────────────────────────────────────────────────────────── */

  corpo.appendChild(elemento("span", "perfil-rotulo", "O teu avatar"));

  const grelha = elemento("div", "perfil-avatares");
  grelha.setAttribute("role", "radiogroup");
  grelha.setAttribute("aria-label", "avatar");

  const opcoesAvatar = AVATARES.map((valor) => {
    const b = botao("", "avatar-opcao");
    b.setAttribute("role", "radio");
    b.setAttribute("aria-label", nomeDaFace(valor));
    b.setAttribute("aria-checked", String(valor === avatar));
    b.appendChild(pecaDeAmostra(valor, opcoes.modoFace ?? "pintas"));

    b.addEventListener("click", () => {
      avatar = valor;
      for (const outra of opcoesAvatar) {
        outra.setAttribute("aria-checked", String(outra === b));
      }
    });

    grelha.appendChild(b);
    return b;
  });

  corpo.appendChild(grelha);

  /* ─── Fechar e guardar ────────────────────────────────────────────────── */

  const fechar = (): void => {
    if (typeof d.close === "function") d.close();
    else d.open = false;
    d.remove();
  };

  const guardar = (): void => {
    fechar();
    opcoes.aoGuardar({ nome: limparNome(entrada.value), avatar });
  };

  /*
   * `Enter` no campo guarda. É o que um teclado de telemóvel promete com o
   * «concluído», e num diálogo de dois campos obrigar a procurar o botão depois
   * de escrever o nome é um passo a mais do que a tarefa tem.
   */
  entrada.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      guardar();
    }
  });

  const acoes = elemento("div", "acoes");
  acoes.append(
    botao("Cancelar", undefined, fechar),
    botao("Guardar", "primario", guardar),
  );
  corpo.append(acoes, botaoRedondo(iconeFechar(), "fechar", fechar));

  // Tocar fora cancela: é o gesto de quem percebeu que se enganou.
  d.addEventListener("click", (e) => {
    if (e.target === d) fechar();
  });

  // O `Esc` e o botão «para trás» do Android fecham sem passar pelos botões.
  d.addEventListener("close", () => {
    d.remove();
  });

  d.appendChild(corpo);
  host.appendChild(d);

  if (typeof d.showModal === "function") d.showModal();
  else d.open = true;

  /*
   * O foco vai para o campo, mas **sem abrir o teclado do telemóvel à força**:
   * `focus` num `<dialog>` acabado de abrir é o que põe o cursor onde a pessoa
   * vai escrever, e é a razão de ela ter aberto isto.
   */
  entrada.focus();

  return d;
}
