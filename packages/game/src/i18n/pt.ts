/**
 * Os textos do jogo em português de Portugal — **o idioma de referência**.
 *
 * É a partir deste que se tira o tipo `Textos`, e os outros idiomas têm de ter
 * exatamente a mesma forma: um texto que falte, ou uma função com outros
 * argumentos, é um erro de compilação, e não um buraco no ecrã de alguém.
 *
 * **Os textos com números são funções**, e não modelos com `{n}`: o plural, a
 * ordem das palavras e a concordância são de cada língua, e uma função deixa
 * cada idioma resolvê-los à sua maneira sem um motor de modelos pelo meio.
 */

import type { IdDoCapitulo } from "../capitulos";
import type { IdDaMedalha, UnidadeDaMedalha } from "../session/medalhas";
import { DEFAULT_COMBO_CONFIG } from "../session/combos";
import { COMPOSICOES } from "../session/estatisticas";
import { LIMIARES } from "../session/medalhas";

const JANELA = new Intl.NumberFormat("pt-PT").format(DEFAULT_COMBO_CONFIG.windowMs / 1000);

/** `30000` → `30 000`, com um espaço fino que não parte a linha. */
const milhares = (n: number): string =>
  String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
] as const;

const MESES_CURTOS = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
] as const;

const mes = (m: number): string => MESES[m - 1] ?? "";
const mesCurto = (m: number): string => MESES_CURTOS[m - 1] ?? "";

/** «1 ponto», «2 pontos». */
const plural = (n: number, um: string, varios: string): string =>
  `${String(n)} ${n === 1 ? um : varios}`;

const diasSeguidos = (n: number): string => plural(n, "dia seguido", "dias seguidos");

export const PT = {
  /** O valor do atributo `lang` do documento. */
  lang: "pt-PT",

  formato: {
    milhares,
    /** `14 out` */
    dataCurta: (dia: number, m: number): string => `${String(dia)} ${mesCurto(m)}`,
    /** `14 de outubro` */
    dataPorExtenso: (dia: number, m: number): string => `${String(dia)} de ${mes(m)}`,
    /** `14 de outubro de 2026` */
    dataCompleta: (dia: number, m: number, ano: number): string =>
      `${String(dia)} de ${mes(m)} de ${String(ano)}`,
    /** `outubro de 2026` */
    mesPorExtenso: (m: number, ano: number): string => `${mes(m)} de ${String(ano)}`,
    /** `outubro` */
    nomeDoMes: (m: number): string => mes(m),
    /** `out` */
    mesCurto: (m: number): string => mesCurto(m),
  },

  comum: {
    voltar: "voltar",
    fechar: "fechar",
    cancelar: "Cancelar",
    guardar: "Guardar",
    sair: "Sair",
    jogar: "Jogar",
    partilhar: "Partilhar",
    copiado: "Copiado",
    copiadoComVisto: "Copiado ✓",
    naoDeuParaCopiar: "Não deu para copiar",
    partilharResultado: "Partilhar o resultado de hoje",
    reiniciar: "Reiniciar",
    repetir: "Repetir",
    treinarOutraVez: "Treinar outra vez",
    jogarOutraVez: "Jogar outra vez",
    tentarOutraVez: "Tentar outra vez",
    tabuleiro: "tabuleiro",
    joker: "joker",
    face: (v: number): string => `face ${String(v)}`,
    pontos: (n: number): string => plural(n, "ponto", "pontos"),
    tabuleiros: (n: number): string => plural(n, "tabuleiro", "tabuleiros"),
    chaves: (n: number): string => plural(n, "chave", "chaves"),
    semNiveis: "não consegui carregar os níveis",
  },

  modos: {
    puzzle: "Puzzle",
    puzzles: "Puzzles",
    tempo: "Contra-Relógio",
    survival: "Survival",
    desafio: "Desafio do dia",
  },

  puzzle: {
    selos: { perfect: "Perfeito", clean: "Limpo", completed: "Concluído" },
    voltarALista: "voltar à lista",
    ajudaJoker: "como funciona o joker",
    desfazer: "Desfazer",
    dica: "Dica",
    reiniciarTitulo: "Reiniciar o nível?",
    sairTitulo: "Sair do nível?",
    jogadasPerdemSe: "As jogadas feitas até aqui perdem-se.",
    primeiroTempo: "primeiro tempo",
    novoRecorde: (era: string): string => `novo recorde, era ${era}`,
    oTeuRecorde: (tempo: string): string => `o teu recorde é ${tempo}`,
    pecas: (restantes: number, total: number): string =>
      `${String(restantes)}/${String(total)} peças`,
    facesSomam: (soma: number): string => `faces somam ${String(soma)}`,
    convite: "Toca nas peças para somar 7",
    passavaDe7: "essa peça passava de 7",
    geloSoAPar: "uma peça gelada só sai com uma peça",
    geloComGelo: "duas peças geladas não saem juntas",
    faltam: (n: number): string => `faltam ${String(n)}`,
    jogadas: "jogadas",
    desfeitas: "desfeitas",
    dicas: "dicas",
    nivelSeguinte: "Nível seguinte",
    verTabuleiro: "ver o tabuleiro",
    becoTitulo: "Ups! Beco sem saída!",
    becoTexto: (restantes: number): string =>
      restantes === 1
        ? "Sobrou 1 peça, e já não há nenhum grupo que some 7."
        : `Sobraram ${String(restantes)} peças, e já não há nenhum grupo que some 7.`,
    becoJoker: "Com o joker, a jogada fatal costuma estar umas atrás.",
  },

  tempo: {
    limpos: (n: number): string =>
      n === 1 ? "1 tabuleiro limpo" : `${String(n)} tabuleiros limpos`,
    saltados: (n: number): string => (n === 1 ? "1 saltado" : `${String(n)} saltados`),
    sairDaCorrida: "sair da corrida",
    sairTitulo: "Sair da corrida?",
    sairTexto: "O relógio não pára: a corrida acaba aqui.",
    sairTextoDesafio:
      "O relógio não pára: a corrida acaba aqui, e é esta a que conta para o desafio.",
    geloSoAPar: "❄ só sai a par",
    geloComGelo: "❄ não sai com gelo",
    comecar: "Começar",
    voltar: "Voltar",
    segundos: (n: number): string => `${String(n)} segundos`,
    arranqueDesafio:
      "Os mesmos tabuleiros para toda a gente. Só esta tentativa conta: depois de começar, sair acaba a corrida.",
    pontosNoTopo: (n: number): string => `${String(n)} pontos`,
    tabuleirosNoTopo: (n: number): string => `${String(n)} tabuleiros`,
    pontosNoFim: (n: number): string => `${String(n)} pontos`,
    /** `custo` já escrito: «−10s». */
    saltar: (custo: string): string => `Saltar (${custo})`,
    saltarAria: (segundos: number): string =>
      `saltar o tabuleiro, custa ${String(segundos)} segundos`,
    saltarTabuleiro: "Saltar tabuleiro",
    saltarFechadoAria: (n: number): string =>
      `saltar o tabuleiro: disponível a partir do ${String(n)}.º tabuleiro`,
    semJogadas: "Sem jogadas",
    semJogadasTexto: (restantes: number): string =>
      restantes === 1
        ? "Sobrou 1 peça, e nenhum grupo soma 7."
        : `Sobraram ${String(restantes)} peças, e nenhum grupo soma 7.`,
    novoRecorde: "Novo recorde",
    acabouOTempo: "Acabou o tempo",
  },

  survival: {
    proximaLinha: "próxima linha",
    /** `bomba` é um dos dois sufixos abaixo, ou vazio. */
    proximaLinhaEm: (segundos: number, bomba: string): string =>
      `próxima linha em ${String(segundos)} segundos${bomba}`,
    bombaEnterrada: ", acende uma bomba na pilha",
    /** O aviso ao lado da fila: a bomba que vem não cai na linha, acende-se na pilha. */
    naPilha: "na pilha",
    comBomba: ", com bomba",
    puxarLinha: "Puxar linha",
    recomecar: "Recomeçar",
    recomecarTitulo: "Recomeçar?",
    recomecarTexto: "Esta corrida e o tempo perdem-se. O tabuleiro volta ao início.",
    semJogadas: "sem jogadas",
    maisUmaLinha: "+1 linha",
    limpoTitulo: "Tabuleiro limpo!",
    transbordouTitulo: "O tabuleiro transbordou",
    limpoLinhas: (n: number): string => `Limpo, com ${String(n)} linhas aguentadas`,
    linhasAguentadas: (n: number): string => `${String(n)} linhas aguentadas`,
    porLimpar:
      "O desafio fica feito quando limpares o tabuleiro. As linhas são as mesmas: tenta outra vez.",
    outraCorrida: "Outra corrida",
    repetirEsta: "Repetir esta",
  },

  tutorialJoker: {
    regra:
      "A soma de qualquer tabuleiro é sempre múltipla de 7. O joker vale exatamente o que falta — e só esse valor esvazia o tabuleiro.",
    facesSomam: "as faces somam",
    faltamPara: (joker: number): string => `faltam ${String(joker)} para`,
    queE: (jogadas: number): string => `que é 7 × ${String(jogadas)}`,
    morto: (restante: number): string =>
      `Sobram ${String(restante)}. Não é múltiplo de 7, e já não há joker para corrigir. O jogo deixou-te gastá-lo no valor errado e não te avisou — nos níveis a sério faz exatamente o mesmo.`,
    limpo:
      "Limpo. Repara no que o jogo te deixava fazer: gastar o joker noutro valor era permitido, e o tabuleiro morria em silêncio. A conta acima acompanha-te nos três primeiros níveis com joker; a partir daí fá-la tu.",
    aJogar: "Toca no joker para lhe dares um valor. Depois soma 7, como em qualquer jogada.",
    outroValor: "E se eu escolher outro valor?",
    jaPercebi: "Já percebi",
  },

  tabuleiro: {
    /** Acrescenta-se ao nome da peça armada, para quem ouve o ecrã. */
    sufixoBomba: ", bomba",
  },

  joker: {
    seletorAria: "quanto vale o joker nesta jogada",
    seletorTitulo: "o joker vale",
  },

  home: {
    modosAria: "modos de jogo",
    legendaPuzzles: "A campanha, capítulo a capítulo",
    escolherPerfil: "escolher nome e avatar",
    mudarPerfil: (nome: string): string => `${nome} — mudar nome e avatar`,
    recorde: (pontos: number): string => `Recorde ${String(pontos)}`,
    aMeio: (tempo: string): string => `A meio · ${tempo}`,
    melhor: (tempo: string): string => `Melhor ${tempo}`,
    interrompido: "Interrompido",
    ariaDesafio: (
      numero: number,
      data: string,
      modo: string,
      estado: string,
      emRisco: number | undefined,
    ): string =>
      `Desafio do dia, número ${String(numero)}, ${data}: ${modo}, ${estado}.` +
      (emRisco === undefined ? "" : ` Sequência de ${String(emRisco)} em risco.`) +
      " Abrir.",
    comoJogar: "Como jogar?",
    comoJogarLegenda: "Junta peças encostadas até somarem 7.",
  },

  perfil: {
    quemEs: "Quem és?",
    oTeuNome: "O teu nome",
    oTeuAvatar: "O teu avatar",
    avatarAria: "avatar",
  },

  comoJogar: {
    titulo: "Como jogar",
    objetivo: "O objetivo",
    objetivoChamada: "Esvaziar o tabuleiro.",
    objetivoTexto:
      "Não há pontos a fazer nem tempo a bater nos Puzzles: um nível acaba quando não sobra uma peça. E todos os níveis que o jogo publica têm solução — se ficaste encravado, foi de um caminho, não do nível.",
    jogada: "Uma jogada",
    jogadaChamada: "Toca em peças encostadas até somarem exatamente 7.",
    jogadaTexto:
      "As peças que tocas ficam marcadas. Quando somarem 7, saem sozinhas. Se passares de 7 a jogada não entra — e tocar outra vez numa peça já escolhida tira-a da conta.",
    jogadaMaximo: "Um grupo tem no máximo sete peças, que é o que dá juntar sete faces de 1.",
    ligadas: "Encostadas, não em diagonal",
    ligadasChamada: "Duas peças estão ligadas se partilham um lado.",
    ligadasVale: "Vale: partilham um lado",
    ligadasNaoVale: "Não vale: só se tocam no canto",
    ligadasTexto:
      "O grupo todo tem de estar ligado — cada peça encostada a outra do grupo. Em L, em T ou em linha: a forma não interessa, a ligação sim.",
    depois: "O que acontece a seguir",
    depoisChamada: "As peças de cima descem, e as colunas vazias desaparecem.",
    depoisColunas:
      "As colunas que ficam vazias fecham-se para a esquerda, e as que estavam de cada lado passam a ser vizinhas. É aqui que nascem quase todos os grupos que não estavam lá antes.",
    depoisGrupos:
      "Grupos novos que se formem ficam disponíveis, mas não saem sozinhos: só desaparecem se os escolheres. O jogo nunca joga por ti — seguir um caminho que não escolheste podia deixar o tabuleiro sem saída.",
    joker: "O joker",
    /** A chamada do joker tem o símbolo no meio: o texto de antes e o de depois. */
    jokerChamadaAntes: "A peça cinzenta com um ",
    jokerSimbolo: "asterisco verde",
    jokerChamadaDepois: ". Há no máximo uma por tabuleiro.",
    jokerNota: "Toca nele para lhe dares um valor de 1 a 6.",
    jokerSozinho:
      "O joker nunca forma grupo sozinho: entra sempre com peças fixas, e vale o que falta para elas chegarem a 7.",
    jokerValor:
      "Só um dos seis valores esvazia o tabuleiro, e o jogo deixa-te escolher outro sem avisar. O tabuleiro não morre logo — falha no fim, com peças a sobrar.",
    jokerTutorial: "Ver o tutorial do joker",
    soldas: "As soldas",
    soldasChamada: "Duas peças unidas por um grampo saem juntas, ou não sai nenhuma.",
    soldasVale: "Vale: 2 + 1 + 4, o par todo",
    soldasNaoVale: "Não vale: 2 + 5 deixa o 1 para trás",
    soldasTexto:
      "As duas peças contam na soma. Uma solda nunca se parte: o par desce junto até sair. Aparecem nos Puzzles, a partir do Avançado.",
    gelo: "O gelo",
    geloChamada: "Uma peça gelada só sai a par: com uma única peça, que não esteja gelada.",
    geloVale: "Vale: 5 + 2, a par",
    geloNaoVale: "Não vale: 5 + 1 + 1",
    geloTexto:
      "Duas peças geladas também não saem juntas, mesmo que somem 7. O gelo não derrete: a peça que solta a gelada vale ouro, e gastá-la noutra jogada pode deixar a gelada presa.",
    geloOnde: "Aparece nos Puzzles Perito e no Contra-Relógio, a partir do sétimo tabuleiro.",
    bomba: "A bomba",
    bombaChamada: "Uma peça com pavio. Tira-a numa jogada antes de ele acabar.",
    bombaNota: "O número no pavio são os segundos que faltam.",
    bombaDesarmar:
      "Para a desarmar, basta que ela entre num grupo de 7, como qualquer outra peça. Se o pavio acabar, rebenta — e a peça fica no tabuleiro.",
    bombaCastigo: (segundos: number): string =>
      `No Contra-Relógio, rebentar custa ${String(segundos)} segundos. No Survival, cai mais uma linha, e as peças encostadas à bomba sobem um ponto: um 1 passa a 2, e um 6 fica 6.`,
    bombaQuando:
      "Há uma bomba de cada vez. No Contra-Relógio pode aparecer a partir do quarto tabuleiro. No Survival vês na linha seguinte se ela traz bomba — e mais à frente há bombas que se acendem numa peça que já está na pilha.",
    selos: "Os selos",
    selosChamada: "Cada nível guarda o melhor selo que já lhe deste.",
    selosTextos: {
      perfect: "Limpaste o nível sem desfazer, sem reiniciar e sem pedir dicas.",
      clean: "Limpaste o nível de uma assentada, mas com uma ou mais dicas.",
      completed: "Limpaste o nível, com desfazer ou depois de reiniciar.",
    },
    selosNuncaDescem: "Um selo nunca desce: voltar a um nível só pode melhorá-lo.",
    modos: "Os modos",
    modoPuzzles:
      "A campanha. Tabuleiros feitos à mão pelo gerador, sempre com solução, do mais fácil ao mais difícil.",
    modoTempo: (saltar: number): string =>
      `Um relógio só, que nunca pára. Cada tabuleiro limpo dá tempo de volta, mas cada vez menos, e os tabuleiros vão crescendo. Uma peça que passe de 7 custa tempo. E cuidado com as bombas: tira-as antes de o pavio acabar. Do sétimo tabuleiro em diante, um tabuleiro pode ficar sem jogadas: aí salta-o, por ${String(saltar)} segundos. E aparecem peças geladas, que só saem a par com uma peça que não esteja gelada.`,
    modoSurvival:
      "De vez em quando cai uma linha nova por cima. Vês qual é antes de ela cair; acaba quando a pilha chega ao teto. Se ficares sem jogadas, a linha cai logo; se passares de 7, chega 3 segundos mais cedo. Algumas linhas trazem uma bomba: tira-a antes de o pavio acabar, ou cai mais uma linha e as peças à volta dela sobem um ponto. Mais à frente, há bombas que se acendem numa peça já na pilha: desenterra-a a tempo.",
    modoDesafio:
      "Todos os dias, um desafio igual para toda a gente: um Puzzle, um Contra-Relógio ou um Survival, à vez. O trilho mostra o caminho — o que já fizeste e o que vem. O Puzzle e o Survival ficam feitos quando limpas o tabuleiro, e podes tentar até lá; no Contra-Relógio, conta a primeira corrida. Depois é treino, com os mesmos tabuleiros. No fim, partilha o resultado — e não deixes partir a sequência de dias. A sequência dá chaves (aos 3, 7, 14 e 30 dias): uma chave abre um desafio que ficou por jogar, ou salva a sequência se falhares um dia.",
  },

  capitulos: {
    iniciado: { nome: "Iniciado", descricao: "Pares e trios, sem pressa" },
    medio: { nome: "Médio", descricao: "Grupos até quatro, e o joker a aparecer" },
    avancado: { nome: "Avançado", descricao: "Faces altas, poucos parceiros" },
    perito: { nome: "Perito", descricao: "Tabuleiros grandes, margem nenhuma" },
  } satisfies Record<IdDoCapitulo, { nome: string; descricao: string }>,

  niveis: {
    selos: { perfect: "perfeito", clean: "limpo", completed: "concluído" },
    nivelComSelo: (n: string, selo: string): string => `nível ${n}, ${selo}`,
    nivelSeguinte: (n: string): string => `nível ${n}, a seguir`,
    nivelPorJogar: (n: string): string => `nível ${n}, por jogar`,
  },

  desafio: {
    etiqueta: (n: number): string => `Desafio #${String(n)}`,
    etiquetaTreino: (etiqueta: string): string => `${etiqueta} · treino`,
    survivalLimpo: (tempo: string): string => `limpo · ${tempo}`,
    legendas: {
      puzzle: "Um tabuleiro, o mesmo para todos. Resolve-o.",
      tempo: "Sessenta segundos, e os mesmos tabuleiros para todos.",
      survival: "As mesmas linhas para todos. Limpa o tabuleiro antes que transborde.",
    },
    emRisco: "em risco",
    diasSeguidos,
    diasEmRisco: (n: number): string => `${diasSeguidos(n)}, em risco`,
    /** Quando é o dia, visto de hoje: 0 é hoje, 1 é amanhã, −3 foi há três dias. */
    quando: (n: number): string =>
      n === 0
        ? "Hoje"
        : n === 1
          ? "Amanhã"
          : n === -1
            ? "Ontem"
            : n > 0
              ? `Daqui a ${String(n)} dias`
              : `Há ${String(-n)} dias`,
    estados: {
      porJogar: "por jogar",
      aMeio: "a meio",
      feito: (resultado: string): string => `feito, ${resultado}`,
      feitoCurto: "feito",
      interrompido: "interrompido",
      perdido: "ficou por jogar",
      futuro: "ainda não abriu",
    },
    chavesAria: (n: number): string => `${plural(n, "chave", "chaves")}. Para que servem?`,
    meses: "Os meses",
    nota:
      "Um desafio por dia, à vez: Puzzle, Contra-Relógio e Survival. Conta a primeira tentativa; depois é treino. Muda à meia-noite. A sequência dá chaves, que abrem os dias que ficaram por jogar.",
    feitosDe: (feitos: number, de: number): string => `${String(feitos)} de ${String(de)} feitos`,
    completo: ", completo",
    anoAnterior: "ano anterior",
    anoSeguinte: "ano seguinte",
    mesFuturo: "ainda não começou",
    mesSemDesafio: "sem desafio",
    listaDoMes: (mes: string): string => `Os desafios de ${mes}, do fim para o início`,
    fimDoMes: (mes: string): string => `Fim de ${mes}`,
    faltamDias: (n: number): string => (n === 1 ? "falta 1 dia" : `faltam ${String(n)} dias`),
    inicioDoDesafio: "Início do desafio",
    inicio: "Início",
    ariaHoje: ", hoje",
    ariaSalvo: "sequência salva com uma chave",
    ariaAberto: "aberto com uma chave",
    ariaGanhou: (chaves: string): string => `ganhou ${chaves}`,
    ariaBalao: (n: number, data: string): string => `Desafio número ${String(n)}, ${data}`,
    ariaPremioDeHoje: (chaves: number): string =>
      chaves > 0
        ? `mais um dia na série, e ${plural(chaves, "chave", "chaves")}`
        : "mais um dia na série",
    treinar: "Treinar",
    continuar: "Continuar",
    notaPatamar: (chaves: number): string =>
      `🔑 +${String(chaves)}: a sequência chegou a um patamar.`,
    notaJogadoDepois: "Jogado depois, com uma chave: conta para o mês, não para a sequência.",
    naoContaHoje: "Não conta, e o resto do dia é treino.",
    naoConta: "Não conta: daqui em diante é treino.",
    ficouPorJogar: "Ficou por jogar.",
    notaSalva: "🔑 Uma chave salvou a sequência.",
    abreAMeiaNoite: "Abre à meia-noite.",
    abreNoDia: (dia: string): string => `Abre no dia ${dia}.`,
    salvar: "Salvar a sequência",
    desbloquear: "Desbloquear",
    semChaves: (dias: number): string =>
      `Sem chaves. A próxima chega aos ${String(dias)} dias seguidos.`,
    riscoTitulo: "A tua sequência está em risco",
    riscoTexto: (sequencia: number, chaves: string): string =>
      `Ontem ficou por jogar, e a tua sequência de ${sequencia === 1 ? "1 dia" : `${String(sequencia)} dias`} acaba aí. ` +
      `Uma chave salva-a: ontem não soma, mas a sequência continua. Tens ${chaves}.`,
    usar: "Usar",
    agoraNao: "Agora não",
    desbloquearTitulo: (n: number): string => `Desbloquear o desafio #${String(n)}?`,
    desbloquearTexto: (modo: string, data: string, chaves: string): string =>
      `Gastas uma chave e jogas o ${modo} de ${data}. ` +
      `Conta a primeira tentativa: para o mês, mas não para a sequência. Tens ${chaves}.`,
    desbloquearEJogar: "Desbloquear e jogar",
    premioTexto: (dias: string, chaves: string): string =>
      `${dias}! Ganhaste ${chaves}: abre um desafio que ficou por jogar, ou salva a sequência no dia em que falhares.`,
    boa: "Boa!",
    ganhamSe: "Ganham-se com a sequência:",
    proximoPatamar: (dias: number, chaves: number, faltam: number): string =>
      `Depois dos 30, o ciclo recomeça. A próxima: aos ${String(dias)} dias, +${String(chaves)} 🔑 — ` +
      `${faltam === 1 ? "falta 1 dia" : `faltam ${String(faltam)} dias`}.`,
    asChaves: "As chaves",
    chavesTexto:
      "Uma chave abre um desafio que ficou por jogar — conta para o mês, mas não para a sequência — ou salva a sequência quando falhas um dia.",
    percebi: "Percebi",
  },

  definicoes: {
    titulo: "Definições",
    idioma: "Idioma",
    notaIdioma: "«Sistema» segue o idioma do telemóvel.",
    idiomaAria: "idioma",
    sistema: "Sistema",
    tema: "Tema",
    notaTema: "As faces não mudam de tema — uma peça é a mesma peça nos dois fundos.",
    temaAria: "tema",
    claro: "Claro",
    escuro: "Escuro",
    vibracao: "Vibração",
    notaVibracao: "Um toque no dedo a cada jogada, e um aviso quando a jogada não entra.",
    vibracaoAria: "vibração",
    ligada: "Ligada",
    desligada: "Desligada",
    notaTempo: "Tempo de arranque. Cada tabuleiro limpo acrescenta ao mesmo relógio.",
    tempoAria: "tempo de arranque",
    progresso: "Progresso",
    notaProgresso:
      "Apaga os selos, os melhores resultados e os recordes do Contra-Relógio. Não tem volta.",
    apagar: "Apagar o progresso",
    apagarConfirmar: "Carrega outra vez para apagar tudo",
    apagado: "Progresso apagado",
  },

  /**
   * O texto partilhado do Desafio do dia:
   *
   *   DiceToSeven · Desafio #3 · 14 out
   *   🧱 Survival: limpo em 3:42.1
   *   🔥 3 dias seguidos
   */
  partilha: {
    cabeca: (numero: number, data: string): string =>
      `DiceToSeven · Desafio #${String(numero)} · ${data}`,
    sequencia: (dias: number): string => `🔥 ${String(dias)} dias seguidos`,
    puzzle: (tempo: string, selo: string): string => `🧩 Puzzle: ${tempo} · ${selo}`,
    tempo: (pontos: number, tabuleiros: number): string =>
      `⏱️ Contra-Relógio: ${plural(pontos, "ponto", "pontos")} · ${plural(tabuleiros, "tabuleiro", "tabuleiros")}`,
    survival: (tempo: string): string => `🧱 Survival: limpo em ${tempo}`,
    selos: { perfect: "★ perfeito", clean: "◆ limpo", completed: "concluído" },
  },

  paginaMedalhas: {
    titulo: "Medalhas",
    tipos: "tipo de medalha",
    normais: "Normais",
    premium: "Premium",
    contaDaAba: (aba: string, ganhas: number, total: number): string =>
      `${aba}: ${String(ganhas)} de ${String(total)}`,
    conquistada: "Conquistada",
    porConquistar: "Por conquistar",
    minutos: (n: number): string => `${String(n)} minutos`,
    nova: "Nova",
    ariaPremium: "medalha premium",
    /** `data` já por extenso: «14 de outubro». */
    ariaConquistada: (data: string): string => `conquistada a ${data}`,
    ariaPorConquistar: "por conquistar",
    ariaNova: "nova",
    /** `data` completa: «14 de outubro de 2026». */
    estadoGanha: (data: string): string => `Conquistada a ${data}.`,
    estadoProgresso: (quanto: string): string => `Vais em ${quanto}.`,
    estadoPorGanhar: "Ainda por conquistar.",
    fechar: "Fechar",
    /** O título da grelha do Colecionador, no pormenor da medalha. */
    composicoesTitulo: (n: number): string => `As ${String(n)} maneiras de fazer 7`,
    /** Uma composição, a quem ouve o ecrã: «1 + 6, feita». */
    composicaoAria: (partes: string, feita: boolean): string =>
      `${partes}, ${feita ? "feita" : "por fazer"}`,
    /** A linha do painel de fim, antes dos nomes. */
    novas: (n: number): string => (n === 1 ? "Nova medalha: " : "Novas medalhas: "),
    /** A pastilha da Home, a quem ouve o ecrã. */
    ariaEntrada: (ganhas: number, total: number, novas: boolean): string =>
      `Medalhas: ${String(ganhas)} de ${String(total)}${novas ? ", com novas por ver" : ""}`,
  },

  medalhas: {
    nomes: {
      iniciado: "Iniciado",
      medio: "Médio",
      avancado: "Avançado",
      perito: "Perito",
      "primeiro-perfeito": "Perfeição",
      "perito-perfeito": "Perito perfeito",
      "campanha-perfeita": "Campanha perfeita",
      maratona: "Maratona",
      recordista: "Recordista",
      ultramaratona: "Ultramaratona",
      "cinco-minutos": "Cinco minutos",
      "dez-minutos": "Dez minutos",
      "dez-limpezas": "Dez limpezas",
      semana: "Uma semana",
      "mes-completo": "Mês completo",
      "trinta-dias": "Imparável",
      "cem-dias": "Centenário",
      "sangue-frio": "Sangue-frio",
      "em-cadeia": "Em cadeia",
      aguentar: "Aguentar",
      "sete-uns": "Sete uns",
      colecionador: "Colecionador",
      mestre: "Mestre",
    } satisfies Record<IdDaMedalha, string>,
    descricoes: {
      iniciado: "Acabar todos os níveis do Iniciado.",
      medio: "Acabar todos os níveis do Médio.",
      avancado: "Acabar todos os níveis do Avançado.",
      perito: "Acabar todos os níveis do Perito.",
      "primeiro-perfeito": "Acabar um nível com selo Perfeito: sem desfazer, sem reiniciar e sem dicas.",
      "perito-perfeito": "Todos os níveis do Perito com selo Perfeito.",
      "campanha-perfeita": "Todos os níveis da campanha com selo Perfeito.",
      maratona: `Limpar ${String(LIMIARES.maratona)} tabuleiros numa corrida do Contra-Relógio.`,
      recordista: `Fazer ${milhares(LIMIARES.recordista)} pontos numa corrida do Contra-Relógio.`,
      ultramaratona: `Limpar ${String(LIMIARES.ultramaratona)} tabuleiros numa corrida do Contra-Relógio.`,
      "cinco-minutos": "Aguentar cinco minutos numa corrida do Survival.",
      "dez-minutos": "Aguentar dez minutos numa corrida do Survival.",
      "dez-limpezas": `Limpar o tabuleiro do Survival ${String(LIMIARES.limpezas)} vezes.`,
      semana: `Fazer o Desafio do dia ${String(LIMIARES.semana)} dias seguidos.`,
      "mes-completo": "Fazer todos os desafios de um mês — a ★ no trilho dos meses.",
      "trinta-dias": `Fazer o Desafio do dia ${String(LIMIARES.trintaDias)} dias seguidos.`,
      "cem-dias": `Fazer o Desafio do dia ${String(LIMIARES.cemDias)} dias seguidos.`,
      "sangue-frio": `Desarmar ${String(LIMIARES.sangueFrio)} bombas numa corrida do Contra-Relógio.`,
      "em-cadeia": `Chegar ao combo ×3 numa corrida do Contra-Relógio: ${String(LIMIARES.emCadeia)} jogadas seguidas no mesmo tabuleiro, sem nunca passarem ${JANELA} s entre elas.`,
      aguentar: `Aguentar ${String(LIMIARES.aguentar)} linhas numa corrida do Survival. As que se puxam também contam.`,
      "sete-uns": "Eliminar um grupo de sete 1 — o maior grupo que existe.",
      colecionador: `Fazer 7 das ${String(COMPOSICOES.length)} maneiras possíveis, de 1 + 6 aos sete 1.`,
      mestre: "Ganhar todas as medalhas normais.",
    } satisfies Record<IdDaMedalha, string>,
    unidades: {
      niveis: "níveis",
      perfeitos: "perfeitos",
      tabuleiros: "tabuleiros",
      pontos: "pontos",
      limpezas: "limpezas",
      dias: "dias seguidos",
      bombas: "bombas",
      jogadas: "jogadas seguidas",
      linhas: "linhas",
      composicoes: "composições",
      medalhas: "medalhas",
    } satisfies Record<UnidadeDaMedalha, string>,
  },
};

export type Textos = typeof PT;
