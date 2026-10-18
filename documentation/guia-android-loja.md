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

## 4. A primeira vez na Play Console

1. **Criar a aplicação**: *Create app* → nome «DiceToSeven», idioma por
   omissão, **Jogo**, **Grátis**. Aceitar as declarações.
2. **Teste interno** primeiro: *Testing → Internal testing → Create new
   release* → enviar o `app-release.aab`. A Play pergunta pela assinatura da
   aplicação: aceitar a **Play App Signing** (a Google gera e guarda a chave
   final; a nossa passa a ser a de envio).
3. Instalar pelo link do teste interno e confirmar que **arranca, joga e guarda
   o progresso** — é a primeira vez que o jogo corre assinado pela Google.
4. **Teste fechado**: *Testing → Closed testing*, com a lista dos 12 testers.
   Os 14 dias contam a partir de quando estiverem todos inscritos. Ver
   `plano-publicacao.md`.

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
