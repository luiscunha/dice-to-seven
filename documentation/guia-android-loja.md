# Android — do repositório à Google Play

O pacote para a Play é um **AAB** (*Android App Bundle*), assinado com a **chave
de envio**. A Google guarda a chave final da aplicação (*Play App Signing*, a
opção por omissão) e volta a assinar cada pacote antes de o distribuir. A chave
de envio só prova que o pacote veio de ti.

Para testar no telemóvel continua a servir o APK de depuração, como até aqui
(`./gradlew assembleDebug`). Este guia é só para o que vai para a loja.

## 1. Uma vez: a chave de envio

**A chave é tua e fica fora do repositório.** Quem a tiver pode enviar versões
do jogo em teu nome. Perdê-la não é o fim do mundo — a Play deixa pedir uma
chave nova —, mas obriga a um pedido à Google e a dias de espera.

Numa pasta **fora do repositório** (por exemplo `D:\chaves\`), no Git Bash:

```bash
mkdir -p /d/chaves && "/c/Program Files/Microsoft/jdk-21.0.12.101-hotspot/bin/keytool" -genkeypair -v -keystore /d/chaves/dicetoseven-envio.jks -alias envio -keyalg RSA -keysize 2048 -validity 10000
```

O `keytool` pede:

- **uma senha** para o ficheiro, e depois para a chave — podem ser a mesma;
- nome, organização, cidade, país — o nome chega, e o país é `PT`.

A senha **não se escreve em lado nenhum do repositório**. Guarda-a num gestor de
senhas, e o ficheiro `dicetoseven-envio.jks` em **dois sítios** — por exemplo
o gestor de senhas (como anexo) e uma pen.

## 2. Uma vez: dizer ao projeto onde está a chave

Cria `packages/mobile/android/chave-envio.properties` (o `.gitignore` já o
exclui — confirma com `git status` que não aparece):

```properties
ficheiro=D:/chaves/dicetoseven-envio.jks
senhaDoArmazem=A_TUA_SENHA
alias=envio
senhaDaChave=A_TUA_SENHA
```

Barras para a frente (`D:/chaves/...`), e não `\`: num `.properties`, a barra
para trás é um carácter de escape.

Para um fluxo do GitHub, as mesmas quatro coisas entram como variáveis de
ambiente: `ANDROID_CHAVE_FICHEIRO`, `ANDROID_CHAVE_SENHA_ARMAZEM`,
`ANDROID_CHAVE_ALIAS` e `ANDROID_CHAVE_SENHA`.

## 3. Cada versão: o AAB

1. **Sobe a versão**, se este pacote vai para a loja: muda a `version` em
   `packages/mobile/package.json` e corre `pnpm versao`. A Play recusa dois
   pacotes com a mesma versão — durante o teste fechado, sobe só o último
   número (`1.0.1`, `1.0.2`…). Ver `packages/mobile/versao.ts`.
2. **Constrói:**

   ```bash
   pnpm mobile:sync && cd packages/mobile/android && JAVA_HOME="/c/Program Files/Microsoft/jdk-21.0.12.101-hotspot" ./gradlew bundleRelease
   ```

3. O pacote fica em
   `packages/mobile/android/app/build/outputs/bundle/release/app-release.aab`.

Sem o `chave-envio.properties`, o `bundleRelease` **falha logo**, a dizer o que
falta — é de propósito: um pacote sem assinatura só seria recusado depois de
enviado.

## 4. Uma vez: a conta da Play Console

A conta custa **25 USD, uma vez** (não é anual), e é precisa para tudo, até para
o teste interno. Não há maneira grátis de enviar um pacote para a Play.

**Antes de começar, à mão:** o documento de identidade, um comprovativo de
morada, um cartão de pagamento **no teu nome**, o telemóvel, e um telemóvel
Android. O nome e a morada que escreveres têm de bater certo com os
documentos: se a Google os recusar, a taxa não é devolvida.

1. **Escolher a conta Google** que vai ser a dona do jogo na Play — proponho a
   `dicetoseven@gmail.com`, para o jogo não ficar preso à tua conta pessoal.
   Liga-lhe a verificação em dois passos antes de começar.
2. Abrir <https://play.google.com/console/signup>, entrar com essa conta, e
   escolher **conta pessoal** («Yourself» / «Para mim»).
3. **Os dados**, em três partes:
   - **o nome de programador**, que aparece na loja por baixo do nome do jogo.
     Pode ser o teu nome ou uma marca («DiceToSeven»); escolhe com calma, que
     se vê em todas as aplicações que publicares;
   - **o teu nome legal e a morada**, exatamente como nos documentos — não se
     mostram na loja;
   - **o contacto público**: o e-mail `dicetoseven@gmail.com`, e, se quiseres,
     o site `https://luiscunha.github.io/dicetoseven-site/`. O telefone de
     contacto confirma-se com um código.
4. **Pagar os 25 USD.**
5. **Verificar a identidade**: enviar o documento quando a Play o pedir. Costuma
   levar um ou dois dias, às vezes mais. O estado vê-se na página inicial da
   Play Console.
6. **Confirmar que tens um Android**: a Play pede que entres na app **Google
   Play Console** num telemóvel Android com a mesma conta. Sem isto não deixa
   criar aplicações.

A ajuda da Google sobre a conta:
<https://support.google.com/googleplay/android-developer/answer/6112435>

### A conta pessoal e os 12 testers

Uma conta **pessoal** só pode publicar depois de um **teste fechado** com pelo
menos **12 testers**, inscritos durante os **últimos 14 dias seguidos**. Até lá,
a Play Console tem a *Produção* desligada. Cumprido isso, pede-se o acesso à
produção na página inicial, com umas perguntas sobre o teste — e a Google
responde em até 7 dias.

Se alguém sair a meio e ficarem menos de 12, a contagem pode recomeçar: convém
convidar 15. Regras oficiais:
<https://support.google.com/googleplay/android-developer/answer/14151465>

## 5. A primeira vez com o jogo

Tudo em <https://play.google.com/console>.

1. **Criar a aplicação**: *Criar aplicação* → nome «DiceToSeven», idioma por
   omissão, **Jogo**, **Grátis**. Aceitar as declarações.
2. **Teste interno** primeiro: *Testar e lançar → Testes → Testes internos →
   Criar nova versão* → enviar o `app-release.aab`. A Play pergunta pela
   assinatura da aplicação: aceitar a **Play App Signing** (a Google gera e
   guarda a chave final; a nossa passa a ser a de envio). Ajuda:
   <https://support.google.com/googleplay/android-developer/answer/9842756>
3. Instalar pelo link do teste interno e confirmar que **arranca, joga e guarda
   o progresso** — é a primeira vez que o jogo corre assinado pela Google. O
   teste interno **não conta** para os 14 dias.
4. **Teste fechado**: *Testes → Teste fechado*, com a lista dos testers (os
   e-mails, ou um Google Group). Os 14 dias começam quando estiverem inscritos.
   Ajuda: <https://support.google.com/googleplay/android-developer/answer/9845334>
5. Enquanto o teste corre, preencher o resto: a ficha da loja, a classificação
   etária, a segurança dos dados e o público-alvo — ver `plano-publicacao.md`,
   secção 4.

Os nomes dos menus mudam com o idioma da Play Console, e a Google mexe-lhes de
tempos a tempos; se um caminho não bater certo, procura pela palavra
(«Testes internos», «Teste fechado»).

## Quando falha

- **«Falta a chave de envio»** — o `chave-envio.properties` não existe, ou não
  está em `packages/mobile/android/`.
- **«Keystore was tampered with, or password was incorrect»** — a senha do
  armazém está errada.
- **«Version code 10000 has already been used»** — esqueceste-te de subir a
  versão (passo 3.1).
- **A Play diz que a chave de envio não é a esperada** — o pacote foi assinado
  com outra chave. Não há volta a dar-lhe senão a certa, ou pedir uma nova em
  *Setup → App integrity → Upload key*.
