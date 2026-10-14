/**
 * Os ícones e os ecrãs de arranque do Android e do iOS, a partir da marca.
 *
 * Corre-se à mão quando a marca mudar — `node icones.mjs` daqui — e as páginas
 * que deixa fotografam-se com o Chrome em modo headless, uma a uma, com o lado
 * que vem em `lista.json`:
 *
 *   chrome --headless=new --hide-scrollbars --force-device-scale-factor=1 \
 *     --default-background-color=00000000 --window-size=LADO,LADO \
 *     --screenshot=NOME.png file:///…/scratch-icones/NOME.html
 *
 * O Chrome escreve RGB quando a página é toda opaca e RGBA quando não é — e é
 * isso que cada destino precisa. Não entra no build: ícones mudam uma vez por
 * ano, e gerá-los a cada compilação seria pagar todos os dias por isso.
 *
 * No Android, duas familias, e a diferenca nao e cosmetica:
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

  /*
   * O arranque do Android: 288dp, dos quais o sistema mostra o círculo de 192
   * do meio. É a proporção do adaptativo — 72 em 108 —, portanto serve a mesma
   * frente, só que seis vezes os 48dp do ícone.
   */
  trabalhos.push({
    nome: `splash_icon-${dpi}`,
    html: pagina(frente, lado * 6),
    lado: lado * 6,
  });
}

/*
 * iOS: um só ícone de 1024 — o sistema faz os outros tamanhos — e **opaco**: a
 * App Store recusa um ícone com canal alfa. Leva também a variante escura, que
 * o iOS 18+ mostra quando o ecrã principal está em modo escuro e os anteriores
 * ignoram.
 */
const escuro = readFileSync("../game/public/marca/icone-app-escuro.svg", "utf8");
trabalhos.push({ nome: "ios-AppIcon", html: pagina(svg, 1024), lado: 1024 });
trabalhos.push({ nome: "ios-AppIcon-escuro", html: pagina(escuro, 1024), lado: 1024 });

/*
 * O arranque do iOS: o símbolo ao centro de um quadrado de 2732, no fundo de
 * cada tema (`--ground` do theme.css), para o arranque passar ao jogo sem um
 * clarão.
 *
 * O LaunchScreen.storyboard mostra-o em scaleAspectFill, portanto recorta-o:
 * num iPhone ao alto só se vê a faixa do meio, menos de metade da largura. Os
 * 400px dão um cubo com cerca de um quarto da largura do telefone, e um sexto
 * da de um iPad — medido com `object-fit: cover` num ecrã de 393×852.
 */
const simbolo = readFileSync("../game/public/marca/icone.svg", "utf8");
const ARRANQUE = 2732;
const SIMBOLO = 400;
const paginaArranque = (fundo) =>
  `<!doctype html><meta charset="utf-8">` +
  `<style>html,body{margin:0;padding:0;background:${fundo}}` +
  `body{width:${ARRANQUE}px;height:${ARRANQUE}px;display:grid;place-items:center}` +
  `svg{display:block;width:${SIMBOLO}px;height:${SIMBOLO}px}</style>${simbolo}`;
trabalhos.push({ nome: "ios-Splash", html: paginaArranque(PAPEL), lado: ARRANQUE });
trabalhos.push({ nome: "ios-Splash-escuro", html: paginaArranque("#0d1917"), lado: ARRANQUE });

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
