/**
 * As imagens das lojas — as capturas com a frase, e o gráfico de destaque — e
 * as do Instagram.
 *
 * Fotografa a vitrine do jogo (`packages/game/vitrine/`) com o Chrome em modo
 * headless, ao píxel exato de cada loja, e deixa os PNG em `loja/` — fora do
 * Git, porque se refazem a qualquer momento. As do Instagram vão para
 * `instagram/`, e só com `--so instagram`.
 *
 *   pnpm dev                                    # noutro terminal: o servidor do jogo
 *   node capturas.mjs                           # daqui, com o servidor em localhost:5173
 *   node capturas.mjs --so iphone --lang pt     # só uma parte
 *   node capturas.mjs --so instagram            # as capas dos destaques e as publicações
 *
 * Fala com o Chrome pelo protocolo de depuração (DevTools Protocol), e não
 * pela linha de comandos do `--screenshot`: esse fotografa no fim do
 * carregamento, antes de o jogo montar o ecrã e de as jogadas assentarem. Aqui
 * espera-se pelo `window.__pronto` que a vitrine levanta quando está pronta.
 *
 * Não entra no build: as imagens mudam quando o jogo muda de aspeto, e
 * gerá-las a cada compilação seria pagar todos os dias por isso.
 */

import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { crc32, deflateSync, inflateSync } from "node:zlib";

const AQUI = dirname(fileURLToPath(import.meta.url));
const SAIDA = join(AQUI, "loja");
const VITRINE = join(AQUI, "../game/vitrine/vitrine.html").replace(/\\/g, "/");
const SAIDA_INSTAGRAM = join(AQUI, "instagram");
const VITRINE_INSTAGRAM = join(AQUI, "../game/vitrine/instagram.html").replace(/\\/g, "/");
const SERVIDOR = process.env.SERVIDOR ?? "http://localhost:5173";
const CHROME =
  process.env.CHROME ??
  (process.platform === "win32"
    ? "C:/Program Files/Google/Chrome/Application/chrome.exe"
    : "google-chrome");

/** Os mesmos formatos da `vitrine.ts`: o tamanho em píxeis CSS e a escala. */
const FORMATOS = {
  play: { largura: 360, altura: 640, escala: 3 },
  iphone: { largura: 440, altura: 956, escala: 3 },
  ipad: { largura: 1032, altura: 1376, escala: 2 },
  destaque: { largura: 512, altura: 250, escala: 2 },
};
const ECRAS = ["nivel", "capitulo", "tempo", "survival", "desafio", "medalhas"];
const LINGUAS = ["en", "pt", "es", "fr"];

/* ─── O ícone da Play ─────────────────────────────────────────────────────── */

/**
 * O ícone de 512 da marca, em PNG de 32 bits, que é o que a Play pede.
 *
 * O `icone-512.png` é RGB, sem canal alfa: o Chrome escreve-o assim porque a
 * imagem é toda opaca. O desenho é o mesmo; aqui só se acrescenta o canal alfa
 * (opaco em todo o lado). Lê-se o PNG à mão — cabeçalho, dados, filtros —
 * porque é uma vez por ano e não vale uma dependência.
 */
function iconeDe32Bits(origem, destino) {
  const png = readFileSync(origem);
  let largura = 0;
  let altura = 0;
  let tipo = 0;
  const dados = [];
  for (let i = 8; i < png.length; ) {
    const tamanho = png.readUInt32BE(i);
    const nome = png.toString("ascii", i + 4, i + 8);
    const corpo = png.subarray(i + 8, i + 8 + tamanho);
    if (nome === "IHDR") {
      largura = corpo.readUInt32BE(0);
      altura = corpo.readUInt32BE(4);
      if (corpo[8] !== 8) throw new Error("o ícone não é de 8 bits por canal");
      tipo = corpo[9];
    }
    if (nome === "IDAT") dados.push(corpo);
    i += 12 + tamanho;
  }
  if (tipo === 6) {
    writeFileSync(destino, png);
    return;
  }
  if (tipo !== 2) throw new Error(`tipo de cor ${String(tipo)} inesperado no ícone`);

  // Desfazer os filtros de cada linha (PNG §9), três bytes por píxel.
  const bruto = inflateSync(Buffer.concat(dados));
  const bpp = 3;
  const linha = largura * bpp;
  const rgb = Buffer.alloc(linha * altura);
  for (let y = 0; y < altura; y++) {
    const filtro = bruto[y * (linha + 1)];
    for (let x = 0; x < linha; x++) {
      const v = bruto[y * (linha + 1) + 1 + x];
      const a = x >= bpp ? rgb[y * linha + x - bpp] : 0;
      const b = y > 0 ? rgb[(y - 1) * linha + x] : 0;
      const c = x >= bpp && y > 0 ? rgb[(y - 1) * linha + x - bpp] : 0;
      const p = a + b - c;
      const [pa, pb, pc] = [Math.abs(p - a), Math.abs(p - b), Math.abs(p - c)];
      const paeth = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      const previsto = [0, a, b, (a + b) >> 1, paeth][filtro];
      rgb[y * linha + x] = (v + previsto) & 0xff;
    }
  }

  // RGBA, sem filtros, opaco.
  const rgba = Buffer.alloc((largura * 4 + 1) * altura);
  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      const o = y * (largura * 4 + 1) + 1 + x * 4;
      rgb.copy(rgba, o, y * linha + x * 3, y * linha + x * 3 + 3);
      rgba[o + 3] = 0xff;
    }
  }

  const pedaco = (nome, corpo) => {
    const cabeca = Buffer.alloc(8);
    cabeca.writeUInt32BE(corpo.length, 0);
    cabeca.write(nome, 4, "ascii");
    const cauda = Buffer.alloc(4);
    cauda.writeUInt32BE(crc32(Buffer.concat([cabeca.subarray(4), corpo])) >>> 0, 0);
    return Buffer.concat([cabeca, corpo, cauda]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largura, 0);
  ihdr.writeUInt32BE(altura, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  writeFileSync(
    destino,
    Buffer.concat([
      png.subarray(0, 8),
      pedaco("IHDR", ihdr),
      pedaco("IDAT", deflateSync(rgba)),
      pedaco("IEND", Buffer.alloc(0)),
    ]),
  );
}

/* ─── Os argumentos ───────────────────────────────────────────────────────── */

const argumento = (nome) => {
  const i = process.argv.indexOf(`--${nome}`);
  return i < 0 ? undefined : process.argv[i + 1];
};
const so = argumento("so");
const soLingua = argumento("lang");
const soEcra = argumento("ecra");

/* ─── O Chrome ────────────────────────────────────────────────────────────── */

const PORTA = 9333;
const perfil = mkdtempSync(join(tmpdir(), "dicetoseven-capturas-"));
const chrome = spawn(
  CHROME,
  [
    "--headless=new",
    `--remote-debugging-port=${PORTA}`,
    `--user-data-dir=${perfil}`,
    "--hide-scrollbars",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ],
  { stdio: "ignore" },
);

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/** O endereço do separador, quando o Chrome já estiver a ouvir. */
async function separador() {
  for (let i = 0; i < 100; i++) {
    try {
      const lista = await (await fetch(`http://127.0.0.1:${PORTA}/json`)).json();
      const pagina = lista.find((t) => t.type === "page");
      if (pagina !== undefined) return pagina.webSocketDebuggerUrl;
    } catch {
      // ainda a arrancar
    }
    await esperar(100);
  }
  throw new Error("o Chrome não arrancou");
}

const ws = new WebSocket(await separador());
await new Promise((r) => ws.addEventListener("open", r, { once: true }));

let proximo = 0;
const pendentes = new Map();
ws.addEventListener("message", (e) => {
  const msg = JSON.parse(String(e.data));
  const p = pendentes.get(msg.id);
  if (p === undefined) return;
  pendentes.delete(msg.id);
  if (msg.error !== undefined) p.rejeitar(new Error(msg.error.message));
  else p.resolver(msg.result);
});

/** Um comando do protocolo, e a resposta dele. */
const cdp = (metodo, params = {}) =>
  new Promise((resolver, rejeitar) => {
    const id = ++proximo;
    pendentes.set(id, { resolver, rejeitar });
    ws.send(JSON.stringify({ id, method: metodo, params }));
  });

/* ─── Fotografar ──────────────────────────────────────────────────────────── */

/** Abre uma página da vitrine ao tamanho dado, e espera que ela diga que está pronta. */
async function abrir(url, f) {
  await cdp("Emulation.setDeviceMetricsOverride", {
    width: f.largura,
    height: f.altura,
    deviceScaleFactor: f.escala,
    mobile: false,
  });
  await cdp("Page.navigate", { url });

  for (let i = 0; i < 300; i++) {
    const { result } = await cdp("Runtime.evaluate", { expression: "window.__pronto === true" });
    if (result.value === true) return;
    await esperar(100);
  }
  throw new Error(`a vitrine não ficou pronta: ${url}`);
}

async function guardar(ficheiro, raiz) {
  const { data } = await cdp("Page.captureScreenshot", { format: "png" });
  mkdirSync(dirname(ficheiro), { recursive: true });
  writeFileSync(ficheiro, Buffer.from(data, "base64"));
  console.log(`  ${ficheiro.slice(raiz.length + 1)}`);
}

async function fotografar(formato, query, ficheiro) {
  await abrir(`${SERVIDOR}/@fs/${VITRINE}?formato=${formato}&${query}`, FORMATOS[formato]);
  await guardar(ficheiro, SAIDA);
}

/**
 * As imagens do Instagram. A lista do que há é a da própria página
 * (`instagram.ts`), lida de `window.__instagram`: aqui não há outra.
 */
async function instagram() {
  const pagina = `${SERVIDOR}/@fs/${VITRINE_INSTAGRAM}`;
  await abrir(pagina, { largura: 360, altura: 360, escala: 1 });
  const { result } = await cdp("Runtime.evaluate", {
    expression: "JSON.stringify(window.__instagram)",
  });
  const { formatos, pecas } = JSON.parse(result.value);

  for (const p of pecas) {
    const linguas = p.comLingua ? ["en", "pt"] : [undefined];
    for (const lingua of linguas) {
      if (soLingua !== undefined && lingua !== undefined && soLingua !== lingua) continue;
      const query = [`peca=${p.peca}`, p.query, lingua === undefined ? "" : `lang=${lingua}`]
        .filter((q) => q !== "")
        .join("&");
      await abrir(`${pagina}?${query}`, formatos[p.formato]);
      await guardar(join(SAIDA_INSTAGRAM, lingua ?? "", p.ficheiro), SAIDA_INSTAGRAM);
    }
  }
}

try {
  await cdp("Page.enable");

  if (so === "instagram") {
    await instagram();
  } else {
    mkdirSync(SAIDA, { recursive: true });
    iconeDe32Bits(join(AQUI, "../game/public/marca/icone-512.png"), join(SAIDA, "play-icone-512.png"));
    console.log("  play-icone-512.png");
  }

  for (const formato of Object.keys(FORMATOS)) {
    if (so !== undefined && so !== formato) continue;

    if (formato === "destaque") {
      await fotografar(formato, "", join(SAIDA, "play-destaque-1024x500.png"));
      continue;
    }

    const { largura, altura, escala } = FORMATOS[formato];
    const tamanho = `${String(largura * escala)}x${String(altura * escala)}`;
    for (const lingua of LINGUAS) {
      if (soLingua !== undefined && soLingua !== lingua) continue;
      for (const [i, ecra] of ECRAS.entries()) {
        if (soEcra !== undefined && soEcra !== ecra) continue;
        const nome = `${String(i + 1).padStart(2, "0")}-${ecra}.png`;
        await fotografar(formato, `ecra=${ecra}&lang=${lingua}`, join(SAIDA, `${formato}-${tamanho}`, lingua, nome));
      }
    }
  }
} finally {
  ws.close();
  chrome.kill();
  await esperar(500);
  rmSync(perfil, { recursive: true, force: true });
}
