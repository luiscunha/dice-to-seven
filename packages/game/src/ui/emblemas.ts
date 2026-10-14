/**
 * Os emblemas das medalhas, em SVG.
 *
 * **Uma forma por modo, e o dado no centro de quase todas.** O dado é a peça do
 * jogo vista de lado — um cubo com o número na face de cima — e é o que diz a
 * quem abre a página que estas medalhas são deste jogo. O Contra-Relógio leva o
 * cronómetro, o Survival o poço onde as linhas caem, e o Desafio do Dia a chama
 * da sequência por trás do dado: as mesmas figuras dos ícones dos modos, aqui
 * em ponto grande.
 *
 * **As cores são todas do tema**, por classe: o emblema não escreve um hex. É o
 * que o deixa mudar de tema com o resto, e esmorecer de uma vez quando a
 * medalha está por ganhar — um filtro no cartão, e não um segundo desenho.
 *
 * As **folhas de louro** só nas ganhas: são a diferença entre uma meta e um
 * prémio, e é a primeira coisa que o olho distingue na grelha.
 */

import type { Emblema } from "../session/medalhas";

const NS = "http://www.w3.org/2000/svg";

type Atributos = Readonly<Record<string, string | number>>;

function no(tag: string, classe: string | undefined, atributos: Atributos): SVGElement {
  const el = document.createElementNS(NS, tag);
  if (classe !== undefined) el.setAttribute("class", classe);
  for (const [k, v] of Object.entries(atributos)) el.setAttribute(k, String(v));
  return el;
}

/**
 * O texto do emblema. Encolhe com o número de caracteres: «7», «30», «100» e
 * «30k» têm de caber no mesmo sítio.
 */
function marca(texto: string, x: number, y: number, tamanho: number): SVGElement {
  const t = no("text", "emblema-marca", {
    x,
    y,
    "text-anchor": "middle",
    "dominant-baseline": "central",
    "font-size": texto.length >= 3 ? tamanho * 0.72 : tamanho,
  });
  t.textContent = texto;
  return t;
}

/* ─── As formas ───────────────────────────────────────────────────────────── */

/**
 * O dado em perspetiva: três losangos, a face de cima com a marca e as duas de
 * lado com pintas — duas e três, como num dado a sério visto do canto.
 *
 * O contorno é um hexágono à parte, por trás, com as juntas redondas: arredonda
 * os cantos do cubo sem cada face ter de pintar uma borda que pisaria a do lado.
 */
function dado(texto: string, estrela: boolean, cy = 52): SVGElement[] {
  const y = (v: number): number => v + cy - 52;
  const ponto = (x: number, v: number): string => `${String(x)} ${String(y(v))}`;

  const topo = `M${ponto(60, 18)} L${ponto(90, 35)} L${ponto(60, 52)} L${ponto(30, 35)} Z`;
  const esquerda = `M${ponto(30, 35)} L${ponto(60, 52)} L${ponto(60, 86)} L${ponto(30, 69)} Z`;
  const direita = `M${ponto(60, 52)} L${ponto(90, 35)} L${ponto(90, 69)} L${ponto(60, 86)} Z`;
  const contorno = `M${ponto(60, 18)} L${ponto(90, 35)} L${ponto(90, 69)} L${ponto(60, 86)} L${ponto(30, 69)} L${ponto(30, 35)} Z`;

  const pinta = (cx: number, v: number): SVGElement =>
    no("circle", "emblema-pinta", { cx, cy: y(v), r: 3.4 });

  /*
   * As pintas vão na diagonal de cada face, como num dado visto do canto. As
   * posições são as da face plana — um quarto, metade, três quartos —, levadas
   * para o losango: a face da esquerda desce para a direita, a da direita sobe.
   */
  const lados = estrela
    ? [estrelaEm(75, y(60.5), 9)]
    : [pinta(67.5, 56.25), pinta(75, 60.5), pinta(82.5, 64.75)];

  return [
    no("path", "emblema-dado-contorno", { d: contorno }),
    no("path", "emblema-dado-esquerda", { d: esquerda }),
    no("path", "emblema-dado-direita", { d: direita }),
    no("path", "emblema-dado-topo", { d: topo }),
    no("path", "emblema-dado-aresta", {
      d: `M${ponto(30, 35)} L${ponto(60, 52)} L${ponto(90, 35)} M${ponto(60, 52)} L${ponto(60, 86)}`,
    }),
    pinta(39, 50.5),
    pinta(51, 70.5),
    ...lados,
    marca(texto, 60, y(35.5), 17),
  ];
}

/** Uma estrela de cinco pontas, centrada em `(cx, cy)`. */
function estrelaEm(cx: number, cy: number, r: number): SVGElement {
  const pontos: string[] = [];
  for (let i = 0; i < 10; i++) {
    const raio = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pontos.push(`${(cx + raio * Math.cos(a)).toFixed(2)},${(cy + raio * Math.sin(a)).toFixed(2)}`);
  }
  return no("polygon", "emblema-estrela", { points: pontos.join(" ") });
}

/** O cronómetro: o mostrador com o número, a coroa, e o botão de lado. */
function relogio(texto: string): SVGElement[] {
  return [
    no("rect", "emblema-relogio-coroa", { x: 52, y: 10, width: 16, height: 8, rx: 3 }),
    no("rect", "emblema-relogio-coroa", { x: 57, y: 16, width: 6, height: 9 }),
    no("path", "emblema-relogio-botao", { d: "M82 27 l6 -6" }),
    no("circle", "emblema-relogio-mostrador", { cx: 60, cy: 56, r: 30 }),
    no("path", "emblema-relogio-traco", { d: "M60 31 v5 M85 56 h-5 M60 81 v-5 M35 56 h5" }),
    marca(texto, 60, 57, 22),
  ];
}

/**
 * O poço do Survival: as paredes, as linhas que já caíram em baixo — nas cores
 * das faces —, e o número por cima delas, no espaço que ainda sobra.
 */
function poco(texto: string): SVGElement[] {
  const pecas: SVGElement[] = [];
  const filas: readonly (readonly number[])[] = [
    [5, 3, 6, 2],
    [2, 4, 1, 5],
  ];
  filas.forEach((fila, i) => {
    fila.forEach((face, c) => {
      pecas.push(
        no("rect", `emblema-peca face-${String(face)}`, {
          x: 37 + c * 12, y: 74 - i * 12, width: 10.5, height: 10.5, rx: 2.4,
        }),
      );
    });
  });

  return [
    no("rect", "emblema-poco-fundo", { x: 32, y: 14, width: 56, height: 74, rx: 9 }),
    ...pecas,
    no("path", "emblema-poco-parede", { d: "M32 14 V79 a9 9 0 0 0 9 9 H79 a9 9 0 0 0 9 -9 V14" }),
    marca(texto, 60, 40, 22),
  ];
}

/**
 * A chama da sequência por trás do dado — o 🔥 do desafio, desenhado. Duas
 * camadas, a de fora e a de dentro, porque uma chama de uma cor só é uma gota.
 */
function chama(texto: string): SVGElement[] {
  return [
    no("path", "emblema-chama-fora", {
      d: "M60 2 C66 14 80 18 86 32 C90 24 88 18 87 14 C99 26 104 44 98 62 C93 78 78 90 60 90 C42 90 27 78 22 62 C16 44 21 26 33 14 C32 18 30 24 34 32 C40 18 54 14 60 2 Z",
    }),
    no("path", "emblema-chama-dentro", {
      d: "M60 18 C64 28 76 32 79 44 C83 60 74 78 60 80 C46 78 37 60 41 44 C44 32 56 28 60 18 Z",
    }),
    ...dado(texto, false, 58),
  ];
}

/** O calendário: a folha, a faixa de cima com as argolas, e a marca no meio. */
function calendario(texto: string): SVGElement[] {
  return [
    no("rect", "emblema-calendario-folha", { x: 28, y: 20, width: 64, height: 64, rx: 10 }),
    no("path", "emblema-calendario-faixa", { d: "M28 38 V30 a10 10 0 0 1 10 -10 H82 a10 10 0 0 1 10 10 V38 Z" }),
    no("rect", "emblema-calendario-argola", { x: 42, y: 12, width: 6, height: 16, rx: 3 }),
    no("rect", "emblema-calendario-argola", { x: 72, y: 12, width: 6, height: 16, rx: 3 }),
    ...(texto === "★" ? [estrelaEm(60, 61, 17)] : [marca(texto, 60, 61, 24)]),
  ];
}

/* ─── O louro ─────────────────────────────────────────────────────────────── */

/**
 * Dois ramos de louro, um de cada lado, a abraçar a forma por baixo.
 *
 * As folhas calculam-se ao longo de um arco, e o ramo da direita é o da
 * esquerda ao espelho: desenhadas à mão, as dez folhas nunca ficavam iguais dos
 * dois lados.
 */
function louro(): SVGElement {
  const g = no("g", "emblema-louro", {});
  const direito = ramo();
  const esquerdo = ramo();
  esquerdo.setAttribute("transform", "translate(120 0) scale(-1 1)");
  g.append(esquerdo, direito);
  return g;
}

/**
 * O ramo da direita: uma haste em arco, do pé (em baixo, junto ao meio) até à
 * ponta (à altura do topo do emblema), e as folhas aos pares ao longo dela — a
 * de fora maior, a de dentro mais pequena, para não pisar o emblema.
 */
function ramo(): SVGElement {
  const g = no("g", undefined, {});
  const cx = 60;
  const cy = 50;
  const r = 47;
  const rad = (graus: number): number => (graus * Math.PI) / 180;
  const pontoEm = (graus: number): readonly [number, number] => [
    cx + r * Math.cos(rad(graus)),
    cy + r * Math.sin(rad(graus)),
  ];

  const [x0, y0] = pontoEm(80);
  const [x1, y1] = pontoEm(-30);
  g.appendChild(
    no("path", "emblema-louro-haste", {
      d: `M${x0.toFixed(2)} ${y0.toFixed(2)} A${String(r)} ${String(r)} 0 0 0 ${x1.toFixed(2)} ${y1.toFixed(2)}`,
    }),
  );

  const folha = (x: number, y: number, rotacao: number, comprimento: number): SVGElement => {
    // A folha prende-se à haste pela base, e não pelo meio.
    const cxF = x + (comprimento - 1) * Math.cos(rad(rotacao));
    const cyF = y + (comprimento - 1) * Math.sin(rad(rotacao));
    return no("ellipse", "emblema-folha", {
      cx: cxF.toFixed(2),
      cy: cyF.toFixed(2),
      rx: comprimento,
      ry: (comprimento * 0.42).toFixed(2),
      transform: `rotate(${rotacao.toFixed(1)} ${cxF.toFixed(2)} ${cyF.toFixed(2)})`,
    });
  };

  for (let i = 0; i < 5; i++) {
    const graus = 70 - i * 22;
    const a = rad(graus);
    const [x, y] = pontoEm(graus);
    // A direção da haste a subir, em graus: a tangente ao arco.
    const tangente = (Math.atan2(-Math.cos(a), Math.sin(a)) * 180) / Math.PI;
    g.append(folha(x, y, tangente + 42, 8), folha(x, y, tangente - 38, 6));
  }

  const [xp, yp] = pontoEm(-30);
  const ponta = (Math.atan2(-Math.cos(rad(-30)), Math.sin(rad(-30))) * 180) / Math.PI;
  g.appendChild(folha(xp, yp, ponta, 7));

  return g;
}

/* ─── O emblema ───────────────────────────────────────────────────────────── */

/**
 * O emblema de uma medalha. `alvo` escreve-se quando o emblema não traz marca
 * própria — o tamanho de um capítulo.
 */
export function emblema(e: Emblema, alvo: number, ganha: boolean): SVGElement {
  const svg = no("svg", "emblema", { viewBox: "0 0 120 96", "aria-hidden": "true" });
  svg.dataset["forma"] = e.forma;

  const texto = e.marca ?? String(alvo);
  const partes =
    e.forma === "relogio"
      ? relogio(texto)
      : e.forma === "poco"
        ? poco(texto)
        : e.forma === "chama"
          ? chama(texto)
          : e.forma === "calendario"
            ? calendario(texto)
            : dado(texto, e.estrela === true);

  if (ganha) svg.appendChild(louro());
  for (const p of partes) svg.appendChild(p);

  return svg;
}
