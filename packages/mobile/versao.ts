/**
 * A versão da aplicação, numa fonte só: a `version` do `package.json` deste
 * pacote.
 *
 * Vivia em três sítios que ninguém ligava — `versionCode` e `versionName` no
 * `build.gradle`, e `MARKETING_VERSION` no `project.pbxproj`, em duas
 * configurações. Este script escreve-a nos dois projetos, e um teste
 * (`test/versao.test.ts`) falha se alguém mudar a versão e se esquecer de o
 * correr.
 *
 *   pnpm versao      # depois de mudar a `version` do package.json
 *
 * ── O `versionCode` do Android sai da versão ──
 *
 * A Play recusa dois envios com o mesmo `versionCode`, e cada um tem de ser
 * maior do que o anterior. Em vez de ser mais um número a lembrar de subir,
 * deduz-se: `1.2.3` → `10203`. A regra é então a de sempre — **cada pacote
 * enviado para a loja leva uma versão nova**, nem que seja só o último número
 * (`1.0.1`, `1.0.2` durante o teste fechado). Por isso nenhuma das partes passa
 * de 99.
 *
 * O número de build do iOS (`CURRENT_PROJECT_VERSION`) não entra aqui: é o
 * número da execução do GitHub, que o `ios.yml` passa ao `xcodebuild`.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export interface Versao {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
}

/** `1.2.3`, e só isso: três números, o segundo e o terceiro abaixo de 100. */
export function lerVersao(texto: string): Versao {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(texto);
  if (m === null) throw new Error(`a versão tem de ser x.y.z, e é «${texto}»`);

  const [major, minor, patch] = [m[1], m[2], m[3]].map(Number) as [number, number, number];
  if (minor > 99 || patch > 99) {
    throw new Error(`o segundo e o terceiro números da versão não passam de 99: «${texto}»`);
  }
  if (major < 1) throw new Error(`a primeira versão publicada é a 1.0.0, e esta é «${texto}»`);

  return { major, minor, patch };
}

export const nomeDaVersao = (v: Versao): string =>
  `${String(v.major)}.${String(v.minor)}.${String(v.patch)}`;

/** `1.2.3` → `10203`. Sobe sempre que a versão sobe. */
export const versionCode = (v: Versao): number => v.major * 10_000 + v.minor * 100 + v.patch;

/** Troca exatamente uma ocorrência; mais ou menos do que isso é um projeto que mudou de forma. */
function trocarUma(texto: string, padrao: RegExp, novo: string, onde: string): string {
  const n = texto.match(new RegExp(padrao.source, "g"))?.length ?? 0;
  if (n !== 1) throw new Error(`${onde}: esperava uma ocorrência de ${String(padrao)}, há ${String(n)}`);
  return texto.replace(padrao, novo);
}

/** O `build.gradle` da aplicação, com a versão escrita. */
export function escreverNoGradle(gradle: string, v: Versao): string {
  const comCodigo = trocarUma(gradle, /versionCode \d+/, `versionCode ${String(versionCode(v))}`, "build.gradle");
  return trocarUma(comCodigo, /versionName "[^"]*"/, `versionName "${nomeDaVersao(v)}"`, "build.gradle");
}

/** O `project.pbxproj`, com a versão nas duas configurações (Debug e Release). */
export function escreverNoXcode(pbxproj: string, v: Versao): string {
  const padrao = /MARKETING_VERSION = [^;]+;/g;
  const n = pbxproj.match(padrao)?.length ?? 0;
  if (n !== 2) throw new Error(`project.pbxproj: esperava duas MARKETING_VERSION, há ${String(n)}`);
  return pbxproj.replace(padrao, `MARKETING_VERSION = ${nomeDaVersao(v)};`);
}

export const CAMINHOS = {
  pacote: new URL("./package.json", import.meta.url),
  gradle: new URL("./android/app/build.gradle", import.meta.url),
  xcode: new URL("./ios/App/App.xcodeproj/project.pbxproj", import.meta.url),
} as const;

export const versaoDoPacote = (): Versao =>
  lerVersao((JSON.parse(readFileSync(CAMINHOS.pacote, "utf8")) as { version: string }).version);

// Corrido diretamente (`pnpm versao`), escreve. Importado pelos testes, não.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const v = versaoDoPacote();
  writeFileSync(CAMINHOS.gradle, escreverNoGradle(readFileSync(CAMINHOS.gradle, "utf8"), v));
  writeFileSync(CAMINHOS.xcode, escreverNoXcode(readFileSync(CAMINHOS.xcode, "utf8"), v));
  console.log(`versão ${nomeDaVersao(v)} — Android versionCode ${String(versionCode(v))}`);
}
