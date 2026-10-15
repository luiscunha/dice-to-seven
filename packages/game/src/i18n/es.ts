/**
 * Os textos do jogo em espanhol de Espanha.
 *
 * A forma é a do português (`Textos`): o compilador recusa um texto que falte.
 * Tratamento por «tú», como o «tu» do original. O joker é o «comodín», que é
 * como qualquer jogador espanhol lhe chama.
 */

import { LIMIARES } from "../session/medalhas";
import type { Textos } from "./pt";

/** `30000` → `30.000`. */
const milhares = (n: number): string =>
  String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
] as const;

const MESES_CURTOS = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sept", "oct", "nov", "dic",
] as const;

const mes = (m: number): string => MESES[m - 1] ?? "";
const mesCurto = (m: number): string => MESES_CURTOS[m - 1] ?? "";

const plural = (n: number, um: string, varios: string): string =>
  `${String(n)} ${n === 1 ? um : varios}`;

const diasSeguidos = (n: number): string => plural(n, "día seguido", "días seguidos");

export const ES: Textos = {
  lang: "es-ES",

  formato: {
    milhares,
    dataCurta: (dia, m) => `${String(dia)} ${mesCurto(m)}`,
    dataPorExtenso: (dia, m) => `${String(dia)} de ${mes(m)}`,
    dataCompleta: (dia, m, ano) => `${String(dia)} de ${mes(m)} de ${String(ano)}`,
    mesPorExtenso: (m, ano) => `${mes(m)} de ${String(ano)}`,
    nomeDoMes: (m) => mes(m),
    mesCurto: (m) => mesCurto(m),
  },

  comum: {
    voltar: "volver",
    fechar: "cerrar",
    cancelar: "Cancelar",
    guardar: "Guardar",
    sair: "Salir",
    jogar: "Jugar",
    partilhar: "Compartir",
    copiado: "Copiado",
    copiadoComVisto: "Copiado ✓",
    naoDeuParaCopiar: "No se pudo copiar",
    partilharResultado: "Compartir el resultado de hoy",
    reiniciar: "Reiniciar",
    repetir: "Repetir",
    treinarOutraVez: "Entrenar otra vez",
    jogarOutraVez: "Jugar otra vez",
    tentarOutraVez: "Intentar otra vez",
    tabuleiro: "tablero",
    joker: "comodín",
    face: (v) => `cara ${String(v)}`,
    pontos: (n) => plural(n, "punto", "puntos"),
    tabuleiros: (n) => plural(n, "tablero", "tableros"),
    chaves: (n) => plural(n, "llave", "llaves"),
    semNiveis: "no se pudieron cargar los niveles",
  },

  modos: {
    puzzle: "Puzle",
    puzzles: "Puzles",
    tempo: "Contrarreloj",
    survival: "Supervivencia",
    desafio: "Desafío diario",
  },

  puzzle: {
    selos: { perfect: "Perfecto", clean: "Limpio", completed: "Completado" },
    voltarALista: "volver a la lista",
    ajudaJoker: "cómo funciona el comodín",
    desfazer: "Deshacer",
    dica: "Pista",
    reiniciarTitulo: "¿Reiniciar el nivel?",
    sairTitulo: "¿Salir del nivel?",
    jogadasPerdemSe: "Se perderán las jugadas que has hecho hasta ahora.",
    primeiroTempo: "primer tiempo",
    novoRecorde: (era) => `nuevo récord, antes ${era}`,
    oTeuRecorde: (tempo) => `tu récord es ${tempo}`,
    pecas: (restantes, total) => `${String(restantes)}/${String(total)} fichas`,
    facesSomam: (soma) => `las caras suman ${String(soma)}`,
    convite: "Toca las fichas para sumar 7",
    passavaDe7: "esa ficha se pasaba de 7",
    geloSoAPar: "una ficha helada solo sale con otra ficha",
    geloComGelo: "dos fichas heladas no salen juntas",
    faltam: (n) => `faltan ${String(n)}`,
    jogadas: "jugadas",
    desfeitas: "deshechas",
    dicas: "pistas",
    nivelSeguinte: "Siguiente nivel",
    verTabuleiro: "ver el tablero",
    becoTitulo: "¡Uy! ¡Callejón sin salida!",
    becoTexto: (restantes) =>
      restantes === 1
        ? "Ha sobrado 1 ficha, y ya no hay ningún grupo que sume 7."
        : `Han sobrado ${String(restantes)} fichas, y ya no hay ningún grupo que sume 7.`,
    becoJoker: "Con el comodín, la jugada fatal suele estar unas cuantas atrás.",
  },

  tempo: {
    limpos: (n) => (n === 1 ? "1 tablero limpio" : `${String(n)} tableros limpios`),
    saltados: (n) => (n === 1 ? "1 saltado" : `${String(n)} saltados`),
    sairDaCorrida: "salir de la partida",
    sairTitulo: "¿Salir de la partida?",
    sairTexto: "El reloj no se para: la partida acaba aquí.",
    sairTextoDesafio: "El reloj no se para: la partida acaba aquí, y es esta la que cuenta para el desafío.",
    geloSoAPar: "❄ solo sale en pareja",
    geloComGelo: "❄ no sale con hielo",
    comecar: "Empezar",
    voltar: "Volver",
    segundos: (n) => `${String(n)} segundos`,
    arranqueDesafio:
      "Los mismos tableros para todo el mundo. Solo cuenta este intento: una vez empieces, salir acaba la partida.",
    pontosNoTopo: (n) => `${String(n)} puntos`,
    tabuleirosNoTopo: (n) => `${String(n)} tableros`,
    pontosNoFim: (n) => `${String(n)} puntos`,
    saltar: (custo) => `Saltar (${custo})`,
    saltarAria: (segundos) => `saltar el tablero, cuesta ${String(segundos)} segundos`,
    saltarTabuleiro: "Saltar tablero",
    saltarFechadoAria: (n) => `saltar el tablero: disponible a partir del ${String(n)}.º tablero`,
    semJogadas: "Sin jugadas",
    semJogadasTexto: (restantes) =>
      restantes === 1
        ? "Ha sobrado 1 ficha, y ningún grupo suma 7."
        : `Han sobrado ${String(restantes)} fichas, y ningún grupo suma 7.`,
    novoRecorde: "Nuevo récord",
    acabouOTempo: "Se acabó el tiempo",
  },

  survival: {
    proximaLinha: "siguiente fila",
    proximaLinhaEm: (segundos, bomba) => `siguiente fila en ${String(segundos)} segundos${bomba}`,
    bombaEnterrada: ", enciende una bomba en la pila",
    naPilha: "en la pila",
    comBomba: ", con bomba",
    puxarLinha: "Bajar fila",
    recomecar: "Recomenzar",
    recomecarTitulo: "¿Recomenzar?",
    recomecarTexto: "Se perderán esta partida y su tiempo. El tablero vuelve al principio.",
    semJogadas: "sin jugadas",
    maisUmaLinha: "+1 fila",
    limpoTitulo: "¡Tablero limpio!",
    transbordouTitulo: "El tablero se desbordó",
    limpoLinhas: (n) => `Limpio, tras aguantar ${String(n)} filas`,
    linhasAguentadas: (n) => `${String(n)} filas aguantadas`,
    porLimpar:
      "El desafío queda hecho cuando limpies el tablero. Las filas son las mismas: inténtalo otra vez.",
    outraCorrida: "Otra partida",
    repetirEsta: "Repetir esta",
  },

  tutorialJoker: {
    regra:
      "La suma de cualquier tablero es siempre múltiplo de 7. El comodín vale exactamente lo que falta — y solo ese valor vacía el tablero.",
    facesSomam: "las caras suman",
    faltamPara: (joker) => `faltan ${String(joker)} para`,
    queE: (jogadas) => `que es 7 × ${String(jogadas)}`,
    morto: (restante) =>
      `Sobran ${String(restante)}. No es múltiplo de 7, y ya no queda comodín para corregirlo. El juego te dejó gastarlo en el valor equivocado sin avisarte — y en los niveles de verdad hace exactamente lo mismo.`,
    limpo:
      "Limpio. Fíjate en lo que el juego te dejaba hacer: gastar el comodín en otro valor estaba permitido, y el tablero moría en silencio. La cuenta de arriba te acompaña en los tres primeros niveles con comodín; a partir de ahí, la haces tú.",
    aJogar: "Toca el comodín para darle un valor. Después suma 7, como en cualquier jugada.",
    outroValor: "¿Y si elijo otro valor?",
    jaPercebi: "Entendido",
  },

  tabuleiro: {
    sufixoBomba: ", bomba",
  },

  joker: {
    seletorAria: "cuánto vale el comodín en esta jugada",
    seletorTitulo: "el comodín vale",
  },

  home: {
    modosAria: "modos de juego",
    modos: "Modos de juego",
    legendaPuzzles: "La campaña, capítulo a capítulo",
    lemaForte: "Tu objetivo es sencillo: sumar 7.",
    lema: " Conseguirlo es el verdadero reto.",
    escolherPerfil: "elegir nombre y avatar",
    mudarPerfil: (nome) => `${nome} — cambiar nombre y avatar`,
    recorde: (pontos) => `Récord ${String(pontos)}`,
    aMeio: (tempo) => `A medias · ${tempo}`,
    melhor: (tempo) => `Mejor ${tempo}`,
    interrompido: "Interrumpido",
    ariaDesafio: (numero, data, modo, estado, emRisco) =>
      `Desafío diario, número ${String(numero)}, ${data}: ${modo}, ${estado}.` +
      (emRisco === undefined ? "" : ` Racha de ${String(emRisco)} en peligro.`) +
      " Abrir.",
    comoJogar: "¿Cómo se juega?",
    comoJogarLegenda: "Junta fichas pegadas hasta que sumen 7.",
  },

  perfil: {
    quemEs: "¿Quién eres?",
    oTeuNome: "Tu nombre",
    oTeuAvatar: "Tu avatar",
    avatarAria: "avatar",
  },

  comoJogar: {
    titulo: "Cómo se juega",
    objetivo: "El objetivo",
    objetivoChamada: "Vaciar el tablero.",
    objetivoTexto:
      "En los Puzles no hay puntos que hacer ni tiempo que batir: un nivel acaba cuando no queda ninguna ficha. Y todos los niveles que publica el juego tienen solución — si te has atascado, ha sido por un camino, no por el nivel.",
    jogada: "Una jugada",
    jogadaChamada: "Toca fichas pegadas hasta que sumen exactamente 7.",
    jogadaTexto:
      "Las fichas que tocas quedan marcadas. Cuando suman 7, salen solas. Si te pasas de 7 la jugada no entra — y tocar otra vez una ficha ya elegida la quita de la cuenta.",
    jogadaMaximo: "Un grupo tiene como máximo siete fichas, que es lo que suman siete caras de 1.",
    ligadas: "Pegadas, no en diagonal",
    ligadasChamada: "Dos fichas están unidas si comparten un lado.",
    ligadasVale: "Vale: comparten un lado",
    ligadasNaoVale: "No vale: solo se tocan en la esquina",
    ligadasTexto:
      "Todo el grupo tiene que estar unido — cada ficha pegada a otra del grupo. En L, en T o en línea: la forma no importa, la unión sí.",
    depois: "Qué pasa después",
    depoisChamada: "Las fichas de arriba bajan, y las columnas vacías desaparecen.",
    depoisColunas:
      "Las columnas que se quedan vacías se cierran hacia la izquierda, y las que estaban a cada lado pasan a ser vecinas. Aquí nacen casi todos los grupos que antes no estaban.",
    depoisGrupos:
      "Los grupos nuevos que se formen quedan disponibles, pero no salen solos: solo desaparecen si los eliges. El juego nunca juega por ti — seguir un camino que no has elegido podría dejar el tablero sin salida.",
    joker: "El comodín",
    jokerChamadaAntes: "La ficha gris con un ",
    jokerSimbolo: "asterisco verde",
    jokerChamadaDepois: ". Hay como máximo uno por tablero.",
    jokerNota: "Tócalo para darle un valor del 1 al 6.",
    jokerSozinho:
      "El comodín nunca forma grupo solo: entra siempre con fichas fijas, y vale lo que les falta para llegar a 7.",
    jokerValor:
      "Solo uno de los seis valores vacía el tablero, y el juego te deja elegir otro sin avisar. El tablero no muere enseguida — falla al final, con fichas de sobra.",
    jokerTutorial: "Ver el tutorial del comodín",
    soldas: "Las soldaduras",
    soldasChamada: "Dos fichas unidas por una grapa salen juntas, o no sale ninguna.",
    soldasVale: "Vale: 2 + 1 + 4, la pareja entera",
    soldasNaoVale: "No vale: 2 + 5 deja el 1 atrás",
    soldasTexto:
      "Las dos fichas cuentan en la suma. Una soldadura nunca se rompe: la pareja baja junta hasta salir. Aparecen en los Puzles, a partir de Avanzado.",
    gelo: "El hielo",
    geloChamada: "Una ficha helada solo sale en pareja: con una única ficha que no esté helada.",
    geloVale: "Vale: 5 + 2, en pareja",
    geloNaoVale: "No vale: 5 + 1 + 1",
    geloTexto:
      "Dos fichas heladas tampoco salen juntas, aunque sumen 7. El hielo no se derrite: la ficha que libera a la helada vale oro, y gastarla en otra jugada puede dejar la helada atrapada.",
    geloOnde: "Aparece en los Puzles Experto y en la Contrarreloj, a partir del séptimo tablero.",
    bomba: "La bomba",
    bombaChamada: "Una ficha con mecha. Quítala en una jugada antes de que se acabe.",
    bombaNota: "El número de la mecha son los segundos que quedan.",
    bombaDesarmar:
      "Para desactivarla, basta con que entre en un grupo de 7, como cualquier otra ficha. Si la mecha se acaba, explota — y la ficha se queda en el tablero.",
    bombaCastigo: (segundos) =>
      `En la Contrarreloj, que explote cuesta ${String(segundos)} segundos. En Supervivencia, cae una fila más, y las fichas pegadas a la bomba suben un punto: un 1 pasa a 2, y un 6 se queda en 6.`,
    bombaQuando:
      "Hay una bomba cada vez. En la Contrarreloj puede aparecer a partir del cuarto tablero. En Supervivencia ves en la fila siguiente si trae bomba — y más adelante hay bombas que se encienden en una ficha que ya está en la pila.",
    selos: "Los sellos",
    selosChamada: "Cada nivel guarda el mejor sello que le has dado.",
    selosTextos: {
      perfect: "Has limpiado el nivel sin deshacer, sin reiniciar y sin pedir pistas.",
      clean: "Has limpiado el nivel de una tirada, pero con una o más pistas.",
      completed: "Has limpiado el nivel, deshaciendo o después de reiniciar.",
    },
    selosNuncaDescem: "Un sello nunca baja: volver a un nivel solo puede mejorarlo.",
    modos: "Los modos",
    modoPuzzles:
      "La campaña. Tableros hechos a mano por el generador, siempre con solución, del más fácil al más difícil.",
    modoTempo: (saltar) =>
      `Un único reloj, que nunca se para. Cada tablero limpio devuelve tiempo, pero cada vez menos, y los tableros van creciendo. Una ficha que se pase de 7 cuesta tiempo. Y cuidado con las bombas: quítalas antes de que se acabe la mecha. Del séptimo tablero en adelante, un tablero puede quedarse sin jugadas: entonces sáltalo, por ${String(saltar)} segundos. Y aparecen fichas heladas, que solo salen en pareja con una ficha que no esté helada.`,
    modoSurvival:
      "De vez en cuando cae una fila nueva por arriba. Ves cuál es antes de que caiga; se acaba cuando la pila llega al techo. Si te quedas sin jugadas, la fila cae enseguida; si te pasas de 7, llega 3 segundos antes. Algunas filas traen una bomba: quítala antes de que se acabe la mecha, o cae una fila más y las fichas de alrededor suben un punto. Más adelante hay bombas que se encienden en una ficha que ya está en la pila: desentiérrala a tiempo.",
    modoDesafio:
      "Todos los días, un desafío igual para todo el mundo: un Puzle, una Contrarreloj o una Supervivencia, por turnos. El camino muestra el recorrido — lo que ya has hecho y lo que viene. El Puzle y la Supervivencia quedan hechos cuando limpias el tablero, y puedes intentarlo hasta entonces; en la Contrarreloj, cuenta la primera partida. Después es entrenamiento, con los mismos tableros. Al final, comparte el resultado — y no dejes que se rompa tu racha. La racha da llaves (a los 3, 7, 14 y 30 días): una llave abre un desafío que te quedó por jugar, o salva la racha si fallas un día.",
  },

  capitulos: {
    iniciado: { nome: "Iniciado", descricao: "Parejas y tríos, sin prisa" },
    medio: { nome: "Intermedio", descricao: "Grupos de hasta cuatro, y aparece el comodín" },
    avancado: { nome: "Avanzado", descricao: "Caras altas, pocas parejas" },
    perito: { nome: "Experto", descricao: "Tableros grandes, sin margen" },
  },

  niveis: {
    selos: { perfect: "perfecto", clean: "limpio", completed: "completado" },
    nivelComSelo: (n, selo) => `nivel ${n}, ${selo}`,
    nivelSeguinte: (n) => `nivel ${n}, el siguiente`,
    nivelPorJogar: (n) => `nivel ${n}, sin jugar`,
  },

  desafio: {
    etiqueta: (n) => `Desafío #${String(n)}`,
    etiquetaTreino: (etiqueta) => `${etiqueta} · entrenamiento`,
    survivalLimpo: (tempo) => `limpio · ${tempo}`,
    legendas: {
      puzzle: "Un tablero, el mismo para todos. Resuélvelo.",
      tempo: "Sesenta segundos, y los mismos tableros para todos.",
      survival: "Las mismas filas para todos. Limpia el tablero antes de que se desborde.",
    },
    emRisco: "en peligro",
    diasSeguidos,
    diasEmRisco: (n) => `${diasSeguidos(n)}, en peligro`,
    quando: (n) =>
      n === 0
        ? "Hoy"
        : n === 1
          ? "Mañana"
          : n === -1
            ? "Ayer"
            : n > 0
              ? `Dentro de ${String(n)} días`
              : `Hace ${String(-n)} días`,
    estados: {
      porJogar: "sin jugar",
      aMeio: "a medias",
      feito: (resultado) => `hecho, ${resultado}`,
      feitoCurto: "hecho",
      interrompido: "interrumpido",
      perdido: "se quedó sin jugar",
      futuro: "aún no se ha abierto",
    },
    chavesAria: (n) => `${plural(n, "llave", "llaves")}. ¿Para qué sirven?`,
    meses: "Los meses",
    nota:
      "Un desafío al día, por turnos: Puzle, Contrarreloj y Supervivencia. Cuenta el primer intento; después es entrenamiento. Cambia a medianoche. La racha da llaves, que abren los días que se quedaron sin jugar.",
    feitosDe: (feitos, de) => `${String(feitos)} de ${String(de)} hechos`,
    completo: ", completo",
    anoAnterior: "año anterior",
    anoSeguinte: "año siguiente",
    mesFuturo: "aún no ha empezado",
    mesSemDesafio: "sin desafío",
    listaDoMes: (mes) => `Los desafíos de ${mes}, del final al principio`,
    fimDoMes: (mes) => `Fin de ${mes}`,
    faltamDias: (n) => (n === 1 ? "falta 1 día" : `faltan ${String(n)} días`),
    inicioDoDesafio: "Inicio del desafío",
    inicio: "Inicio",
    ariaHoje: ", hoy",
    ariaSalvo: "racha salvada con una llave",
    ariaAberto: "abierto con una llave",
    ariaGanhou: (chaves) => `ganó ${chaves}`,
    ariaBalao: (n, data) => `Desafío número ${String(n)}, ${data}`,
    ariaPremioDeHoje: (chaves) =>
      chaves > 0
        ? `un día más en la racha, y ${plural(chaves, "llave", "llaves")}`
        : "un día más en la racha",
    treinar: "Entrenar",
    continuar: "Continuar",
    notaPatamar: (chaves) => `🔑 +${String(chaves)}: la racha ha llegado a un hito.`,
    notaJogadoDepois: "Jugado después, con una llave: cuenta para el mes, no para la racha.",
    naoContaHoje: "No cuenta, y el resto del día es entrenamiento.",
    naoConta: "No cuenta: de aquí en adelante es entrenamiento.",
    ficouPorJogar: "Se quedó sin jugar.",
    notaSalva: "🔑 Una llave salvó la racha.",
    abreAMeiaNoite: "Se abre a medianoche.",
    abreNoDia: (dia) => `Se abre el día ${dia}.`,
    salvar: "Salvar la racha",
    desbloquear: "Desbloquear",
    semChaves: (dias) => `Sin llaves. La próxima llega a los ${String(dias)} días seguidos.`,
    riscoTitulo: "Tu racha está en peligro",
    riscoTexto: (sequencia, chaves) =>
      `Ayer se quedó sin jugar, y tu racha de ${sequencia === 1 ? "1 día" : `${String(sequencia)} días`} se acaba ahí. ` +
      `Una llave la salva: ayer no suma, pero la racha sigue. Tienes ${chaves}.`,
    usar: "Usar",
    agoraNao: "Ahora no",
    desbloquearTitulo: (n) => `¿Desbloquear el desafío #${String(n)}?`,
    desbloquearTexto: (modo, data, chaves) =>
      `Gastas una llave y juegas el desafío de ${modo} del ${data}. ` +
      `Cuenta el primer intento: para el mes, pero no para la racha. Tienes ${chaves}.`,
    desbloquearEJogar: "Desbloquear y jugar",
    premioTexto: (dias, chaves) =>
      `¡${dias}! Has ganado ${chaves}: abre un desafío que se quedó sin jugar, o salva la racha el día que falles.`,
    boa: "¡Genial!",
    ganhamSe: "Se ganan con la racha:",
    proximoPatamar: (dias, chaves, faltam) =>
      `Después de los 30, el ciclo vuelve a empezar. La próxima: a los ${String(dias)} días, +${String(chaves)} 🔑 — ` +
      `${faltam === 1 ? "falta 1 día" : `faltan ${String(faltam)} días`}.`,
    asChaves: "Las llaves",
    chavesTexto:
      "Una llave abre un desafío que se quedó sin jugar — cuenta para el mes, pero no para la racha — o salva la racha cuando fallas un día.",
    percebi: "Entendido",
  },

  definicoes: {
    titulo: "Ajustes",
    idioma: "Idioma",
    notaIdioma: "«Sistema» sigue el idioma del móvil.",
    idiomaAria: "idioma",
    sistema: "Sistema",
    tema: "Tema",
    notaTema: "Las caras no cambian de tema — una ficha es la misma ficha en los dos fondos.",
    temaAria: "tema",
    claro: "Claro",
    escuro: "Oscuro",
    vibracao: "Vibración",
    notaVibracao: "Un toque en el dedo en cada jugada, y un aviso cuando la jugada no entra.",
    vibracaoAria: "vibración",
    ligada: "Activada",
    desligada: "Desactivada",
    notaTempo: "Tiempo inicial. Cada tablero limpio suma al mismo reloj.",
    tempoAria: "tiempo inicial",
    progresso: "Progreso",
    notaProgresso: "Borra los sellos, los mejores resultados y los récords de la Contrarreloj. No se puede deshacer.",
    apagar: "Borrar el progreso",
    apagarConfirmar: "Pulsa otra vez para borrarlo todo",
    apagado: "Progreso borrado",
  },

  partilha: {
    cabeca: (numero, data) => `DiceToSeven · Desafío #${String(numero)} · ${data}`,
    sequencia: (dias) => `🔥 ${String(dias)} días seguidos`,
    puzzle: (tempo, selo) => `🧩 Puzle: ${tempo} · ${selo}`,
    tempo: (pontos, tabuleiros) =>
      `⏱️ Contrarreloj: ${plural(pontos, "punto", "puntos")} · ${plural(tabuleiros, "tablero", "tableros")}`,
    survival: (tempo) => `🧱 Supervivencia: limpio en ${tempo}`,
    selos: { perfect: "★ perfecto", clean: "◆ limpio", completed: "completado" },
  },

  paginaMedalhas: {
    titulo: "Medallas",
    tipos: "tipo de medalla",
    normais: "Normales",
    premium: "Prémium",
    contaDaAba: (aba, ganhas, total) => `${aba}: ${String(ganhas)} de ${String(total)}`,
    conquistada: "Conseguida",
    porConquistar: "Por conseguir",
    minutos: (n) => `${String(n)} minutos`,
    nova: "Nueva",
    ariaPremium: "medalla prémium",
    ariaConquistada: (data) => `conseguida el ${data}`,
    ariaPorConquistar: "por conseguir",
    ariaNova: "nueva",
    estadoGanha: (data) => `Conseguida el ${data}.`,
    estadoProgresso: (quanto) => `Llevas ${quanto}.`,
    estadoPorGanhar: "Aún por conseguir.",
    fechar: "Cerrar",
    novas: (n) => (n === 1 ? "Nueva medalla: " : "Nuevas medallas: "),
    ariaEntrada: (ganhas, total, novas) =>
      `Medallas: ${String(ganhas)} de ${String(total)}${novas ? ", con nuevas por ver" : ""}`,
  },

  medalhas: {
    nomes: {
      iniciado: "Iniciado",
      medio: "Intermedio",
      avancado: "Avanzado",
      perito: "Experto",
      "primeiro-perfeito": "Perfección",
      "perito-perfeito": "Experto perfecto",
      "campanha-perfeita": "Campaña perfecta",
      maratona: "Maratón",
      recordista: "Plusmarquista",
      ultramaratona: "Ultramaratón",
      "cinco-minutos": "Cinco minutos",
      "dez-minutos": "Diez minutos",
      "dez-limpezas": "Diez limpiezas",
      semana: "Una semana",
      "mes-completo": "Mes completo",
      "trinta-dias": "Imparable",
      "cem-dias": "Centenario",
    },
    descricoes: {
      iniciado: "Acabar todos los niveles de Iniciado.",
      medio: "Acabar todos los niveles de Intermedio.",
      avancado: "Acabar todos los niveles de Avanzado.",
      perito: "Acabar todos los niveles de Experto.",
      "primeiro-perfeito": "Acabar un nivel con el sello Perfecto: sin deshacer, sin reiniciar y sin pistas.",
      "perito-perfeito": "Todos los niveles de Experto con el sello Perfecto.",
      "campanha-perfeita": "Todos los niveles de la campaña con el sello Perfecto.",
      maratona: `Limpiar ${String(LIMIARES.maratona)} tableros en una partida de Contrarreloj.`,
      recordista: `Hacer ${milhares(LIMIARES.recordista)} puntos en una partida de Contrarreloj.`,
      ultramaratona: `Limpiar ${String(LIMIARES.ultramaratona)} tableros en una partida de Contrarreloj.`,
      "cinco-minutos": "Aguantar cinco minutos en una partida de Supervivencia.",
      "dez-minutos": "Aguantar diez minutos en una partida de Supervivencia.",
      "dez-limpezas": `Limpiar el tablero de Supervivencia ${String(LIMIARES.limpezas)} veces.`,
      semana: `Hacer el Desafío diario ${String(LIMIARES.semana)} días seguidos.`,
      "mes-completo": "Hacer todos los desafíos de un mes — la ★ en el camino de los meses.",
      "trinta-dias": `Hacer el Desafío diario ${String(LIMIARES.trintaDias)} días seguidos.`,
      "cem-dias": `Hacer el Desafío diario ${String(LIMIARES.cemDias)} días seguidos.`,
    },
    unidades: {
      niveis: "niveles",
      perfeitos: "perfectos",
      tabuleiros: "tableros",
      pontos: "puntos",
      limpezas: "limpiezas",
      dias: "días seguidos",
    },
  },
};
