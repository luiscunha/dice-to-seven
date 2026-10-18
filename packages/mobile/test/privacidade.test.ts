/**
 * O que as fichas das lojas declaram, e o que o pacote faz.
 *
 * As duas lojas vão dizer «nenhum dado recolhido» (Apple: *Data Not Collected*;
 * Google: segurança dos dados). Isso é uma afirmação sobre o pacote, e um
 * plugin ou uma permissão acrescentados depois podem torná-la falsa sem
 * ninguém reparar. Estes testes falham nesse momento, para a ficha e o
 * manifesto se reverem antes de o pacote seguir.
 */

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const ler = (caminho: string): string => readFileSync(new URL(caminho, import.meta.url), "utf8");

const MANIFESTO = ler("../ios/App/App/PrivacyInfo.xcprivacy");
const XCODE = ler("../ios/App/App.xcodeproj/project.pbxproj");
const ANDROID = ler("../android/app/src/main/AndroidManifest.xml");
const PACOTE = JSON.parse(ler("../package.json")) as { dependencies: Record<string, string> };

/** O valor que segue uma chave no plist, sem os espaços. */
const depoisDe = (chave: string): string => {
  const i = MANIFESTO.indexOf(`<key>${chave}</key>`);
  if (i < 0) throw new Error(`o manifesto não tem ${chave}`);
  return MANIFESTO.slice(i + chave.length + 11).trimStart();
};

describe("o manifesto de privacidade do iOS", () => {
  it("não rastreia nem recolhe nada", () => {
    expect(depoisDe("NSPrivacyTracking")).toMatch(/^<false\/>/);
    expect(depoisDe("NSPrivacyTrackingDomains")).toMatch(/^<array\/>/);
    expect(depoisDe("NSPrivacyCollectedDataTypes")).toMatch(/^<array\/>/);
  });

  it("declara o UserDefaults do @capacitor/preferences, pela razão CA92.1", () => {
    expect(MANIFESTO).toMatch(
      /NSPrivacyAccessedAPICategoryUserDefaults<\/string>\s*<key>NSPrivacyAccessedAPITypeReasons<\/key>\s*<array>\s*<string>CA92\.1<\/string>/,
    );
  });

  /*
   * Um ficheiro na pasta não chega: sem estar nos recursos do alvo, o Xcode não
   * o copia para a aplicação, e a Apple recusa o envio como se não existisse.
   */
  it("vai dentro da aplicação: está nos recursos do projeto Xcode", () => {
    const recursos = /Begin PBXResourcesBuildPhase section \*\/([\s\S]*?)End PBXResourcesBuildPhase/.exec(XCODE)?.[1];
    expect(recursos).toContain("PrivacyInfo.xcprivacy in Resources");
    expect(XCODE).toMatch(/PrivacyInfo\.xcprivacy \*\/ = \{isa = PBXFileReference;[^}]*path = PrivacyInfo\.xcprivacy;/);
  });
});

describe("o que o pacote pode fazer", () => {
  /*
   * Cada plugin nativo pode usar APIs que a Apple obriga a declarar, ou
   * recolher dados que a ficha teria de mencionar. Um plugin novo faz este
   * teste falhar: rever o PrivacyInfo.xcprivacy e as fichas, e só depois
   * acrescentá-lo aqui.
   */
  it("os plugins são os que o manifesto e as fichas conhecem", () => {
    expect(Object.keys(PACOTE.dependencies).sort()).toEqual([
      "@capacitor/android",
      "@capacitor/app",
      "@capacitor/core",
      "@capacitor/haptics",
      "@capacitor/ios",
      "@capacitor/preferences",
      "@capacitor/splash-screen",
      "@capacitor/status-bar",
    ]);
  });

  /*
   * A INTERNET vem do modelo do Capacitor e não é usada — o jogo não faz um
   * pedido de rede —, mas a Play mostra-a. A VIBRATE é a dos toques. Uma
   * terceira muda a ficha de segurança dos dados.
   */
  it("as permissões do Android são só a internet do Capacitor e a vibração", () => {
    const permissoes = [...ANDROID.matchAll(/<uses-permission android:name="([^"]+)"/g)].map((m) => m[1]);
    expect(permissoes.sort()).toEqual(["android.permission.INTERNET", "android.permission.VIBRATE"]);
  });
});
