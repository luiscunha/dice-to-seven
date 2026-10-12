# Estado atual — ponto de partida

> Este documento existe para que uma sessão nova, noutra máquina, arranque com o
> mesmo contexto que a sessão que construiu isto. Não substitui o
> `plano-implementacao.md` — complementa-o com o que **não** se lê no código nem
> no histórico do git.
>
> Última atualização: 2026-08-20, com o gate da Fase 6 fechado a **Verde**.

---

## Arranque

```bash
git clone https://github.com/luiscunha/dice-to-seven.git
cd dice-to-seven
pnpm install
pnpm check
```

Node ≥ 20, pnpm 11.22.0 (fixado em `packageManager`). O `pnpm check` corre
lint + typecheck + testes: **269 testes, ~20 s**. Se demorar muito mais do que
isso, ver "Armadilhas" no fim.

Leituras, por esta ordem:

1. `CLAUDE.md` — as cinco regras invioláveis do motor e os quatro algoritmos que
   não se improvisam.
2. `documentation/plano-implementacao.md` — o plano vivo. Cada fase concluída
   traz as decisões que foram tomadas durante a execução e os critérios que
   foram verificados.
3. Este ficheiro.

Os documentos de origem — `spec-motor.md` e `plano-modelo-jogo.md` —
mantêm-se como estavam. **Não foram corrigidos**, e em quatro pontos estão
contrariados por medições. Ver "Onde a realidade contrariou os documentos".

---

## Onde estamos

| Fase | | |
|---|---|---|
| 0 | Andaime | ✅ |
| 1 | Tabuleiro, adjacência e jogada | ✅ |
| 2 | Deteção de grupos | ✅ |
| 3 | Solver | ✅ |
| 4 | Gerador | ✅ |
| 5 | Métricas e pipeline | ✅ |
| 6 | Renderer de consola | ✅ **gate fechado a Verde** |
| 7 | Camada de sessão | ✅ |
| 8 | UI web | 🔨 **publicada** — falta só o playtest externo, que é o critério de aceitação |
| 9 | Empacotamento | por começar |

O motor está completo e é puro: `packages/engine/src/` não importa nada de Node,
não toca no DOM e não chama `Math.random()` — há regras de ESLint que o impõem,
não é convenção.

Existe um pack verificado em `packages/tools/out/level-pack.json`: **240 níveis,
8 bandas de 30**, todos com solução guardada e validada por simulação direta.

---

## O gate da Fase 6 — fechado a Verde

O critério era humano, e é o risco nº 1 do plano §8:

> Num tabuleiro de 4x4, consegues planear 2–3 jogadas à frente?

Consegue-se. Oito sessões, registadas em `playtest.jsonl`:

| Nível | Peças | Sobrevivência | Previsões | Selo |
|---|---|---|---|---|
| `inicio-000296` | 18 | 0.625 | **6/6** | perfeito |
| `inicio-000256` | 24 | 0.708 | **8/8** | perfeito |
| `meio-000015` | 28 | 0.476 | **9/9** | perfeito |
| `perito-000014` | 37 | 0.083 | **12/12** | perfeito |
| `meio-joker-000013` | 27 | 0.079 | *(joker)* | perfeito |

**35/35, zero undos, zero bloqueios**, incluindo silhuetas e grupos de 5 a 7 peças
onde uma em cada doze sequências aleatórias sobrevive. A regra de reorganização
fica, e com ela tudo o que está construído a partir da Fase 1.

O passo 3 do protocolo — repetir com o modo de dois passos — não chegou a ser
preciso: existia para separar Verde de Amarelo, e a taxa já estava no máximo sem
ajuda. Animar gravidade e colapso em separado continua **recomendado** na Fase 8,
mas não é requisito.

Cuidado com uma leitura fácil: o número de jogadas de uma resolução não mede nada.
Como cada jogada remove exatamente 7, qualquer tabuleiro limpo leva sempre
`soma/7` jogadas. O sinal está em chegar ao fim sem desfazer.

### Os dois achados que mudam a Fase 8

**O valor do joker escolhe-se ao tocar nele.**

O modelo de interação do plano §3.1 — tocar-a-acumular, elimina ao chegar a 7 —
não encaixa no joker sem ajuda: como ele preenche o que faltar, a seleção fica
válida logo à primeira peça encostada, e o joker gasta-se ao valor que essa peça
deixar. A Fase 8 tentou três desenhos:

| Tentativa | Porque falhou |
|---|---|
| Disparo automático | O jogador nunca chegava a escolher o valor |
| Botão de confirmação | Obrigava a sair do tabuleiro; a razão do botão não se lia |
| Teto em `7 − valor obrigatório` | Removia a possibilidade de errar — ver abaixo |

**A terceira foi a mais instrutiva, e a mais perigosa.** Impedir o valor errado
parecia uma simplificação elegante: sem botão, sem números, sem tutorial. Mas
medido depois, exaustivamente, num tabuleiro de 12 peças da banda `denso`:

| Conjunto de jogadas | Sequências | Bloqueiam |
|---|---|---|
| Com o joker livre | 1175 | **77,0%** |
| Com o joker forçado ao valor certo | 279 | **3,2%** |

E na banda inteira, a sobrevivência passava de 0,141 para **0,957**. Toda a
dificuldade das bandas com joker vinha da possibilidade de o gastar mal — é a
medição nº 3 acima, lida ao contrário.

**A solução é escolher o valor no momento do toque.** Um seletor com as seis
faces abre em cima da peça; escolhido o valor, o joker comporta-se como uma peça
normal e elimina sozinho ao chegar a 7. A ambiguidade morre na origem, não é
preciso botão, e **a liberdade de errar mantém-se intacta**.

O valor obrigatório nunca aparece no ecrã: descobri-lo é o puzzle. E o tutorial
dedicado do §2.6 continua a fazer falta — ensina a regra, não a resposta.

**Lição de método:** a segunda medição do gate da Fase 6 — "o valor do joker não
se descobre a jogar" — foi tirada com um defeito presente e está contaminada.
Quando uma conclusão de playtest vier de uma sessão onde algo estava partido,
remede-se antes de a tratar como facto.

## O que se segue

A **Fase 8** está construída e **publicada**:

```
https://luiscunha.github.io/dice-to-seven/
```

Home, **Puzzles** (campanha em cinco capítulos, com grelha e selos),
**Contra-Relógio** e definições. Publica-se por botão em Actions → Publicar, e o
`pnpm check` corre antes; se falhar, não publica.

**Falta o playtest externo**, que é o que o critério de aceitação pede antes de
qualquer trabalho de empacotamento. Confirmado a jogar num iPhone 17e: o 7×7 do
Perito lê-se e toca-se bem num dos ecrãs mais estreitos que há.

```bash
pnpm dev     # localhost:5173
```

As rotas vivem no fragmento — `#/puzzles/perito`, `#/jogo/perito/27`,
`#/contrarrelogio`.
É o que faz o jogo publicado correr em alojamento estático sem uma linha de
reescritas, e o que dá endereço a cada ecrã: no playtest, um link leva a pessoa
exatamente ao nível de que se está a falar. A forma antiga, `?banda=…&nivel=…`,
continua a funcionar.

O critério de aceitação da fase é *campanha inicial jogável ponta a ponta, com os
dois modos, num link partilhável*. Contra ele falta, por ordem:

| | | |
|---|---|---|
| 1 | Tutorial do joker | ✅ |
| 2 | Forma dos tabuleiros — metade cheios | ✅ |
| 3 | Home, campanha em capítulos, definições | ✅ |
| 4 | Contra-Relógio | ✅ |
| 5 | Link partilhável, para o playtest externo | ✅ |

O mapa de progressão, o perfil, as definições e o puzzle diário ficam **depois**
da marca do playtest (desenho §8) e não bloqueiam a Fase 9.

Uma coisa por resolver, que veio de jogar e ainda não tem decisão. É mais barata
antes do playtest externo do que depois — regerar bandas depois de alguém jogar
invalida o que essa pessoa jogou:

- **A dificuldade chega sempre aos ~78% do jogo**, em todas as bandas. No
  `perito` são 15 jogadas com a primeira fatal à décima segunda. Não é afinável:
  em 250 candidatos, o melhor está nos 65%. A ramificação de 33 grupos por jogada
  não deixa errar cedo. Ver "O que fica por decidir".
  - Medido depois: os ~78% são quando o jogador **dá pelo** erro; o erro em si
    comete-se a meio do nível. A contagem decrescente foi testada contra isto e
    não passa como está. Ver "A contagem decrescente".

---

## O tutorial do joker — feito

O plano §2.6 chama-lhe obrigatório, e é a mitigação nomeada do risco *"joker mal
usado mata o tabuleiro"*. Ficou mais necessário do que estava: com o joker livre
restaurado, voltou a ser possível matar o tabuleiro em silêncio, e sem tutorial
isso lê-se como defeito e não como puzzle.

**É um tabuleiro a sério, de quatro peças** — `[[0, 4], [5, 3]]`, joker a valer 2,
duas jogadas. Tem duas saídas boas e uma má: gastar o joker com o 4 soma 7, o
jogo aceita, e sobram 5 e 3 — soma 8, zero grupos, sem joker para corrigir. Morre
numa jogada, à frente do jogador, e o ecrã nomeia o que aconteceu sem o
repreender.

A conta aparece **com números, uma vez**: `as faces somam 12` · `faltam 2 para 14`
· `que é 7 × 2 → ✳ = 2`.

**O andaime.** Aplicar a regra exige a soma do tabuleiro, e somar 27 faces de
cabeça no telemóvel não é um puzzle, é trabalho. O cabeçalho mostra
`faces somam N` nos **três primeiros níveis com joker que o jogador completar**, e
nunca mais — nem no `denso`, que é dedução pura. O número não dá a resposta:
continua a ser o jogador a fechar a conta.

Detalhes de desenho e o porquê de cada um: `desenho-fase-8.md` §5.4.
`packages/game/test/tutorial.test.ts` verifica contra a engine as três coisas que
o tabuleiro promete ensinar.

---

## A forma dos tabuleiros — metade cheios

Até aqui os tabuleiros nunca enchiam: preenchimento de 65–73% em todas as bandas,
silhueta sempre recortada, e a forma média do `perito` era 6,9 × 9,0 — mais alta
do que larga. Nunca saía um 7×7.

O `silhouetteProfile` existia no gerador desde a Fase 4 e **nenhuma banda o
usava**. Passou a usar-se, e metade dos níveis de cada banda são agora retângulos
cheios.

### O que a medição decidiu

Três medições, a 2026-08-21, antes de mexer numa linha de banda.

**Encher não custa dificuldade.** Comparando o mesmo tamanho com e sem perfil, a
sobrevivência mediana é a mesma dentro do ruído — e se pende, pende para mais
difícil:

| | com perfil | sem perfil |
|---|---|---|
| `meio` 5×5 | 0,497 | 0,520 |
| `meio` 6×6 | 0,287 | 0,323 |
| `perito` 7×7 | 0,113 | 0,127 |

**Encher não custa aceitação.** Sete configurações, 300 candidatos cada: média de
**16,3% de aceites sem perfil contra 15,0% com**. Quem rejeita a maioria dos
tabuleiros cheios é o piso de justiça — e rejeita qualquer tabuleiro na mesma
medida. Era a hipótese que faltava excluir.

**Sem perfil não há nada a filtrar.** Zero tabuleiros cheios em 300 candidatos em
cinco das sete configurações. Não é uma preferência que se satisfaça filtrando o
que já se gerava.

**O custo é a raridade da forma, e depende do número de colunas** — o gerador
constrói coluna a coluna, e quantas menos houver mais fácil é fechá-las todas à
mesma altura. Daí que `perito` 5×7 saia quatro vezes mais que 7×5, com as mesmas
35 peças:

| Colunas | Cheios em 200 candidatos |
|---|---|
| 3 | ~96 |
| 4 | ~45 |
| 5 | ~25 |
| 6 | ~8 |
| 7 | ~6 |

### O que ficou no pack

| Banda | Cheios | Formas |
|---|---|---|
| `inicio` | 15/30 | 4×4 ·7 · 4×5 ·8 |
| `meio` | 15/30 | 5×5 ·7 · 5×6 ·8 |
| `meio-joker` | 15/30 | 4×6 ·7 · 5×5 ·8 |
| `avancado` | 15/30 | 5×6 ·7 · 6×6 ·8 |
| `perito` | 15/30 | 5×7 ·5 · 6×7 ·5 · **7×7 ·5** |
| `denso` | 15/30 | 3×4 ·7 · 3×5 ·8 |

`tutorial` e `tempo` ficaram como estavam: exigem sobrevivência de 100% e prova
exaustiva de greedy-safe, e é aí que encher luta mais contra a aceitação —
1 aceite em 91 tabuleiros cheios do tutorial, contra 6% de base.

### As duas peças que isto obrigou a existir

**A rejeição por forma.** O perfil é uma *preferência* do gerador, não uma
garantia. Sem verificar que o tabuleiro saiu mesmo cheio, "metade cheios"
degenerava em "metade tentados, quase todos recortados" — e o pack ficaria igual
ao antigo. É a sexta razão de rejeição, e corre antes da ida-e-volta e de
qualquer playout, portanto é barata. Não toca em nenhuma garantia: a
resolubilidade continua a vir da ida-e-volta e do piso de justiça.

**A quota por forma.** Cada banda constrói-se agora em várias passagens — uma de
forma livre e uma por cada forma cheia, cada uma com a sua faixa de seeds, porque
a seed é a identidade do nível. Misturar as seeds e deixar a proporção ao acaso
dava um pack dominado pelas formas baratas: um `denso` 3×4 custa 12 candidatos e
um `perito` 7×7 custa 150, e é precisamente o 7×7 que se quer garantido.

### O que a geração corrigiu das medições

**O `meio-joker` 5×5 dá.** No funil tinha dado zero aceites em 27 tabuleiros
cheios. Ficou na rotação por o zero ser amostra pequena, e saíram os oito. Era
ruído.

**O `inicio` é três vezes mais caro do que estimado** — ~400 candidatos por nível
cheio, não ~150. A razão está nos seus próprios números: os tabuleiros cheios
desta banda têm mediana de sobrevivência **0,42**, e a banda exige **0,55 para
cima**. Foi preciso dar-lhe seis vezes mais orçamento, e daí vem o `--max` do
`dicetoseven build`.

---

## Bandas e capítulos são coisas diferentes

Estavam a ser a mesma, e isso pôs sete entradas na lista de níveis — duas delas,
`meio-joker` e `denso`, bandas **inteiras** de joker. O plano §7 diz o
contrário: o joker "aparece esporadicamente — não em todos os tabuleiros".

A campanha passa a mostrar **cinco capítulos**, com o joker intercalado um em
cada três níveis:

| Capítulo | Base | Joker intercalado | Níveis |
|---|---|---|---|
| Tutorial | `tutorial` | — | 30 |
| Iniciado | `inicio` | — | 30 |
| Médio | `meio` | `meio-joker` | 45 |
| Avançado | `avancado` | `denso` | 45 |
| Perito | `perito` | — | 30 |

Os dois modos chamam-se **Puzzles** e **Contra-Relógio**. O segundo arranca com
60 segundos por omissão, e o valor está nas definições — 30, 60 ou 90. O plano
§6.3 pede um arranque generoso mas não diz quanto, e isso é número de playtest.

**As bandas não se fundem, e não é preguiça.** A `meio` aceita sobrevivência de
30–55% e a `meio-joker` de 2–15%; nenhum tabuleiro cumpre as duas, porque um
joker sozinho leva a sobrevivência de 0,83 para 0,20. A separação é uma restrição
de *geração*. A apresentação não a tem — daí viver em `capitulos.ts` e as bandas
continuarem oito no pipeline.

A rota do jogo continua a ser `#/jogo/<banda>/<índice>`, e não a posição no
capítulo: é o par que identifica o nível no pack, portanto um link sobrevive a
mudar a cadência de intercalação — e os links antigos continuam a funcionar sem
tradução nenhuma.

**Sobram 15 níveis de cada banda com joker**, 30 ao todo, gerados e por jogar. É
assumido, e há um teste que o vigia: são o corpo natural do puzzle diário
(desenho §8, passo 10).

---

## Telemóvel deixou de ser da Fase 9

O desenho da Fase 8 assumiu "desktop primeiro" e adiou o telemóvel. Deixou de
servir: **mais de 80% de quem vai testar usa telemóvel**.

Medido, não presumido. Nada rebentava — sem rolagem lateral, rodapé sempre
visível, tabuleiro sempre dentro da bandeja. O que falhava era o **alvo de
toque**, e falhava de duas maneiras diferentes.

**A que se resolve com CSS.** Num ecrã de 375, um 7×7 dava peças de 41px, abaixo
do piso de 44. Apertando a folga das peças de 6 para 4 e o enchimento dos ecrãs
em larguras até 480px, passa a 46px — e a 44px num ecrã de 360, o pior caso que
vale a pena servir.

Mais duas ausências que só doem com o dedo:

| | |
|---|---|
| `-webkit-tap-highlight-color: transparent` | o iOS pintava um retângulo azul por cima do anel de seleção |
| `touch-action: manipulation` | sem ele, 300ms de espera por toque à procura de um duplo toque — numa jogada de sete peças lê-se como o jogo estar lento |

**A que não se resolve com CSS: a largura.** Até 7 colunas as peças ficam no piso
de toque; 8 colunas dão 38px e o único nível de 11 dá 26px, mais estreito do que
uma tecla de teclado. Não há enchimento que recupere largura.

A campanha passa a **saltar os níveis com 8 ou mais colunas**. Continuam no pack,
continuam válidos, e continuam acessíveis por link direto — só não entram nos
capítulos:

| Capítulo | Antes | Agora |
|---|---|---|
| Tutorial | 30 | 30 |
| Iniciado | 30 | 30 |
| Médio | 45 | 40 |
| Avançado | 45 | 33 |
| Perito | 30 | 23 |

O índice ganhou `colunas` para isto ser decidido no arranque, sem carregar as
bandas todas. **O índice na banda continua a ser calculado antes de filtrar** —
é ele que vai na rota, e renumerar fazia um link antigo abrir outro nível.

É a correção barata e reversível; a correção de raiz seria um teto de largura no
pipeline, e essa fica para quando houver razão para regerar.

---

## Onde a realidade contrariou os documentos

Quatro conclusões medidas que contrariam a spec ou o plano. Estão em comentários
no código e nas mensagens de commit; ficam aqui reunidas porque são o tipo de
coisa que se volta a descobrir do zero se ninguém as escrever.

### 1. A hipótese do joker da spec §6.4 está refutada

A spec previa que colocar o joker tarde na construção reversa produzisse níveis
mais difíceis. Mede-se o contrário: colocação tardia dá **sobrevivência
0,329 ± 0,017**, colocação cedo dá **0,226 ± 0,006**. Sobrevivência mais alta é
mais fácil. O parâmetro `jokerProgress` existe por isto, com omissão **0.3** —
cedo — e a tabela medida está em comentário no `generator.ts`.

### 2. O plano §6.2 e o §2.6 são incompatíveis entre si

O piso de justiça (§6.2) exige que todos os estados alcançáveis até profundidade
*d* continuem resolúveis. O desenho do joker (§2.6) faz precisamente o oposto:
gastar o joker mal mata o tabuleiro. Medido: **40 em 40** níveis com joker têm
uma primeira jogada fatal envolvendo o joker; a banda aceitou **0 em 8128**
candidatos.

Resolvido com `skipJokerMoves`, que exclui as jogadas com joker do piso —
seguindo a mitigação que o próprio §2.6 propõe (tutorial dedicado + desfazer, não
o piso). As bandas `meio-joker` e `denso` usam-no.

As soldas e o gelo também ficam fora do piso, mas por decisão de desenho e não
por medição — ver «O piso de justiça não vê as marcas».

### 3. O tamanho não é alavanca de dificuldade — o joker é

Passar de 12 para 49 peças custa **−0,31** de sobrevivência. Pôr **um** joker em
12 peças custa **−0,77**.

Corolário que inverte o plano §7: a tabela de bandas alarga as composições à
medida que a dificuldade sobe, mas composições largas são feitas de 1 e 2 e
tornam os tabuleiros *mais fáceis*. Com todas as composições, a banda `avancado`
era a mais fácil do pack. As composições aceites por banda em `bands.ts` já
refletem a medição, não a tabela original.

### 4. O piso de justiça a profundidade 3 é inviável

A severidade escala com ramificação^profundidade. Em tabuleiros com forma
correta, a profundidade 3 rejeitava **1840 em 1856**. Todas as bandas usam
`fairnessDepth: 2` (a `tempo` usa 0), que o plano §6.2 permite explicitamente.

### 5. As faces não aparecem todas com a mesma frequência, nem de perto

Notado a jogar — *"porque nunca aparece a face 6?"* — e medido no pack:

| Face | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|
| Frequência | **36,0%** | 21,3% | 20,1% | 10,9% | 6,7% | **4,0%** |

São **duas causas independentes**, e convém não as confundir:

**Estrutural.** Das 14 composições de 7, só `[1,6]` contém um 6 — e as
composições longas são feitas de 1 e 2, contribuindo muitas células cada vez que
saem. Com pesos uniformes, o previsto é 56,6% de uns e 1,9% de seises.

**O filtro da banda.** Um 6 tem um único parceiro, portanto tabuleiros com seises
são rígidos e sobrevivem menos. Medido na `inicio`, que exige sobrevivência
≥ 0,55: **6,1% de seises nos gerados, 0,9% nos aceites.** Não é defeito — é a
alavanca de dificuldade a funcionar.

Corolário contraintuitivo: **a banda onde se veem mais seises é o `tutorial`**, com
16,6% e distribuição perfeitamente igual entre as seis faces. Só tem pares, e os
pares que somam 7 são `1+6`, `2+5`, `3+4` — cada face uma vez.

Isto expôs um defeito de contabilidade no `facesAltas()` das bandas `avancado` e
`perito`: pesava composições e não células, portanto `[1,1,1,1,1,1,1]` saía com o
mesmo peso de `[1,6]`. O rótulo "faces altas" não se cumpria no tabuleiro — a
`perito` tinha 42,9% de uns. Corrigido a dividir o peso por `length`.

---

## As soldas — a primeira mecânica nova depois do joker

Vieram de um playtest, e da medição que ele provocou. A queixa era unânime:
*"no modo Puzzles, a dificuldade não é perceptível com os diferentes graus — o
que muda são mais colunas e mais peças."*

### A medição deu-lhes razão, e explicou porquê

As métricas de banda separam-se bem — sobrevivência mediana 0,83 no `inicio`,
0,14 no `perito`. Mas a sobrevivência mede jogo **aleatório**. Medindo o que o
jogador sente — em cada posição, que fração das jogadas legais é segura:

| banda | peças | jogadas seguras | 1ªs 3 jogadas | pares óbvios/posição |
|---|---|---|---|---|
| inicio | 20 | 97,5% | 99,3% | 2,9 |
| meio | 30 | 96,9% | 100% | 3,6 |
| avancado | 36 | 93,8% | 99,8% | 4,3 |
| perito | 43 | 93,3% | **100%** | 5,2 |
| meio-joker | 25 | 67,4% | 71,4% | 3,3 |
| denso | 12 | **33,4%** | 33,4% | 2,4 |

Do `inicio` ao `perito` o tabuleiro duplica e a probabilidade de errar passa de
2,5% para 6,7%. Não se sente uma diferença dessas. E a curva está **invertida**
no que o jogador realmente faz: procurar uma jogada é *mais fácil* no perito.

O achado que orientou a solução: **no perito há 35 jogadas disponíveis por
posição mas só 6 combinações diferentes.** As outras 29 são cópias da mesma soma
noutros sítios. A decisão que interessa é **geométrica** — qual dos seis `5+2`
se tira — e nada no jogo a tornava visível.

### A regra

> Duas peças soldadas ou entram ambas na jogada, ou não entra nenhuma.

**Só verticais**, e não é âmbito reduzido — é o que a representação permite. Uma
solda vertical liga `(c, r)` a `(c, r+1)`; depois de uma jogada ambas descem o
mesmo número de linhas, porque a gravidade é um `filter` que preserva a ordem.
Uma solda horizontal parte-se assim que uma célula por baixo de uma das duas
desaparece, e exigiria uma regra de quebra — estado que muda a meio do nível é
estado que o gerador tem de reconstruir em reverso.

Uma solda **nunca se quebra**: um par soldado é um bloco que desce inteiro até
sair inteiro. É essa propriedade — fixada por teste de propriedade em 300
tabuleiros — que permite guardá-la como uma só coordenada empacotada.

### Como a garantia central sobrevive

Não é o solver que a sustenta. É uma observação sobre a construção reversa:

> Se as duas células de uma solda forem eliminadas **pelo mesmo passo da
> solução**, a solução guardada continua legal, palavra por palavra.

Uma solda só proíbe levar meio par. O passo que leva o par inteiro respeita-a
por definição, e os passos anteriores nem lhe tocam. A garantia não é
enfraquecida — é herdada.

Consequência prática: as soldas escolhem-se **depois** de o nível ser aceite, e
o rendimento do funil não se mexe. Nos 60 níveis de avançado e perito, pedir 2,
3 ou 4 soldas devolveu sempre o número pedido, com 100% das soluções ainda a
esvaziar o tabuleiro.

### Dois casos degenerados, e ambos foram defeitos reais

**Um par que já soma 7 não se solda.** A primeira versão soldava qualquer par do
mesmo passo, e quando esse passo era *o próprio par* as faces somavam 7: a solda
não proibia nada, porque qualquer grupo que as contivesse já tinha de ser
exatamente elas. Saíam assim **22% das soldas do avançado e 28% das do perito**.
Pior do que inútil — era uma ajuda, a apontar uma jogada pronta a fazer.

**O joker nunca entra numa solda.** `joker + v` é sempre grupo legal, porque o
joker toma `7 - v` e `1 <= v <= 6`. Soldá-lo a um vizinho é oferecer uma jogada.

### O que as soldas dão — e a medição que corrigiu a primeira leitura

A primeira medição dizia que as soldas cortavam as opções mas não mexiam na taxa
de erro (92,7% → 91,7%). **Estava medida no sítio errado**: no pack antigo, de 43
peças e formas mistas, e com as soldas degeneradas lá dentro — as que somavam 7
e não proibiam nada, que eram 22% a 28%.

No pack que foi publicado — 49 peças, 7×7, sem soldas degeneradas:

| marcas | jogadas/posição | jogadas seguras |
|---|---|---|
| nenhuma | 48,4 | 97,3% |
| 4 soldas | 33,1 | **89,5%** |
| 3 peças geladas | 39,9 | 93,2% |
| 4 soldas + 3 geladas | 26,5 | **86,8%** |

As soldas **quadruplicam** a taxa de erro, de 2,7% para 10,5%. O gelo leva-a a
13,2% — cinco vezes o tabuleiro sem marcas.

A lição não é sobre soldas: é que **uma marca degenerada não é neutra, é
diluidora**. Foi a correção de as excluir que fez a mecânica funcionar, e sem
ela a medição dava a conclusão errada sobre a mecânica inteira.

### Uma regra que se testou e não presta

*"Não podes repetir a mesma combinação duas vezes seguidas."* Medido: as opções
passam de 35,7 para 33,5 e só 2% das posições ficam bloqueadas. Fica registado
para não se voltar a ela.

### O perito é grande **e** apertado

A medição apontava para encolher a banda — o `denso` de 12 peças é quatro vezes
mais exigente. Ficou decidido o contrário, e com razão: um perito pequeno seria
um `denso` com outro nome. O perito é a banda do tabuleiro cheio — **49 peças,
7×7, formas cheias apenas** — e a dificuldade vem das regras. Quatro soldas e
três peças geladas no perito, duas soldas no avançado.

---

## O gelo — a segunda marca

> Uma peça gelada só pode ser eliminada num grupo de **exatamente duas peças**:
> ela e a que completa 7 com ela — **que não pode estar gelada**.

A segunda metade entrou depois, vinda de jogar: um 5 e um 2, ambos gelados e
encostados, saíam juntos. As duas soltavam-se uma à outra, e o gelo deixava de
prender o que quer que fosse — o parceiro deixava de ser o recurso que o gelo
existe para criar.

**A correção tocou na garantia central, e foi tratada como tal.** O gerador
escolhia para gelar peças que saem a par na solução guardada — e as duas
peças do mesmo par eram ambas candidatas. **10 dos 30 níveis do `perito`**
tinham as duas geladas no mesmo passo; com a regra nova, esse passo ficava
ilegal e o nível sem a solução que o garante. Três mudanças, juntas:

- `respeitaGelo` recusa um par de duas geladas, e `checkGelo` passa a exigir
  um parceiro **não gelado** no tabuleiro.
- `gelarNivel` gela no máximo uma peça por passo da solução. O baralhar consome
  o gerador como antes, portanto um nível sem o conflito sai com o mesmo gelo.
- O pack foi **remarcado sem regerar um tabuleiro**, por uma ferramenta nova,
  `tools/src/remarcar.ts`: as marcas escolhem-se depois de o nível estar aceite,
  com uma seed derivada da do nível, portanto a mesma escolha pode repetir-se
  com a regra nova. Mudou o gelo dos 10 níveis e mais nada — tabuleiros,
  soluções, soldas e métricas iguais, byte a byte — e o `verify` passa os 288.

No toque, a segunda gelada é recusada com o aviso «duas peças geladas não saem
juntas», como a terceira peça já era.

Ataca o que as soldas não atacam. Um 5 gelado só sai com um 2 encostado,
portanto **o parceiro passa a ser um recurso que se guarda**: gastá-lo noutra
jogada deixa o 5 preso. É a espécie de erro que faltava ao jogo — um erro que se
vê *antes* de o cometer, a olhar para o tabuleiro, e não doze jogadas depois,
quando já se lê como azar.

E é a primeira regra que usa a **queda das peças como ferramenta**: sem nenhum 2
encostado, é preciso fazer cair um limpando por baixo. Até aqui o colapso de
colunas era só uma consequência das jogadas, que era a pergunta que o gate da
Fase 6 deixou em aberto.

### Três exclusões, todas medidas

**A face 6 nunca se gela.** Das 14 composições, quantas contêm cada face e
quantas dessas têm mais de duas peças — que são precisamente as que o gelo
fecha:

| face | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|
| composições com ela | 11 | 7 | 5 | 3 | 2 | 1 |
| com 3+ peças | 10 | 6 | 4 | 2 | 1 | **0** |

`6+1` é a única composição com um 6, portanto qualquer grupo com um 6 já é
obrigatoriamente um par: gelá-lo não proíbe uma única jogada. É o mesmo defeito
das soldas que somavam 7, apanhado desta vez antes de sair.

**O joker nunca se gela** — `joker + v` é sempre par legal, e o desenho do joker
é ser flexível em posição. **Uma peça soldada nunca se gela** — é a invariante de
`marcas.ts`.

### Marcas

As duas mecânicas são a mesma espécie de coisa: um conjunto de coordenadas que
viaja com o tabuleiro e estreita o que é jogada legal. A primeira versão passou
as soldas ao solver como parâmetro solto; com a segunda ficava
`isSolvable(b, limits, soldas, gelo)`, e mais um por cada regra futura.

`Marcas` junta-as num objeto. Resolve mais do que a assinatura: a chave de
memoização compõe-se num sítio só, e **um nível sem marcas continua a dar
exatamente a chave de sempre, byte a byte**.

### O piso de justiça não vê as marcas — e é de propósito

O piso (§6.2) promete que as primeiras duas jogadas são seguras, jogue-se o que
se jogar. No pipeline corre **antes** de as marcas serem escolhidas, e o
`fairnessFloor` nem as recebe. Nos níveis com soldas ou gelo, portanto, a
promessa não vale: as primeiras jogadas podem deixar o nível sem saída.

Encontrado a 2026-10-12 e medido sobre o pack publicado —
BFS a profundidade 2 com `gruposMarcados`/`aplicarMarcas`, e
`isSolvable(..., marcas)` em cada estado alcançado:

| banda | marcas | níveis com 2 jogadas fatais |
|---|---|---|
| `avancado` | 2 soldas | **15 de 30** — provados, o solver esgota a pesquisa |
| `perito` | 4 soldas + 3 gelo | **pelo menos 6 dos 13 primeiros**; os outros 17 ficaram por medir |

Os 30 do avançado passam o piso sem marcas, que é o que o pipeline verificou.

O caso que decidiu, no `perito-1000174`: a peça gelada 1 só sai com um 6, e o
tabuleiro tem dois. Duas jogadas `1+6` normais, legais e à vista, gastam-nos aos
dois, e o 1 fica preso à segunda jogada. Em cinco desses seis níveis do perito o
beco é deste tipo: depois de duas jogadas, uma gelada já não tem nenhum parceiro
livre no tabuleiro.

**Decidido: fica assim.** É a armadilha que o gelo existe para criar — o
parceiro é um recurso que se guarda, e gastá-lo vê-se *antes* de o fazer. O piso
existe para que uma jogada fatal logo no início não se leia como adivinha; estas
leem-se como erro de quem não olhou. Perder por não pensar, e voltar a tentar, é
o objetivo, não um defeito.

É a mesma espécie de exceção que o joker tem (`skipJokerMoves`, ver «Onde a
realidade contrariou os documentos», nº 2), com uma diferença: a do joker foi
forçada por medição — sem ela nenhum nível passava —, e esta é escolha de
desenho.

O que **continua** garantido: todo o nível tem solução, e a solução guardada
respeita as marcas — o `verify` confirma-o nível a nível. O que o piso garante
num nível com marcas é o que garantia antes de elas lá estarem, e mais nada.

**Se um dia se quiser o piso com marcas**, o caminho ficou medido:

- O `fairnessFloor` passa a receber `Marcas`, com `chaveMarcas` na chave, e o
  pipeline volta a corrê-lo depois de as escolher. Se falhar, tenta outra seed
  derivada em vez de recusar o tabuleiro. No avançado, 14 dos 15 níveis acham
  uma escolha justa em 13 tentativas ou menos. O `avancado-2000099` não acha
  nenhuma com duas soldas: tem três candidatas, e só uma passa sozinha.
- **No perito, o solver não chega como está.** Com o orçamento do piso (20 000
  estados) dá *inconclusive* em 27 dos 30 níveis. Uma poda tornou-o decidível:
  uma gelada de valor v só sai com uma peça de valor 7 − v que não esteja gelada
  nem soldada — a soldada levaria a companheira, e o grupo deixava de ser par.
  Se houver mais geladas de valor v do que peças livres de valor 7 − v, o estado
  está morto. Numa fronteira de 1826 estados passou de 8,4 M estados e 337 s
  para 105 k e 2 s, e os 399 *inconclusive* viraram 186 becos e 213 resoluções.
  Ficou nos scripts de medição; **não entrou no solver**.

### O desenho do gelo não se via, e a razão é medível

A primeira versão era um anel de um azul frio só. Contraste contra as seis
faces: 1,69 · 1,32 · 1,13 · **1,08** · 1,84 · 2,83. Invisível.

E nenhuma cor única resolve, porque a rampa das faces vai de luminância 0,746 a
0,116: branco dá 1,32 contra a face 1, escuro dá 2,36 contra a face 6. **Claro
por fora, escuro por dentro dá 3,93 no pior caso** — que é o mesmo argumento que
o anel de seleção já usava, escrito no próprio ficheiro.

A moldura do gelo é por dentro e a da seleção é por fora, portanto coexistem sem
competir — e têm de coexistir, porque uma peça gelada selecionada é o caso
normal: é assim que ela sai.

---

## A contagem decrescente — medida, e não passa como está

A proposta: uma peça com um número, por exemplo 3, tem de sair numa das
próximas 3 jogadas. Atacava o problema dos ~78%: obrigar a decidir cedo. Ficou
combinado medir antes de construir, só no pipeline, com o critério fixado antes:
o momento em que o jogador dá pelo erro tem de descer para menos de metade do
nível, e o piso de justiça tem de continuar a aceitar níveis suficientes.

O protótipo está em `packages/tools/src/contagem.ts` e mede-se com
`tsx packages/tools/src/medir-contagem.ts` (~7 min em 15 workers). A contagem
escolhe-se sobre o pack publicado, a partir da solução guardada (sai na jogada
*k* → contagem *k* + folga), e passa a ida-e-volta e o piso de justiça com as
marcas e a contagem. A engine não mudou.

### Os 78% são quando se dá pelo erro, não quando se comete

A `firstFatalDepth` do pack mede onde o jogo ao calhas **bloqueia**. Encontrando,
em cada playout, a jogada exata depois da qual já não há saída:

| banda | erro cometido | dá por isso |
|---|---|---|
| avancado | 52% do nível | 78% |
| perito | 46% | 80% |

No `perito` são ~6 jogadas entre o erro e o bloqueio. O problema não é só o
jogador errar tarde — é **o erro só se ver muito depois**, e por isso ler-se como
azar.

### Numa peça que já se pode tirar, a contagem é uma dica

A primeira medição parecia um êxito: com folga 1, o momento de dar pelo erro
caía de 78% para 48% no `avancado` e de 79% para 42% no `perito`. Mas 26 das 27
contagens escolhidas estavam em peças que **já se podiam tirar na primeira
jogada** — com ~33 jogadas por posição quase todas as peças entram nalgum grupo
logo no início. O jogo ao calhas ignora o número; uma pessoa tira a peça logo, e
o piso garante que a primeira jogada é sempre segura.

Medido com um jogador **atento** — tira a peça da contagem logo que pode, e de
resto joga ao calhas:

| `avancado`, 15 níveis | sobrevivência | erro | dá por isso |
|---|---|---|---|
| sem contagem | 28,6% | 53,7% | 78,2% |
| contagem, jogador ao calhas | 8,4% | 40,0% | 48,2% |
| contagem, jogador **atento** | 29,2% | 52,6% | **75,7%** |

No `perito`, igual: 79,0% sem contagem, 79,3% com ela. **Para quem lê o número,
a contagem não faz nada.** É o mesmo defeito das soldas que somavam 7.

### Numa peça enterrada funciona — mas quase nunca cabe

Só com peças que não se podem tirar no início, e a folga que o piso exigir (1 a
4), o jogador atento dá pelo erro aos **52%** em vez de 77% no `avancado`, e os
erros no primeiro terço do nível passam de 6% para 40%. É a mecânica a fazer o
que devia.

Só que só cabe em **3 dos 30** níveis do `avancado` e **1 dos 30** do `perito`.
Faltam primeiro as peças: uma peça enterrada que a solução tire entre a 3.ª
jogada e o meio do nível existe em 9 dos 30 níveis do `avancado` e 6 dos 30 do
`perito` (0,37 e 0,27 por nível). Das que existem, o piso de justiça recusa a
maioria: se as duas primeiras jogadas podem ser quaisquer, sobra pouco tempo
para desenterrar a peça.

### O que fica decidido

- **Não entra no jogo assim.** Acrescentada a níveis já feitos, ou é uma dica,
  ou quase nunca cabe.
- O único caminho que resta é o gerador construir o nível **à volta** de uma
  peça enterrada, filtrando os candidatos que a admitem. Com 4 níveis medidos,
  o ganho para o jogador atento ainda não está provado, e o custo seria aceitar
  uma fração pequena de candidatos que já são caros.
- Os números do protótipo valem para qualquer marca futura: **uma regra tem de
  ser medida com um jogador que a lê**, não só com o jogo ao calhas.

### O piso de justiça não conta com as marcas

Apareceu de lado. O piso corre no pipeline **antes** de as soldas e o gelo serem
escolhidos, e o `fairnessFloor` da engine não as recebe. Contando com elas, em
**15 dos 30** níveis do `avancado` há duas primeiras jogadas legais que deixam o
nível sem solução — confirmado com o `isSolvable` da engine. No `perito`, a
20 000 estados, o piso com marcas dá 5 sim e 25 inconclusivos.

A garantia central não é tocada: a solução guardada continua legal. O que falha
é a promessa do piso, de que as primeiras jogadas são seguras qualquer que seja
a escolha. Fica por corrigir à parte.

---

## O Contra-Relógio deixou de ser infinito

O retorno de quem jogava era que o modo era demasiado fácil. Medido contra o
pack publicado (`tempo.json`), a razão não era falta de mecânicas: **a economia
de tempo tinha saldo positivo**, e para quem jogava abaixo dos ~2,5 s por jogada
a corrida não acabava nunca.

| ritmo do jogador | saldo por tabuleiro, depois da escada |
|---|---|
| 2,4 s/jogada | **+7 s** |
| 2,0 s/jogada | **+9 s** |
| 1,5 s/jogada | **+12 s** |
| 3,0 s/jogada | −8 s |

Três causas, por ordem de peso:

1. **O combo não tinha teto.** `(n − 1) × 750ms` por jogada cresce com o
   quadrado do encadeamento; o tempo gasto cresce em linha. E quanto maior o
   tabuleiro, maior o saldo — a escada de tamanho, que devia endurecer o modo,
   aliviava-o.
2. **O prémio tinha piso** (10 s), e um piso é um ponto de equilíbrio. Chegava ao
   piso no sexto tabuleiro, o mesmo em que a escada para — daí para a frente a
   corrida não mudava.
3. **Errar não custava nada.** Uma peça que passava de 7 era recusada, e a
   recusa não tirava tempo: tocar ao calhas era uma estratégia.

### O que mudou

**Ritmo-alvo.** O prémio de um tabuleiro é `jogadas × ritmo`, com
`jogadas = soma / 7` e o ritmo a começar em 4 s por jogada e a multiplicar por
0,92 a cada tabuleiro limpo, **sem piso**. A corrida acaba quando o jogador deixa
de acompanhar o ritmo que se lhe pede, e acaba sempre.

Geométrico e não linear, por medição: a descer um valor fixo, os jogadores
rápidos ficavam comprimidos — 1,5 s e 1 s por jogada acabavam quase no mesmo
tabuleiro — e as corridas lentas esticavam. Simulado com 60 s de arranque e 1 s
de leitura por tabuleiro novo:

| ritmo do jogador | tabuleiros | duração |
|---|---|---|
| 4 s/jogada | ~7 | ~3 min |
| 3 s/jogada | ~12 | ~4 min |
| 2 s/jogada | ~28 | ~6 min |
| 1,5 s/jogada | ~42 | ~7 min |
| 1 s/jogada | ~69 | ~8 min |

**Teto no combo.** +0,25 s por nível de combo, no máximo +0,5 s por jogada.

**Passar de 7 custa 1,5 s** e quebra o combo. Tirar uma peça da seleção ou
tocar fora das peças não custa nada.

**A peça-bomba.** A partir do quarto tabuleiro, metade dos tabuleiros traz uma
peça com pavio de 6 s; se não sair numa jogada a tempo, rebenta e custa 5 s.
Sai sempre numa peça que entra num grupo jogável no momento em que aparece.

### Porque é que a bomba não passa pelo gerador

As soldas e o gelo mudam **o que é jogada legal**, e por isso mudam os estados
alcançáveis: têm de ser verificadas pelo solver para a garantia central
sobreviver. A bomba só muda **o que se ganha ou perde de tempo**. O tabuleiro
resolve-se exatamente como antes, com ou sem ela — e é por isso que vive na
`TimeAttackSession` e não na engine.

Pela mesma razão, quando rebenta **a peça fica**. Tirá-la mudava a soma do
tabuleiro, que deixava de ser múltiplo de 7.

É a primeira mecânica do modo que dá uma decisão em vez de só pedir velocidade:
os tabuleiros são greedy-safe e qualquer ordem resolve, mas com a bomba há uma
ordem que custa menos tempo.

### Por afinar em playtest

Todos os números vivem em `DEFAULT_TIME_ATTACK`. Os que mais mexem na sensação
do modo são `ritmoFator` (quão depressa aperta), `pavioMs` e
`bomba.probabilidade`. A simulação assume ritmos constantes, e ninguém joga
assim: o primeiro playtest diz se as corridas boas duram mesmo seis minutos.

### A bomba no Survival

A mesma peça, com a moeda do modo: no Survival a pressão são as linhas, e
**rebentar faz cair uma linha a mais**. O mecanismo comum — seguir a peça, sair
com ela, o pavio — vive em `session/bomba.ts`; o castigo é de cada modo.

Três diferenças face ao Contra-Relógio, todas forçadas pelo modo:

- **Chega numa linha, e vê-se na fila antes de cair.** Uma em cada quatro
  linhas, numa coluna tirada da seed (nunca no joker). No Contra-Relógio a bomba
  arma-se numa peça já jogável; aqui não há essa garantia, e a fila é o que a
  substitui — o jogador tem uma linha de avanço para preparar o sítio onde ela
  aterra. Como o joker, só uma de cada vez: com bomba armada, nenhuma linha traz
  outra.
- **Uma linha a mais, e não a próxima antecipada.** Antecipar a próxima fazia o
  castigo depender da sorte: a um segundo da linha marcada, rebentar não custava
  nada. A linha extra custa sempre o mesmo, e o prazo da marcada fica onde
  estava.
- **O pavio está no tempo da corrida**, que pára com a pausa e se grava com a
  corrida. Sair com seis segundos de pavio é voltar com seis segundos de pavio.
  Uma corrida gravada antes das bombas abre sem bomba e com o contador a zero.

A peça fica quando rebenta, também aqui. Não há solução a proteger, mas tirar
uma peça num modo que se perde por excesso delas seria um alívio, e um castigo
que alivia não é castigo.

**E a explosão aquece as peças à volta**: as oito vizinhas que existirem (lados
e diagonais) sobem um ponto — o 1 passa a 2, o 6 fica 6, o joker não muda. Muda
à vista, com um clarão, no instante da explosão e antes de a linha extra cair.

Começou como a ideia de baralhar as vizinhas ao calhas. Medido em 2 000
explosões a meio de corrida:

| As vizinhas… | tabuleiro pior | tabuleiro melhor | a peça presa da bomba solta-se |
|---|---|---|---|
| mudam ao calhas, com os pesos das linhas | 50% | **48%** | **84%** |
| mudam ao calhas, faces uniformes | 80% | 18% | 63% |
| mudam ao calhas, puxadas para faces altas | 93% | 6% | 38% |
| **sobem um ponto** | **99%** | 1% | 28% |

Ao calhas era cara ou coroa, e soltava a peça presa de uma bomba enterrada em
84% das vezes — premiava falhar o desenterrar. Subir um ponto piora quase sempre
(os 1 são a cola do jogo) e é previsível: quem vê o pavio a acabar pode tirar
primeiro os 1 encostados à bomba. Não acrescenta peças, por isso a linha a mais
continua a cair: no Survival perde-se pela altura. Desliga-se com
`aqueceVizinhas: false`.

Valores de partida, em `DEFAULT_SURVIVAL`: `linhasEntreBombas: 3`,
`pavioBombaMs: 10_000` — mais longo do que os 6 s do Contra-Relógio, porque a
peça chega no topo da pilha e o tabuleiro tem o dobro das peças.

### A bomba enterrada

A bomba da linha aterra no topo da pilha, onde quase sempre já se pode tirar:
para quem a vê, é uma prioridade e não um problema. É o defeito que a contagem
decrescente mostrou na campanha — uma marca numa peça que já sai não muda nada a
quem a lê. A contagem não cabia lá, porque cada nível promete solução; o
Survival não promete nada, e as linhas entram por cima, portanto há sempre peças
enterradas.

**Da segunda bomba em diante, metade acende-se numa peça que já está na
pilha**, por baixo da linha que acabou de cair:

- **Uma peça presa**: sem grupo nesse momento, com 1 a 3 peças por cima, nunca o
  joker. Tirá-la a tempo pede um plano — que jogadas a destapam, e por que
  ordem. Só se não houver nenhuma presa a esse alcance se aceita uma que já sai.
- **O mesmo pavio de 10 s e o mesmo castigo**, uma linha a mais. Chegou a ter
  15 s, por ser preciso escavar; ficou nos 10 por decisão de produto — a bomba é
  uma só, e o tempo dela também.
- **A fila anuncia-a**, com um «na pilha» e o pavio apagado ao lado das peças. Não
  pode dizer em que peça — até a linha cair o jogador mexe na pilha —, mas diz
  que vem. A promessa do modo, nada cai sem se ver, continua a valer.
- **Acende-se com um clarão**: a peça incha e brilha duas vezes. A bomba da linha
  cai à frente dos olhos; esta aparece a meio da pilha, longe de onde se olha.
- A primeira bomba da corrida é sempre na linha. É ela que ensina o que é uma
  bomba.

Tudo puro na seed e no índice da linha, como o resto da fila, portanto
«Repetir esta» repete também as bombas. A peça é escolhida no tabuleiro do
instante em que a linha cai, com um gerador à parte, e uma corrida gravada
guarda se a bomba é enterrada (as gravadas antes disto abrem com bombas da
linha, que é o que eram).

Valores em `DEFAULT_SURVIVAL`, por afinar a jogar: `bombaEnterradaDesde: 6`
linhas caídas, `probabilidadeEnterrada: 0.5`, `profundidadeEnterrada: 3`.

### Sem jogadas, a linha cai já

Um tabuleiro sem jogadas — 1, 2, 1, 2 que não chegam a 7 — deixava o jogador à
espera do relógio ou à procura do botão, que mudava para «Sem jogadas: puxa uma
linha». Era tempo morto, não uma decisão. Agora a linha cai logo, com um «sem
jogadas» por cima do tabuleiro, e o prazo da seguinte recomeça a contar daí.
Não paga o multiplicador de puxar, porque não foi uma escolha. Se a linha nova
também não trouxer jogada, cai outra — uma de cada vez, depois de a anterior
assentar. A regra é `semJogadas`, em `avancarRelogio`.

Saiu também a linha do resto para limpar («dá para limpar», «limpar: faltam
6»), por baixo do tabuleiro: quase nunca mudava a jogada seguinte, e roubava
uma linha ao tabuleiro. A conta continua na sessão (`restoParaLimpar`).

### Passar de 7 adianta a próxima linha

No Survival, tocar ao calhas não custava nada além do toque: a peça era
recusada e a seleção ficava. Agora cada toque que passa de 7 — o 5 e o 3, por
exemplo — **adianta a próxima linha 3 segundos**. É a multa do Contra-Relógio
com a moeda deste modo: lá perde-se tempo do relógio, aqui a linha chega mais
cedo. O «−3s» sobe da peça, a peça abana, e a barra da fila salta para trás com
um esticão a vermelho. Se o prazo ficar para trás, a linha cai no tique
seguinte. Só a soma errada paga: tirar uma peça da seleção não. Valor em
`penalizacaoSomaMs`.

### A vibração é a mesma nos três modos

Só a campanha vibrava a cada toque. O Contra-Relógio vibrava na multa e na
bomba; o Survival, só na bomba — um toque que passava de 7 não vibrava, com a
vibração ligada. A regra passou para um sítio só, `vibrarPeloToque`, e os três
ecrãs chamam-na: toque leve ao selecionar, médio ao fechar um grupo, o padrão de
aviso quando o toque é recusado, e o de sucesso quando a jogada limpa o
tabuleiro (no Contra-Relógio e no Survival; na campanha, a vitória vibra no
painel de fim). No Survival, o toque recusado passou também a abanar a peça,
como nos outros modos.

### Depois da escada: tabuleiros sem garantia, e o salto

A banda `tempo` para nas 20 peças porque a garantia de não bloquear acaba aí, e
o modo ficava num 4×5 do sexto tabuleiro em diante. Agora a escada continua por
uma segunda banda, **`tempo-livre`**: 48 níveis de 21 a 39 peças, em quatro
degraus, até 7×7. Larga a garantia de não bloquear — **não a de ter solução**:
passa pela ida-e-volta e pelo piso de justiça a 2, como tudo o resto.

Do sétimo tabuleiro em diante, o modo oferece o **salto**: um botão ao lado da
seta de sair, por **10 s**. Num tabuleiro sem jogadas abre-se no palco o painel
«Sem jogadas», com o salto como botão principal.

**O que a medição decidiu** (80 candidatos por janela):

- **Composições até 5**, e não até 4. A 36–42 peças a aceitação triplica, e o
  plano §6.3 manda endurecer o modo pelo tamanho dos grupos — 18% dos grupos
  das soluções publicadas têm 5 ou mais peças, e é aqui que o bónus de grupo
  grande passa a existir.
- **Sobrevivência a partir de 0,5** em todas as janelas: bloquear é um risco,
  não uma sentença.
- **Teto de 7×7**, por um campo novo das bandas (`limite`). Sem ele, um terço
  dos aceites grandes saía com 8 a 10 colunas, que o jogo filtra. Com ele, a
  janela de 43–49 peças não dá nada (0 em 80), e a escada fica nas 42.

**As regras do salto**, todas na `TimeAttackSession`:

- Custa **mais do que a bomba** (10 s contra 5 s), senão fugir de uma bomba era
  a jogada certa. Uma bomba armada vai com o tabuleiro, sem rebentar.
- **Avança na escada** como limpar — saltar não é maneira de ficar nos
  tabuleiros pequenos — mas **não aperta o ritmo exigido**, que conta só os
  tabuleiros limpos.
- A fronteira do salto é a da **escada desta corrida** (`Escada.livresDesde`),
  e não a constante: um pack com menos níveis garantidos do que degraus dava
  tabuleiros sem garantia antes de o salto existir.
- **Um tabuleiro bloqueado salta-se sempre**, esteja onde estiver. Não devia
  acontecer antes do sétimo, mas uma corrida presa à espera do fim do relógio
  é um defeito que nenhuma garantia de geração vale arriscar.

**O efeito na duração das corridas.** Os tabuleiros grandes tornam as
corridas rápidas mais longas em tempo, com menos tabuleiros. Simulado com 60 s
de arranque, sem contar bloqueios nem saltos:

| ritmo do jogador | antes | agora | agora, `ritmoFator: 0.90` |
|---|---|---|---|
| 3 s/jogada | 12 tab, 3,7 min | 10 tab, 3,7 min | 9 tab, 3,2 min |
| 2 s/jogada | 28 tab, 6,0 min | 24 tab, 7,9 min | 20 tab, 6,3 min |
| 1,5 s/jogada | 42 tab, 6,9 min | 37 tab, 9,7 min | 30 tab, 7,6 min |

O `ritmoFator` ficou em 0,92: os bloqueios e saltos reais encurtam as corridas,
e quanto só o playtest diz. Se as corridas boas passarem dos oito minutos, 0,90
repõe as durações de antes.

---

## Decisões de arquitetura que não se leem no código

- **A campanha não tem pontuação, tem um recorde de tempo.** A pontuação era
  `10 × n^1.5` por jogada; com o número de jogadas fixo (`somaTotal / 7`) e o
  número de peças fixo, o tamanho médio dos grupos também é fixo, e jogar de
  propósito para pontuar mede **±14%** de margem. Pior: a estratégia que ela
  premiava — caçar grupos grandes — **encrava o nível em 98% das tentativas** no
  avançado e 99% no perito, porque gasta o parceiro das peças geladas. Era uma
  pontuação a ensinar a perder. O `scoring.ts` fica para o modo tempo, onde o
  combo é real, e para o Survival, onde não há total fixo de peças.
- **O grupo que a jogada eliminou vem da sessão (`GameState.lastMove`), não da
  interface.** Cada ecrã reconstruía-o como "a seleção de antes mais a peça
  tocada", e essa conta rebentou no dia em que um toque passou a trazer duas
  peças: o grupo chegava a meio à animação e o `applyMove` lançava
  `InvalidMoveError`. O defeito foi duplicar a regra do toque; a correção remove
  a duplicação em vez de a remendar.
- **O tabuleiro é uma lista de colunas, de baixo para cima.** A gravidade é um
  `filter` sobre a coluna; o colapso é não empurrar a coluna vazia. As colunas
  intactas são partilhadas por referência. O tabuleiro *é* JSON válido.
- **O estado intermédio de uma jogada não é representável como `Board`** — tem
  buracos, e a representação por colunas torna isso impossível. Por isso o modo
  de dois passos vive só em `render.ts` (opção `removidas`), e não no motor.
- **O piso de justiça só corre o solver na fronteira final**, não em cada estado
  visitado. É uma equivalência: a insolubilidade herda-se para a frente, e os
  becos sem saída são apanhados a cada nível. Levou a banda `tutorial` de 18 s
  para 4,3 s.
- **`isGreedySafe` é iterativo**, ao contrário de `isSolvable` e `findSolution`,
  que recorrem — o grafo de estados dele é largo, não fundo.
- **O RNG é semeado com `deriveSeed(seed, i)` por playout**, e os resultados do
  pool são ordenados por seed. O output não depende do escalonamento nem do
  número de workers, e há um teste que o verifica.
- **O gerador trabalha com células marcadas** (`{value, inserida}`) para não ter
  de manter coordenadas através das inserções.
- **A dificuldade é medida, não desenhada.** Nenhuma banda declara uma
  dificuldade; declara um intervalo aceitável de sobrevivência, e o pipeline
  rejeita o que cai fora.

---

## Medição em duas fases — decidida e implementada

Vinha do PR #5 sem decisão. Ficou **implementada e ligada por omissão** a
2026-08-20. Cada candidato leva agora 100 playouts contra a banda alargada, e só
os sobreviventes levam os 1000.

O que a torna segura não é a precisão da amostra curta — é onde ela vive. A
resolubilidade vem da ida-e-volta, que corre **antes**, e do piso de justiça, que
corre **depois**; a sobrevivência é uma métrica de dificuldade. O pior que o
atalho pode fazer é descartar um candidato bom, e isso só custa procurar mais uma
seed, porque o pipeline avalia até a banda encher. **A garantia central não é
tocada.**

Medido em 64 candidatos por banda, nas oito:

| | Playouts | Descartes falsos |
|---|---|---|
| Margem fixa 0,15 | −31% | 0 em 512 |
| **Margem 3σ no extremo** | **−37%** | **0 em 512** |

A margem fixa era ingénua: o erro de amostragem de uma proporção colapsa perto de
0, e uma margem constante é generosa de mais exatamente onde as bandas são
estreitas. Com 0,15, a `meio-joker` ficava **−7%** — pior do que não ter
pré-filtro. Com 3σ calculados no próprio extremo, nenhuma banda perde.

A poupança é muito desigual, e é bom saber porquê: `tutorial`, `tempo` e `perito`
poupam 60–70%, porque os candidatos caem longe da banda; `meio-joker` e `denso`
poupam ~0%, porque as bandas são estreitas e perto de zero, e porque as rejeições
delas são dominadas pelo piso de justiça, que corre depois da medição e o
pré-filtro não alcança.

Validação de ponta a ponta: as oito bandas construídas pelos dois caminhos dão um
pack **idêntico byte a byte**.

Duas ressalvas honestas:

- **O relógio não serve para medir isto.** A mesma banda `perito`, com trabalho
  idêntico, levou 88,1 s numa corrida e 49,5 s noutra. A grandeza fiável é a
  contagem de playouts, não o tempo.
- **Os percentis de calibração ficam mais ruidosos.** A `survivalRate` guardada
  numa rejeição do pré-filtro é a estimativa curta. Como essas taxas alimentam os
  p10/mediana/p90 que se usam para recalibrar bandas, as caudas ficam um pouco
  mais largas. Quem recalibrar bandas a sério deve correr com `--pre 0`.

---

## Modo de trabalho

- **Um branch por fase**, um commit com mensagem substantiva, push, e o PR é
  aberto e aprovado pelo Luís. (Exceção: este ficheiro foi diretamente para a
  `main`, a pedido.)
- **Teste de mutação como aceitação de cada fase** — introduzir uma alteração
  deliberada no código e confirmar que algum teste a apanha. Foi assim que se
  descobriu que havia testes de propriedade vazios na Fase 3 (o gerador de
  tabuleiros dava 178/200 insolúveis e **zero** resolúveis-mas-não-seguros).
- **Documentação e comentários em português europeu; identificadores em inglês.**
- **Não otimizar antes de medir** — e, quando medir, medir uma sonda pequena
  primeiro. Perdeu-se muito tempo na Fase 5 a correr o pipeline inteiro quatro
  vezes onde uma sonda de dois minutos teria chegado.

---

## Armadilhas conhecidas

- **`pnpm check` que parece pendurar.** Já aconteceu, e a causa foi um ficheiro
  de sondagem esquecido em `packages/tools/test/`. O `vitest.config.ts` exclui
  `**/__*.test.ts` por isso. Antes de suspeitar de paralelismo ou de workers,
  bissectar por ficheiro.
- **O Vitest não faz typecheck.** Um literal de tabuleiro sem anotação infere
  `number[][]` e passa nos testes enquanto o `tsc` falha. Anotar sempre
  `const b: Board = ...`; usar `as unknown as Board` só para tabuleiros
  deliberadamente inválidos.
- **Os Workers não herdam o loader do pai.** O `worker.ts` precisa de
  `execArgv: ["--import", "tsx"]` ou não resolve os módulos sob o Vitest.
- ~~O git avisa LF→CRLF em cada commit.~~ Resolvido: o `.gitattributes` fixa
  `* text=auto eol=lf`, portanto o comportamento é do repositório e não do
  `core.autocrlf` de cada máquina. Índice e cópia de trabalho em LF nos 59
  ficheiros versionados.

---

## Comandos

```bash
pnpm check                                    # lint + typecheck + 323 testes
pnpm dice7 bands                               # as bandas e os seus critérios
pnpm dice7 play --id inicio-000296 --log p.jsonl # jogar um nível na consola
pnpm dice7 verify                              # revalida o pack todo
pnpm dice7 build --count 30 --runs 1000        # reconstrói o pack (--pre 0 desliga o pré-filtro)
pnpm dice7 build --band inicio --max 1200      # mais orçamento por nível: as formas cheias caras precisam
pnpm dice7 export                              # parte o pack por banda para game/public/levels
```
