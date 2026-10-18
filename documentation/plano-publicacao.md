# Publicar nas lojas — Google Play e App Store

O que falta entre o jogo de hoje e o jogo nas duas lojas, por ordem, e quem faz
o quê. **Tu** é o dono das contas: o que pede identidade, pagamento ou
aceitar termos. **Eu** é o que se faz no repositório.

## As decisões tomadas (2026-10-16)

| | |
|---|---|
| Contas | Nenhuma ainda: criam-se as duas |
| Conta Google | **Pessoal** — o que obriga ao teste fechado (ver o caminho crítico) |
| Preço | **Grátis, sem compras nem anúncios.** A compra única do plano (§9.2) fica para uma versão seguinte |
| iPad | **Mantém-se.** Há capturas de iPad a fazer |

Grátis e sem nada lá dentro é o caminho mais curto, e não por pouco: não há
faturação para integrar, não há acordos de impostos nem de banco, e as duas
fichas de privacidade dizem **«nenhum dado recolhido»** — o jogo não usa a rede
para nada (a fonte vai no pacote, e o único `fetch` é aos níveis locais).

## O caminho crítico

O que mais demora não é código, é o **teste fechado da Google**. Uma conta
pessoal criada depois de novembro de 2023 só pode pedir a publicação depois de
**12 testers** terem estado inscritos num teste fechado durante **14 dias
seguidos**. Tudo o resto cabe dentro desses 14 dias.

```
dia  0  contas criadas (Apple: 1–2 dias a aprovar; Google: verificação de identidade)
dia ~3  primeiro AAB no teste interno da Play; primeiro build no TestFlight
dia ~4  teste fechado na Play com 12 testers ───┐
        fichas, capturas e privacidade prontas  │ 14 dias
dia ~7  App Store: submeter para revisão (1–3 dias)
dia ~18 Play: pedir acesso à produção ───────────┘ (a Google responde até 7 dias)
dia ~25 lançamento nas duas, no mesmo dia (lançamento manual na Apple)
```

**Recrutar os 12 testers é a primeira coisa a fazer**, já: pessoas com Android
e conta Google, que aceitem o convite e fiquem os 14 dias. Se um sair a meio, a
contagem pode não fechar. Convém ter 15.

---

## 1. As contas — tu

### Apple (App Store)

- [ ] **Apple Developer Program**, como indivíduo — 99 USD por ano, em
      <https://developer.apple.com/programs/enroll/>. Pede um Apple ID com
      autenticação de dois fatores. O nome que aparece na loja como vendedor é
      o teu nome.
- [ ] Na aprovação, o acordo das apps grátis fica aceite. **Não** é preciso o
      acordo das apps pagas, nem impostos, nem banco.
- [ ] **Estatuto de comerciante na UE** (Digital Services Act), em App Store
      Connect → Business. Sem compras nem anúncios, declaras **não
      comerciante**; como comerciante, a morada e o telefone ficavam públicos.
- [ ] Seguir o `guia-ios-sem-mac.md`, passos 2 a 7: o identificador
      `com.luiscunha.dicetoseven`, o certificado, o perfil, a aplicação no App
      Store Connect e os seis segredos do GitHub. **Criar a aplicação no App
      Store Connect reserva o nome** — fazê-lo cedo, para saber se
      «DiceToSeven» está livre.

### Google (Play)

- [ ] **Play Console**, conta pessoal — 25 USD, uma vez, em
      <https://play.google.com/console/signup>. Verificação de identidade com
      documento, morada e telefone; pode levar alguns dias.
- [x] **Um e-mail de contacto** — `dicetoseven@gmail.com`. Fica **público** na ficha. Convém um
      endereço só para o jogo.
- [ ] **Estatuto de comerciante na UE**: o mesmo raciocínio — não comerciante.
- [ ] **Os 12 testers**, numa lista de e-mails ou num Google Group.

---

## 2. O projeto — eu

### A versão, numa fonte só

Vivia em três sítios que ninguém ligava: `versionCode`/`versionName` no
`build.gradle`, e `MARKETING_VERSION` no `project.pbxproj`, em duas
configurações.

- [x] Uma fonte — a `version` do `packages/mobile/package.json` — e
      `pnpm versao` (`packages/mobile/versao.ts`), que a escreve nos dois
      projetos. A primeira é a **1.0.0**. Um teste falha se os projetos não
      disserem a versão do `package.json`.
- [x] O `versionCode` do Android sai da versão — `1.2.3` → `10203` —, e a
      regra é uma só: **cada pacote para a loja leva uma versão nova**, nem que
      seja só o último número. O número de build do iOS continua a ser o da
      execução do GitHub.

### Android: o pacote para a loja

- [ ] **Tu: a chave de envio** (*upload key*): um keystore gerado uma vez,
      **fora do repositório**, guardado em dois sítios. Os passos estão em
      `guia-android-loja.md`.
- [x] O `build.gradle` assina o release com essa chave, lida de
      `android/chave-envio.properties` (fora do Git) ou de variáveis de
      ambiente. Sem ela, o `bundleRelease` falha logo a dizer o que falta, e o
      `assembleDebug` continua igual. Verificado com uma chave de teste,
      descartada a seguir.
- [x] **AAB e não APK**: `./gradlew bundleRelease`. A assinatura final é da
      Google (*Play App Signing*), que é a opção por omissão.
- [ ] Um workflow `android.yml`, à imagem do `ios.yml`: compila o AAB assinado
      só quando alguém o mandar, com a chave nos segredos do GitHub. Opcional
      numa primeira fase — o AAB também se gera aqui, como os APKs de teste.
- [x] Verificar o pacote: nenhuma biblioteca nativa (a regra das páginas de
      16 KB não se aplica), `targetSdk` 36, e a depuração da WebView só nos
      pacotes de depuração — é a omissão do Capacitor, que a liga pela marca
      `debuggable` do Android.

### iOS

- [x] **O manifesto de privacidade** (`ios/App/App/PrivacyInfo.xcprivacy`),
      registado nos recursos do projeto. Declara o `UserDefaults` do
      `@capacitor/preferences` (razão `CA92.1`), «nenhum dado recolhido» e
      «sem rastreio». Um teste guarda o que as fichas vão dizer: falha se o
      manifesto mudar, se entrar um plugin novo ou uma permissão Android nova.
- [ ] Confirmar que o projeto compila no macOS: o `ios.yml` corre sozinho no
      PR, porque o PR mexe em `packages/mobile`.
- [ ] O SDK do iOS 26 e o Xcode 26 já estão fixados no `ios.yml`. A
      conformidade de exportação (`ITSAppUsesNonExemptEncryption`) também já
      está no `Info.plist`.

### O que se vê dentro do jogo

- [x] **O «Acerca»**, no fim das Definições: a versão (a do `mobile`), o
      contacto, a política de privacidade e o suporte, estas duas no idioma do
      jogo. Os links abrem fora do jogo.

---

## 3. As páginas públicas — eu

As duas lojas exigem uma **política de privacidade** num endereço público, e a
Apple também uma **página de suporte**.

**As páginas vivem num repositório à parte e público**, `dicetoseven-site`, que
só tem HTML, CSS, o ícone e a fonte do nome — nenhum código do jogo. Publicado
no GitHub Pages, e já no ar:

| Página | Endereço |
|---|---|
| Apresentação | `https://luiscunha.github.io/dicetoseven-site/` |
| Privacidade | `https://luiscunha.github.io/dicetoseven-site/privacy.html` |
| Suporte | `https://luiscunha.github.io/dicetoseven-site/support.html` |

Cada página tem os quatro idiomas, e mostra o do dispositivo (`?lang=` escolhe
à mão).

- [x] **Política de privacidade**, nos quatro idiomas: o jogo não recolhe, não
      envia nem partilha dados; o progresso fica só no telemóvel (e nas cópias
      de segurança do sistema, que são do utilizador); não há contas, anúncios
      nem análise de uso.
- [x] **Suporte**: o contacto e as perguntas frequentes — o progresso não passa
      de um telemóvel para outro, desinstalar apaga-o, como recomeçar, como
      mudar o idioma.
- [x] **O e-mail de contacto**: `dicetoseven@gmail.com`, nas duas páginas e nos
      quatro idiomas.
- [x] **Tu**: criar o repositório público `dicetoseven-site`, enviar a pasta, e
      ligar o Pages (2026-10-16).

### A versão web fica até à aprovação

**O jogo continua na web, e o código continua público, até as lojas o
aprovarem** (decidido a 2026-10-16). É por lá que os amigos testam, e perder
esse feedback agora custava mais do que esconder o código umas semanas. As duas
coisas convivem: o jogo em `luiscunha.github.io/dice-to-seven/`, as páginas em
`luiscunha.github.io/dicetoseven-site/`.

Depois da aprovação, por esta ordem:

- [ ] Retirar o `deploy.yml`, para ninguém voltar a publicar o jogo na web.
- [ ] **Tu**: pôr o repositório do jogo **privado**, e confirmar que
      `luiscunha.github.io/dice-to-seven/` saiu do ar. Se continuar, desligar o
      Pages nas definições desse repositório.
- [ ] Na página de apresentação, trocar «Em breve» pelos links das duas lojas.

**Com o repositório privado, as Actions passam a ter limite**: 2 000 minutos
por mês no plano grátis, e o macOS conta 10× — uns dez builds de iOS por mês,
além da CI. Depois do lançamento chega; se não chegar, o GitHub Pro.

---

## 4. As fichas das lojas — eu escrevo, tu aprovas

Nos quatro idiomas do jogo. A loja escolhe pela língua do telemóvel, como o
jogo.

### Os textos

| | Google Play | App Store |
|---|---|---|
| Nome | 30 caracteres | 30 caracteres |
| Frase curta | Descrição breve, 80 | Subtítulo, 30 |
| Descrição | até 4000 | até 4000 |
| Outros | — | Palavras-chave (100), texto promocional (170) |
| Categoria | Jogos → Quebra-cabeças | Jogos → Puzzle (e Tabuleiro) |

### As imagens

| | Google Play | App Store |
|---|---|---|
| Ícone | 512×512 PNG (já há a marca) | sai do projeto |
| Destaque | **1024×500** (gráfico de destaque) | — |
| Telemóvel | 4 a 8 capturas, ≥ 1080 px | 3 a 10, **6,9"** (1320×2868) |
| Tablet | opcional | **13" iPad** (2064×2752) — o iPad mantém-se |

- [ ] **As capturas geram-se aqui**, e não à mão: os ecrãs montam-se no
      browser ao tamanho exato de cada loja, com dados de exemplo e em cada
      idioma. Proposta de seis: a Home, um nível a meio com um grupo
      selecionado, o Contra-Relógio com o combo, o Survival, o caminho do
      Desafio do Dia, e as medalhas.
- [ ] O gráfico de destaque da Play, a partir da marca.

### Os questionários

- [ ] **Privacidade**: Apple — *Data Not Collected*; Google, segurança dos
      dados — nenhum dado recolhido nem partilhado.
- [ ] **Classificação etária**: Apple (questionário novo, com os escalões 4+,
      9+, 13+, 16+, 18+) e Google (IARC). Sem violência, compras, anúncios nem
      interação entre jogadores — deve sair **4+ / PEGI 3**. (A espada do
      Survival é um ícone, não um conteúdo.)
- [ ] **Público-alvo** da Google: proponho **13 anos ou mais**. Incluir menores
      de 13 põe a app na política de Famílias, com mais declarações e mais
      revisão, por nada que o jogo ganhe com isso. A classificação continua
      PEGI 3: qualquer pessoa pode instalar.
- [ ] Anúncios: não. Acesso à app: sem início de sessão. Funcionalidades
      financeiras, de saúde, de notícias: não.

---

## 5. Os testes antes de publicar

- [ ] **Teste interno da Play** com o primeiro AAB: confirmar que a versão da
      loja instala, arranca e guarda o progresso — é a primeira vez que o jogo
      corre assinado pela Google.
- [ ] **Teste fechado** com os 12 testers, 14 dias. No pedido de acesso à
      produção a Google pergunta como correu o teste e o que mudou com ele:
      vale a pena recolher o que os testers disserem.
- [ ] **TestFlight** num iPhone e, se houver, num iPad — os testes internos não
      precisam de revisão da Apple.
- [ ] **Atualização por cima**: instalar a versão N, jogar, instalar a N+1, e o
      progresso continua lá. É o que nenhum teste automático cobre e o que
      mais custa se falhar.

## 6. Publicar

- [ ] **App Store**: submeter para revisão com **lançamento manual**, para sair
      no mesmo dia que a Play. Nas notas para a revisão: não há início de
      sessão, nada a configurar, e o jogo funciona sem rede.
- [ ] **Play**: pedir o acesso à produção ao fim dos 14 dias, e depois
      promover o build do teste fechado para a produção. Vale a pena um
      lançamento faseado (20% → 100%), para um defeito apanhar menos gente.
- [ ] Países: todos, por omissão.

### O risco de revisão a ter em conta

A Apple recusa aplicações que sejam «um site embrulhado» (regra 4.2). Este
jogo não é: funciona sem rede, guarda tudo no telemóvel, vibra, segue o tema e
o idioma do sistema, e o botão de voltar do Android é do jogo. Mas é a regra
que um revisor aplica a uma app em Capacitor, e convém que a primeira coisa que
ele vê seja o jogo — o arranque já vai direto para a Home.

---

## Depois do lançamento

Fica para versões seguintes, por esta ordem de valor:

1. **A compra única** do plano (§9.2) — o resto da campanha. Pede a Play
   Billing e a StoreKit, e os acordos de pagamento nas duas lojas.
2. **Tabelas de classificação** no Game Center e no Play Games, para o Desafio
   do Dia e o Contra-Relógio (plano de implementação, fase 9).
3. Um processo de versão escrito: subir a versão, `pnpm check`, AAB para o
   teste interno, TestFlight, revisão.
