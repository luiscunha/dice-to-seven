/**
 * Uma captura das lojas: o fundo da marca, uma frase, e o ecrã do jogo num
 * telemóvel (ou num iPad).
 *
 *   vitrine.html?formato=iphone&ecra=nivel&lang=pt
 *   vitrine.html?formato=destaque
 *
 * O ecrã vem de `ecra.html`, num iframe ao tamanho de um telemóvel a sério, e
 * a moldura encolhe-o para caber: o jogo vê-se como num aparelho, e não
 * esticado à largura da imagem. As frases são as de
 * `documentation/ficha-loja.md`.
 *
 * `capturas.mjs`, no `mobile`, fotografa isto ao tamanho de cada loja.
 */

import "./vitrine.css";

declare global {
  interface Window {
    __pronto?: boolean;
  }
}

/** O tamanho de cada imagem, em píxeis CSS; a escala do Chrome faz o resto. */
export const FORMATOS = {
  /** Google Play, telemóvel: 1080×1920. */
  play: { largura: 360, altura: 640, escala: 3, aparelho: "telemovel" },
  /** App Store, iPhone de 6,9": 1320×2868. */
  iphone: { largura: 440, altura: 956, escala: 3, aparelho: "telemovel" },
  /** App Store, iPad de 13" (e a Play, tablet): 2064×2752. */
  ipad: { largura: 1032, altura: 1376, escala: 2, aparelho: "tablet" },
  /** Google Play, gráfico de destaque: 1024×500. */
  destaque: { largura: 512, altura: 250, escala: 2, aparelho: "nenhum" },
} as const;

/**
 * O ecrã por dentro do aparelho, em píxeis CSS: um iPhone, e um iPad de 11".
 *
 * O iPad é o de 11" e não o de 13", embora a imagem seja do tamanho que a
 * Apple pede para o de 13". A peça do tabuleiro tem um teto (`LADO_MAX`, no
 * `BoardView`), e num ecrã de 1032px o tabuleiro ficava a ocupar metade da
 * largura. Num iPad Air é o mesmo jogo, mais cheio — e é um iPad a sério.
 */
const ECRA_DO_APARELHO = {
  telemovel: { largura: 390, altura: 844 },
  tablet: { largura: 820, altura: 1180 },
} as const;

/** As frases das capturas, pela ordem em que aparecem na loja. */
export const CAPTURAS = [
  {
    ecra: "nivel",
    frase: {
      en: "Join dice that add up to 7",
      pt: "Junta dados que somem 7",
      es: "Junta dados que sumen 7",
      fr: "Réunis des dés qui font 7",
    },
  },
  {
    ecra: "capitulo",
    frase: {
      en: "133 levels, every one solvable",
      pt: "133 níveis, todos com solução",
      es: "133 niveles, todos con solución",
      fr: "133 niveaux, tous résolubles",
    },
  },
  {
    ecra: "tempo",
    frase: {
      en: "Race the clock, chain combos",
      pt: "Contra o relógio, faz combos",
      es: "Contra el reloj, haz combos",
      fr: "Contre la montre, enchaîne",
    },
  },
  {
    ecra: "survival",
    tema: "escuro",
    frase: {
      en: "Hold out as the rows drop",
      pt: "Aguenta as linhas a cair",
      es: "Aguanta las filas que caen",
      fr: "Tiens bon face aux lignes",
    },
  },
  {
    ecra: "desafio",
    frase: {
      en: "A new challenge every day",
      pt: "Um desafio novo cada dia",
      es: "Un desafío nuevo cada día",
      fr: "Un nouveau défi chaque jour",
    },
  },
  {
    ecra: "medalhas",
    frase: {
      en: "23 medals to collect",
      pt: "23 medalhas para conquistar",
      es: "23 medallas por conseguir",
      fr: "23 médailles à obtenir",
    },
  },
] as const;

type Formato = keyof typeof FORMATOS;
type Lingua = keyof (typeof CAPTURAS)[number]["frase"];

const parametros = new URLSearchParams(location.search);
const formato = (parametros.get("formato") ?? "iphone") as Formato;
const lingua = (parametros.get("lang") ?? "en") as Lingua;
const medidas = FORMATOS[formato];

const tela = document.getElementById("tela") as HTMLElement;
tela.dataset["formato"] = formato;
tela.style.width = `${String(medidas.largura)}px`;
tela.style.height = `${String(medidas.altura)}px`;

const el = (tag: string, classe: string, texto?: string): HTMLElement => {
  const e = document.createElement(tag);
  e.className = classe;
  if (texto !== undefined) e.textContent = texto;
  return e;
};

/** O nome do jogo, como na Home: o «To» destacado, e uma peça no lugar do «o». */
function nome(): HTMLElement {
  const h = el("span", "nome");
  const liga = el("span", "nome-liga");
  liga.append("T", el("span", "nome-peca"), el("span", "nome-o", "o"));
  h.append("Dice", liga, "Seven");
  return h;
}

/** Uma peça de amostra, com as pintas da face. */
function peca(valor: number): HTMLElement {
  const p = el("span", `amostra face-${String(valor)}`);
  for (let i = 0; i < valor; i++) p.appendChild(el("span", "pinta"));
  return p;
}

if (formato === "destaque") {
  /*
   * O gráfico de destaque da Play: sem frase, para servir às quatro línguas. O
   * cubo, o nome, e a regra em peças — que se lê em qualquer língua.
   */
  const regra = el("div", "regra");
  regra.append(peca(3), el("span", "sinal", "+"), peca(4), el("span", "sinal", "="), el("span", "sete", "7"));
  const texto = el("div", "destaque-texto");
  texto.append(nome(), regra);
  const simbolo = document.createElement("img");
  simbolo.className = "destaque-simbolo";
  simbolo.src = new URL("../public/marca/icone.svg", import.meta.url).href;
  simbolo.alt = "";
  tela.append(simbolo, texto);
  await simbolo.decode();
  await document.fonts.ready;
  window.__pronto = true;
} else {
  const ecra = parametros.get("ecra") ?? "nivel";
  const captura = CAPTURAS.find((c) => c.ecra === ecra) ?? CAPTURAS[0];
  const tema = "tema" in captura ? captura.tema : "claro";

  const frase = el("h1", "frase", captura.frase[lingua]);
  frase.lang = lingua;

  const tipo = medidas.aparelho === "tablet" ? "tablet" : "telemovel";
  const dentro = ECRA_DO_APARELHO[tipo];
  const aparelho = el("div", `aparelho ${tipo}`);
  aparelho.style.setProperty("--largura-ecra", `${String(dentro.largura)}px`);
  aparelho.style.setProperty("--altura-ecra", `${String(dentro.altura)}px`);

  const quadro = document.createElement("iframe");
  quadro.className = "ecra";
  quadro.width = String(dentro.largura);
  quadro.height = String(dentro.altura);
  quadro.src = `ecra.html?ecra=${ecra}&lang=${lingua}&tema=${tema}`;
  aparelho.appendChild(quadro);

  tela.append(frase, aparelho);

  /*
   * A escala do aparelho: o que couber debaixo da frase, sem passar da largura.
   * Mede-se depois de a frase ter a fonte certa, porque é ela que decide quanto
   * sobra.
   */
  await document.fonts.ready;
  const sobraAltura = medidas.altura - frase.getBoundingClientRect().bottom - medidas.altura * 0.05;
  const borda = tipo === "tablet" ? 28 : 22;
  const escala = Math.min(
    sobraAltura / (dentro.altura + 2 * borda),
    (medidas.largura * 0.86) / (dentro.largura + 2 * borda),
  );
  aparelho.style.setProperty("--escala", String(escala));
  aparelho.style.setProperty("--borda", `${String(borda)}px`);

  // Espera que o jogo, lá dentro, diga que está pronto.
  for (let i = 0; i < 300; i++) {
    if (quadro.contentWindow?.__pronto === true) break;
    await new Promise((r) => {
      setTimeout(r, 100);
    });
  }
  window.__pronto = true;
}
