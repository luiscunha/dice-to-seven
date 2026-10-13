# iOS sem Mac — do repositório ao TestFlight

O `xcodebuild` só corre em macOS. Quem compila é o workflow
[`.github/workflows/ios.yml`](../.github/workflows/ios.yml), numa máquina
`macos-26` que o GitHub empresta a cada execução. Este guia é o resto: o que se
cria do lado da Apple, a partir do Windows, para essa máquina poder assinar e
enviar.

| Modo | Quando corre | Precisa de |
|---|---|---|
| **Compilar** | Em cada PR que mexa em `packages/mobile/`, e à mão | Nada |
| **TestFlight** | Só à mão, com a caixa "testflight" marcada | Conta Apple Developer e os seis segredos abaixo |

O repositório é público, portanto os minutos em macOS não se pagam. Se algum dia
deixar de ser, contam a dez vezes os de Linux.

---

## 1. Uma vez: a conta

O TestFlight exige o **Apple Developer Program** (99 USD por ano), em
<https://developer.apple.com/programs/enroll/>. A aprovação pode levar um ou dois
dias. Sem ela, só o modo Compilar funciona.

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
read -rsp "Senha do .p12: " P12_SENHA && echo && export P12_SENHA
openssl pkcs12 -export -inkey distribuicao.key -in distribuicao.pem \
  -out distribuicao.p12 -name "Apple Distribution" -passout env:P12_SENHA
```

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
O **número de build é o número da execução**, que só sobe. No fim, a Apple
processa o build durante 5 a 30 minutos, e manda um e-mail quando acabar.

Para o instalar: App Store Connect → a aplicação → **TestFlight** → *Internal
Testing* → cria um grupo e adiciona-te a ele. No iPhone, instala a aplicação
TestFlight e entra com a mesma conta Apple.

---

## Quando falha

| Sintoma no registo | Causa |
|---|---|
| `Falta o segredo …` | O segredo não existe, ou o nome tem uma gralha |
| `0 valid identities found` | O `.p12` não tem a chave privada, ou é de outro certificado |
| `MAC verification failed during PKCS12 import` | O macOS não leu o `.p12`. Refazer o passo 3 com `-legacy` a seguir a `pkcs12 -export` |
| `doesn't include signing certificate` | O perfil foi gerado com outro certificado. Gerar o perfil outra vez (passo 4) |
| `does not support provisioning profiles` | O perfil foi passado na linha de comando como `PROVISIONING_PROFILE_SPECIFIER`. Ver o comentário do passo *Arquivar* |
| `No suitable application records were found` | Falta o passo 5 |
| `The bundle version must be higher` | O número de execução recomeçou (o workflow mudou de nome?). Sobe o `MARKETING_VERSION` |

## O que expira

- **O certificado e o perfil**, ao fim de um ano. Repetir os passos 3, 4 e 7.
  Os builds já no TestFlight continuam a funcionar até expirarem (90 dias).
- **A conta**, ao fim de um ano, se não for renovada.
- **A chave de API** não expira, mas pode ser revogada no mesmo sítio onde foi
  criada.

## A versão

O `MARKETING_VERSION` (a versão que a loja mostra, hoje `1.0`) está no
`project.pbxproj`, em duas configurações. O TestFlight aceita quantos builds se
quiser na mesma versão; sobe-se quando se fecha uma versão para a App Store.
