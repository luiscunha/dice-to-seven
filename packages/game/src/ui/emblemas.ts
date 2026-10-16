/**
 * Os emblemas das medalhas: uma ilustração por medalha, em SVG.
 *
 * **Ilustração, e não ícone.** Os ícones do jogo são traço (`icones.ts`), e a
 * direção de arte recusa-os ilustrados porque um ícone é uma instrução. Uma
 * medalha é o contrário — é o prémio, e tem de parecer uma coisa que se ganhou:
 * volume, brilho, ouro. É o único sítio do jogo onde se desenha assim.
 *
 * **O dado é a figura de quase todas**, visto do canto, com as três faces e as
 * pintas — a peça do tabuleiro em objeto. À volta, o que diz o tamanho da
 * conquista: uma folha a nascer no Iniciado, dois dados no Médio, asas no
 * Avançado, o escudo e a coroa no Perito. O Contra-Relógio é o cronómetro, o
 * Survival a ampulheta, o desafio a chama da sequência. As das estatísticas
 * trazem a coisa que contam: a bomba, os elos do combo, o poço cheio, as
 * peças de uma pinta, a vitrine das composições.
 *
 * **SVG, e não imagens.** Nítido em qualquer ecrã, uns quilobytes no total, e
 * as cores vêm todas de `theme.css`, por classe — nenhum hex aqui. As cores das
 * ilustrações não mudam com o tema, como as das faces: uma medalha de ouro é de
 * ouro no claro e no escuro.
 *
 * **Os degradês vivem numa folha só** (`garantirDefinicoes`), escondida no
 * `body`, e cada emblema refere-os por id. Repetidos em cada emblema, os ids
 * apareciam em dobro no documento, e um degradê que o browser fosse buscar a
 * um emblema já retirado do ecrã deixava os outros sem cor.
 */

import { LIMIARES } from "../session/medalhas";

const NS = "http://www.w3.org/2000/svg";

type Atributos = Readonly<Record<string, string | number>>;

function no(tag: string, classe: string | undefined, atributos: Atributos = {}): SVGElement {
  const el = document.createElementNS(NS, tag);
  if (classe !== undefined) el.setAttribute("class", classe);
  for (const [k, v] of Object.entries(atributos)) el.setAttribute(k, String(v));
  return el;
}

function grupo(atributos: Atributos, ...filhos: readonly SVGElement[]): SVGElement {
  const g = no("g", undefined, atributos);
  for (const f of filhos) g.appendChild(f);
  return g;
}

const n = (x: number): string => String(Math.round(x * 100) / 100);

/* ─── Os degradês ─────────────────────────────────────────────────────────── */

const DEFINICOES_ID = "emblemas-definicoes";

/**
 * Um degradê, com as paragens por classe — a cor de cada uma vem do CSS
 * (`stop-color`), e é isso que a deixa viver em `theme.css`.
 */
function degrade(
  id: string,
  tipo: "linearGradient" | "radialGradient",
  atributos: Atributos,
  paragens: readonly (readonly [number, string])[],
): SVGElement {
  const g = no(tipo, undefined, { id, ...atributos });
  for (const [offset, classe] of paragens) {
    g.appendChild(no("stop", classe, { offset }));
  }
  return g;
}

/** Põe a folha dos degradês no documento, se ainda lá não estiver. */
function garantirDefinicoes(): void {
  if (document.getElementById(DEFINICOES_ID) !== null) return;

  const svg = no("svg", "emblemas-definicoes", {
    id: DEFINICOES_ID,
    width: 0,
    height: 0,
    "aria-hidden": "true",
    focusable: "false",
  });
  const defs = no("defs", undefined);
  const diagonal = { x1: 0, y1: 0, x2: 1, y2: 1 };
  const vertical = { x1: 0, y1: 0, x2: 0, y2: 1 };

  defs.append(
    degrade("emb-ouro", "linearGradient", diagonal, [
      [0, "emb-ouro-1"],
      [0.45, "emb-ouro-2"],
      [1, "emb-ouro-3"],
    ]),
    degrade("emb-prata", "linearGradient", diagonal, [
      [0, "emb-prata-1"],
      [0.5, "emb-prata-2"],
      [1, "emb-prata-3"],
    ]),
    degrade("emb-escudo", "linearGradient", vertical, [
      [0, "emb-escudo-1"],
      [1, "emb-escudo-2"],
    ]),
    degrade("emb-folha", "linearGradient", diagonal, [
      [0, "emb-folha-1"],
      [1, "emb-folha-2"],
    ]),
    degrade("emb-fogo", "radialGradient", { cx: 0.5, cy: 0.8, r: 0.75 }, [
      [0, "emb-fogo-1"],
      [0.45, "emb-fogo-2"],
      [1, "emb-fogo-3"],
    ]),
    degrade("emb-fogo-ouro", "radialGradient", { cx: 0.5, cy: 0.8, r: 0.75 }, [
      [0, "emb-ouro-1"],
      [0.5, "emb-ouro-2"],
      [1, "emb-ouro-3"],
    ]),
    degrade("emb-areia", "linearGradient", vertical, [
      [0, "emb-areia-1"],
      [1, "emb-areia-2"],
    ]),
    degrade("emb-brilho", "linearGradient", vertical, [
      [0, "emb-brilho-1"],
      [1, "emb-brilho-2"],
    ]),
    degrade("emb-halo", "radialGradient", { cx: 0.5, cy: 0.5, r: 0.5 }, [
      [0, "emb-halo-1"],
      [1, "emb-halo-2"],
    ]),
    degrade("emb-halo-ouro", "radialGradient", { cx: 0.5, cy: 0.5, r: 0.5 }, [
      [0, "emb-halo-ouro-1"],
      [1, "emb-halo-2"],
    ]),
    degrade("emb-bomba", "radialGradient", { cx: 0.36, cy: 0.32, r: 0.75 }, [
      [0, "emb-bomba-1"],
      [0.55, "emb-bomba-2"],
      [1, "emb-bomba-3"],
    ]),
  );

  svg.appendChild(defs);
  document.body.appendChild(svg);
}

/* ─── O dado ──────────────────────────────────────────────────────────────── */

export type PaletaDoDado = "marfim" | "prata" | "ouro" | "branco";

/** O conteúdo de uma face: pintas, de 1 a 6, ou a estrela das perfeitas. */
type Face = number | "estrela";

const R3 = Math.sqrt(3) / 2;

/** As pintas na face plana, de 0 a 1, na disposição de um dado a sério. */
const PINTAS: Readonly<Record<number, readonly (readonly [number, number])[]>> = {
  1: [[0.5, 0.5]],
  2: [[0.27, 0.27], [0.73, 0.73]],
  3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
  4: [[0.27, 0.27], [0.73, 0.27], [0.27, 0.73], [0.73, 0.73]],
  5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
  6: [[0.27, 0.22], [0.73, 0.22], [0.27, 0.5], [0.73, 0.5], [0.27, 0.78], [0.73, 0.78]],
};

/**
 * A matriz que leva o quadrado unitário de cada face para o losango dela.
 *
 * O cubo desenha-se num espaço unitário — o centro em `(0, 0)`, o vértice de
 * cima em `(0, −1)` — e cada face é um paralelogramo. Desenhar as pintas num
 * quadrado e deixar a matriz achatá-las é o que as põe *na* face, em
 * perspetiva, em vez de pousadas por cima dela.
 */
const MATRIZ = {
  topo: `matrix(${n(R3)} -0.5 ${n(R3)} 0.5 ${n(-R3)} -0.5)`,
  esquerda: `matrix(${n(R3)} 0.5 0 1 ${n(-R3)} -0.5)`,
  direita: `matrix(${n(R3)} -0.5 0 1 0 0)`,
} as const;

function conteudoDaFace(face: Face, matriz: string, classe: string): SVGElement {
  const g = no("g", undefined, { transform: matriz });
  if (face === "estrela") {
    g.appendChild(estrela(0.5, 0.5, 0.36, `${classe} dado-estrela`));
    return g;
  }
  for (const [x, y] of PINTAS[face] ?? []) {
    g.appendChild(no("circle", classe, { cx: x, cy: y, r: 0.105 }));
  }
  return g;
}

/**
 * Um dado em perspetiva, centrado em `(x, y)`, com `s` de raio — do centro ao
 * vértice de cima. As três faces em três tons da paleta, o brilho na de cima,
 * e o contorno arredondado por trás: um hexágono com as juntas redondas, que
 * arredonda os cantos sem cada face ter de pintar uma borda.
 */
export function dado(
  x: number,
  y: number,
  s: number,
  paleta: PaletaDoDado,
  faces: { readonly topo: Face; readonly esquerda: Face; readonly direita: Face },
  rotacao = 0,
): SVGElement {
  const topo = `M0 -1 L${n(R3)} -0.5 L0 0 L${n(-R3)} -0.5 Z`;
  return grupo(
    {
      class: `emb-dado dado-${paleta}`,
      transform: `translate(${n(x)} ${n(y)}) rotate(${n(rotacao)}) scale(${n(s)})`,
    },
    no("path", "dado-contorno", {
      d: `M0 -1 L${n(R3)} -0.5 L${n(R3)} 0.5 L0 1 L${n(-R3)} 0.5 L${n(-R3)} -0.5 Z`,
      "stroke-width": 0.16,
    }),
    no("path", "dado-esquerda", { d: `M${n(-R3)} -0.5 L0 0 L0 1 L${n(-R3)} 0.5 Z` }),
    no("path", "dado-direita", { d: `M0 0 L${n(R3)} -0.5 L${n(R3)} 0.5 L0 1 Z` }),
    no("path", "dado-topo", { d: topo }),
    no("path", "dado-brilho", { d: topo }),
    no("path", "dado-aresta", {
      d: `M${n(-R3)} -0.5 L0 0 L${n(R3)} -0.5 M0 0 V1`,
      "stroke-width": 0.045,
    }),
    conteudoDaFace(faces.topo, MATRIZ.topo, "dado-pinta"),
    conteudoDaFace(faces.esquerda, MATRIZ.esquerda, "dado-pinta"),
    conteudoDaFace(faces.direita, MATRIZ.direita, "dado-pinta"),
  );
}

/* ─── As peças ────────────────────────────────────────────────────────────── */

/** Uma estrela de cinco pontas, centrada em `(cx, cy)`. */
function estrela(cx: number, cy: number, r: number, classe: string): SVGElement {
  const pontos: string[] = [];
  for (let i = 0; i < 10; i++) {
    const raio = i % 2 === 0 ? r : r * 0.46;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pontos.push(`${n(cx + raio * Math.cos(a))},${n(cy + raio * Math.sin(a))}`);
  }
  return no("polygon", classe, { points: pontos.join(" ") });
}

/** O brilho de quatro pontas que pisca à volta do ouro. */
function brilho(x: number, y: number, r: number, classe = "emb-centelha"): SVGElement {
  const q = r * 0.18;
  return no("path", classe, {
    d:
      `M${n(x)} ${n(y - r)} Q${n(x + q)} ${n(y - q)} ${n(x + r)} ${n(y)} ` +
      `Q${n(x + q)} ${n(y + q)} ${n(x)} ${n(y + r)} Q${n(x - q)} ${n(y + q)} ${n(x - r)} ${n(y)} ` +
      `Q${n(x - q)} ${n(y - q)} ${n(x)} ${n(y - r)} Z`,
  });
}

/** O halo por trás de uma medalha ganha: luz, e não um desenho. */
const halo = (premium: boolean): SVGElement =>
  no("circle", premium ? "emb-halo emb-halo-ouro" : "emb-halo", { cx: 60, cy: 52, r: 48 });

/**
 * Uma asa, a da direita, presa em `(0, 0)` e aberta para cima e para fora. A
 * da esquerda é esta ao espelho.
 */
function asa(x: number, y: number, escala: number, espelho: boolean, metal: "ouro" | "prata"): SVGElement {
  const sx = espelho ? -escala : escala;
  return grupo(
    { transform: `translate(${n(x)} ${n(y)}) scale(${n(sx)} ${n(escala)})`, class: `emb-asa emb-${metal}` },
    no("path", "emb-metal", {
      d:
        "M0 4 C6 -6 20 -14 40 -15 C36 -9 31 -6 25 -4 C32 -3 36 -1 39 2 " +
        "C32 6 25 6 19 5 C24 8 27 11 28 14 C18 15 8 12 0 4 Z",
    }),
    no("path", "emb-asa-pena", { d: "M8 1 C17 -5 27 -9 37 -12 M10 5 C18 2 26 1 35 1 M12 8 C17 9 21 10 25 12" }),
  );
}

/** A coroa, pousada em `(x, y)` — o meio da base. */
function coroa(x: number, y: number, escala = 1): SVGElement {
  return grupo(
    { transform: `translate(${n(x)} ${n(y)}) scale(${n(escala)})`, class: "emb-coroa" },
    no("path", "emb-metal emb-ouro", { d: "M-16 0 L-19 -15 L-8 -6 L0 -19 L8 -6 L19 -15 L16 0 Z" }),
    no("rect", "emb-metal emb-ouro", { x: -16, y: -2, width: 32, height: 6, rx: 2 }),
    no("circle", "emb-metal emb-ouro", { cx: -19, cy: -15, r: 2.6 }),
    no("circle", "emb-metal emb-ouro", { cx: 0, cy: -19, r: 2.6 }),
    no("circle", "emb-metal emb-ouro", { cx: 19, cy: -15, r: 2.6 }),
    no("circle", "emb-joia", { cx: 0, cy: 1, r: 2.2 }),
  );
}

/** O escudo do Perito: azul, com o rebordo de ouro. */
function escudo(dourado: boolean): SVGElement {
  const d = "M60 24 C70 28 78 28 88 26 V52 C88 71 76 83 60 91 C44 83 32 71 32 52 V26 C42 28 50 28 60 24 Z";
  return grupo(
    {},
    no("path", dourado ? "emb-escudo emb-escudo-dourado" : "emb-escudo", { d }),
    no("path", "emb-escudo-filete", {
      d: "M60 31 C68 34 75 34 82 33 V52 C82 67 73 77 60 84 C47 77 38 67 38 52 V33 C45 34 52 34 60 31 Z",
    }),
  );
}

/**
 * Dois ramos de louro, um de cada lado, a subir do pé do emblema. As folhas
 * calculam-se ao longo de um arco, e o ramo da esquerda é o da direita ao
 * espelho: desenhadas à mão, nunca ficavam iguais dos dois lados.
 */
function louro(metal: "folha" | "ouro"): SVGElement {
  const direito = ramo();
  const esquerdo = ramo();
  esquerdo.setAttribute("transform", "translate(120 0) scale(-1 1)");
  return grupo({ class: `emb-louro emb-louro-${metal}` }, esquerdo, direito);
}

function ramo(): SVGElement {
  const g = no("g", undefined);
  const cx = 60;
  const cy = 52;
  const r = 46;
  const rad = (graus: number): number => (graus * Math.PI) / 180;
  const pontoEm = (graus: number): readonly [number, number] => [
    cx + r * Math.cos(rad(graus)),
    cy + r * Math.sin(rad(graus)),
  ];
  const tangente = (graus: number): number =>
    (Math.atan2(-Math.cos(rad(graus)), Math.sin(rad(graus))) * 180) / Math.PI;

  const [x0, y0] = pontoEm(78);
  const [x1, y1] = pontoEm(-28);
  g.appendChild(
    no("path", "emb-louro-haste", {
      d: `M${n(x0)} ${n(y0)} A${String(r)} ${String(r)} 0 0 0 ${n(x1)} ${n(y1)}`,
    }),
  );

  const folha = (x: number, y: number, rotacao: number, comprimento: number): SVGElement => {
    // A folha prende-se à haste pela base, e não pelo meio.
    const fx = x + (comprimento - 1) * Math.cos(rad(rotacao));
    const fy = y + (comprimento - 1) * Math.sin(rad(rotacao));
    return no("ellipse", "emb-folha", {
      cx: n(fx),
      cy: n(fy),
      rx: comprimento,
      ry: n(comprimento * 0.42),
      transform: `rotate(${n(rotacao)} ${n(fx)} ${n(fy)})`,
    });
  };

  for (let i = 0; i < 5; i++) {
    const graus = 68 - i * 22;
    const [x, y] = pontoEm(graus);
    g.append(folha(x, y, tangente(graus) + 42, 8), folha(x, y, tangente(graus) - 38, 6));
  }
  const [xp, yp] = pontoEm(-28);
  g.appendChild(folha(xp, yp, tangente(-28), 7));

  return g;
}

/** A fita por baixo, com as pontas dobradas — e um texto, se o houver. */
function fita(y: number, texto?: string): SVGElement {
  const g = grupo(
    { class: "emb-fita" },
    no("path", "emb-fita-ponta", { d: `M22 ${n(y + 2)} H38 V${n(y + 14)} H22 L28 ${n(y + 8)} Z` }),
    no("path", "emb-fita-ponta", { d: `M98 ${n(y + 2)} H82 V${n(y + 14)} H98 L92 ${n(y + 8)} Z` }),
    no("path", "emb-metal emb-ouro", { d: `M32 ${n(y)} H88 V${n(y + 12)} H32 Z` }),
  );
  if (texto !== undefined) g.appendChild(marca(texto, 60, y + 6.4, 14, "emb-fita-texto"));
  return g;
}

/** O texto de um emblema. Encolhe com o número de caracteres. */
function marca(texto: string, x: number, y: number, tamanho: number, classe = "emb-marca"): SVGElement {
  const t = no("text", classe, {
    x: n(x),
    y: n(y),
    "text-anchor": "middle",
    "dominant-baseline": "central",
    "font-size": n(texto.length >= 3 ? tamanho * 0.7 : tamanho),
  });
  t.textContent = texto;
  return t;
}

/** O selo redondo, no canto, com um número: «7», «30». */
function selo(texto: string, dourado: boolean): SVGElement {
  return grupo(
    { class: dourado ? "emb-selo emb-selo-ouro" : "emb-selo" },
    no("circle", "emb-selo-disco", { cx: 90, cy: 76, r: 13 }),
    marca(texto, 90, 76.5, 12, "emb-selo-texto"),
  );
}

/** O cronómetro, com o mostrador e o número nele. */
function cronometro(texto: string, metal: "ouro" | "prata"): SVGElement {
  return grupo(
    { class: `emb-cronometro emb-${metal}` },
    no("rect", "emb-metal", { x: 53, y: 18, width: 14, height: 7, rx: 2.5 }),
    no("rect", "emb-metal", { x: 57, y: 24, width: 6, height: 6 }),
    no("rect", "emb-metal", { x: 78, y: 28, width: 7, height: 5, rx: 2, transform: "rotate(45 81.5 30.5)" }),
    no("circle", "emb-metal emb-cronometro-caixa", { cx: 60, cy: 57, r: 26 }),
    no("circle", "emb-mostrador", { cx: 60, cy: 57, r: 20 }),
    no("path", "emb-mostrador-traco", { d: "M60 39.5 v4 M77.5 57 h-4 M60 74.5 v-4 M42.5 57 h4" }),
    marca(texto, 60, 58, 17),
  );
}

/** As linhas de velocidade, atrás do cronómetro. */
const velocidade = (): SVGElement =>
  no("path", "emb-velocidade", { d: "M14 48 H28 M10 57 H30 M16 66 H29" });

/** A ampulheta: os tampos, o vidro, e a areia a cair. */
function ampulheta(metal: "ouro" | "prata"): SVGElement {
  return grupo(
    { class: `emb-ampulheta emb-${metal}` },
    no("path", "emb-vidro", {
      d: "M45 26 H75 C75 41 64 47 62 54 C64 61 75 67 75 82 H45 C45 67 56 61 58 54 C56 47 45 41 45 26 Z",
    }),
    no("path", "emb-areia", { d: "M49 33 H71 C70 41 64 45 60 49 C56 45 50 41 49 33 Z" }),
    no("path", "emb-areia-fio", { d: "M60 49 V69" }),
    no("path", "emb-areia", { d: "M47 81 C48 72 55 68 60 66 C65 68 72 72 73 81 Z" }),
    no("rect", "emb-metal", { x: 40, y: 19, width: 40, height: 8, rx: 3 }),
    no("rect", "emb-metal", { x: 40, y: 81, width: 40, height: 8, rx: 3 }),
    no("rect", "emb-metal", { x: 41, y: 26, width: 4, height: 56, rx: 1.5 }),
    no("rect", "emb-metal", { x: 75, y: 26, width: 4, height: 56, rx: 1.5 }),
  );
}

/** A chama da sequência, por trás do que estiver à frente dela. */
function chama(ouro: boolean): SVGElement {
  return no("path", ouro ? "emb-chama emb-chama-ouro" : "emb-chama", {
    d:
      "M60 4 C66 15 79 19 85 32 C89 25 88 19 87 15 C98 27 102 45 97 62 " +
      "C92 78 78 89 60 89 C42 89 28 78 23 62 C18 45 22 27 33 15 C32 19 31 25 35 32 C41 19 54 15 60 4 Z",
  });
}

/** O calendário do mês, com a estrela do mês completo. */
function calendario(): SVGElement {
  return grupo(
    { class: "emb-calendario" },
    no("rect", "emb-calendario-folha", { x: 30, y: 24, width: 60, height: 60, rx: 10 }),
    no("path", "emb-calendario-faixa", { d: "M30 42 V34 a10 10 0 0 1 10 -10 H80 a10 10 0 0 1 10 10 V42 Z" }),
    no("rect", "emb-metal emb-prata", { x: 42, y: 15, width: 7, height: 16, rx: 3.5 }),
    no("rect", "emb-metal emb-prata", { x: 71, y: 15, width: 7, height: 16, rx: 3.5 }),
    estrela(60, 63, 16, "emb-estrela"),
  );
}

/** A taça da campanha perfeita. */
function taca(): SVGElement {
  return grupo(
    { class: "emb-taca emb-ouro" },
    no("path", "emb-taca-asa", { d: "M42 30 H32 C29 44 35 51 44 52" }),
    no("path", "emb-taca-asa", { d: "M78 30 H88 C91 44 85 51 76 52" }),
    no("path", "emb-metal", { d: "M40 22 H80 V36 C80 53 70 61 60 63 C50 61 40 53 40 36 Z" }),
    no("rect", "emb-metal", { x: 56, y: 62, width: 8, height: 10 }),
    no("rect", "emb-metal", { x: 45, y: 71, width: 30, height: 7, rx: 2 }),
    no("rect", "emb-taca-base", { x: 40, y: 78, width: 40, height: 9, rx: 2.5 }),
    estrela(60, 40, 10, "emb-taca-estrela"),
  );
}

/** O poço do Survival, vazio e a brilhar: o tabuleiro limpo. */
function pocoLimpo(): SVGElement {
  return grupo(
    { class: "emb-poco" },
    no("path", "emb-vidro", { d: "M34 22 V78 a10 10 0 0 0 10 10 H76 a10 10 0 0 0 10 -10 V22 Z" }),
    no("path", "emb-poco-parede", { d: "M34 22 V78 a10 10 0 0 0 10 10 H76 a10 10 0 0 0 10 -10 V22" }),
    no("path", "emb-poco-reflexo", { d: "M42 30 V70" }),
    brilho(60, 52, 13, "emb-centelha emb-centelha-clara"),
    brilho(73, 38, 6, "emb-centelha emb-centelha-clara"),
    brilho(50, 70, 5, "emb-centelha emb-centelha-clara"),
  );
}

/**
 * A bomba do Contra-Relógio, com o pavio cortado e gelado na ponta: a bomba
 * que não rebentou porque alguém não perdeu a cabeça.
 */
function bombaGelada(): SVGElement {
  // O floco: seis braços, cada um com dois raminhos.
  const floco = grupo({ class: "emb-gelo", transform: "translate(87 21)" });
  for (let i = 0; i < 6; i++) {
    floco.appendChild(
      no("path", undefined, {
        d: "M0 0 V-9 M0 -5.5 L-2.8 -8 M0 -5.5 L2.8 -8",
        transform: `rotate(${String(i * 60)})`,
      }),
    );
  }

  return grupo(
    { class: "emb-bomba-grupo" },
    no("path", "emb-pavio", { d: "M66 32 C70 22 76 20 82 23" }),
    no("circle", "emb-bomba", { cx: 54, cy: 58, r: 27 }),
    no("ellipse", "emb-bomba-brilho", { cx: 44, cy: 46, rx: 8, ry: 5, transform: "rotate(-35 44 46)" }),
    no("rect", "emb-metal emb-prata", {
      x: 58,
      y: 27,
      width: 14,
      height: 10,
      rx: 2.5,
      transform: "rotate(34 65 32)",
    }),
    floco,
    no("circle", "emb-gelo-nucleo", { cx: 87, cy: 21, r: 2.4 }),
  );
}

/**
 * Um elo de corrente entre dois dados, deitado ao longo da diagonal. Dois
 * anéis entrelaçados: a aresta por baixo, o metal por cima.
 */
function elo(x: number, y: number, rotacao: number): SVGElement {
  const anel = (dx: number): readonly SVGElement[] => [
    no("ellipse", "emb-elo-aresta", { cx: dx, cy: 0, rx: 7, ry: 4.2 }),
    no("ellipse", "emb-elo", { cx: dx, cy: 0, rx: 7, ry: 4.2 }),
  ];
  return grupo(
    { transform: `translate(${n(x)} ${n(y)}) rotate(${n(rotacao)})` },
    ...anel(-4.5),
    ...anel(4.5),
  );
}

/**
 * O poço do Survival cheio até perto da borda, com a linha de fogo por cima:
 * aguentar é isto, as linhas a subir e a pilha a não passar.
 */
function pocoCheio(): SVGElement {
  const pecas: SVGElement[] = [];
  // Quatro linhas de quatro peças, de baixo para cima, nos tons da rampa.
  const tons = [
    [4, 2, 3, 1],
    [1, 3, 4, 2],
    [3, 4, 1, 3],
    [2, 1, 3, 4],
  ];
  tons.forEach((linha, r) => {
    linha.forEach((tom, c) => {
      pecas.push(
        no("rect", `emb-peca emb-peca-${String(tom)}`, {
          x: 38 + c * 11,
          y: 75 - r * 11,
          width: 10,
          height: 10,
          rx: 2.2,
        }),
      );
    });
  });

  return grupo(
    { class: "emb-poco" },
    no("path", "emb-vidro", { d: "M34 22 V78 a10 10 0 0 0 10 10 H76 a10 10 0 0 0 10 -10 V22 Z" }),
    ...pecas,
    no("path", "emb-linha-fogo", { d: "M36 36 H84" }),
    no("path", "emb-poco-parede", { d: "M34 22 V78 a10 10 0 0 0 10 10 H76 a10 10 0 0 0 10 -10 V22" }),
  );
}

/**
 * O grupo de sete 1, como sai no tabuleiro: sete peças planas, cada uma com a
 * pinta ao centro, encostadas umas às outras numa forma que só os sete juntos
 * fazem.
 *
 * Peças e não dados, ao contrário das outras: num dado em perspetiva, as faces
 * de lado têm mais pintas do que a de cima, e o que se via eram os 2 e os 4. A
 * medalha é a jogada, e a jogada faz-se com peças.
 */
function grupoDeUns(): SVGElement {
  const lado = 19;
  const folga = 3;
  const celulas: readonly (readonly [number, number])[] = [
    [1, 0], [2, 0],
    [0, 1], [1, 1], [2, 1], [3, 1],
    [1, 2],
  ];
  const x0 = 60 - (4 * lado + 3 * folga) / 2;
  const y0 = 52 - (3 * lado + 2 * folga) / 2;

  const pecas = celulas.flatMap(([c, r]) => {
    const x = x0 + c * (lado + folga);
    const y = y0 + r * (lado + folga);
    return [
      // A espessura por baixo, e a face por cima: a peça assenta.
      no("rect", "emb-uns-base", { x: n(x), y: n(y + 2.5), width: lado, height: lado, rx: 4.5 }),
      no("rect", "emb-uns-face", { x: n(x), y: n(y), width: lado, height: lado, rx: 4.5 }),
      no("circle", "emb-uns-pinta", { cx: n(x + lado / 2), cy: n(y + lado / 2), r: 2.7 }),
    ];
  });

  return grupo({ class: "emb-uns" }, ...pecas);
}

/**
 * A vitrine do Colecionador: catorze casas em duas filas de sete, cada uma
 * com uma face — as catorze maneiras de fazer 7, guardadas como se guardam
 * medalhas.
 */
function vitrine(): SVGElement {
  const casas: SVGElement[] = [];
  const faces = [1, 6, 2, 5, 3, 4, 1, 2, 3, 1, 4, 2, 5, 1];
  faces.forEach((face, i) => {
    const x = 22 + (i % 7) * 11;
    const y = 33 + Math.floor(i / 7) * 13;
    casas.push(no("rect", "emb-casa", { x, y, width: 9, height: 9, rx: 2 }));
    for (const [px, py] of PINTAS[face] ?? []) {
      casas.push(no("circle", "emb-casa-pinta", { cx: n(x + px * 9), cy: n(y + py * 9), r: 0.95 }));
    }
  });

  return grupo(
    { class: "emb-vitrine" },
    no("rect", "emb-metal emb-ouro", { x: 14, y: 24, width: 92, height: 38, rx: 7 }),
    no("rect", "emb-vitrine-fundo", { x: 18, y: 28, width: 84, height: 30, rx: 4 }),
    ...casas,
    no("path", "emb-vitrine-reflexo", { d: "M22 30 L34 30 L24 56 L18 56 Z" }),
  );
}

/* ─── As medalhas ─────────────────────────────────────────────────────────── */

const DESENHOS: Readonly<Record<string, () => readonly SVGElement[]>> = {
  /* ── Puzzles ── */

  /** Um dado de madeira clara, e uma folha a nascer: o começo. */
  iniciado: () => [
    dado(56, 52, 31, "marfim", { topo: 1, esquerda: 2, direita: 3 }, -6),
    grupo(
      { class: "emb-folha-solta", transform: "translate(78 76) rotate(-38) scale(1.45)" },
      no("path", "emb-folha", { d: "M0 0 C4 -10 14 -14 22 -12 C20 -4 12 2 0 0 Z" }),
      no("path", "emb-folha-nervura", { d: "M2 -1 C8 -6 14 -9 20 -11" }),
    ),
  ],

  /** Dois dados de prata, um atrás do outro, e uma estrela pequena. */
  medio: () => [
    dado(44, 46, 21, "prata", { topo: 2, esquerda: 3, direita: 1 }, -14),
    dado(70, 60, 23, "prata", { topo: 5, esquerda: 4, direita: 6 }, 8),
    estrela(94, 22, 7, "emb-estrela emb-estrela-prata"),
  ],

  /** O dado de ouro, com asas: já voa. */
  avancado: () => [
    asa(43, 48, 1.05, true, "ouro"),
    asa(77, 48, 1.05, false, "ouro"),
    dado(60, 54, 27, "ouro", { topo: 1, esquerda: 6, direita: 5 }, 0),
    brilho(22, 78, 5),
    brilho(98, 24, 6),
    brilho(90, 82, 4),
  ],

  /** O escudo, a coroa por cima, e o dado de ouro ao centro. */
  perito: () => [
    escudo(false),
    coroa(60, 26, 0.95),
    dado(60, 59, 16, "ouro", { topo: 5, esquerda: 3, direita: 4 }),
  ],

  /** O dado branco com a estrela, entre louros, e a fita por baixo. */
  "primeiro-perfeito": () => [
    louro("folha"),
    dado(60, 52, 24, "branco", { topo: "estrela", esquerda: 2, direita: 3 }),
    estrela(46, 13, 4.5, "emb-estrela"),
    estrela(60, 9, 6, "emb-estrela"),
    estrela(74, 13, 4.5, "emb-estrela"),
    fita(80),
  ],

  /** O escudo de ouro, a coroa, e o dado perfeito: o Perito, sem uma falha. */
  "perito-perfeito": () => [
    louro("ouro"),
    escudo(true),
    coroa(60, 26, 0.95),
    dado(60, 59, 16, "branco", { topo: "estrela", esquerda: 2, direita: 3 }),
  ],

  /** A taça, com a estrela, e o louro de ouro à volta. */
  "campanha-perfeita": () => [
    louro("ouro"),
    taca(),
    brilho(30, 20, 5),
    brilho(92, 18, 6),
  ],

  /* ── Contra-Relógio ── */

  /** O cronómetro de prata, com uma asa e as linhas de quem corre. */
  maratona: () => [
    velocidade(),
    asa(38, 44, 0.7, true, "prata"),
    cronometro(String(LIMIARES.maratona), "prata"),
  ],

  /** A bomba com o pavio gelado: cinco que não rebentaram. */
  "sangue-frio": () => [bombaGelada(), selo(String(LIMIARES.sangueFrio), false)],

  /** Três dados presos por elos, a subir: a cadeia até ao ×3. */
  "em-cadeia": () => [
    elo(44, 58, -32),
    elo(74, 40, -32),
    dado(28, 70, 15, "branco", { topo: 1, esquerda: 2, direita: 3 }, -6),
    dado(59, 51, 15, "branco", { topo: 2, esquerda: 3, direita: 1 }, 0),
    dado(90, 32, 15, "branco", { topo: 3, esquerda: 1, direita: 2 }, 6),
    selo("×3", false),
  ],

  /** O cronómetro de ouro, entre louros. */
  recordista: () => [
    louro("ouro"),
    cronometro(`${String(LIMIARES.recordista / 1000)}k`, "ouro"),
    brilho(96, 20, 6),
  ],

  /** O cronómetro de ouro, com duas asas. */
  ultramaratona: () => [
    velocidade(),
    asa(38, 46, 0.8, true, "ouro"),
    asa(82, 46, 0.8, false, "ouro"),
    cronometro(String(LIMIARES.ultramaratona), "ouro"),
  ],

  /* ── Survival ── */

  /** A ampulheta de prata: aguentar. */
  "cinco-minutos": () => [
    ampulheta("prata"),
    selo(`${String(LIMIARES.cincoMinutosMs / 60_000)}′`, false),
  ],

  /** O poço cheio até à linha de fogo, e a pilha a aguentar. */
  aguentar: () => [pocoCheio(), selo(String(LIMIARES.aguentar), false)],

  /** A ampulheta de ouro. */
  "dez-minutos": () => [
    ampulheta("ouro"),
    selo(`${String(LIMIARES.dezMinutosMs / 60_000)}′`, true),
    brilho(26, 26, 5),
  ],

  /** O poço vazio, a brilhar, dez vezes. */
  "dez-limpezas": () => [pocoLimpo(), selo(String(LIMIARES.limpezas), true)],

  /* ── Desafio do Dia ── */

  /** A chama da sequência, e o dado à frente dela. */
  semana: () => [
    chama(false),
    dado(60, 57, 22, "branco", { topo: 1, esquerda: 2, direita: 3 }),
    selo(String(LIMIARES.semana), false),
  ],

  /** O calendário, com a estrela. */
  "mes-completo": () => [calendario()],

  /** A chama de ouro: trinta dias seguidos. */
  "trinta-dias": () => [
    chama(true),
    dado(60, 57, 22, "branco", { topo: 1, esquerda: 2, direita: 3 }),
    selo(String(LIMIARES.trintaDias), true),
  ],

  /** A chama de ouro, a coroa, e a fita dos cem. */
  "cem-dias": () => [
    chama(true),
    dado(60, 54, 20, "branco", { topo: 1, esquerda: 2, direita: 3 }),
    coroa(60, 28, 0.8),
    fita(78, String(LIMIARES.cemDias)),
  ],

  /* ── O sete ── */

  /** Sete peças de uma pinta, encostadas como no tabuleiro: o maior grupo que existe. */
  "sete-uns": () => [grupoDeUns(), brilho(16, 20, 5), brilho(102, 80, 5)],

  /** A vitrine das catorze composições, com a fita. */
  colecionador: () => [
    vitrine(),
    fita(70, "14"),
    brilho(14, 16, 5),
    brilho(104, 20, 6),
  ],

  /**
   * O dado de ouro com a estrela, a coroa e os louros: todas as normais. As
   * duas faces do lado somam 7.
   */
  mestre: () => [
    louro("ouro"),
    dado(60, 58, 23, "ouro", { topo: "estrela", esquerda: 6, direita: 1 }),
    coroa(60, 27, 0.9),
    brilho(24, 22, 5),
    brilho(96, 22, 5),
  ],
};

/**
 * O emblema de uma medalha, pelo id. Uma medalha sem desenho — uma que se
 * acrescente ao catálogo antes de o ter — leva um dado branco, e não um buraco.
 *
 * `ganha` acende o halo por trás; o resto do desenho é o mesmo, ganha ou não —
 * é o cartão à volta que diz o estado.
 */
export function emblema(id: string, ganha: boolean, premium: boolean): SVGElement {
  garantirDefinicoes();

  const svg = no("svg", "emblema", { viewBox: "0 0 120 100", "aria-hidden": "true" });
  const proprio = DESENHOS[id];
  svg.dataset["desenho"] = proprio === undefined ? "generico" : id;

  if (ganha) svg.appendChild(halo(premium));

  const desenho =
    proprio ?? ((): readonly SVGElement[] => [dado(60, 52, 24, "branco", { topo: 1, esquerda: 2, direita: 3 })]);
  for (const parte of desenho()) svg.appendChild(parte);

  return svg;
}
