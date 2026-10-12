/**
 * Mede a contagem decrescente sobre o pack publicado, sem mudar nada nele.
 *
 *   tsx packages/tools/src/medir-contagem.ts [--bandas avancado,perito]
 *       [--playouts 120] [--max 100000] [--niveis <n>]
 *
 * Para cada nível corre a mesma bateria **sem contagem** (só as marcas que já
 * tem) e com a contagem escolhida por cada política, e compara-as nos mesmos
 * níveis. O critério ficou fixado antes de medir: o momento em que o jogador dá
 * pelo erro tem de descer dos ~78% do nível para menos de metade, e o piso de
 * justiça tem de continuar a aceitar níveis suficientes.
 *
 * Cada contagem é medida com os dois jogadores de `contagem.ts`. O `atento` é o
 * que decide: uma contagem que só aperta a quem a ignora não é dificuldade.
 *
 * Um nível por tarefa, em `worker_threads`. Tudo é semeado a partir da seed do
 * nível, portanto o resultado não depende de quantos workers correm.
 */

import { readFile } from "node:fs/promises";
import { availableParallelism } from "node:os";
import { parseArgs } from "node:util";
import {
  Worker,
  isMainThread,
  parentPort,
  workerData,
} from "node:worker_threads";

import type { Level, Verdict } from "@dicetoseven/engine";
import { LIMITES_PISO } from "@dicetoseven/engine";

import { bandById } from "./bands";
import type { Escolha, Falhados, Jogador, MedicaoPlayouts } from "./contagem";
import {
  escolherContagem,
  estadoDe,
  medirPlayouts,
  pisoComContagem,
  resolveComContagem,
} from "./contagem";

interface Politica {
  readonly nome: string;
  readonly folgas: readonly number[];
  readonly soEnterradas: boolean;
}

/*
 * A primeira é a da primeira medição, que escolheu quase só peças que já se
 * podiam tirar. A segunda proíbe-as, e dá a folga que for precisa para o piso
 * de justiça aceitar.
 */
const POLITICAS: readonly Politica[] = [
  { nome: "qualquer peça, folga 1", folgas: [1], soEnterradas: false },
  { nome: "só enterradas, folga 1 a 4", folgas: [1, 2, 3, 4], soEnterradas: true },
];

const JOGADORES: readonly Jogador[] = ["calhas", "atento"];

interface Opcoes {
  readonly playouts: number;
  readonly maxEstados: number;
}

interface ComContagem {
  readonly escolha: Escolha | undefined;
  readonly medicoes: Partial<Record<Jogador, MedicaoPlayouts>>;
}

interface ResultadoNivel {
  readonly id: string;
  readonly band: string;
  readonly jogadas: number;
  readonly piso: Verdict;
  readonly base: MedicaoPlayouts;
  readonly politicas: readonly ComContagem[];
  readonly ms: number;
}

interface Tarefa {
  readonly nivel: Level;
  readonly opcoes: Opcoes;
}

/* ─── Um nível ─────────────────────────────────────────────────────────── */

function medirNivel({ nivel, opcoes }: Tarefa): ResultadoNivel {
  const inicio = performance.now();
  const profundidade = bandById(nivel.band ?? "")?.accept.fairnessDepth ?? 2;

  // O piso com o mesmo limite do pipeline: um inconclusivo é uma recusa.
  const maxPiso = LIMITES_PISO.maxStates;
  const falhadosBase: Falhados = new Set();

  const politicas = POLITICAS.map((politica): ComContagem => {
    const falhados: Falhados = new Set();
    const escolha = escolherContagem(
      nivel,
      {
        folgas: politica.folgas,
        soEnterradas: politica.soEnterradas,
        profundidadePiso: profundidade,
        playouts: 64,
        maxEstados: maxPiso,
        tentativas: 12,
      },
      falhados,
    );

    if (escolha === undefined) return { escolha, medicoes: {} };

    // A ida-e-volta, com a contagem: nada se mede sobre um nível que a
    // solução guardada já não resolve.
    if (!resolveComContagem(nivel, escolha.contagem)) {
      throw new Error(`${nivel.id}: a solução guardada não cumpre a contagem`);
    }

    const medicoes: Partial<Record<Jogador, MedicaoPlayouts>> = {};
    for (const jogador of JOGADORES) {
      medicoes[jogador] = medirPlayouts(
        nivel,
        escolha.contagem,
        opcoes.playouts,
        opcoes.maxEstados,
        falhados,
        jogador,
      );
    }

    return { escolha, medicoes };
  });

  return {
    id: nivel.id,
    band: nivel.band ?? "?",
    jogadas: nivel.solution.length,
    // A linha de base passa pelo mesmo piso, com as marcas, para a régua ser a mesma.
    piso: pisoComContagem(estadoDe(nivel), profundidade, maxPiso, falhadosBase),
    // Sem contagem, os dois jogadores jogam exatamente o mesmo.
    base: medirPlayouts(nivel, undefined, opcoes.playouts, opcoes.maxEstados, falhadosBase),
    politicas,
    ms: performance.now() - inicio,
  };
}

/* ─── Agregar ──────────────────────────────────────────────────────────── */

const media = (xs: readonly number[]): number =>
  xs.length === 0 ? NaN : xs.reduce((a, b) => a + b, 0) / xs.length;

const pct = (x: number): string => (Number.isNaN(x) ? "—" : `${(x * 100).toFixed(1)}%`);

function linha(nome: string, niveis: number, ms: readonly MedicaoPlayouts[]): string {
  const runs = ms.reduce((a, m) => a + m.runs, 0);
  const sobreviveram = ms.reduce((a, m) => a + m.sobreviveram, 0);
  const erros = ms.flatMap((m) => m.erros);
  const revelacoes = ms.flatMap((m) => m.revelacoes);
  const inconclusivos = ms.reduce((a, m) => a + m.inconclusivos, 0);

  const noTerco = erros.length === 0 ? NaN : erros.filter((x) => x <= 1 / 3).length / erros.length;

  return `| ${nome} | ${niveis} | ${pct(runs === 0 ? NaN : sobreviveram / runs)} | ${pct(media(erros))} | ${pct(noTerco)} | ${pct(media(revelacoes))} | ${inconclusivos} |`;
}

function relatorio(resultados: readonly ResultadoNivel[]): string {
  const out: string[] = [];
  const bandas = [...new Set(resultados.map((r) => r.band))];

  for (const band of bandas) {
    const daBanda = resultados.filter((r) => r.band === band);
    const conta = (v: Verdict): number => daBanda.filter((r) => r.piso === v).length;

    out.push(
      `\n## ${band} — ${daBanda.length} níveis\n`,
      `Piso de justiça com as marcas atuais, sem contagem: ` +
        `${conta("yes")} passam · ${conta("no")} falham · ${conta("inconclusive")} inconclusivos\n`,
      "| variante | níveis | sobrevivência | 1.º erro | erros no 1.º terço | dá por isso | inconcl. |",
      "|---|---|---|---|---|---|---|",
      linha("sem contagem (todos)", daBanda.length, daBanda.map((r) => r.base)),
    );

    POLITICAS.forEach((politica, i) => {
      const com = daBanda.filter((r) => r.politicas[i]?.escolha !== undefined);
      out.push(linha(`sem contagem (os mesmos ${com.length})`, com.length, com.map((r) => r.base)));

      for (const jogador of JOGADORES) {
        const ms = com.flatMap((r) => {
          const m = r.politicas[i]?.medicoes[jogador];
          return m === undefined ? [] : [m];
        });
        out.push(linha(`**${politica.nome}**, jogador ${jogador}`, com.length, ms));
      }
    });

    out.push("\nA contagem escolhida:\n");
    POLITICAS.forEach((politica, i) => {
      const escolhas = daBanda.flatMap((r) => {
        const e = r.politicas[i]?.escolha;
        return e === undefined ? [] : [{ r, e }];
      });

      const porFolga = politica.folgas
        .map((f) => `${escolhas.filter((x) => x.e.folga === f).length}× folga ${f}`)
        .join(", ");

      out.push(
        `- **${politica.nome}**: ${escolhas.length}/${daBanda.length} níveis (${porFolga}) · ` +
          `contagem média ${media(escolhas.map((x) => x.e.contagem.restantes)).toFixed(1)}, ` +
          `a solução tira a peça à jogada ${media(escolhas.map((x) => x.e.passo)).toFixed(1)} ` +
          `de ${media(escolhas.map((x) => x.r.jogadas)).toFixed(1)} · ` +
          `o jogo ao calhas cumpre-a em ${pct(media(escolhas.map((x) => x.e.aTempo)))} · ` +
          `${media(escolhas.map((x) => x.e.candidatas)).toFixed(1)} candidatas por nível · ` +
          `${escolhas.filter((x) => x.e.jaSaia).length} em peças que já se podiam tirar`,
      );
    });
  }

  const ms = resultados.reduce((a, r) => a + r.ms, 0);
  out.push(`\n${resultados.length} níveis, ${(ms / 1000).toFixed(0)} s de CPU.`);
  return out.join("\n");
}

/* ─── Processo principal e workers ─────────────────────────────────────── */

function emWorker(tarefas: readonly Tarefa[]): Promise<ResultadoNivel[]> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL(import.meta.url), {
      workerData: tarefas,
      execArgv: ["--import", "tsx"],
    });
    worker.once("message", (m: ResultadoNivel[]) => {
      void worker.terminate().then(
        () => resolve(m),
        () => resolve(m),
      );
    });
    worker.once("error", reject);
  });
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      pack: { type: "string", default: "packages/tools/out/level-pack.json" },
      bandas: { type: "string", default: "avancado,perito" },
      playouts: { type: "string", default: "120" },
      max: { type: "string", default: "100000" },
      niveis: { type: "string" },
    },
  });

  const opcoes: Opcoes = {
    playouts: Number(values.playouts),
    maxEstados: Number(values.max),
  };

  const pack = JSON.parse(await readFile(values.pack, "utf8")) as Level[];
  const escolhidos = values.bandas.split(",").flatMap((b) => {
    const niveis = pack.filter((l) => l.band === b);
    return values.niveis === undefined ? niveis : niveis.slice(0, Number(values.niveis));
  });

  // Um nível por fatia: os níveis custam muito diferente, e fatias pequenas
  // distribuem melhor a carga.
  const fila = escolhidos.map((nivel) => ({ nivel, opcoes }));
  const resultados: ResultadoNivel[] = [];
  const workers = Math.max(1, availableParallelism() - 1);
  let feitos = 0;

  await Promise.all(
    Array.from({ length: workers }, async () => {
      for (let t = fila.shift(); t !== undefined; t = fila.shift()) {
        const [r] = await emWorker([t]);
        if (r !== undefined) resultados.push(r);
        feitos++;
        process.stderr.write(`\r${feitos}/${escolhidos.length} níveis`);
      }
    }),
  );
  process.stderr.write("\n");

  // A ordem dos workers não pode mudar o relatório.
  resultados.sort((a, b) => a.id.localeCompare(b.id));
  process.stdout.write(`${relatorio(resultados)}\n`);
}

if (isMainThread) {
  await main();
} else {
  parentPort?.postMessage((workerData as Tarefa[]).map(medirNivel));
}
