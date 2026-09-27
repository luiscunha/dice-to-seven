/**
 * O relógio, escrito para se ler de relance.
 *
 * Vive à parte porque o usam três ecrãs — o Survival, a campanha e o resumo da
 * Home — e um formato de tempo que difira entre eles lê-se como um defeito.
 */

/** `m:ss.d`. Os décimos existem porque sem eles dois tempos próximos empatam. */
export function relogio(ms: number): string {
  const total = Math.max(0, ms);
  const minutos = Math.floor(total / 60_000);
  const segundos = Math.floor((total % 60_000) / 1000);
  const decimos = Math.floor((total % 1000) / 100);

  return `${String(minutos)}:${String(segundos).padStart(2, "0")}.${String(decimos)}`;
}

/** De quanto em quanto o mostrador se repinta. Um décimo, que é o que ele mostra. */
export const PASSO_RELOGIO = 100;
