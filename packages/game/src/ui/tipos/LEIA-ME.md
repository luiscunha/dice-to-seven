# Tipos de letra empacotados

## Fredoka

`fredoka-600-latin.woff2` — Fredoka SemiBold (peso 600), subconjunto **latin**,
16 KB.

Usada **só no nome do jogo**, na barra da Home. O resto da interface continua
com `system-ui`, e essa escolha não é indecisão: a fonte do sistema é a que o
aparelho já tem carregada, a que o utilizador já sabe ler, e a que acompanha as
definições de tamanho de letra dele. Numa marca, o carácter vale o peso; num
rodapé de definições, não.

**Empacotada e não servida por CDN**, porque o jogo corre dentro de um Capacitor
e tem de funcionar sem rede — uma fonte pedida ao Google não carregaria no avião,
e o wordmark caía de volta para a fonte do sistema justamente na única situação
em que ninguém pode arranjá-lo.

Vive em `src/ui/` e não em `public/` de propósito: o Vite corre com `base: "./"`
para o build funcionar servido de uma subpasta, e um caminho absoluto
(`/tipos/…`) partia-se aí. Em `src/`, o Vite resolve a `url()` do CSS em tempo de
build e emite o caminho certo sozinho.

- Origem: <https://fonts.google.com/specimen/Fredoka>
- Licença: SIL Open Font License 1.1 — <https://openfontlicense.org>
- A OFL permite embutir e redistribuir com o software. Não permite vender a
  fonte à parte, e obriga a manter esta atribuição.
