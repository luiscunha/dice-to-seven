/**
 * Os ícones do lançador Android, a partir da marca.
 *
 * Corre-se à mão quando a marca mudar — `node icones.mjs` daqui — e as páginas
 * que deixa fotografam-se com o Chrome em modo headless. Não entra no build:
 * ícones mudam uma vez por ano, e gerá-los a cada compilação seria pagar todos
 * os dias por isso.
 *
 * Duas familias, e a diferenca nao e cosmetica:
 *
 * - Legado (mipmap-DPI/ic_launcher.png): o icone inteiro, com fundo. E o que o
 *   Android 7 e anteriores mostram.
 * - Adaptativo (ic_launcher_foreground): so a marca, em transparente, e o fundo
 *   e uma cor a parte. O Android 8+ recorta-o a forma que o fabricante escolher
 *   — circulo, quadrado, gota — e corta os 33% de fora. Por isso o cubo aqui vai
 *   mais pequeno: o que estiver fora da zona segura desaparece em metade dos
 *   telefones.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const MARCA = "../game/public/marca/icone-app.svg";
const svg = readFileSync(MARCA, "utf8");

/** O fundo da marca. Vai para o ic_launcher_background como cor solida. */
const PAPEL = "#f1f2f0";

/** Sem o retangulo de fundo, e com o cubo na zona segura do icone adaptativo. */
const frente = svg
  .replace(`<rect width="1024" height="1024" fill="${PAPEL}"/>`, "")
  .replace("translate(512 512) scale(2.7)", "translate(512 512) scale(1.62)");

if (frente === svg) {
  throw new Error("a marca mudou de forma: as substituicoes nao apanharam nada");
}

/** Uma pagina do tamanho exato, sem margens, para o Chrome fotografar. */
const pagina = (conteudo, lado) =>
  `<!doctype html><meta charset="utf-8">` +
  `<style>html,body{margin:0;padding:0;background:transparent}` +
  `svg{display:block;width:${lado}px;height:${lado}px}</style>${conteudo}`;

const BASE = "scratch-icones";
mkdirSync(BASE, { recursive: true });

/** As cinco densidades do Android, em pixeis por lado. */
const DENSIDADES = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };

const trabalhos = [];
for (const [dpi, lado] of Object.entries(DENSIDADES)) {
  trabalhos.push({ nome: `ic_launcher-${dpi}`, html: pagina(svg, lado), lado });

  // O adaptativo mede 108dp de lado, dos quais so os 72 do meio se veem.
  const ladoAdapt = Math.round((lado * 108) / 48);
  trabalhos.push({
    nome: `ic_launcher_foreground-${dpi}`,
    html: pagina(frente, ladoAdapt),
    lado: ladoAdapt,
  });
}

for (const t of trabalhos) writeFileSync(`${BASE}/${t.nome}.html`, t.html);

writeFileSync(
  `${BASE}/lista.json`,
  JSON.stringify(
    trabalhos.map(({ nome, lado }) => ({ nome, lado })),
    null,
    2,
  ),
);

console.log(trabalhos.length, "paginas escritas em", BASE);
