/**
 * Os textos do jogo em francês de França.
 *
 * A forma é a do português (`Textos`): o compilador recusa um texto que falte.
 * Tratamento por «tu», como no original.
 *
 * ── A tipografia francesa ──
 *
 * Em francês há um espaço fino inquebrável antes de `:`, `;`, `!` e `?`, e
 * dentro das aspas «». Escrito à mão em cada texto, esquecia-se metade; aqui
 * escreve-se o texto com um espaço normal, e `tipografia` troca-o pelo fino em
 * todos os textos de uma vez — também nos que são funções, no resultado.
 */

import { DEFAULT_COMBO_CONFIG } from "../session/combos";
import { COMPOSICOES } from "../session/estatisticas";
import { LIMIARES } from "../session/medalhas";
import type { Textos } from "./pt";

const JANELA = new Intl.NumberFormat("fr-FR").format(DEFAULT_COMBO_CONFIG.windowMs / 1000);

const FINO = " ";

/** O espaço normal antes da pontuação alta passa a fino e inquebrável. */
const corrigir = (s: string): string =>
  s.replace(/ ([:;!?»])/g, `${FINO}$1`).replace(/« /g, `«${FINO}`);

function tipografia<T>(x: T): T {
  if (typeof x === "string") return corrigir(x) as T;
  if (typeof x === "function") {
    const f = x as (...a: unknown[]) => unknown;
    const embrulhada = (...a: unknown[]): unknown => tipografia(f(...a));
    // O mesmo número de argumentos que a original: quem a inspeciona — os
    // testes — vê a mesma função.
    Object.defineProperty(embrulhada, "length", { value: f.length });
    return embrulhada as T;
  }
  if (typeof x === "object" && x !== null) {
    return Object.fromEntries(
      Object.entries(x).map(([k, v]) => [k, tipografia(v)]),
    ) as T;
  }
  return x;
}

/** `30000` → `30 000`, com o espaço fino. */
const milhares = (n: number): string =>
  String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, FINO);

const MESES = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
] as const;

const MESES_CURTOS = [
  "janv.", "févr.", "mars", "avr.", "mai", "juin",
  "juil.", "août", "sept.", "oct.", "nov.", "déc.",
] as const;

const mes = (m: number): string => MESES[m - 1] ?? "";
const mesCurto = (m: number): string => MESES_CURTOS[m - 1] ?? "";

const plural = (n: number, um: string, varios: string): string =>
  `${String(n)} ${n === 1 ? um : varios}`;

const diasSeguidos = (n: number): string => plural(n, "jour d’affilée", "jours d’affilée");

/** O primeiro do mês diz-se «1er»; os outros, pelo número. */
const diaDoMes = (dia: number): string => (dia === 1 ? "1er" : String(dia));

const FR_CRU: Textos = {
  lang: "fr-FR",

  formato: {
    milhares,
    dataCurta: (dia, m) => `${diaDoMes(dia)} ${mesCurto(m)}`,
    dataPorExtenso: (dia, m) => `${diaDoMes(dia)} ${mes(m)}`,
    dataCompleta: (dia, m, ano) => `${diaDoMes(dia)} ${mes(m)} ${String(ano)}`,
    mesPorExtenso: (m, ano) => `${mes(m)} ${String(ano)}`,
    nomeDoMes: (m) => mes(m),
    mesCurto: (m) => mesCurto(m),
  },

  comum: {
    voltar: "retour",
    fechar: "fermer",
    cancelar: "Annuler",
    guardar: "Enregistrer",
    sair: "Quitter",
    jogar: "Jouer",
    partilhar: "Partager",
    copiado: "Copié",
    copiadoComVisto: "Copié ✓",
    naoDeuParaCopiar: "Impossible de copier",
    partilharResultado: "Partager le résultat du jour",
    reiniciar: "Recommencer",
    repetir: "Rejouer",
    treinarOutraVez: "S’entraîner encore",
    jogarOutraVez: "Rejouer",
    tentarOutraVez: "Réessayer",
    tabuleiro: "plateau",
    joker: "joker",
    face: (v) => `face ${String(v)}`,
    pontos: (n) => plural(n, "point", "points"),
    tabuleiros: (n) => plural(n, "plateau", "plateaux"),
    chaves: (n) => plural(n, "clé", "clés"),
    semNiveis: "impossible de charger les niveaux",
  },

  modos: {
    puzzle: "Puzzle",
    puzzles: "Puzzles",
    tempo: "Contre-la-montre",
    survival: "Survie",
    desafio: "Défi du jour",
  },

  puzzle: {
    selos: { perfect: "Parfait", clean: "Net", completed: "Terminé" },
    voltarALista: "retour à la liste",
    ajudaJoker: "comment marche le joker",
    desfazer: "Annuler",
    dica: "Indice",
    reiniciarTitulo: "Recommencer le niveau ?",
    sairTitulo: "Quitter le niveau ?",
    jogadasPerdemSe: "Les coups joués jusqu’ici seront perdus.",
    primeiroTempo: "premier temps",
    novoRecorde: (era) => `nouveau record, avant ${era}`,
    oTeuRecorde: (tempo) => `ton record est ${tempo}`,
    pecas: (restantes, total) => `${String(restantes)}/${String(total)} pièces`,
    facesSomam: (soma) => `les faces font ${String(soma)}`,
    convite: "Touche les pièces pour faire 7",
    passavaDe7: "cette pièce dépassait 7",
    geloSoAPar: "une pièce gelée ne part qu’avec une seule pièce",
    geloComGelo: "deux pièces gelées ne partent pas ensemble",
    faltam: (n) => `il manque ${String(n)}`,
    jogadas: "coups",
    desfeitas: "annulés",
    dicas: "indices",
    nivelSeguinte: "Niveau suivant",
    verTabuleiro: "voir le plateau",
    becoTitulo: "Oups ! Impasse !",
    becoTexto: (restantes) =>
      restantes === 1
        ? "Il reste 1 pièce, et plus aucun groupe ne fait 7."
        : `Il reste ${String(restantes)} pièces, et plus aucun groupe ne fait 7.`,
    becoJoker: "Avec le joker, le coup fatal est souvent quelques coups plus tôt.",
  },

  tempo: {
    limpos: (n) => (n === 1 ? "1 plateau vidé" : `${String(n)} plateaux vidés`),
    saltados: (n) => (n === 1 ? "1 passé" : `${String(n)} passés`),
    sairDaCorrida: "quitter la partie",
    sairTitulo: "Quitter la partie ?",
    sairTexto: "Le chrono ne s’arrête pas : la partie s’arrête ici.",
    sairTextoDesafio:
      "Le chrono ne s’arrête pas : la partie s’arrête ici, et c’est elle qui compte pour le défi.",
    geloSoAPar: "❄ ne part qu’en paire",
    geloComGelo: "❄ ne part pas avec la glace",
    comecar: "Commencer",
    voltar: "Retour",
    segundos: (n) => `${String(n)} secondes`,
    arranqueDesafio:
      "Les mêmes plateaux pour tout le monde. Seule cette tentative compte : une fois commencée, quitter met fin à la partie.",
    pontosNoTopo: (n) => `${String(n)} points`,
    tabuleirosNoTopo: (n) => `${String(n)} plateaux`,
    pontosNoFim: (n) => `${String(n)} points`,
    saltar: (custo) => `Passer (${custo})`,
    saltarAria: (segundos) => `passer le plateau, coûte ${String(segundos)} secondes`,
    saltarTabuleiro: "Passer le plateau",
    saltarFechadoAria: (n) => `passer le plateau : disponible à partir du ${String(n)}e plateau`,
    semJogadas: "Plus de coups",
    semJogadasTexto: (restantes) =>
      restantes === 1
        ? "Il reste 1 pièce, et aucun groupe ne fait 7."
        : `Il reste ${String(restantes)} pièces, et aucun groupe ne fait 7.`,
    novoRecorde: "Nouveau record",
    acabouOTempo: "Temps écoulé",
  },

  survival: {
    proximaLinha: "prochaine ligne",
    proximaLinhaEm: (segundos, bomba) => `prochaine ligne dans ${String(segundos)} secondes${bomba}`,
    bombaEnterrada: ", allume une bombe dans la pile",
    naPilha: "dans la pile",
    comBomba: ", avec une bombe",
    puxarLinha: "Tirer une ligne",
    recomecar: "Recommencer",
    recomecarTitulo: "Recommencer ?",
    recomecarTexto: "Cette partie et son temps seront perdus. Le plateau revient au début.",
    semJogadas: "plus de coups",
    maisUmaLinha: "+1 ligne",
    limpoTitulo: "Plateau vidé !",
    transbordouTitulo: "Le plateau a débordé",
    limpoLinhas: (n) => `Vidé, après avoir tenu ${String(n)} lignes`,
    linhasAguentadas: (n) => `${String(n)} lignes tenues`,
    porLimpar:
      "Le défi est réussi quand tu vides le plateau. Les lignes sont les mêmes : réessaie.",
    outraCorrida: "Une autre partie",
    repetirEsta: "Rejouer celle-ci",
  },

  tutorialJoker: {
    regra:
      "La somme de n’importe quel plateau est toujours un multiple de 7. Le joker vaut exactement ce qui manque — et seule cette valeur vide le plateau.",
    facesSomam: "les faces font",
    faltamPara: (joker) => `il manque ${String(joker)} pour`,
    queE: (jogadas) => `soit 7 × ${String(jogadas)}`,
    morto: (restante) =>
      `Il reste ${String(restante)}. Ce n’est pas un multiple de 7, et il n’y a plus de joker pour corriger. Le jeu t’a laissé le dépenser sur la mauvaise valeur sans te prévenir — et les vrais niveaux font exactement pareil.`,
    limpo:
      "Vidé. Remarque ce que le jeu te laissait faire : dépenser le joker sur une autre valeur était permis, et le plateau mourait en silence. Le calcul ci-dessus t’accompagne pendant les trois premiers niveaux avec joker ; ensuite, c’est à toi de le faire.",
    aJogar: "Touche le joker pour lui donner une valeur. Puis fais 7, comme pour n’importe quel coup.",
    outroValor: "Et si je choisis une autre valeur ?",
    jaPercebi: "J’ai compris",
  },

  tabuleiro: {
    sufixoBomba: ", bombe",
  },

  joker: {
    seletorAria: "combien vaut le joker pour ce coup",
    seletorTitulo: "le joker vaut",
  },

  home: {
    modosAria: "modes de jeu",
    legendaPuzzles: "La campagne, chapitre par chapitre",
    escolherPerfil: "choisir un nom et un avatar",
    mudarPerfil: (nome) => `${nome} — changer le nom et l’avatar`,
    recorde: (pontos) => `Record ${String(pontos)}`,
    aMeio: (tempo) => `En cours · ${tempo}`,
    melhor: (tempo) => `Meilleur ${tempo}`,
    interrompido: "Interrompu",
    ariaDesafio: (numero, data, modo, estado, emRisco) =>
      `Défi du jour, numéro ${String(numero)}, ${data} : ${modo}, ${estado}.` +
      (emRisco === undefined ? "" : ` Série de ${String(emRisco)} en danger.`) +
      " Ouvrir.",
    comoJogar: "Comment jouer ?",
    comoJogarLegenda: "Assemble des pièces qui se touchent jusqu’à faire 7.",
  },

  perfil: {
    quemEs: "Qui es-tu ?",
    oTeuNome: "Ton nom",
    oTeuAvatar: "Ton avatar",
    avatarAria: "avatar",
  },

  comoJogar: {
    titulo: "Comment jouer",
    objetivo: "Le but",
    objetivoChamada: "Vider le plateau.",
    objetivoTexto:
      "Pas de points à faire ni de chrono à battre dans les Puzzles : un niveau se termine quand il ne reste plus aucune pièce. Et tous les niveaux publiés par le jeu ont une solution — si tu es bloqué, c’est le chemin, pas le niveau.",
    jogada: "Un coup",
    jogadaChamada: "Touche des pièces qui se touchent jusqu’à faire exactement 7.",
    jogadaTexto:
      "Les pièces que tu touches sont marquées. Quand elles font 7, elles partent toutes seules. Si tu dépasses 7, le coup ne passe pas — et toucher à nouveau une pièce déjà choisie la retire du calcul.",
    jogadaMaximo: "Un groupe a au plus sept pièces, ce que font sept faces de 1.",
    ligadas: "Côte à côte, pas en diagonale",
    ligadasChamada: "Deux pièces sont reliées si elles partagent un côté.",
    ligadasVale: "Ça compte : elles partagent un côté",
    ligadasNaoVale: "Ça ne compte pas : elles ne se touchent que par le coin",
    ligadasTexto:
      "Tout le groupe doit être relié — chaque pièce collée à une autre du groupe. En L, en T ou en ligne : la forme n’a pas d’importance, le lien si.",
    depois: "Ce qui se passe ensuite",
    depoisChamada: "Les pièces du dessus tombent, et les colonnes vides disparaissent.",
    depoisColunas:
      "Les colonnes qui se vident se referment vers la gauche, et celles de chaque côté deviennent voisines. C’est là que naissent presque tous les nouveaux groupes.",
    depoisGrupos:
      "Les nouveaux groupes qui se forment sont disponibles, mais ne partent pas tout seuls : ils ne disparaissent que si tu les choisis. Le jeu ne joue jamais à ta place — suivre un chemin que tu n’as pas choisi pourrait laisser le plateau sans issue.",
    joker: "Le joker",
    jokerChamadaAntes: "La pièce grise avec un ",
    jokerSimbolo: "astérisque vert",
    jokerChamadaDepois: ". Il y en a au plus un par plateau.",
    jokerNota: "Touche-le pour lui donner une valeur de 1 à 6.",
    jokerSozinho:
      "Le joker ne forme jamais un groupe seul : il va toujours avec des pièces fixes, et vaut ce qui leur manque pour faire 7.",
    jokerValor:
      "Une seule des six valeurs vide le plateau, et le jeu te laisse en choisir une autre sans prévenir. Le plateau ne meurt pas tout de suite — il échoue à la fin, avec des pièces en trop.",
    jokerTutorial: "Voir le tutoriel du joker",
    soldas: "Les soudures",
    soldasChamada: "Deux pièces reliées par une agrafe partent ensemble, ou aucune ne part.",
    soldasVale: "Ça compte : 2 + 1 + 4, toute la paire",
    soldasNaoVale: "Ça ne compte pas : 2 + 5 laisse le 1 derrière",
    soldasTexto:
      "Les deux pièces comptent dans la somme. Une soudure ne casse jamais : la paire tombe ensemble jusqu’à partir. Elles apparaissent dans les Puzzles, à partir d’Avancé.",
    gelo: "La glace",
    geloChamada: "Une pièce gelée ne part qu’en paire : avec une seule pièce, qui ne soit pas gelée.",
    geloVale: "Ça compte : 5 + 2, en paire",
    geloNaoVale: "Ça ne compte pas : 5 + 1 + 1",
    geloTexto:
      "Deux pièces gelées ne partent pas ensemble non plus, même si elles font 7. La glace ne fond pas : la pièce qui libère la gelée vaut de l’or, et la dépenser ailleurs peut laisser la gelée coincée.",
    geloOnde: "Elle apparaît dans les Puzzles Expert et dans le Contre-la-montre, à partir du septième plateau.",
    bomba: "La bombe",
    bombaChamada: "Une pièce avec une mèche. Enlève-la en un coup avant qu’elle ne brûle.",
    bombaNota: "Le nombre sur la mèche, ce sont les secondes qui restent.",
    bombaDesarmar:
      "Pour la désamorcer, il suffit qu’elle entre dans un groupe de 7, comme n’importe quelle pièce. Si la mèche s’éteint, elle explose — et la pièce reste sur le plateau.",
    bombaCastigo: (segundos) =>
      `En Contre-la-montre, une explosion coûte ${String(segundos)} secondes. En Survie, une ligne de plus tombe, et les pièces collées à la bombe montent d’un point : un 1 devient 2, et un 6 reste 6.`,
    bombaQuando:
      "Il y a une bombe à la fois. En Contre-la-montre, elle peut apparaître dès le quatrième plateau. En Survie, tu vois sur la ligne suivante si elle apporte une bombe — et plus loin, il y a des bombes qui s’allument sur une pièce déjà dans la pile.",
    selos: "Les sceaux",
    selosChamada: "Chaque niveau garde le meilleur sceau que tu lui as donné.",
    selosTextos: {
      perfect: "Tu as vidé le niveau sans annuler, sans recommencer et sans demander d’indice.",
      clean: "Tu as vidé le niveau d’une traite, mais avec un ou plusieurs indices.",
      completed: "Tu as vidé le niveau, en annulant ou après avoir recommencé.",
    },
    selosNuncaDescem: "Un sceau ne baisse jamais : rejouer un niveau ne peut que l’améliorer.",
    modos: "Les modes",
    modoPuzzles:
      "La campagne. Des plateaux faits main par le générateur, toujours avec une solution, du plus facile au plus difficile.",
    modoTempo: (saltar) =>
      `Un seul chrono, qui ne s’arrête jamais. Chaque plateau vidé rend du temps, mais de moins en moins, et les plateaux grandissent. Une pièce qui dépasse 7 coûte du temps. Et attention aux bombes : enlève-les avant que la mèche ne brûle. À partir du septième plateau, un plateau peut se retrouver sans coup possible : passe-le alors, pour ${String(saltar)} secondes. Et des pièces gelées apparaissent, qui ne partent qu’en paire avec une pièce qui n’est pas gelée.`,
    modoSurvival:
      "De temps en temps, une nouvelle ligne tombe par le haut. Tu vois laquelle avant qu’elle tombe ; c’est fini quand la pile atteint le plafond. Si tu n’as plus de coup possible, la ligne tombe aussitôt ; si tu dépasses 7, elle arrive 3 secondes plus tôt. Certaines lignes apportent une bombe : enlève-la avant que la mèche ne brûle, ou une ligne de plus tombe et les pièces autour montent d’un point. Plus loin, il y a des bombes qui s’allument sur une pièce déjà dans la pile : déterre-la à temps.",
    modoDesafio:
      "Chaque jour, le même défi pour tout le monde : un Puzzle, un Contre-la-montre ou une Survie, à tour de rôle. Le parcours montre le chemin — ce que tu as fait et ce qui vient. Le Puzzle et la Survie sont réussis quand tu vides le plateau, et tu peux réessayer jusque-là ; en Contre-la-montre, c’est la première partie qui compte. Ensuite, c’est de l’entraînement, avec les mêmes plateaux. À la fin, partage ton résultat — et ne laisse pas ta série se briser. La série rapporte des clés (à 3, 7, 14 et 30 jours) : une clé ouvre un défi manqué, ou sauve ta série si tu rates un jour.",
  },

  capitulos: {
    iniciado: { nome: "Débutant", descricao: "Paires et trios, sans se presser" },
    medio: { nome: "Intermédiaire", descricao: "Des groupes jusqu’à quatre, et le joker qui arrive" },
    avancado: { nome: "Avancé", descricao: "Faces hautes, peu de partenaires" },
    perito: { nome: "Expert", descricao: "Grands plateaux, aucune marge" },
  },

  niveis: {
    selos: { perfect: "parfait", clean: "net", completed: "terminé" },
    nivelComSelo: (n, selo) => `niveau ${n}, ${selo}`,
    nivelSeguinte: (n) => `niveau ${n}, le suivant`,
    nivelPorJogar: (n) => `niveau ${n}, pas encore joué`,
  },

  desafio: {
    etiqueta: (n) => `Défi n° ${String(n)}`,
    etiquetaTreino: (etiqueta) => `${etiqueta} · entraînement`,
    survivalLimpo: (tempo) => `vidé · ${tempo}`,
    legendas: {
      puzzle: "Un plateau, le même pour tous. Résous-le.",
      tempo: "Soixante secondes, et les mêmes plateaux pour tous.",
      survival: "Les mêmes lignes pour tous. Vide le plateau avant qu’il ne déborde.",
    },
    emRisco: "en danger",
    diasSeguidos,
    diasEmRisco: (n) => `${diasSeguidos(n)}, en danger`,
    quando: (n) =>
      n === 0
        ? "Aujourd’hui"
        : n === 1
          ? "Demain"
          : n === -1
            ? "Hier"
            : n > 0
              ? `Dans ${String(n)} jours`
              : `Il y a ${String(-n)} jours`,
    estados: {
      porJogar: "pas encore joué",
      aMeio: "en cours",
      feito: (resultado) => `réussi, ${resultado}`,
      feitoCurto: "réussi",
      interrompido: "interrompu",
      perdido: "manqué",
      futuro: "pas encore ouvert",
    },
    chavesAria: (n) => `${plural(n, "clé", "clés")}. À quoi servent-elles ?`,
    meses: "Les mois",
    nota:
      "Un défi par jour, à tour de rôle : Puzzle, Contre-la-montre et Survie. La première tentative compte ; ensuite, c’est de l’entraînement. Ça change à minuit. La série rapporte des clés, qui ouvrent les jours manqués.",
    feitosDe: (feitos, de) => `${String(feitos)} sur ${String(de)} réussis`,
    completo: ", complet",
    anoAnterior: "année précédente",
    anoSeguinte: "année suivante",
    mesFuturo: "pas encore commencé",
    mesSemDesafio: "pas de défi",
    listaDoMes: (mes) => `Les défis de ${mes}, de la fin au début`,
    fimDoMes: (mes) => `Fin ${mes}`,
    faltamDias: (n) => (n === 1 ? "plus qu’1 jour" : `plus que ${String(n)} jours`),
    inicioDoDesafio: "Début du défi",
    inicio: "Début",
    ariaHoje: ", aujourd’hui",
    ariaSalvo: "série sauvée avec une clé",
    ariaAberto: "ouvert avec une clé",
    ariaGanhou: (chaves) => `a rapporté ${chaves}`,
    ariaBalao: (n, data) => `Défi numéro ${String(n)}, ${data}`,
    ariaPremioDeHoje: (chaves) =>
      chaves > 0
        ? `un jour de plus dans la série, et ${plural(chaves, "clé", "clés")}`
        : "un jour de plus dans la série",
    treinar: "S’entraîner",
    continuar: "Continuer",
    notaPatamar: (chaves) => `🔑 +${String(chaves)} : ta série a franchi un palier.`,
    notaJogadoDepois: "Joué plus tard, avec une clé : compte pour le mois, pas pour la série.",
    naoContaHoje: "Ne compte pas, et le reste de la journée, c’est de l’entraînement.",
    naoConta: "Ne compte pas : à partir de maintenant, c’est de l’entraînement.",
    ficouPorJogar: "Manqué.",
    notaSalva: "🔑 Une clé a sauvé la série.",
    abreAMeiaNoite: "Ouvre à minuit.",
    abreNoDia: (dia) => `Ouvre le ${dia === "1" ? "1er" : dia}.`,
    salvar: "Sauver la série",
    desbloquear: "Débloquer",
    semChaves: (dias) => `Pas de clé. La prochaine arrive à ${String(dias)} jours d’affilée.`,
    riscoTitulo: "Ta série est en danger",
    riscoTexto: (sequencia, chaves) =>
      `Hier, tu n’as pas joué, et ta série de ${sequencia === 1 ? "1 jour" : `${String(sequencia)} jours`} s’arrête là. ` +
      `Une clé la sauve : hier ne compte pas, mais la série continue. Tu as ${chaves}.`,
    usar: "Utiliser",
    agoraNao: "Pas maintenant",
    desbloquearTitulo: (n) => `Débloquer le défi n° ${String(n)} ?`,
    desbloquearTexto: (modo, data, chaves) =>
      `Tu dépenses une clé et tu joues le défi ${modo} du ${data}. ` +
      `La première tentative compte : pour le mois, mais pas pour la série. Tu as ${chaves}.`,
    desbloquearEJogar: "Débloquer et jouer",
    premioTexto: (dias, chaves) =>
      `${dias} ! Tu as gagné ${chaves} : ouvre un défi manqué, ou sauve ta série le jour où tu rates.`,
    boa: "Bravo !",
    ganhamSe: "Elles se gagnent avec la série :",
    proximoPatamar: (dias, chaves, faltam) =>
      `Après 30, le cycle recommence. La prochaine : à ${String(dias)} jours, +${String(chaves)} 🔑 — ` +
      `${faltam === 1 ? "plus qu’1 jour" : `plus que ${String(faltam)} jours`}.`,
    asChaves: "Les clés",
    chavesTexto:
      "Une clé ouvre un défi manqué — il compte pour le mois, mais pas pour la série — ou sauve ta série quand tu rates un jour.",
    percebi: "Compris",
  },

  definicoes: {
    titulo: "Réglages",
    idioma: "Langue",
    notaIdioma: "« Système » suit la langue du téléphone.",
    idiomaAria: "langue",
    sistema: "Système",
    tema: "Thème",
    notaTema: "Les faces ne changent pas de thème — une pièce est la même pièce sur les deux fonds.",
    temaAria: "thème",
    claro: "Clair",
    escuro: "Sombre",
    vibracao: "Vibration",
    notaVibracao: "Une petite vibration à chaque coup, et un avertissement quand un coup ne passe pas.",
    vibracaoAria: "vibration",
    ligada: "Activée",
    desligada: "Désactivée",
    notaTempo: "Temps de départ. Chaque plateau vidé s’ajoute au même chrono.",
    tempoAria: "temps de départ",
    progresso: "Progression",
    notaProgresso:
      "Efface les sceaux, les meilleurs résultats et les records du Contre-la-montre. Impossible de revenir en arrière.",
    apagar: "Effacer la progression",
    apagarConfirmar: "Touche encore pour tout effacer",
    apagado: "Progression effacée",
  },

  partilha: {
    cabeca: (numero, data) => `DiceToSeven · Défi n° ${String(numero)} · ${data}`,
    sequencia: (dias) => `🔥 ${String(dias)} jours d’affilée`,
    puzzle: (tempo, selo) => `🧩 Puzzle : ${tempo} · ${selo}`,
    tempo: (pontos, tabuleiros) =>
      `⏱️ Contre-la-montre : ${plural(pontos, "point", "points")} · ${plural(tabuleiros, "plateau", "plateaux")}`,
    survival: (tempo) => `🧱 Survie : vidé en ${tempo}`,
    selos: { perfect: "★ parfait", clean: "◆ net", completed: "terminé" },
  },

  paginaMedalhas: {
    titulo: "Médailles",
    tipos: "type de médaille",
    normais: "Normales",
    premium: "Premium",
    contaDaAba: (aba, ganhas, total) => `${aba} : ${String(ganhas)} sur ${String(total)}`,
    conquistada: "Obtenue",
    porConquistar: "À obtenir",
    minutos: (n) => `${String(n)} minutes`,
    nova: "Nouvelle",
    ariaPremium: "médaille premium",
    ariaConquistada: (data) => `obtenue le ${data}`,
    ariaPorConquistar: "à obtenir",
    ariaNova: "nouvelle",
    estadoGanha: (data) => `Obtenue le ${data}.`,
    estadoProgresso: (quanto) => `Tu en es à ${quanto}.`,
    estadoPorGanhar: "Encore à obtenir.",
    fechar: "Fermer",
    composicoesTitulo: (n) => `Les ${String(n)} façons de faire 7`,
    composicaoAria: (partes, feita) => `${partes}, ${feita ? "faite" : "à faire"}`,
    novas: (n) => (n === 1 ? "Nouvelle médaille : " : "Nouvelles médailles : "),
    ariaEntrada: (ganhas, total, novas) =>
      `Médailles : ${String(ganhas)} sur ${String(total)}${novas ? ", avec des nouvelles à voir" : ""}`,
  },

  medalhas: {
    nomes: {
      iniciado: "Débutant",
      medio: "Intermédiaire",
      avancado: "Avancé",
      perito: "Expert",
      "primeiro-perfeito": "Perfection",
      "perito-perfeito": "Expert parfait",
      "campanha-perfeita": "Campagne parfaite",
      maratona: "Marathon",
      recordista: "Champion",
      ultramaratona: "Ultramarathon",
      "cinco-minutos": "Cinq minutes",
      "dez-minutos": "Dix minutes",
      "dez-limpezas": "Dix plateaux vidés",
      semana: "Une semaine",
      "mes-completo": "Mois complet",
      "trinta-dias": "Inarrêtable",
      "cem-dias": "Centenaire",
      "sangue-frio": "Sang-froid",
      "em-cadeia": "En chaîne",
      aguentar: "Tenir bon",
      "sete-uns": "Sept as",
      colecionador: "Collectionneur",
      mestre: "Maître",
    },
    descricoes: {
      iniciado: "Terminer tous les niveaux Débutant.",
      medio: "Terminer tous les niveaux Intermédiaire.",
      avancado: "Terminer tous les niveaux Avancé.",
      perito: "Terminer tous les niveaux Expert.",
      "primeiro-perfeito": "Terminer un niveau avec le sceau Parfait : sans annuler, sans recommencer et sans indice.",
      "perito-perfeito": "Tous les niveaux Expert avec le sceau Parfait.",
      "campanha-perfeita": "Tous les niveaux de la campagne avec le sceau Parfait.",
      maratona: `Vider ${String(LIMIARES.maratona)} plateaux en une partie de Contre-la-montre.`,
      recordista: `Faire ${milhares(LIMIARES.recordista)} points en une partie de Contre-la-montre.`,
      ultramaratona: `Vider ${String(LIMIARES.ultramaratona)} plateaux en une partie de Contre-la-montre.`,
      "cinco-minutos": "Tenir cinq minutes en une partie de Survie.",
      "dez-minutos": "Tenir dix minutes en une partie de Survie.",
      "dez-limpezas": `Vider le plateau de la Survie ${String(LIMIARES.limpezas)} fois.`,
      semana: `Faire le Défi du jour ${String(LIMIARES.semana)} jours d’affilée.`,
      "mes-completo": "Faire tous les défis d’un mois — l’étoile ★ sur le parcours des mois.",
      "trinta-dias": `Faire le Défi du jour ${String(LIMIARES.trintaDias)} jours d’affilée.`,
      "cem-dias": `Faire le Défi du jour ${String(LIMIARES.cemDias)} jours d’affilée.`,
      "sangue-frio": `Désamorcer ${String(LIMIARES.sangueFrio)} bombes en une partie de Contre-la-montre.`,
      "em-cadeia": `Atteindre le combo ×3 en une partie de Contre-la-montre : ${String(LIMIARES.emCadeia)} coups d’affilée sur le même plateau, sans jamais laisser passer plus de ${JANELA} s entre eux.`,
      aguentar: `Tenir ${String(LIMIARES.aguentar)} lignes en une partie de Survie. Celles qu’on tire comptent aussi.`,
      "sete-uns": "Éliminer un groupe de sept 1 — le plus grand groupe qui existe.",
      colecionador: `Faire 7 des ${String(COMPOSICOES.length)} façons possibles, de 1 + 6 aux sept 1.`,
      mestre: "Obtenir toutes les médailles normales.",
    },
    unidades: {
      niveis: "niveaux",
      perfeitos: "parfaits",
      tabuleiros: "plateaux",
      pontos: "points",
      limpezas: "plateaux vidés",
      dias: "jours d’affilée",
      bombas: "bombes",
      jogadas: "coups d’affilée",
      linhas: "lignes",
      composicoes: "combinaisons",
      medalhas: "médailles",
    },
  },
};

export const FR: Textos = tipografia(FR_CRU);
