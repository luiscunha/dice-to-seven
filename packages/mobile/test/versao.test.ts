/**
 * A versão da aplicação.
 *
 * O que se protege: **a versão é uma só** — a do `package.json` do `mobile` é a
 * que está escrita no Android e no iOS, e quem mudar uma sem correr `pnpm
 * versao` vê isto falhar antes de enviar um pacote com duas versões; e **o
 * `versionCode` sobe sempre que a versão sobe**, que é a única regra da Play.
 */

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  CAMINHOS,
  escreverNoGradle,
  escreverNoXcode,
  lerVersao,
  nomeDaVersao,
  versaoDoPacote,
  versionCode,
} from "../versao";

describe("a versão", () => {
  it("lê x.y.z, e recusa o resto", () => {
    expect(lerVersao("1.2.3")).toEqual({ major: 1, minor: 2, patch: 3 });
    expect(() => lerVersao("1.2")).toThrow();
    expect(() => lerVersao("1.2.3-beta")).toThrow();
    expect(() => lerVersao("1.100.0")).toThrow();
    expect(() => lerVersao("0.9.0")).toThrow();
  });

  it("o versionCode sobe sempre que a versão sobe", () => {
    const ordem = ["1.0.0", "1.0.1", "1.0.99", "1.1.0", "1.99.99", "2.0.0", "10.0.0"];
    const codigos = ordem.map((v) => versionCode(lerVersao(v)));
    expect(codigos).toEqual([...codigos].sort((a, b) => a - b));
    expect(new Set(codigos).size).toBe(codigos.length);
    expect(versionCode(lerVersao("1.2.3"))).toBe(10203);
  });

  it("escreve no build.gradle e no project.pbxproj, e só onde deve", () => {
    const v = lerVersao("1.4.2");
    const gradle = 'defaultConfig {\n  versionCode 1\n  versionName "1.0"\n}';
    expect(escreverNoGradle(gradle, v)).toBe('defaultConfig {\n  versionCode 10402\n  versionName "1.4.2"\n}');

    const xcode = "MARKETING_VERSION = 1.0;\nX = 1;\nMARKETING_VERSION = 1.0;";
    expect(escreverNoXcode(xcode, v)).toBe("MARKETING_VERSION = 1.4.2;\nX = 1;\nMARKETING_VERSION = 1.4.2;");
  });

  it("um projeto que mudou de forma não se escreve às cegas", () => {
    const v = lerVersao("1.0.0");
    expect(() => escreverNoGradle('versionName "1.0"', v)).toThrow();
    expect(() => escreverNoXcode("MARKETING_VERSION = 1.0;", v)).toThrow();
  });

  /*
   * O teste que importa: os dois projetos dizem a versão do package.json. Se
   * falhar, faltou correr `pnpm versao` depois de mudar a versão.
   */
  it("**o Android e o iOS dizem a versão do package.json**", () => {
    const v = versaoDoPacote();
    const gradle = readFileSync(CAMINHOS.gradle, "utf8");
    const xcode = readFileSync(CAMINHOS.xcode, "utf8");

    expect(gradle).toContain(`versionCode ${String(versionCode(v))}`);
    expect(gradle).toContain(`versionName "${nomeDaVersao(v)}"`);
    expect(xcode.match(/MARKETING_VERSION = [^;]+;/g)).toEqual([
      `MARKETING_VERSION = ${nomeDaVersao(v)};`,
      `MARKETING_VERSION = ${nomeDaVersao(v)};`,
    ]);
  });
});
