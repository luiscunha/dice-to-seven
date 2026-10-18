/**
 * Os textos do jogo em inglês britânico.
 *
 * A forma é a do português (`Textos`): o compilador recusa um texto que falte.
 * Traduzido para soar a jogo e não a manual — o mesmo tom curto e direto do
 * original, com «you» a fazer de «tu».
 */

import { DEFAULT_COMBO_CONFIG } from "../session/combos";
import { COMPOSICOES } from "../session/estatisticas";
import { LIMIARES } from "../session/medalhas";
import type { Textos } from "./pt";

const JANELA = new Intl.NumberFormat("en-GB").format(DEFAULT_COMBO_CONFIG.windowMs / 1000);

/** `30000` → `30,000`. */
const milhares = (n: number): string =>
  String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

const MESES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

const MESES_CURTOS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

const mes = (m: number): string => MESES[m - 1] ?? "";
const mesCurto = (m: number): string => MESES_CURTOS[m - 1] ?? "";

const plural = (n: number, um: string, varios: string): string =>
  `${String(n)} ${n === 1 ? um : varios}`;

const diasSeguidos = (n: number): string => plural(n, "day in a row", "days in a row");

export const EN: Textos = {
  lang: "en-GB",

  formato: {
    milhares,
    dataCurta: (dia, m) => `${String(dia)} ${mesCurto(m)}`,
    dataPorExtenso: (dia, m) => `${String(dia)} ${mes(m)}`,
    dataCompleta: (dia, m, ano) => `${String(dia)} ${mes(m)} ${String(ano)}`,
    mesPorExtenso: (m, ano) => `${mes(m)} ${String(ano)}`,
    nomeDoMes: (m) => mes(m),
    mesCurto: (m) => mesCurto(m),
  },

  comum: {
    voltar: "back",
    fechar: "close",
    cancelar: "Cancel",
    guardar: "Save",
    sair: "Leave",
    jogar: "Play",
    partilhar: "Share",
    copiado: "Copied",
    copiadoComVisto: "Copied ✓",
    naoDeuParaCopiar: "Couldn't copy",
    partilharResultado: "Share today's result",
    reiniciar: "Restart",
    repetir: "Replay",
    treinarOutraVez: "Practise again",
    jogarOutraVez: "Play again",
    tentarOutraVez: "Try again",
    tabuleiro: "board",
    joker: "joker",
    face: (v) => `face ${String(v)}`,
    pontos: (n) => plural(n, "point", "points"),
    tabuleiros: (n) => plural(n, "board", "boards"),
    chaves: (n) => plural(n, "key", "keys"),
    semNiveis: "couldn't load the levels",
  },

  modos: {
    puzzle: "Puzzle",
    puzzles: "Puzzles",
    tempo: "Time Attack",
    survival: "Survival",
    desafio: "Daily Challenge",
  },

  puzzle: {
    selos: { perfect: "Perfect", clean: "Clean", completed: "Completed" },
    voltarALista: "back to the list",
    ajudaJoker: "how the joker works",
    desfazer: "Undo",
    dica: "Hint",
    reiniciarTitulo: "Restart the level?",
    sairTitulo: "Leave the level?",
    jogadasPerdemSe: "The moves you've made so far will be lost.",
    primeiroTempo: "first time",
    novoRecorde: (era) => `new record, was ${era}`,
    oTeuRecorde: (tempo) => `your record is ${tempo}`,
    pecas: (restantes, total) => `${String(restantes)}/${String(total)} pieces`,
    facesSomam: (soma) => `faces add up to ${String(soma)}`,
    convite: "Tap pieces to make 7",
    passavaDe7: "that piece would go over 7",
    geloSoAPar: "a frozen piece only leaves with one other piece",
    geloComGelo: "two frozen pieces can't leave together",
    faltam: (n) => `${String(n)} to go`,
    jogadas: "moves",
    desfeitas: "undos",
    dicas: "hints",
    nivelSeguinte: "Next level",
    verTabuleiro: "see the board",
    becoTitulo: "Oops! Dead end!",
    becoTexto: (restantes) =>
      restantes === 1
        ? "1 piece is left, and no group adds up to 7 any more."
        : `${String(restantes)} pieces are left, and no group adds up to 7 any more.`,
    becoJoker: "With the joker, the fatal move is usually a few moves back.",
  },

  tempo: {
    limpos: (n) => (n === 1 ? "1 board cleared" : `${String(n)} boards cleared`),
    saltados: (n) => `${String(n)} skipped`,
    sairDaCorrida: "leave the run",
    sairTitulo: "Leave the run?",
    sairTexto: "The clock doesn't stop: the run ends here.",
    sairTextoDesafio: "The clock doesn't stop: the run ends here, and this is the one that counts for the challenge.",
    geloSoAPar: "❄ only leaves in a pair",
    geloComGelo: "❄ can't leave with ice",
    comecar: "Start",
    voltar: "Back",
    segundos: (n) => `${String(n)} seconds`,
    arranqueDesafio:
      "The same boards for everyone. Only this attempt counts: once you start, leaving ends the run.",
    pontosNoTopo: (n) => `${String(n)} points`,
    tabuleirosNoTopo: (n) => `${String(n)} boards`,
    pontosNoFim: (n) => `${String(n)} points`,
    saltar: (custo) => `Skip (${custo})`,
    saltarAria: (segundos) => `skip the board, costs ${String(segundos)} seconds`,
    saltarTabuleiro: "Skip board",
    saltarFechadoAria: (n) => `skip the board: available from board ${String(n)}`,
    semJogadas: "No moves",
    semJogadasTexto: (restantes) =>
      restantes === 1
        ? "1 piece is left, and no group adds up to 7."
        : `${String(restantes)} pieces are left, and no group adds up to 7.`,
    novoRecorde: "New record",
    acabouOTempo: "Time's up",
  },

  survival: {
    proximaLinha: "next row",
    proximaLinhaEm: (segundos, bomba) => `next row in ${String(segundos)} seconds${bomba}`,
    bombaEnterrada: ", lights a bomb in the stack",
    naPilha: "in the stack",
    comBomba: ", with a bomb",
    puxarLinha: "Pull row",
    recomecar: "Restart",
    recomecarTitulo: "Restart?",
    recomecarTexto: "This run and its time will be lost. The board goes back to the start.",
    semJogadas: "no moves",
    maisUmaLinha: "+1 row",
    limpoTitulo: "Board cleared!",
    transbordouTitulo: "The board overflowed",
    limpoLinhas: (n) => `Cleared, after surviving ${String(n)} rows`,
    linhasAguentadas: (n) => `${String(n)} rows survived`,
    porLimpar:
      "The challenge is done when you clear the board. The rows are the same: try again.",
    outraCorrida: "Another run",
    repetirEsta: "Replay this one",
  },

  tutorialJoker: {
    regra:
      "Every board always adds up to a multiple of 7. The joker is worth exactly what's missing — and only that value empties the board.",
    facesSomam: "the faces add up to",
    faltamPara: (joker) => `${String(joker)} short of`,
    queE: (jogadas) => `which is 7 × ${String(jogadas)}`,
    morto: (restante) =>
      `${String(restante)} left. That's not a multiple of 7, and there's no joker left to fix it. The game let you spend it on the wrong value without a word — and the real levels do exactly the same.`,
    limpo:
      "Cleared. Notice what the game let you do: spending the joker on another value was allowed, and the board would have died quietly. The sum above stays with you for the first three joker levels; after that, it's up to you.",
    aJogar: "Tap the joker to give it a value. Then make 7, like any other move.",
    outroValor: "What if I pick another value?",
    jaPercebi: "Got it",
  },

  tabuleiro: {
    sufixoBomba: ", bomb",
  },

  joker: {
    seletorAria: "what the joker is worth in this move",
    seletorTitulo: "the joker is worth",
  },

  home: {
    modosAria: "game modes",
    legendaPuzzles: "The campaign, chapter by chapter",
    escolherPerfil: "choose a name and avatar",
    mudarPerfil: (nome) => `${nome} — change name and avatar`,
    recorde: (pontos) => `Record ${String(pontos)}`,
    aMeio: (tempo) => `In progress · ${tempo}`,
    melhor: (tempo) => `Best ${tempo}`,
    interrompido: "Interrupted",
    ariaDesafio: (numero, data, modo, estado, emRisco) =>
      `Daily Challenge, number ${String(numero)}, ${data}: ${modo}, ${estado}.` +
      (emRisco === undefined ? "" : ` A ${String(emRisco)}-day streak at risk.`) +
      " Open.",
    comoJogar: "How to play?",
    comoJogarLegenda: "Join touching pieces until they add up to 7.",
  },

  perfil: {
    quemEs: "Who are you?",
    oTeuNome: "Your name",
    oTeuAvatar: "Your avatar",
    avatarAria: "avatar",
  },

  comoJogar: {
    titulo: "How to play",
    objetivo: "The goal",
    objetivoChamada: "Empty the board.",
    objetivoTexto:
      "There are no points to score and no clock to beat in Puzzles: a level ends when there isn't a piece left. And every level the game publishes has a solution — if you got stuck, it was the path, not the level.",
    jogada: "A move",
    jogadaChamada: "Tap touching pieces until they add up to exactly 7.",
    jogadaTexto:
      "The pieces you tap get marked. When they add up to 7, they leave on their own. If you go over 7 the move doesn't count — and tapping a chosen piece again takes it out of the sum.",
    jogadaMaximo: "A group has at most seven pieces, which is what seven 1s add up to.",
    ligadas: "Touching, not diagonal",
    ligadasChamada: "Two pieces are connected if they share a side.",
    ligadasVale: "Counts: they share a side",
    ligadasNaoVale: "Doesn't count: they only touch at the corner",
    ligadasTexto:
      "The whole group has to be connected — every piece touching another one in the group. An L, a T or a line: the shape doesn't matter, the connection does.",
    depois: "What happens next",
    depoisChamada: "The pieces above fall down, and empty columns disappear.",
    depoisColunas:
      "Columns that end up empty close up to the left, and the ones on either side become neighbours. This is where almost every new group comes from.",
    depoisGrupos:
      "New groups that form are available, but they don't leave on their own: they only go if you pick them. The game never plays for you — following a path you didn't choose could leave the board with no way out.",
    joker: "The joker",
    jokerChamadaAntes: "The grey piece with a ",
    jokerSimbolo: "green asterisk",
    jokerChamadaDepois: ". There's at most one per board.",
    jokerNota: "Tap it to give it a value from 1 to 6.",
    jokerSozinho:
      "The joker never makes a group on its own: it always goes with fixed pieces, and it's worth whatever they need to reach 7.",
    jokerValor:
      "Only one of the six values empties the board, and the game lets you pick another without a warning. The board doesn't die straight away — it fails at the end, with pieces left over.",
    jokerTutorial: "See the joker tutorial",
    soldas: "Welds",
    soldasChamada: "Two pieces joined by a staple leave together, or not at all.",
    soldasVale: "Counts: 2 + 1 + 4, the whole pair",
    soldasNaoVale: "Doesn't count: 2 + 5 leaves the 1 behind",
    soldasTexto:
      "Both pieces count towards the sum. A weld never breaks: the pair falls together until it leaves. They show up in Puzzles, from Advanced onwards.",
    gelo: "Ice",
    geloChamada: "A frozen piece only leaves in a pair: with a single piece that isn't frozen.",
    geloVale: "Counts: 5 + 2, a pair",
    geloNaoVale: "Doesn't count: 5 + 1 + 1",
    geloTexto:
      "Two frozen pieces can't leave together either, even if they add up to 7. The ice never melts: the piece that frees a frozen one is worth its weight in gold, and spending it on another move can leave the frozen piece stuck.",
    geloOnde: "It shows up in Expert Puzzles and in Time Attack, from the seventh board.",
    bomba: "The bomb",
    bombaChamada: "A piece with a fuse. Take it out in a move before the fuse runs out.",
    bombaNota: "The number on the fuse is the seconds left.",
    bombaDesarmar:
      "To defuse it, just put it in a group of 7, like any other piece. If the fuse runs out, it goes off — and the piece stays on the board.",
    bombaCastigo: (segundos) =>
      `In Time Attack, a bomb going off costs ${String(segundos)} seconds. In Survival, an extra row falls, and the pieces touching the bomb go up by one: a 1 becomes a 2, and a 6 stays a 6.`,
    bombaQuando:
      "There's one bomb at a time. In Time Attack it can show up from the fourth board. In Survival you can see on the next row whether it brings a bomb — and further on there are bombs that light up on a piece already in the stack.",
    selos: "Seals",
    selosChamada: "Each level keeps the best seal you've ever given it.",
    selosTextos: {
      perfect: "You cleared the level without undoing, restarting or asking for hints.",
      clean: "You cleared the level in one go, but with one or more hints.",
      completed: "You cleared the level, with undos or after restarting.",
    },
    selosNuncaDescem: "A seal never goes down: replaying a level can only improve it.",
    modos: "The modes",
    modoPuzzles:
      "The campaign. Boards handcrafted by the generator, always solvable, from the easiest to the hardest.",
    modoTempo: (saltar) =>
      `A single clock that never stops. Every board you clear gives time back, but less and less, and the boards keep growing. A piece that goes over 7 costs time. And watch out for bombs: take them out before the fuse runs out. From the seventh board on, a board can run out of moves: then skip it, for ${String(saltar)} seconds. And frozen pieces appear, which only leave in a pair with a piece that isn't frozen.`,
    modoSurvival:
      "Every so often a new row falls from the top. You see which one before it falls; it's over when the stack reaches the ceiling. If you run out of moves, the row falls at once; if you go over 7, it comes 3 seconds early. Some rows bring a bomb: take it out before the fuse runs out, or an extra row falls and the pieces around it go up by one. Further on, there are bombs that light up on a piece already in the stack: dig it out in time.",
    modoDesafio:
      "Every day, the same challenge for everyone: a Puzzle, a Time Attack or a Survival, in turn. The trail shows the way — what you've done and what's coming. The Puzzle and the Survival are done when you clear the board, and you can keep trying until then; in Time Attack, the first run counts. After that it's practice, with the same boards. At the end, share your result — and don't let your streak break. The streak earns keys (at 3, 7, 14 and 30 days): a key opens a challenge you missed, or saves your streak if you miss a day.",
  },

  capitulos: {
    iniciado: { nome: "Beginner", descricao: "Pairs and threes, no rush" },
    medio: { nome: "Intermediate", descricao: "Groups of up to four, and the joker turns up" },
    avancado: { nome: "Advanced", descricao: "High faces, few partners" },
    perito: { nome: "Expert", descricao: "Big boards, no margin" },
  },

  niveis: {
    selos: { perfect: "perfect", clean: "clean", completed: "completed" },
    nivelComSelo: (n, selo) => `level ${n}, ${selo}`,
    nivelSeguinte: (n) => `level ${n}, up next`,
    nivelPorJogar: (n) => `level ${n}, not played`,
  },

  desafio: {
    etiqueta: (n) => `Challenge #${String(n)}`,
    etiquetaTreino: (etiqueta) => `${etiqueta} · practice`,
    survivalLimpo: (tempo) => `cleared · ${tempo}`,
    legendas: {
      puzzle: "One board, the same for everyone. Solve it.",
      tempo: "Sixty seconds, and the same boards for everyone.",
      survival: "The same rows for everyone. Clear the board before it overflows.",
    },
    emRisco: "at risk",
    diasSeguidos,
    diasEmRisco: (n) => `${diasSeguidos(n)}, at risk`,
    quando: (n) =>
      n === 0
        ? "Today"
        : n === 1
          ? "Tomorrow"
          : n === -1
            ? "Yesterday"
            : n > 0
              ? `In ${String(n)} days`
              : `${String(-n)} days ago`,
    estados: {
      porJogar: "not played",
      aMeio: "in progress",
      feito: (resultado) => `done, ${resultado}`,
      feitoCurto: "done",
      interrompido: "interrupted",
      perdido: "missed",
      futuro: "not open yet",
    },
    chavesAria: (n) => `${plural(n, "key", "keys")}. What are they for?`,
    meses: "The months",
    nota:
      "One challenge a day, in turn: Puzzle, Time Attack and Survival. The first attempt counts; after that it's practice. It changes at midnight. Your streak earns keys, which open the days you missed.",
    feitosDe: (feitos, de) => `${String(feitos)} of ${String(de)} done`,
    completo: ", complete",
    anoAnterior: "previous year",
    anoSeguinte: "next year",
    mesFuturo: "hasn't started",
    mesSemDesafio: "no challenge",
    listaDoMes: (mes) => `The challenges of ${mes}, from the end to the start`,
    fimDoMes: (mes) => `End of ${mes}`,
    faltamDias: (n) => (n === 1 ? "1 day to go" : `${String(n)} days to go`),
    inicioDoDesafio: "Start of the challenge",
    inicio: "Start",
    ariaHoje: ", today",
    ariaSalvo: "streak saved with a key",
    ariaAberto: "opened with a key",
    ariaGanhou: (chaves) => `earned ${chaves}`,
    ariaBalao: (n, data) => `Challenge number ${String(n)}, ${data}`,
    ariaPremioDeHoje: (chaves) =>
      chaves > 0
        ? `one more day on the streak, and ${plural(chaves, "key", "keys")}`
        : "one more day on the streak",
    treinar: "Practise",
    continuar: "Continue",
    notaPatamar: (chaves) => `🔑 +${String(chaves)}: your streak reached a milestone.`,
    notaJogadoDepois: "Played later, with a key: it counts for the month, not for the streak.",
    naoContaHoje: "It doesn't count, and the rest of the day is practice.",
    naoConta: "It doesn't count: from here on it's practice.",
    ficouPorJogar: "Missed.",
    notaSalva: "🔑 A key saved the streak.",
    abreAMeiaNoite: "Opens at midnight.",
    abreNoDia: (dia) => `Opens on the ${dia}${sufixoOrdinal(Number(dia))}.`,
    salvar: "Save the streak",
    desbloquear: "Unlock",
    semChaves: (dias) => `No keys. The next one comes at ${String(dias)} days in a row.`,
    riscoTitulo: "Your streak is at risk",
    riscoTexto: (sequencia, chaves) =>
      `Yesterday was missed, and your ${sequencia === 1 ? "1-day" : `${String(sequencia)}-day`} streak ends there. ` +
      `A key saves it: yesterday doesn't count, but the streak carries on. You have ${chaves}.`,
    usar: "Use",
    agoraNao: "Not now",
    desbloquearTitulo: (n) => `Unlock challenge #${String(n)}?`,
    desbloquearTexto: (modo, data, chaves) =>
      `You spend a key and play the ${modo} challenge from ${data}. ` +
      `The first attempt counts: for the month, but not for the streak. You have ${chaves}.`,
    desbloquearEJogar: "Unlock and play",
    premioTexto: (dias, chaves) =>
      `${dias}! You earned ${chaves}: open a challenge you missed, or save your streak on a day you miss.`,
    boa: "Nice!",
    ganhamSe: "You earn them with your streak:",
    proximoPatamar: (dias, chaves, faltam) =>
      `After 30, the cycle starts again. The next one: at ${String(dias)} days, +${String(chaves)} 🔑 — ` +
      `${faltam === 1 ? "1 day to go" : `${String(faltam)} days to go`}.`,
    asChaves: "Keys",
    chavesTexto:
      "A key opens a challenge you missed — it counts for the month, but not for the streak — or saves your streak when you miss a day.",
    percebi: "Got it",
  },

  definicoes: {
    titulo: "Settings",
    idioma: "Language",
    notaIdioma: "“System” follows your phone's language.",
    idiomaAria: "language",
    sistema: "System",
    tema: "Theme",
    notaTema: "The faces don't change with the theme — a piece is the same piece on both backgrounds.",
    temaAria: "theme",
    claro: "Light",
    escuro: "Dark",
    vibracao: "Vibration",
    notaVibracao: "A tap on your finger with every move, and a warning when a move doesn't go in.",
    vibracaoAria: "vibration",
    ligada: "On",
    desligada: "Off",
    notaTempo: "Starting time. Every board you clear adds to the same clock.",
    tempoAria: "starting time",
    progresso: "Progress",
    notaProgresso: "Erases your seals, your best results and your Time Attack records. There's no undo.",
    apagar: "Erase progress",
    apagarConfirmar: "Tap again to erase everything",
    apagado: "Progress erased",
    acerca: "About",
    versao: (v) => `Version ${v}`,
    contacto: "Contact",
    privacidade: "Privacy policy",
    suporte: "Support",
  },

  partilha: {
    cabeca: (numero, data) => `DiceToSeven · Challenge #${String(numero)} · ${data}`,
    sequencia: (dias) => `🔥 ${String(dias)} days in a row`,
    puzzle: (tempo, selo) => `🧩 Puzzle: ${tempo} · ${selo}`,
    tempo: (pontos, tabuleiros) =>
      `⏱️ Time Attack: ${plural(pontos, "point", "points")} · ${plural(tabuleiros, "board", "boards")}`,
    survival: (tempo) => `🧱 Survival: cleared in ${tempo}`,
    selos: { perfect: "★ perfect", clean: "◆ clean", completed: "completed" },
  },

  paginaMedalhas: {
    titulo: "Medals",
    tipos: "medal type",
    normais: "Standard",
    premium: "Premium",
    contaDaAba: (aba, ganhas, total) => `${aba}: ${String(ganhas)} of ${String(total)}`,
    conquistada: "Earned",
    porConquistar: "Not earned yet",
    minutos: (n) => `${String(n)} minutes`,
    nova: "New",
    ariaPremium: "premium medal",
    ariaConquistada: (data) => `earned on ${data}`,
    ariaPorConquistar: "not earned yet",
    ariaNova: "new",
    estadoGanha: (data) => `Earned on ${data}.`,
    estadoProgresso: (quanto) => `You're at ${quanto}.`,
    estadoPorGanhar: "Not earned yet.",
    fechar: "Close",
    composicoesTitulo: (n) => `The ${String(n)} ways to make 7`,
    composicaoAria: (partes, feita) => `${partes}, ${feita ? "done" : "not yet"}`,
    novas: (n) => (n === 1 ? "New medal: " : "New medals: "),
    ariaEntrada: (ganhas, total, novas) =>
      `Medals: ${String(ganhas)} of ${String(total)}${novas ? ", with new ones to see" : ""}`,
  },

  medalhas: {
    nomes: {
      iniciado: "Beginner",
      medio: "Intermediate",
      avancado: "Advanced",
      perito: "Expert",
      "primeiro-perfeito": "Perfection",
      "perito-perfeito": "Perfect Expert",
      "campanha-perfeita": "Perfect Campaign",
      maratona: "Marathon",
      recordista: "Record Breaker",
      ultramaratona: "Ultramarathon",
      "cinco-minutos": "Five Minutes",
      "dez-minutos": "Ten Minutes",
      "dez-limpezas": "Ten Clears",
      semana: "One Week",
      "mes-completo": "Full Month",
      "trinta-dias": "Unstoppable",
      "cem-dias": "Centurion",
      "sangue-frio": "Nerves of Steel",
      "em-cadeia": "Chain Reaction",
      aguentar: "Hold the Line",
      "sete-uns": "Seven Ones",
      colecionador: "Collector",
      mestre: "Master",
    },
    descricoes: {
      iniciado: "Finish every Beginner level.",
      medio: "Finish every Intermediate level.",
      avancado: "Finish every Advanced level.",
      perito: "Finish every Expert level.",
      "primeiro-perfeito": "Finish a level with the Perfect seal: no undos, no restarts and no hints.",
      "perito-perfeito": "Every Expert level with the Perfect seal.",
      "campanha-perfeita": "Every campaign level with the Perfect seal.",
      maratona: `Clear ${String(LIMIARES.maratona)} boards in one Time Attack run.`,
      recordista: `Score ${milhares(LIMIARES.recordista)} points in one Time Attack run.`,
      ultramaratona: `Clear ${String(LIMIARES.ultramaratona)} boards in one Time Attack run.`,
      "cinco-minutos": "Survive five minutes in one Survival run.",
      "dez-minutos": "Survive ten minutes in one Survival run.",
      "dez-limpezas": `Clear the Survival board ${String(LIMIARES.limpezas)} times.`,
      semana: `Do the Daily Challenge ${String(LIMIARES.semana)} days in a row.`,
      "mes-completo": "Do every challenge in a month — the ★ on the month trail.",
      "trinta-dias": `Do the Daily Challenge ${String(LIMIARES.trintaDias)} days in a row.`,
      "cem-dias": `Do the Daily Challenge ${String(LIMIARES.cemDias)} days in a row.`,
      "sangue-frio": `Defuse ${String(LIMIARES.sangueFrio)} bombs in one Time Attack run.`,
      "em-cadeia": `Reach the ×3 combo in a Time Attack run: ${String(LIMIARES.emCadeia)} moves in a row on the same board, never more than ${JANELA} s apart.`,
      aguentar: `Hold out for ${String(LIMIARES.aguentar)} rows in one Survival run. Rows you pull count too.`,
      "sete-uns": "Clear a group of seven 1s — the biggest group there is.",
      colecionador: `Make 7 in all ${String(COMPOSICOES.length)} possible ways, from 1 + 6 to seven 1s.`,
      mestre: "Earn every standard medal.",
    },
    unidades: {
      niveis: "levels",
      perfeitos: "perfect",
      tabuleiros: "boards",
      pontos: "points",
      limpezas: "clears",
      dias: "days in a row",
      bombas: "bombs",
      jogadas: "moves in a row",
      linhas: "rows",
      composicoes: "combinations",
      medalhas: "medals",
    },
  },
};

/** 1st, 2nd, 3rd, 4th… 11th, 12th, 13th, 21st. */
function sufixoOrdinal(n: number): string {
  const resto100 = n % 100;
  if (resto100 >= 11 && resto100 <= 13) return "th";
  switch (n % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}
