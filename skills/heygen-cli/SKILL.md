---
name: heygen-cli
description: Gera vídeos de AVATAR FALANTE no HeyGen a partir de um roteiro de texto e entrega o MP4 no Telegram. Use SEMPRE que o usuário pedir "faz um vídeo do meu avatar", "avatar falando", "vídeo no HeyGen", "gera um avatar falante", "vídeo com meu rosto", "manda no bot", ou der um roteiro/fala e quiser um vídeo de avatar — mesmo sem dizer "HeyGen". Cobre também listar vozes (inclusive PT-BR), listar os avatares da conta e listar os looks configurados. Default: 9:16, 720p, voz em português, engine avatar_iii. NÃO use para vídeos de motion graphics/HTML, parallax de imagens ou explicativos sem rosto — esta skill é especificamente o avatar falante do HeyGen.
---

# heygen-cli

Transforma um **roteiro de texto** num **vídeo de avatar falante** via API do HeyGen. Um comando, sem dependências (Node 18+ nativo).

O fluxo já vem resolvido: lê a chave e os IDs da config local, cria o vídeo, espera o render, baixa o arquivo, **mede o custo real** (delta de quota) e — se o Telegram estiver configurado — manda no bot com uma legenda explicando como foi feito e quanto custou.

## Quando usar

Pedidos como *"faz um vídeo curto do meu avatar falando sobre X"*, *"vídeo com meu rosto pra Reels"*, *"gera o avatar e manda no bot"*. Se o usuário só der um roteiro e quiser "o vídeo", é aqui.

Esta skill gasta o **pool de API** (Pay-As-You-Go). Para gastar os **créditos da assinatura**, use a skill `heygen-mcp` — os dois cofres são separados e não se cruzam.

## Como gerar

A fala é o único campo obrigatório; o resto tem defaults sensatos (9:16, 720p, voz PT-BR, engine `avatar_iii`):

```bash
node ~/.claude/skills/heygen-cli/scripts/heygen.mjs --text "Sua fala aqui."
```

Roteiro em arquivo, ou ajustes pontuais:

```bash
node ~/.claude/skills/heygen-cli/scripts/heygen.mjs \
  --text-file /caminho/roteiro.txt \
  --look escritorio --ratio 16:9 --slug minha-campanha --no-send
```

### Opções

| Flag | Default | Para quê |
|---|---|---|
| `--text` / `--text-file` | — (obrigatório) | a fala do avatar |
| `--look <slug>` | — | look por nome; resolve o avatar (e a voz, se o look fixar) |
| `--avatar <id>` | look default, ou `.env` | avatar cru |
| `--voice <id>` | voz do look, ou `.env` | trocar a voz |
| `--ratio` | `9:16` | `9:16` Reels · `16:9` YouTube · `1:1` · `4:5` |
| `--res` | `720p` | `720p` (barato) · `1080p` · `4k` |
| `--locale` | `pt-BR` | idioma da voz — **mantém português** |
| `--engine` | `avatar_iii` | `avatar_iii` · `avatar_iv` · `avatar_v` |
| `--slug` | derivado da fala | nome da pasta de saída |
| `--no-send` | (envia) | não mandar no bot, só salvar local |
| `--dry-run` | — | validar key/avatar/voz/engine **sem gerar** (custo 0) |

## Descobrir vozes, avatares e looks

```bash
node ~/.claude/skills/heygen-cli/scripts/heygen.mjs looks              # slugs configurados (local, não chama a API)
node ~/.claude/skills/heygen-cli/scripts/heygen.mjs voices --lang pt   # vozes PT
node ~/.claude/skills/heygen-cli/scripts/heygen.mjs avatars            # avatares da conta
```

## Pontos importantes (porquês)

- **Português é o ponto de risco.** Clones de voz costumam ficar cadastrados como *English* na conta. Por isso o default força `voice_settings.locale = pt-BR` — sem isso a pronúncia pode sair em inglês. Confira o primeiro render de ouvido; se a pronúncia PT ficar ruim, liste vozes PT (`voices --lang pt`) e passe `--voice <id>` de uma voz PT-BR nativa.
- **Engine: o default é `avatar_iii`, e o do HeyGen não é.** A engine vai no corpo do `POST /v3/videos` como `engine: { type: "avatar_iii" }` — **não** é propriedade do avatar; o mesmo `avatar_id` roda nas três. Se o campo for **omitido**, o HeyGen assume `avatar_iv`: o silêncio já é uma escolha, e a errada. O CLI valida a engine contra `supported_api_engines` do avatar e aborta se não bater.
- **Custo: meça, não estime.** `photo_avatar` e `digital_twin` custam diferente, e resolução/duração pesam. O CLI lê a quota antes e depois e reporta o **delta real**; leia o número que ele imprime.
- **`--dry-run` antes de todo render novo.** Custo 0, e pega os quatro erros que só apareceriam depois de pagar: key, avatar, voz e engine.
- **Um slug de look inexistente aborta** com a lista de válidos — nunca cai no default calado, senão o vídeo sai com a cara errada.

## Config

Nada de segredo mora nesta skill. Ela lê dois arquivos locais, ambos fora de qualquer repo:

- **`~/.config/heygen/looks.json`** (permissão `600`) — mapa `slug → avatar`, look default, e opcionalmente `env_path`, `out_dir` e `env_names`. Override: `HEYGEN_LOOKS_PATH`.
- **`~/.config/heygen/.env`** — `HEYGEN_API_KEY` e, opcionalmente, `HEYGEN_AVATAR_ID`, `HEYGEN_VOICE_ID`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`. Override: `HEYGEN_ENV_PATH`, ou `env_path` no config.

**Nunca** escreva um `avatar_id` ou `voice_id` neste SKILL.md, em README, guia, commit ou issue — nem em repo privado: repo privado vira público, e o histórico do git não esquece.

Detalhes de instalação, engines e custos: README do repo `heygenmcp`.
