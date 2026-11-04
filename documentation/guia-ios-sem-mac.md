# iOS sem Mac — do repositório ao TestFlight

O `xcodebuild` só corre em macOS. Quem compila é o workflow
[`.github/workflows/ios.yml`](../.github/workflows/ios.yml), numa máquina
`macos-26` que o GitHub empresta a cada execução. Este guia é o resto: o que se
cria do lado da Apple, a partir do Windows, para essa máquina poder assinar e
enviar.

| Modo | Quando corre | Precisa de | Deixa |
|---|---|---|---|
| **Compilar** | Em cada PR que mexa em `packages/mobile/`, e à mão | Nada | Um `.ipa` sem assinatura |
| **TestFlight** | Só à mão, com a caixa "testflight" marcada | Conta Apple Developer e os seis segredos abaixo | Um build no TestFlight |

O repositório é público, portanto os minutos em macOS não se pagam. Se algum dia
deixar de ser, contam a dez vezes os de Linux.

---

## Sem conta paga: o `.ipa` e o Sideloadly

Para sentir o jogo no telemóvel antes de pagar a conta. O modo Compilar deixa um
`.ipa` sem assinatura, que o [Sideloadly](https://sideloadly.io) assina no
Windows com uma conta Apple gratuita e instala por USB.

### Obter o `.ipa`

- Num PR que mexa em `packages/mobile/`, sai sozinho.
- Fora disso: **Actions** → **iOS** → **Run workflow**, com a caixa
  *testflight* **desmarcada**.

Na página da execução, em **Artifacts**, descarrega
`DiceToSeven-N-sem-assinatura`. Vem num `.zip`; o `.ipa` está lá dentro. O `N` é
o número do build, e fica guardado 14 dias.

### Preparar, uma vez

1. **iTunes e iCloud nas versões "web"**, não os da Microsoft Store. O
   Sideloadly fala com o iPhone pelos controladores deles, e os da Store não
   servem. Se já tens os da Store, desinstala-os primeiro.

   Não se chega lá pelo site normal: no Windows, `apple.com/itunes` manda para
   a Microsoft Store. Estes são os instaladores diretos, nos servidores da
   Apple — os mesmos para que o site do Sideloadly aponta:

   - iTunes, 64 bits: <https://www.apple.com/itunes/download/win64>
   - iCloud: <https://updates.cdn-apple.com/2020/windows/001-39935-20200911-1A70AA56-F448-11EA-8CC0-99D41950005E/iCloudSetup.exe>

   O iCloud é de 2020 de propósito: é a última versão que a Apple pôs fora da
   Store. Se o Windows sugerir a aplicação **Dispositivos Apple** quando ligares
   o iPhone, recusa: substitui a parte do iTunes que fala com o telefone.
2. **O Sideloadly**, de <https://sideloadly.io>.
3. Liga o iPhone por USB e aceita **Confiar neste computador**.

### Instalar

1. Arrasta o `.ipa` para o Sideloadly, escreve o Apple ID, e **Start**. Pede a
   senha e o código de dois fatores da conta Apple.
2. Na primeira vez, no iPhone:
   - **Definições** → **Geral** → **VPN e gestão de dispositivos** → confia no
     teu Apple ID.
   - **Definições** → **Privacidade e segurança** → **Modo de programador** →
     liga-o. O iPhone reinicia e pede confirmação. A opção só aparece depois da
     primeira instalação.

O Sideloadly é uma ferramenta de terceiros, e a senha da conta Apple passa por
ela. Ele próprio recomenda usar uma conta Apple secundária.

### Os limites da conta gratuita

- **A aplicação deixa de abrir ao fim de 7 dias.** Reinstala-se por cima com o
  mesmo Apple ID, e o progresso fica.
- No máximo três aplicações instaladas assim de cada vez.
- Sem TestFlight, e sem partilhar com mais ninguém: cada pessoa teria de fazer
  isto com a sua conta.

Para tudo isso, é a conta paga e o resto deste guia.

---

## 1. Uma vez: a conta

O TestFlight exige o **Apple Developer Program**: 99 USD por ano, que em
Portugal são 99 €. Sem ele, só o modo Compilar funciona.

Há dois caminhos para a inscrição:
- **A aplicação Apple Developer, num iPhone.** É o mais rápido: fotografa-se o
  documento de identificação, e a quota fica como uma subscrição anual do Apple
  ID.
- **A web**, em <https://developer.apple.com/programs/enroll/>. Aí paga-se com
  um cartão **em nome próprio**. Com o cartão de outra pessoa, a Apple pede o
  documento de identificação e a aprovação atrasa.

Nos dois, o nome e o apelido do Apple ID têm de ser os **legais**, os do
documento, e são esse nome que a loja mostra como vendedor. A conta deste jogo
foi aprovada no próprio dia, a 2026-11-03.

Depois da aprovação, no App Store Connect → **Business**, declara-se o
estatuto da UE (*Digital Services Act*). Um jogo grátis, sem compras nem
anúncios, é de **não comerciante**. Sem essa declaração, a Apple não aceita o
jogo nas lojas da UE.

Tudo o que se segue usa o **Git Bash**, que já traz o `openssl`. Trabalha numa
pasta **fora do repositório** — há aqui uma chave privada, e um segredo commitado
não se apaga do histórico com um commit a seguir:

```bash
mkdir -p ~/ios-assinatura && cd ~/ios-assinatura
```

## 2. O identificador da aplicação

[Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list)
→ **Identifiers** → **+** → *App IDs* → *App*.

- Descrição: `DiceToSeven`
- Bundle ID: **Explicit**, `com.luiscunha.dicetoseven` — o mesmo do
  `capacitor.config.ts`, e é para sempre.
- Capacidades: nenhuma.

## 3. O certificado de distribuição

O pedido de certificado normalmente sai do Keychain do Mac. Sem Mac, sai do
`openssl`:

```bash
openssl genrsa -out distribuicao.key 2048
MSYS_NO_PATHCONV=1 openssl req -new -key distribuicao.key -out distribuicao.csr \
  -subj "/emailAddress=O_TEU_EMAIL/CN=Luis Cunha/C=PT"
```

(`O_TEU_EMAIL` é o e-mail da conta Apple Developer.)

O `MSYS_NO_PATHCONV=1` não é opcional: sem ele, o Git Bash lê o `-subj` como um
caminho e transforma-o em `C:/Program Files/Git/emailAddress=…`.

Em **Certificates** → **+** → *Apple Distribution* → envia o
`distribuicao.csr` → descarrega o `distribution.cer` para a mesma pasta. Depois
junta-o à chave num `.p12`:

```bash
openssl x509 -inform DER -in distribution.cer -out distribuicao.pem
openssl pkcs12 -export -inkey distribuicao.key -in distribuicao.pem \
  -out distribuicao.p12 -name "Apple Distribution" \
  -keypbe PBE-SHA1-3DES -certpbe PBE-SHA1-3DES -macalg sha1
```

O `openssl` pede a senha duas vezes, e não a mostra. Se as duas não forem
iguais, diz *Verify failure* e não escreve nada; quando corre bem, não diz
nada.

**As três opções do fim não são opcionais.** Por omissão, o OpenSSL 3 cifra o
`.p12` com AES e SHA-256, e o `security import` do macOS costuma recusá-lo com
*MAC verification failed*. O SHA1 com 3DES é o formato que o Keychain sempre
leu, e não precisa do `-legacy`.

Para confirmar que a senha abre o ficheiro, e que lá dentro estão o certificado
e a chave:

```bash
openssl pkcs12 -in distribuicao.p12 -info -noout -nokeys
```

Pede a senha uma vez. A resposta tem de mostrar um `Certificate bag` e um
`Shrouded Keybag`; se a senha estiver errada, diz *Mac verify error*.

A senha que escreveste é o segredo `IOS_CERTIFICATE_PASSWORD`. Guarda-a, e
guarda o `distribuicao.key`: sem ele o certificado não serve para nada.

## 4. O perfil de provisionamento

**Profiles** → **+** → *Distribution* → **App Store Connect** → escolhe o App ID
do passo 2 → escolhe o certificado do passo 3 → nome `DiceToSeven App Store` →
descarrega o `.mobileprovision`.

O workflow lê do próprio perfil o UUID e a equipa. Não há segredo de Team ID.

## 5. A aplicação no App Store Connect

[App Store Connect](https://appstoreconnect.apple.com/apps) → **+** → *New App*.

- Plataforma: iOS
- Nome: `DiceToSeven` (tem de estar livre na loja inteira)
- Bundle ID: o do passo 2
- SKU: `dicetoseven` (só tu o vês)

Tem de existir antes do primeiro envio; sem ela, o envio falha com *No suitable
application records were found*.

## 6. A chave de API

App Store Connect → **Users and Access** → **Integrations** → **App Store Connect
API** → **Team Keys** → **+**. Na primeira vez, o titular da conta tem de pedir
acesso à API.

- Nome: `GitHub Actions`
- Acesso: **App Manager**

Descarrega o `AuthKey_XXXXXXXXXX.p8` — **só dá para descarregar uma vez**. Anota
o **Key ID** (está na linha da chave) e o **Issuer ID** (por cima da tabela).

## 7. Os segredos no GitHub

No repositório: **Settings** → **Secrets and variables** → **Actions** → **New
repository secret**.

Os três ficheiros vão em base64. No PowerShell, isto copia um deles para a área
de transferência, pronto a colar:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("$HOME\ios-assinatura\distribuicao.p12")) | Set-Clipboard
```

| Segredo | Valor |
|---|---|
| `IOS_CERTIFICATE_P12` | `distribuicao.p12`, em base64 |
| `IOS_CERTIFICATE_PASSWORD` | A senha do passo 3 |
| `IOS_PROVISIONING_PROFILE` | O `.mobileprovision` do passo 4, em base64 |
| `ASC_KEY_ID` | O Key ID do passo 6 |
| `ASC_ISSUER_ID` | O Issuer ID do passo 6 |
| `ASC_KEY_P8` | O `AuthKey_….p8`, em base64 |

## 8. Enviar

**Actions** → **iOS** → **Run workflow** → marca *testflight* → **Run**.

O botão só aparece depois de o `ios.yml` estar na `main`.

O workflow corre o `pnpm check` e reverifica os níveis, compila, assina e envia.
O **número de build é o número da execução**, que só sobe. Se o passo *Enviar
para o TestFlight* acabar bem, a Apple aceitou o ficheiro. Ainda o processa
durante 5 a 30 minutos.

**Não contes com o e-mail de «processado».** No primeiro envio, a 2026-11-03,
não chegou. Provavelmente é porque o build foi enviado pela chave de API, e não
por um utilizador. O estado vê-se no App Store Connect → a aplicação → **TestFlight** → **iOS**:

| Estado | O que quer dizer |
|---|---|
| *Processing* | A Apple ainda o está a processar |
| *Ready to Submit* | Está pronto. «Submit» é para os testers externos e para a App Store; os internos já o podem instalar |
| *Missing Compliance* | Não devia aparecer: o `Info.plist` já declara que não há cifra |
| *Invalid Binary* | Foi recusado. Chega um e-mail com os erros `ITMS-…` |

Para o instalar: App Store Connect → a aplicação → **TestFlight** → *Internal
Testing* → cria um grupo e adiciona-te a ele. No iPhone, instala a aplicação
TestFlight e entra com a mesma conta Apple.

---

## Quando falha

| Sintoma no registo | Causa |
|---|---|
| `Falta o segredo …` | O segredo não existe, ou o nome tem uma gralha |
| `0 valid identities found` | O `.p12` não tem a chave privada, ou é de outro certificado |
| `MAC verification failed during PKCS12 import` | O macOS não leu o `.p12`. Ou a senha do segredo não é a do `.p12`, ou o `.p12` foi feito sem as três opções do passo 3 |
| `doesn't include signing certificate` | O perfil foi gerado com outro certificado. Gerar o perfil outra vez (passo 4) |
| `does not support provisioning profiles` | O perfil foi passado na linha de comando como `PROVISIONING_PROFILE_SPECIFIER`. Ver o comentário do passo *Arquivar* |
| `No suitable application records were found` | Falta o passo 5 |
| `The bundle version must be higher` | O número de execução recomeçou (o workflow mudou de nome?). Sobe o `MARKETING_VERSION` |
| Sideloadly: o campo do Apple ID fica cinzento, ou não vê o iPhone | O iTunes ou o iCloud são os da Microsoft Store |
| Sideloadly: o Bundle ID não está disponível | O `com.luiscunha.dicetoseven` já está registado noutra equipa — a conta paga, depois do passo 2. Nas opções avançadas do Sideloadly, muda o Bundle ID |

## O que expira

- **O certificado e o perfil**, ao fim de um ano. Repetir os passos 3, 4 e 7.
  Os builds já no TestFlight continuam a funcionar até expirarem (90 dias).
- **A conta**, ao fim de um ano, se não for renovada.
- **A chave de API** não expira, mas pode ser revogada no mesmo sítio onde foi
  criada.

## A versão

A versão que a loja mostra vem da `version` do `packages/mobile/package.json`.
O `pnpm versao` escreve-a no `MARKETING_VERSION` do `project.pbxproj`, nas duas
configurações. A primeira a ir para a App Store foi a `1.0.1`. O TestFlight
aceita quantos builds se quiser na mesma versão; sobe-se quando se fecha uma
versão para a App Store.

**A versão do App Store Connect tem de ser igual à do build.** A primeira
página de versão nasce como `1.0`; troca-se para a do build antes de o
escolher, senão ele não aparece na lista.
