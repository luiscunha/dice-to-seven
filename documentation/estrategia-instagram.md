# Lançar no Instagram — a estratégia

Como pôr o DiceToSeven no Instagram antes de chegar às lojas, e como fazer do
lançamento um dia que se nota. **Tu** é quem tem a conta, a cara e a voz: o que
se grava, se publica e se responde. **Eu** é o que se faz no repositório e à
secretária: imagens, legendas, ligações e análise.

Escrito a 2026-10-23, o dia em que o teste fechado da Play abriu. As datas
seguem o `plano-publicacao.md`; se a Google ou a Apple atrasarem, o calendário
desliza inteiro, e só a fase 1 estica.

## A ideia numa frase

> **O puzzle de dados que não te pede nada.** Uma regra — soma 7 —, 133 níveis
> todos com solução garantida, e nenhum anúncio, compra ou dado recolhido.

Há dois ângulos, e o Instagram vai viver dos dois:

| Ângulo | Para quem | Porque funciona |
|---|---|---|
| **O jogo**: uma regra, profundidade a sério | Quem gosta de puzzles, de números, de «só mais um» | Lê-se num segundo e cabe num Reel de 10 s. As peças a cair e as colunas a encostar são *satisfying* por natureza |
| **O criador**: um programador português que fez um jogo sozinho, e com regras | Quem segue indies, quem está farto de jogos com anúncios | A história é rara e verdadeira: cada nível foi resolvido por um computador antes de chegar ao jogador. E «sem anúncios nem compras» é uma posição, não um pormenor |

Os jogos grandes não podem contar a segunda história. É a vantagem de ser um.

## As decisões — proponho, tu confirmas

| | Proposta | Porquê |
|---|---|---|
| Utilizador | **@dicetoseven** | Igual ao nome do jogo, ao e-mail e ao site. Sem sessão iniciada o Instagram não diz se está livre: confirma-se ao criar a conta. Se estiver ocupado: `@dicetoseven.game`, depois `@playdicetoseven` |
| O mesmo nome noutras redes | Reservar já no TikTok, Threads e YouTube, mesmo sem publicar | Os Reels servem tal e qual de TikTok e Shorts: o triplo do alcance pelo mesmo trabalho. Um nome reservado não custa nada; um nome perdido não se recupera |
| Tipo de conta | **Profissional → Criador de conteúdo** | Dá as estatísticas e o botão de contacto, como a de Empresa, mas mantém a biblioteca de música completa. As contas de Empresa só têm músicas licenciadas para marcas, e o jogo **não tem som**: cada Reel vive do áudio que lhe pusermos |
| Língua | **Inglês primeiro**, com uma linha em português no fim de cada legenda | Os dados não precisam de tradução, e o alcance dos Reels vem do mundo inteiro. A rede que arranca a conta é portuguesa e lê as duas. O inglês já é a língua por omissão das lojas |
| Cara | **Tu apareces**, pelo menos uma vez por semana | Um jogo de uma pessoa só ganha quando se vê a pessoa. Não tem de ser vídeo a falar: as mãos a jogar e uma frase escrita já contam |
| Orçamento | **0 €** até ao lançamento; 50–100 € depois, se um Reel já provou sozinho | Pagar para empurrar o que não funcionou de graça é deitar dinheiro fora |
| A beta | **A versão web**, `luiscunha.github.io/dice-to-seven/` (decidido por ti a 2026-10-24) | Joga-se no browser, em qualquer telemóvel ou computador, com um toque. O teste fechado da Play pedia três passos e só servia ao Android. Mais gente a jogar dá mais feedback antes do lançamento. O teste fechado continua, para quem quiser a app a sério |
| Quem recebe a beta | **Só quem comenta BETA**, por mensagem automática (ManyChat). A bio leva só o site (decidido por ti a 2026-10-24) | Se a beta só chega a quem comenta, cada comentário vale mais, porque é a única porta. A ligação não é secreta, e quem a recebe pode passá-la: a exclusividade é de perceção, e mais jogadores até ajudam |
| Dia do lançamento (**L**) | **Terça, 17 de novembro**, provisório | A regra é: a primeira terça, quarta ou quinta **cinco dias depois** de as duas lojas aprovarem. Com a Play a pedir a produção a ~6 de novembro e a responder até 7 dias, 17 é o mais provável. **A data só se anuncia com as duas aprovações na mão** |

---

## 1. A página

### O cabeçalho

| Campo | O que leva |
|---|---|
| Nome | `DiceToSeven · Dice Puzzle` — o nome conta para a pesquisa, e «dice puzzle» é o que se procura |
| Categoria | Videojogo (*Video game*) |
| Foto | O ícone da app (`packages/game/public/marca/icone-512.png`), com margem para o círculo. É o que a pessoa vai ver depois no ecrã do telemóvel: reconhece-se logo na loja |
| Contacto | `dicetoseven@gmail.com`, o do jogo. É também o e-mail da conta, com **autenticação de dois fatores** desde o primeiro dia |
| Ligações | Ver abaixo |

### A bio — 150 caracteres

Antes do lançamento:

```text
🎲 Add up to 7. Clear the board.
🧩 133 levels, every one solvable
🚫 No ads · No purchases · Offline
📲 iOS & Android — soon 👇
```

No dia L, só muda a última linha: `📲 Free on iOS & Android 👇`.

A primeira linha é o subtítulo da App Store, palavra por palavra. A mesma frase
na bio, na loja e no ícone do telemóvel é como uma marca se fixa.

### As ligações — até cinco

| Quando | Ligações, por esta ordem |
|---|---|
| Até L | 1. **O site** (`https://luiscunha.github.io/dicetoseven-site/`), e mais nenhuma. A beta não vai para a bio: chega só a quem comenta |
| A partir de L | 1. **Google Play** · 2. **App Store** · 3. O site |

As duas ligações das lojas levam uma marca de campanha, para se saber quantas
instalações vieram do Instagram **sem o jogo recolher nada** — quem conta é a
loja, não o jogo:

```text
Play:      https://play.google.com/store/apps/details?id=com.luiscunha.dicetoseven&referrer=utm_source%3Dinstagram%26utm_medium%3Dbio
App Store: https://apps.apple.com/app/id<ID>?pt=<PROVIDER>&ct=ig-bio&mt=8
```

O da Play lê-se na Play Console → Aquisição de utilizadores. O da Apple faz-se
no gerador de campanhas do App Store Connect (App Analytics), que dá o `pt`. Nos
Stories e nos DMs usa-se a mesma ligação com outro `utm_medium` / `ct`
(`story`, `dm`, `creator-<nome>`) — e fica-se a saber o que trouxe gente.

### Os destaques — as seis faces

Seis destaques, e cada capa é **uma face do dado**, na cor da rampa do jogo. Ao
olhar para o perfil, a fila dos destaques é um dado a contar de 1 a 6.

| Face | Cor | Nome | O que tem |
|---|---|---|---|
| ⚀ | `--face-1` | How to play | A regra em quatro Stories |
| ⚁ | `--face-2` | Modes | Puzzles, Contra-Relógio, Survival, Desafio do dia |
| ⚂ | `--face-3` | Pieces | O joker, os soldados, os gelados, as bombas |
| ⚃ | `--face-4` | Daily | Os resultados do Desafio do dia que a comunidade partilha |
| ⚄ | `--face-5` | Devlog | Os bastidores |
| ⚅ | `--face-6` | FAQ | Grátis? Anúncios? Sem rede? Línguas? Dados? iPad? |

As respostas do FAQ são as da página de suporte: grátis, sem anúncios nem
compras, joga-se sem rede, quatro línguas, nenhum dado recolhido, o progresso
não passa de um telemóvel para outro, e há versão para iPad.

### As três publicações fixadas

1. **O trailer** (#01) — o que é, em 15 s.
2. **Como jogar** (#02) — para quem chega e quer perceber antes de instalar.
3. **A chamada à ação** — a Beta (#03) até L, e no dia L o «Já disponível»
   (#16) toma-lhe o lugar.

---

## 2. A identidade no feed

### As cores e as letras

As mesmas do jogo, sem uma única exceção — vêm do `theme.css`:

| Papel | Token | Hex |
|---|---|---|
| Fundo claro | `--ground` | `#f1f2f0` |
| Texto, fundo escuro | `--ink` | `#123f3a` |
| Acento | `--accent` | `#1b6b62` |
| As faces 1 → 6 | `--face-1` … `--face-6` | `#cfe3f2` → `#1b6b62` |
| **O único verde vivo** | `--joker-caixa` | `#0aa816` |

O verde do joker usa-se **só** para o que se quer que salte: «Out now», o
número da data, a seta para a ligação. Se aparecer em todo o lado, deixa de
saltar — é a mesma regra que tem dentro do jogo.

A **Fredoka 600** é só para títulos e números grandes, como no jogo. O resto em
sem serifa simples (Inter, ou a do sistema).

### Os formatos

| O quê | Tamanho | Atenção |
|---|---|---|
| Publicação e carrossel | **1080×1350** (4:5) | A grelha do perfil mostra 3:4: o essencial fica no centro, longe das margens de cima e de baixo |
| Reels e Stories | 1080×1920 (9:16) | Nada importante nos 250 px de cima nem nos 350 de baixo: é onde ficam o nome, a legenda e os botões |
| Capa do Reel | 1080×1920 | O título no terço do meio, para se ler também recortado na grelha |

### Três moldes, e o feed faz-se com eles

| Molde | Como é | Para quê |
|---|---|---|
| **Tabuleiro** | O tabuleiro do jogo em fundo claro, uma pergunta curta em Fredoka por cima | Os puzzles, os modos, as peças |
| **Número** | Fundo `--ink`, um número enorme a verde ou branco — `7`, `14`, `133`, `77%` — e uma linha a explicar | Os factos. É o que se guarda e partilha |
| **Bastidores** | Fotografia ou vídeo teu, com uma moldura fina `--accent` | O criador |

A alternância dos três é o que faz a grelha parecer pensada sem precisar de
mosaicos — que, de resto, estragam cada publicação sozinha.

### As imagens saem do jogo

Fazem-se como as capturas das lojas: por código, a partir do jogo verdadeiro.
A página é `packages/game/vitrine/instagram.html`, com as peças
(`pecaDeAmostra`) e o tabuleiro (`BoardView`) do jogo, e o telemóvel da beta
mostra um ecrã real. Quando o jogo mudar de aspeto, refazem-se:

```bash
pnpm dev                                          # noutro terminal
node packages/mobile/capturas.mjs --so instagram  # --lang pt para uma língua só
```

Saem para `packages/mobile/instagram/`, fora do Git:

| Ficheiro | O que é |
|---|---|
| `destaques/1.png` … `6.png` | As capas dos seis destaques, 1080×1080. Sem texto, servem às duas línguas |
| `<língua>/02-como-jogar/1.png` … `5.png` | O carrossel #02, 1080×1350 |
| `<língua>/03-beta.png` | A imagem da beta, #03, 1080×1350 |
| `<língua>/stories/beta.png` | A Story da beta, 1080×1920: «Responde BETA a esta story» |
| `<língua>/05-puzzle-1/1.png` … `4.png` | O carrossel #05, Puzzle #1, 1080×1350 |

As línguas são `en` e `pt`. O tabuleiro do «Como jogar» é um exemplo feito à
mão, como os do ecrã «Como jogar» do jogo, e **a página verifica-o com o
solver**: se deixar de ter solução, a página falha em vez de o mostrar.

Falta o molde Número.

Os **Reels gravam-se no telemóvel**, com o gravador de ecrã do sistema: é a
única maneira de ter o toque e a animação verdadeiros. Tema escuro para os
Reels (destaca-se no feed, que é claro), claro para os carrosséis.

### A voz

A do jogo: **tu**, frases curtas, números exatos, nenhum ponto de exclamação a
mais.

| Sim | Não |
|---|---|
| «Num tabuleiro destes, 77% das jogadas ao acaso bloqueiam.» | «O PUZZLE MAIS DIFÍCIL DE SEMPRE!!! 🤯🔥» |
| «Consegues limpar isto em 4 jogadas?» | «Só 1% das pessoas consegue resolver isto!» |
| «Sem anúncios. Sem compras. É só o jogo.» | «Descarrega JÁ o melhor jogo do ano» |

Dois emojis por legenda chegam: 🎲 e o que a frase pedir.

---

## 3. Do que se fala — os pilares

| Pilar | Formato | O que se quer | Peso |
|---|---|---|---|
| **Consegues?** — um tabuleiro, uma pergunta | Carrossel, solução no último slide | Comentários e guardados | 30% |
| **Satisfatório** — peças a cair, combos, o selo Perfeito | Reels de 7–15 s, em ciclo | Alcance, gente nova | 30% |
| **Bastidores** — tu, o código, as decisões | Reel ou carrossel, com cara | Confiança, seguidores que ficam | 20% |
| **Comunidade** — o Desafio do dia, os resultados de quem joga | Stories, partilhas, destaque «Daily» | O hábito diário | 20% |

### As histórias que só este jogo tem

Cada uma vale pelo menos uma publicação. Todas são verdadeiras e estão
medidas — é o que as torna boas:

- **Todos os níveis têm solução.** Os 133 níveis são construídos de trás para a
  frente, a partir do tabuleiro vazio, e um computador resolve cada um antes de
  ele entrar no jogo.
- **Há exatamente 14 maneiras de fazer 7** com faces de dado — de `6+1` a sete
  `1`. E há uma medalha para a última.
- **O joker:** num tabuleiro de 12 peças, com o joker livre, **77%** das
  sequências ao acaso bloqueiam; com o valor certo, só **3%**. Toda a
  dificuldade está em saber quanto ele vale — e o jogo nunca o diz.
- **Nos tabuleiros mais duros**, só **1 em cada 12** sequências ao acaso chega
  ao fim (medido no playtest da fase 6). Antes de o escrever num post, **eu**
  meço o nível escolhido com o `measureSurvival`: o número tem de ser o desse
  tabuleiro.
- **Em agosto, o jogo era texto numa consola.** Antes de haver uma linha de
  interface, testou-se se a mecânica se aguentava: 35 previsões em 35 certas.
- **Sem anúncios, sem compras, sem dados.** O jogo nem usa a internet.

---

## 4. O calendário

Cinco fases. As horas são de Lisboa e são um ponto de partida: ao fim de duas
semanas, as estatísticas da conta dizem a que horas os teus seguidores estão
lá, e passa-se a publicar a essas.

```
sáb 24 out ─ seg 26 out   0. Montar a casa       a conta pronta, 3 publicações, ainda sem avisar ninguém
ter 27 out ─ dom  8 nov   1. Curiosidade         4 publicações por semana; beta; os primeiros 300
seg  9 nov ─ seg 16 nov   2. Contagem            a data, o lembrete, os criadores
ter 17 nov                3. L                   o lançamento, hora a hora
qua 18 nov ─ ter 24 nov   4. A primeira semana   o Desafio do dia passa a ritual
qua 25 nov  →             5. O ritmo             3 publicações por semana + Stories diárias
```

### Fase 0 — Montar a casa (até seg 26 out)

- [ ] **Tu**: criar a conta, mudá-la para Criador, nome, bio, foto, contacto,
      dois fatores. Reservar o nome no TikTok, Threads e YouTube.
- [x] **Eu**: as capas dos destaques, as imagens do #02 e do #03 (§2, «As
      imagens saem do jogo»).
- [ ] **Eu**: as Stories dos destaques «How to play» e «FAQ».
- [ ] **Tu**: gravar o trailer (#01, guião no anexo A).
- [ ] Publicar **#01, #02, #03 no mesmo dia**, por esta ordem, e fixá-los. Uma
      conta nova com uma fila completa parece a sério; com uma publicação só,
      parece abandonada.
- [ ] Ligar o filtro de palavras ocultas (Definições → Palavras ocultas).

Só depois disto se avisa alguém.

### Fase 1 — Curiosidade (ter 27 out → dom 8 nov)

O que se quer: **os primeiros 300 seguidores** — a tua rede primeiro —, gente
na beta, e descobrir que formatos pegam.

| Dia | # | Formato | Pilar | O quê |
|---|---|---|---|---|
| ter 27 | #04 | Reel | Bastidores | «Olá, sou o Luís. Fiz um jogo onde cada nível tem solução garantida.» |
| — | — | — | — | **Tu**: partilhar o #04 nas tuas redes pessoais, e mandar a 20–30 amigos uma mensagem **pessoal**, uma a uma, a pedir que sigam |
| qui 29 | #05 | Carrossel | Consegues? | **Puzzle #1** — um nível do Iniciado; a solução no último slide |
| sáb 31 | #06 | Reel | Satisfatório | O Survival em 10 s, em ciclo |
| seg 2 nov | #07 | Carrossel | Número | **As 14 maneiras de fazer 7** |
| qua 4 | #08 | Reel | Peças | **O joker**: «Vale o que faltar para o 7. Mas só um valor limpa o tabuleiro.» |
| qui 5 | #09 | Carrossel | Consegues? | **Puzzle #2** |
| sáb 7 | #10 | Reel | Bastidores | «Em agosto, o jogo era isto» — a consola → o jogo de hoje |

**Todos os dias, uma a três Stories**: uma sondagem («Joker: génio ou
batota?»), um bastidor, uma pergunta. As Stories não crescem a conta — fazem
voltar quem já a segue, e é isso que faz o algoritmo mostrar as publicações.

**A beta é a chamada desta fase**, e é a versão web: joga-se no browser, sem
instalar nada. **Só a recebe quem comenta BETA**: a ligação não vai para a bio
nem para as legendas. «Comenta BETA e mando-te a ligação» dá comentários (o
algoritmo gosta) e uma conversa privada com cada um (tu gostas).

A mensagem vai **sozinha**, pelo ManyChat (anexo A, #03), para ninguém ficar à
espera de que estejas ao telemóvel. A conversa a seguir é tua: quem responder
com feedback cai na caixa de entrada normal do Instagram. E o que eles
disserem entra no questionário que a Google faz no pedido de produção: o
feedback recebido e o que mudou com ele.

**A versão web tem de estar atualizada antes de a divulgar**: publica-se à
mão, e a de 2026-10-24 era de 16 de outubro, sem o «Acerca» nem o que entrou
depois. No GitHub, `dice-to-seven` → Actions → «Publicar» → Run workflow. E
volta a publicar-se cada vez que o `main` mudar o jogo, até ao lançamento.

### Fase 2 — Contagem (seg 9 nov → seg 16 nov)

Começa **no dia em que a segunda loja aprovar**. Se as aprovações atrasarem, a
fase 1 continua — com mais puzzles e bastidores — e a data move-se com elas.

| Dia | # | O quê |
|---|---|---|
| L−8 (seg 9) | #11 | **A data.** Reel curto: o tabuleiro esvazia, fica «17.11» a verde. Com **lembrete** na publicação, para quem tocar receber o aviso no dia |
| L−7 | #12 | Carrossel: os quatro modos, um por slide |
| L−5 | #13 | **Puzzle #3** — um nível do Perito, com a taxa de sobrevivência medida dele: «Só 1 em cada N tentativas ao acaso chega ao fim» |
| L−3 | #14 | Reel: as bombas, o pavio a acabar |
| L−1 | #15 | Story só: «Amanhã.» com o autocolante de contagem decrescente |

**Todos os dias da fase**: o autocolante de contagem decrescente numa Story.
Quem toca em «Lembrar-me» recebe uma notificação quando chega a zero — é o
mais perto que o Instagram tem de uma lista de espera.

**Os criadores** (ver §5): mandar as mensagens em L−8, com a data e a beta.

**O lado das lojas, que o Instagram não perdoa** — na véspera, tudo tem de
estar instalável por toda a gente:

- [ ] **Tu**: na Play, se se fizer o lançamento faseado do plano de publicação,
      fazê-lo **antes** de L — produção a 20% em L−5, **100% em L−1**. Um
      lançamento faseado no próprio dia pode deixar parte de quem chega pelo
      Instagram sem botão de instalar.
- [ ] **Tu**: na Apple, carregar em «Lançar» em **L−1 ao fim da tarde**. A app
      pode demorar umas horas a aparecer em todas as lojas do mundo.
- [ ] Se a Apple aprovar com dias de folga: ligar a **pré-encomenda** na App
      Store. A partir daí, a ligação da Apple já pode ir para a bio, e quem
      encomendar recebe o jogo sozinho no dia L.

### Fase 3 — O dia L (ter 17 nov)

| Hora | Quem | O quê |
|---|---|---|
| 08:00 | Tu | Abrir as duas ligações **de dentro do Instagram**, num Android e num iPhone, e instalar. Se alguma falhar, nada se publica até estar resolvido |
| 08:15 | Tu | A bio passa a «Free on iOS & Android», as ligações passam às das lojas |
| 09:00 | Tu | **#16 — «Out now»**: o Reel do lançamento. Fixar no lugar do #03 |
| 09:00–10:00 | Tu | **Responder a todos os comentários.** A primeira hora decide até onde a publicação vai |
| 09:15 | Tu | Stories com o autocolante de ligação: uma para a Play, outra para a App Store |
| 09:30 | Tu | Mensagem pessoal a quem esteve na beta e a quem comentou: «Já está. Obrigado.» |
| 12:30 | Amigos | **A onda dos Stories**: 15–20 amigos combinados de véspera partilham o #16 à hora de almoço |
| 19:00 | Tu | **#17** — carrossel «What's inside»: 4 modos, 133 níveis, 23 medalhas, 4 peças especiais |
| 21:30 | Tu | Opcional: um Live de 20 min a jogar o Desafio do dia com quem estiver |
| 23:00 | Tu | Stories com os primeiros resultados e reações que te mandaram, com crédito |

Fora do Instagram, no mesmo dia: o teu LinkedIn (a história do criador funciona
muito bem lá) e os grupos onde já estás.

### Fase 4 — A primeira semana (qua 18 → ter 24 nov)

O que se quer: **transformar instalações em hábito**. O hábito é o Desafio do
dia — igual para toda a gente, um por dia, com o texto de partilha que o jogo
já faz:

```text
DiceToSeven · Challenge #3 · 14 Oct
🧱 Survival: cleared in 3:42.1
🔥 3 days in a row
```

- **Todos os dias, uma Story «Challenge #N»** — o número é o do jogo, para quem
  joga reconhecer o seu: o teu resultado, a sondagem
  «Conseguiste?», e os resultados que os seguidores partilharam (com crédito).
  Tudo para o destaque «Daily».
- L+1: Reel com as primeiras reações (com autorização de quem as mandou).
- L+2: **Puzzle #4**.
- L+4: Reel de bastidores: «Como sei que todos os níveis têm solução.»
- L+6: **Hall da Fama** — quem ganhou o primeiro selo Perfeito no Perito.
- Uma Story a pedir uma avaliação na loja — **sem nada em troca**. Prémios por
  avaliações são proibidos nas duas lojas.

### Fase 5 — O ritmo (a partir de qua 25 nov)

| Dia | O quê |
|---|---|
| Segunda | **Puzzle da semana** (carrossel) |
| Quarta | **Reel**: jogo, uma peça especial, um modo |
| Sexta | **Bastidores ou comunidade**: o que mudou, o que pediram, o Hall da Fama |
| Todos os dias | A Story «Challenge #N» |
| Segunda, 20 min | **A revisão** (ver §7) |

Três publicações por semana durante meses vale mais do que sete numa semana e
nada na seguinte. O agendamento do próprio Instagram aceita publicações até 75
dias à frente: uma tarde por mês chega para o feed.

---

## 5. Os criadores

**Micro-criadores** (2 a 50 mil seguidores), não estrelas. Nesse tamanho
respondem às mensagens, a audiência confia neles, e fazem por gosto o que os
grandes só fazem por contrato.

| Onde procurar | Porquê |
|---|---|
| Puzzles, quebra-cabeças, «brain teasers» | É exatamente o público |
| Matemática e professores | «Somar até 7» é cálculo mental com estratégia; um professor partilha por gosto |
| Jogos de telemóvel *cozy* e indie — PT, BR, ES, FR | As quatro línguas do jogo |
| Jogos de tabuleiro e de dados | O objeto é o mesmo |
| Indie devs | Partilham-se uns aos outros; ao sábado, `#screenshotsaturday` |

- Fazer uma lista de **30**, escrever a **15** em L−8, contar com **5** que
  aceitam.
- O que se oferece: a beta antes de toda a gente, e **um puzzle só deles** —
  um tabuleiro escolhido para desafiarem os seguidores, com a solução no último
  slide. Publicado como **Colaboração** (o mesmo post nos dois perfis).
- Sem pagamento nesta fase. Se algum dia se pagar, **marca de parceria paga
  sempre**: é a regra do Instagram e é a lei.
- O modelo da mensagem está no anexo B. Escrita à mão, com o nome da pessoa e
  uma frase sobre uma coisa que ela publicou. Mensagens em massa não respondem.

---

## 6. A pesquisa e as hashtags

O Instagram hoje lê o que se escreve: **as palavras da legenda, do nome e do
texto alternativo contam mais do que as hashtags**. Cada legenda diz, por
palavras normais, o que o jogo é — «dice puzzle game», «brain game», «jogo de
puzzle».

Hashtags: **3 a 5 por publicação**, específicas. Mais do que isso não ajuda.

| Grupo | Hashtags |
|---|---|
| Sempre | `#DiceToSeven` |
| Puzzle | `#puzzlegame` `#braingames` `#logicpuzzle` `#brainteaser` |
| Indie | `#indiegame` `#indiedev` `#gamedev` `#mobilegame` |
| Ao sábado | `#screenshotsaturday` |

`#DiceToSeven` é também a da comunidade: é por ela que se encontram os
resultados para os Stories.

E o **texto alternativo** em todas as imagens (Avançado → Texto alternativo):
ajuda quem usa um leitor de ecrã, e o Instagram usa-o para saber do que a
imagem trata.

---

## 7. Medir

### Os números que importam

| Fase | Métrica | Meta de partida |
|---|---|---|
| 1 | Seguidores | 300 |
| 1 | Guardados por carrossel | ≥ 5% do alcance |
| 1 | Pessoas que pediram a beta (os contactos no ManyChat) | 25 |
| 2 | Toques em «Lembrar-me» | 100 |
| L | Toques nas ligações (estatísticas do perfil) | 300 |
| L+7 | Instalações vindas do Instagram (`utm_source=instagram`, `ct=ig-*`) | 150 |
| L+30 | Seguidores | 1 000 |
| L+30 | Resultados do Desafio partilhados com `#DiceToSeven` ou a menção | 50 |

São **metas de partida** para uma conta nova sem orçamento, não promessas.
Recalibram-se ao fim da primeira semana com números a sério.

A métrica que mais pesa no alcance de hoje é a **partilha por mensagem**
(«enviar a um amigo»). Um puzzle que se manda a alguém com «consegues isto?» é
o formato ideal — é por isso que o pilar «Consegues?» pesa tanto.

### A revisão de segunda-feira — 20 minutos

1. As três publicações da semana com mais **partilhas + guardados** (não
   gostos). Repetir o formato delas.
2. A pior. Perceber porquê, e não repetir.
3. As instalações vindas do Instagram, nas duas consolas.
4. Uma decisão para a semana seguinte, escrita.

**Eu** posso fazer a análise: exportas as estatísticas (ou mandas capturas) e
devolvo as três linhas.

---

## 8. O orçamento

**0 € até ao lançamento.** Depois, se se quiser, 50 a 100 € para promover
**o Reel que já foi o melhor sem dinheiro**, entre L+2 e L+7:

- Objetivo: tráfego para a ligação da loja (com `utm_medium=ads`).
- Países: Portugal, Brasil, Espanha, França — as línguas do jogo.
- Idade 18–44, interesses em jogos de puzzle e jogos de telemóvel.

Sem SDK no jogo (e é de propósito) não há medição ao clique; a marca de
campanha nas lojas é o que diz se valeu a pena.

**Sorteios, não.** «Segue, marca três amigos» enche a conta de gente que veio
pelo prémio e não pelo jogo — e uma conta cheia de seguidores que não ligam é
mostrada a cada vez menos gente.

---

## 9. O que não fazer

- **Não deixar a ligação da beta partida.** A versão web sai do ar quando as
  lojas aprovarem, e o repositório passa a privado (`plano-publicacao.md`).
  Antes disso, a mesma morada tem de passar a mandar para as lojas, em vez de
  dar um erro a quem a guardou. Deve dar para o fazer com uma página no site
  da conta (`luiscunha.github.io`), mas confirma-se como quando chegar a
  altura. **Eu** trato disso.

  E a troca faz-se **no dia L, e não no dia da aprovação**: entre uma e outra
  há uns cinco dias (fase 2) em que o jogo ainda não está nas lojas, e a
  ligação ia mandar a pessoa para uma página onde não há nada para instalar.
- **Não anunciar a data antes das duas aprovações.** Uma data adiada gasta a
  confiança que a contagem construiu.
- **Não prometer o que ainda não existe**: as tabelas de classificação e a
  compra única são de versões seguintes.
- **Não comprar seguidores nem gostos.** Estragam as estatísticas de que a
  revisão de segunda depende, e o alcance com elas.
- **Não deixar comentários sem resposta**, sobretudo na primeira hora.
- **Não usar o «7» como superstição ou jogo de azar.** É um puzzle de lógica:
  nada de casinos, sorte ou apostas na linguagem nem nas imagens. Atrai o
  público errado e aproxima o jogo de categorias que as lojas vigiam.

---

## 10. Quem faz o quê

**Tu**

- [x] Criar a conta (2026-10-23).
- [ ] Reservar o nome nas outras redes.
- [ ] Ligar a @dicetoseven ao ManyChat e ativar a mensagem automática da
      beta, antes de publicar o #03 (anexo A).
- [ ] Publicar a versão web antes de divulgar a beta (Actions → «Publicar»), e
      sempre que o jogo mudar até ao lançamento.
- [ ] Gravar os Reels no telemóvel — os guiões estão no anexo A.
- [ ] Aparecer: o #04, o #10, e uma vez por semana a seguir.
- [ ] Responder a comentários e mensagens, todos os dias.
- [ ] As mensagens pessoais aos amigos, aos testers e aos criadores.
- [ ] Os botões das lojas: o lançamento faseado e o «Lançar» da Apple.

**Eu**

- [x] A vitrine do Instagram: as publicações (1080×1350), as capas (1080×1080)
      e o molde Tabuleiro.
- [x] O formato das Stories (1080×1920), e a Story da beta.
- [ ] O molde Número.
- [x] As capas dos seis destaques.
- [ ] As Stories dos destaques fixos.
- [x] O carrossel #02 «How to play» e a imagem #03 da beta.
- [ ] As imagens dos outros carrosséis: os puzzles (com a solução), as 14
      maneiras, os quatro modos, as peças.
- [ ] As legendas que faltam, nas duas línguas, à medida do calendário.
- [ ] As ligações com marca de campanha, uma por sítio.
- [ ] A lista dos 30 criadores, a partir de pesquisas que tu confirmas.
- [ ] A análise da revisão de segunda.

**Para uma versão seguinte do jogo** (1.0.1, depois de L):

- [ ] O texto de partilha do Desafio passa a terminar com `#DiceToSeven` e a
      ligação do site. Hoje não leva nenhum dos dois, e cada resultado colado
      numa conversa é um anúncio que não diz onde se instala.

---

## Anexo A — As primeiras publicações

As legendas vão em inglês, com a linha 🇵🇹 no fim. O resto escreve-se à medida
do calendário, no mesmo molde.

### #01 — Reel · O trailer (fixado)

Grava-se o ecrã do telemóvel a jogar um nível inteiro, e corta-se e acelera-se
no editor de Reels do Instagram. Não é precisa nenhuma aplicação de edição.

**1. Preparar o telemóvel**

- Modo Não incomodar, para não aparecer nenhuma notificação a meio.
- No jogo: Definições → Tema → **Escuro**, que se destaca mais no feed.
- No gravador de ecrã do Android (no painel rápido), ligar **mostrar toques no
  ecrã** — num Samsung, «Toques e gestos». O áudio fica desligado: o jogo não
  tem som.

**2. O nível: Iniciado 2** (`inicio-000134`)

A primeira jogada é um **3 + 4**, e é um dos três níveis que mostram a linha da
soma — que é o que o trailer quer mostrar. Esta é a solução guardada no pack.
As colunas contam-se da esquerda, e as peças de baixo para cima, sempre como
estão no ecrã nesse momento, porque as colunas encostam:

| Jogada | Toca em |
|---|---|
| 1 | o **3** e o **4** da coluna 1 (3.ª e 4.ª peças) |
| 2 | o **2** e o **2** da coluna 1 (2.ª e 3.ª), e o **3** da coluna 2 (2.ª) |
| 3 | o **3** e o **2** da coluna 3 (3.ª e 4.ª), e o **2** da coluna 4 (3.ª) |
| 4 | o **2** e o **2** da coluna 3 (2.ª e 3.ª), e o **3** da coluna 4 (2.ª) |
| 5 | o **2** e o **1** da coluna 1 (1.ª e 2.ª), e o **4** da coluna 2 (2.ª) |
| 6 | o **3**, o **2** e o **2** de baixo das colunas 1, 2 e 3 |
| 7 | o **4** da coluna 1, e o **1** e o **2** da coluna 2 |

Se o pack mudar, o nível 2 pode deixar de ser este: confirma-se pelo id.
Ensaia-se duas ou três vezes antes de gravar. Sem desfazer e sem dicas, o nível
acaba com o selo **Perfect**, que é o fecho do trailer.

**3. Gravar**

1. Abrir o Iniciado 2 e esperar que o tabuleiro apareça.
2. Começar a gravação do ecrã, e esperar que acabe a contagem decrescente.
3. Jogar as 7 jogadas **a um ritmo calmo**: acelera-se depois.
4. No painel do Perfect, esperar 2 segundos. Voltar à Home, onde está o
   logótipo, e ficar lá 3 segundos.
5. Parar. Fazer duas ou três gravações e ficar com a melhor.

**4. Montar no Instagram**

1. **+ → Reel** → a gravação.
2. **Cortar o início**, para o primeiro toque no 3 acontecer logo no primeiro
   segundo. É o que decide se as pessoas param de deslizar.
3. **Dividir** logo a seguir à primeira jogada, e pôr o meio (jogadas 2 a 7) a
   **velocidade 2×**. O fim — o Perfect e a Home — fica à velocidade normal.
   Tudo junto, uns 15 segundos.
4. **Três textos** (Aa), cada um com a sua duração na linha do tempo:
   - «**One rule: add up to 7.**» — do início até o primeiro par sair.
   - «**Every move changes the next one.**» — durante a parte acelerada.
   - «**Coming soon · iOS & Android**» — por cima da Home, no fim.

   A meio do ecrã: em cima e em baixo é onde o Instagram põe os botões e a
   legenda.
5. **Música**: um instrumental calmo da biblioteca («lofi», «chill»), com o
   volume baixo.
6. **Capa**: a imagem com o tabuleiro inteiro e o primeiro texto.
7. **Legenda**: a de baixo.
8. **«Partilhar também no feed»** ligado, e **guardar como rascunho**: publica-se
   no mesmo dia que o #02 e o #03.

```text
One rule: join touching dice that add up to exactly 7. 🎲

Then the pieces above fall, the columns slide together — and every move changes the next one.

A dice puzzle game, coming soon to iOS & Android. Free. No ads. No purchases.

🇵🇹 Uma regra só: junta dados encostados que somem 7. Em breve, grátis e sem anúncios.

#DiceToSeven #puzzlegame #indiegame #mobilegame
```

### #02 — Carrossel · How to play (fixado)

1. **How to play DiceToSeven** — o tabuleiro inteiro.
2. **Tap dice that touch each other** — três peças selecionadas, a soma à vista.
3. **They must add up to exactly 7** — o grupo sai.
4. **The pieces above fall. The columns slide together.** — antes e depois.
5. **Clear the board.** — o tabuleiro vazio e o selo Perfeito.

```text
How to play, in five slides. 🎲 Save it for later.

Tip: the order matters. Every group you clear moves the pieces around it — so look one move ahead.

🇵🇹 Como jogar, em cinco slides. Guarda para depois.

#DiceToSeven #puzzlegame #braingames #logicpuzzle
```

### #03 — Imagem · A beta (fixado até L)

**Play it before anyone else**, a etiqueta `Free beta · play in your browser`,
e o jogo num telemóvel. A beta é a versão web: corre em qualquer telemóvel ou
computador.

```text
DiceToSeven is almost here, and you can play the beta today. 🎲

Comment BETA and I'll send you the link. It runs in your browser, on any phone or computer. No install, no account.

What you tell me goes straight into the next build.

🇵🇹 Comenta BETA e envio-te a ligação: joga já no browser, em qualquer telemóvel ou computador.

#DiceToSeven #indiegame #puzzlegame #betatest
```

Texto alternativo: `The DiceToSeven app on a phone, showing a chapter's grid of levels with stars. Text: Play it before anyone else. Free beta, play in your browser.`

**A mensagem a quem comenta vai sozinha, pelo ManyChat**, parceiro oficial da
Meta. O plano grátis chega para começar; confirmar os limites no site. A conta
e as permissões são tuas; os nomes dos botões podem mudar.

1. **No Instagram, antes:** Definições → Mensagens e respostas a stories →
   Controlos de mensagens → Ferramentas ligadas → **Permitir acesso às
   mensagens**. Sem isto, nenhuma ferramenta envia nada.
2. **No ManyChat:** criar a conta, escolher Instagram e ligar a @dicetoseven.
3. **Automation → New Automation**, com o modelo de enviar uma mensagem a quem
   comenta.
4. **O gatilho:** um comentário em **qualquer publicação ou Reel** com a
   palavra **BETA**. Com «qualquer», fica pronta antes de o #03 existir e
   serve para os posts seguintes.
5. **A resposta pública**, com várias versões, para não parecer um robô:
   - `Sent! Check your DMs 📩`
   - `On its way to your DMs 🎲`
   - `Done! Look in your messages 📩`
6. **A mensagem privada**, com a ligação num botão e não crua no texto:

   ```text
   Thanks for joining the DiceToSeven beta! 🎲
   It runs in your browser, best on your phone. Tap below to play.
   Anything you notice, good or bad, just reply here. 🙏

   🇵🇹 Obrigado! Toca abaixo para jogar, e diz-me o que achaste.
   ```

   Botão: **Play the beta** → `https://luiscunha.github.io/dice-to-seven/`
7. **Ativar** a automação (Set Live), e só depois publicar o #03.
8. **Testar** com a conta pessoal: comentar «beta» no #03, e ver chegar a
   resposta pública e a mensagem com o botão. Depois apagar o comentário.
9. **As Stories, num segundo gatilho:** uma **resposta a uma Story** com a
   palavra **BETA** manda a mesma mensagem, sem resposta pública (a resposta a
   uma Story já é privada).

**Entre amigos, a Story pesa menos do que o comentário.** Comentar «BETA» à
vista de todos é estranho para quem já te conhece, e no primeiro dia ninguém o
fez (2026-10-26). A Story da beta (`stories/beta.png`) pede para **responder**,
e não para comentar. Aos amigos mais próximos, manda-se a ligação diretamente,
com um pedido pessoal de feedback: são eles os primeiros testers.

Quem não segue a @dicetoseven pode receber a mensagem nos **pedidos de
mensagem**: é lá que deve procurar quem disser que não recebeu. As respostas
com feedback chegam à caixa de entrada normal do Instagram, e são tuas. O que
as pessoas disserem guarda-se: é a resposta ao questionário da Google no
pedido de produção.

### #04 — Reel · Hi, I'm Luís

Tu, a jogar, 20–30 s. Pode ser só as mãos e o telemóvel, com o texto no ecrã:

1. «I'm Luís. I'm a developer from Portugal.»
2. «I made a dice puzzle game.»
3. «Every one of its 133 levels was solved by a computer before you see it.»
4. «No ads. No purchases. It doesn't even need the internet.»
5. «Launching soon. This is the start of it.»

```text
Hi! I'm Luís, and this is the first game I've made on my own. 👋

DiceToSeven has one rule — add up to 7 — and 133 levels. Each one was built backwards from an empty board and solved by a computer before it went in. If you get stuck, there was always a way out.

I'll be sharing how it was made, and the puzzles I like best. Glad you're here.

🇵🇹 Olá! Sou o Luís, e este é o primeiro jogo que fiz sozinho. Vou mostrar aqui como foi feito.

#DiceToSeven #indiedev #gamedev #indiegame
```

### #05 — Carrossel · Puzzle #1

O **Iniciado 21** (`inicio-1002190`), um nível verdadeiro: quem tem a beta pode
ir jogá-lo. É o nível pequeno mais difícil do Iniciado, com 16 peças num
quadrado de 4×4, e 44% das tentativas ao acaso ficam presas. Os slides saem da
vitrine (`peca=puzzle&n=1`), e a página confirma que a solução guardada esvazia
o tabuleiro.

1. **Puzzle #1: can you clear this?**: o tabuleiro, e «Beginner · level 21».
2. **44%** of random attempts at this board get stuck. *Think before you tap.*
   Em fundo escuro, no molde Número.
3. **Solution: the first move**: o 3 e o 4 lado a lado, 3 + 4 = 7.
4. **And the rest, in order**: as outras seis jogadas, cada uma num cartão.

A dica é a taxa de sobrevivência, e não «começa pela direita». Medido a
2026-10-29: no Iniciado e no Médio, todas as primeiras jogadas ainda têm
saída, e os becos só aparecem mais à frente. Uma dica sobre a primeira jogada
seria inventada.

```text
Puzzle #1 🎲 Can you clear this board?

Tell me your first move in the comments, then swipe for the solution.

It's level 21 of the Beginner chapter, and 44% of random attempts on it get stuck. Every board in the game has at least one way out. Finding it is the whole game.

Want to play it for real? Comment BETA and I'll send you the beta.

🇵🇹 Puzzle #1: consegues limpar este tabuleiro? Diz nos comentários a tua primeira jogada. Queres jogá-lo a sério? Comenta BETA.

#DiceToSeven #puzzlegame #brainteaser #logicpuzzle
```

Textos alternativos:

1. `A 4 by 4 DiceToSeven board: level 21 of the Beginner chapter.`
2. `44% of random attempts at this board get stuck.`
3. `The first move: a 3 and a 4 side by side. 3 + 4 = 7.`
4. `The other six moves, each on a small board with its group marked.`

### #07 — Carrossel · The 14 ways to make 7

1. **There are exactly 14 ways to make 7 with dice.** (molde Número: um `14` enorme)
2. Com duas peças: `6+1` · `5+2` · `4+3`
3. Com três: `5+1+1` · `4+2+1` · `3+3+1` · `3+2+2`
4. Com quatro: `4+1+1+1` · `3+2+1+1` · `2+2+2+1`
5. Com cinco e seis: `3+1+1+1+1` · `2+2+1+1+1` · `2+1+1+1+1+1`
6. **And the hardest one: seven 1s.** — com a medalha que se ganha por ela.

Cada soma desenhada com as faces do jogo, nas cores da rampa.

```text
There are exactly 14 ways to make 7 with dice — and in DiceToSeven, every one of them is a move. 🎲

The rarest? Seven 1s in a single group. There's a medal for it.

Which one do you think you'll use the most?

🇵🇹 Há exatamente 14 maneiras de fazer 7 com dados. A mais rara são sete 1 — e há uma medalha para ela.

#DiceToSeven #braingames #math #puzzlegame
```

### #08 — Reel · Meet the Joker

1. Um tabuleiro com o joker; o dedo toca nele.
2. O seletor das seis faces abre por cima da peça. Texto: **It's worth whatever completes the 7.**
3. Texto: **But only one value clears the board.**
4. O dedo hesita entre duas faces. Texto: **Which one would you pick?** — e corta.

```text
Meet the Joker. 🃏 It's worth whatever you need to make 7.

The catch: across the whole board, only one value lets you clear it. Spend it in the wrong group, and you'll only find out at the very end.

Which one would you pick? 👇

🇵🇹 O joker vale o que faltar para o 7 — mas só um valor limpa o tabuleiro. Qual escolhias?

#DiceToSeven #puzzlegame #brainteaser #indiegame
```

### #11 — Reel · A data

O tabuleiro esvazia-se jogada a jogada, e as últimas peças que saem deixam no
lugar **17.11**, a verde. Texto final: **Free on iOS & Android.** Com o
**lembrete** ligado na publicação.

```text
17 November. 🎲

DiceToSeven launches on iOS and Android — free, no ads, no purchases.

Tap "Remind me" and Instagram will let you know on the day.

🇵🇹 17 de novembro, no iOS e no Android. Grátis, sem anúncios. Toca em «Lembrar-me».

#DiceToSeven #puzzlegame #indiegame #mobilegame
```

### #16 — Reel · Out now (fixado a partir de L)

O trailer do #01 com o fim trocado: **Out now · Free on iOS & Android**, e a
seta verde para a bio.

```text
It's out. 🎲

DiceToSeven is now free on iOS and Android. One rule — add up to 7 — 133 levels, a new Daily Challenge every day, and nothing else: no ads, no purchases, no account.

Link in bio. If you play today's Daily, share your result and tag @dicetoseven — I'll repost them all.

🇵🇹 Já está! Grátis no iOS e no Android, ligação na bio. Partilha o teu resultado do Desafio do dia e marca @dicetoseven.

#DiceToSeven #puzzlegame #indiegame #mobilegame
```

---

## Anexo B — A mensagem aos criadores

```text
Hi <name>! I loved your <post / puzzle / video about X>.

I'm Luís, a solo developer from Portugal. On <date> I'm launching DiceToSeven — a dice puzzle where you join touching dice that add up to 7. It's free, with no ads and no purchases.

I picked a board just for you, to challenge your followers with — solution included. Would you like to try it? I can also send you the beta now.

No strings attached: if you don't like it, that's fine too. 🎲
```

```text
Olá <nome>! Gostei muito do teu <post / puzzle / vídeo sobre X>.

Sou o Luís, um programador português, e a <data> lanço o DiceToSeven — um puzzle em que se juntam dados encostados até somarem 7. É grátis, sem anúncios nem compras.

Escolhi um tabuleiro só para ti, para desafiares quem te segue — com a solução incluída. Queres experimentar? Também te posso mandar a beta já.

Sem compromisso nenhum: se não gostares, está tudo bem. 🎲
```
