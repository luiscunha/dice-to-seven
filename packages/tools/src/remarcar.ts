/**
 * Volta a escolher as marcas — soldas e gelo — de um pack já curado, **sem
 * regerar um único tabuleiro**.
 *
 * Existe porque as marcas escolhem-se depois de o nível estar aceite, sobre a
 * solução que ele já traz, com uma seed derivada da do nível (`marcasDoNivel`).
 * Quando a regra de uma marca muda, a escolha pode mudar com ela; os tabuleiros,
 * as soluções e as métricas não. Regerar a banda inteira para isso custava
 * horas no `perito` e arriscava ids que não tinham razão para mudar.
 *
 *   tsx packages/tools/src/remarcar.ts <pack.json>
 *
 * ── Três recusas, e nenhuma é zelo a mais ──
 *
 * 1. **Uma solução que deixe de ser legal com as marcas novas** aborta tudo. É a
 *    ida-e-volta (spec §9.3) aplicada às marcas: nada sai daqui sem que a
 *    solução guardada esvazie o tabuleiro, marca a marca.
 * 2. **Um nível sem marcas na banda** fica intacto, byte a byte — não há o que
 *    escolher.
 * 3. Os níveis cujas marcas saem iguais **não são reescritos**: o ficheiro só
 *    muda onde a escolha mudou, e o diff diz exatamente quais foram.
 */

import { readFile, writeFile } from "node:fs/promises";

import type { GeneratedLevel, Level, Marcas } from "@dicetoseven/engine";
import {
  aplicarMarcas,
  applyMove,
  isEmpty,
  jogadaLegal,
  marcasDe,
  toLevel,
} from "@dicetoseven/engine";

import { bandById } from "./bands";
import { marcasDoNivel } from "./candidate";

const log = (msg: string): void => {
  process.stdout.write(`${msg}\n`);
};

/** A solução guardada esvazia o tabuleiro com estas marcas, jogada a jogada? */
function resolveCom(nivel: Level, marcas: Marcas): boolean {
  let b = nivel.board;
  let m = marcas;

  for (const g of nivel.solution) {
    if (!jogadaLegal(b, g, m)) return false;
    m = aplicarMarcas(b, m, g);
    b = applyMove(b, g);
  }

  return isEmpty(b);
}

const mesmas = (a: Marcas, b: Marcas): boolean =>
  JSON.stringify(a.soldas) === JSON.stringify(b.soldas) &&
  JSON.stringify(a.gelo) === JSON.stringify(b.gelo);

async function main(argv: readonly string[]): Promise<number> {
  const [caminho] = argv;
  if (caminho === undefined) {
    log("uso: remarcar <pack.json>");
    return 1;
  }

  const pack = JSON.parse(await readFile(caminho, "utf8")) as Level[];
  const mudados: string[] = [];

  const saida = pack.map((nivel) => {
    const band = bandById(nivel.band ?? "");
    if (band === undefined || ((band.soldas ?? 0) === 0 && (band.gelo ?? 0) === 0)) {
      return nivel;
    }

    /*
     * O nível gerado, reconstruído do publicado. `stats` é a única coisa que
     * o pack não guarda, e a escolha das marcas não a lê.
     */
    const gerado: GeneratedLevel = {
      board: nivel.board,
      solution: nivel.solution,
      ...(nivel.joker === undefined ? {} : { joker: nivel.joker }),
      stats: undefined as never,
    };

    const antes = marcasDe(nivel.soldas, nivel.gelo);
    const depois = marcasDoNivel(gerado, band, nivel.seed);

    if (!resolveCom(nivel, depois)) {
      throw new Error(
        `${nivel.id}: a solução guardada deixa de esvaziar o tabuleiro com as marcas novas`,
      );
    }

    if (mesmas(antes, depois)) return nivel;

    mudados.push(nivel.id);

    // A mesma forma que o pipeline produz: `toLevel`, e depois banda e métricas.
    return {
      ...toLevel(nivel.id, nivel.seed, gerado, depois),
      ...(nivel.band === undefined ? {} : { band: nivel.band }),
      ...(nivel.metrics === undefined ? {} : { metrics: nivel.metrics }),
    };
  });

  await writeFile(caminho, `${JSON.stringify(saida, null, 1)}\n`, "utf8");

  log(`${mudados.length} níveis com marcas novas:`);
  for (const id of mudados) log(`  ${id}`);
  return 0;
}

process.exitCode = await main(process.argv.slice(2));
