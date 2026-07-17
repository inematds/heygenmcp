---
name: heygen-cli
description: Gera vídeos de AVATAR FALANTE no HeyGen (o avatar/perfil do Nei) a partir de um roteiro de texto e entrega o MP4 no bot do openpcbot (Telegram). Use SEMPRE que o usuário pedir "faz um vídeo do meu avatar", "vídeo do Nei falando X", "avatar falando", "vídeo no HeyGen", "gera um avatar falante", "vídeo provocativo/promo com meu rosto", "manda no bot", ou der um roteiro/fala e quiser um vídeo de avatar — mesmo sem dizer "HeyGen". Cobre também listar vozes (inclusive PT-BR) e listar os avatares/perfis da conta. Default: formato 9:16, 720p, voz em português, e entrega automática no bot do openpcbot. NÃO use para vídeos de motion graphics/HTML (HyperFrames), parallax de imagens (pixflow) ou explicativos sem rosto — esta skill é especificamente o avatar falante do HeyGen.
---

# heygen-cli

Transforma um **roteiro de texto** num **vídeo de avatar falante** (o perfil do Nei) via API do HeyGen e entrega o MP4 no **bot do openpcbot** (Telegram). Tudo num comando, sem dependências (Node 18+ nativo).

O fluxo já vem resolvido: lê a chave e os IDs do `.env` do openpcbot, cria o vídeo, espera o render, baixa o arquivo, **mede o custo real** (delta de quota) e manda no bot com uma legenda explicando como foi feito e quanto custou.

## Quando usar

Pedidos como *"faz um vídeo curto do meu avatar falando sobre X"*, *"vídeo provocativo com meu rosto pra Reels"*, *"gera o avatar e manda no bot"*. Se o usuário só der um roteiro e quiser "o vídeo", é aqui.

Para um vídeo de **motion graphics / HTML animado** use HyperFrames; para **parallax de imagens** use pixflow; para **explicativo sem rosto** use video-explicativo. Esta skill é o **avatar falante** especificamente.

## Como gerar

Rode o CLI bundlado. A fala é o único campo obrigatório; o resto tem defaults sensatos (9:16, 720p, voz PT-BR, envia no bot):

```bash
node ~/.claude/skills/heygen-cli/scripts/heygen.mjs --text "O trem da IA já saiu da estação. Embarque agora: inema ponto club."
```

Roteiro longo em arquivo, ou ajustes pontuais:

```bash
node ~/.claude/skills/heygen-cli/scripts/heygen.mjs \
  --text-file /caminho/roteiro.txt \
  --ratio 16:9 --res 720p --slug minha-campanha --no-send
```

### Opções

| Flag | Default | Para quê |
|---|---|---|
| `--text` / `--text-file` | — (obrigatório) | a fala do avatar |
| `--avatar <id>` | `HEYGEN_AVATAR_ID_NEI` | trocar o avatar/perfil |
| `--voice <id>` | `HEYGEN_VOICE_ID_NEI` | trocar a voz |
| `--ratio` | `9:16` | `9:16` Reels · `16:9` YouTube · `1:1` · `4:5` |
| `--res` | `720p` | `720p` (barato) · `1080p` · `4k` |
| `--locale` | `pt-BR` | idioma da voz — **mantém português** |
| `--engine` | `avatar_iii` | engine de render: `avatar_iii` · `avatar_iv` · `avatar_v` |
| `--slug` | derivado da fala | nome da pasta de saída |
| `--no-send` | (envia) | não mandar no bot, só salvar local |
| `--dry-run` | — | validar key/avatar/voz/engine **sem gerar** (custo 0) |

Saída em `~/projetos/output/heygen/<slug>/` (`<slug>.mp4`, `roteiro.txt`, `resultado.json`).

## Descobrir vozes e avatares

```bash
node ~/.claude/skills/heygen-cli/scripts/heygen.mjs voices --lang pt   # vozes (filtra idioma)
node ~/.claude/skills/heygen-cli/scripts/heygen.mjs avatars            # avatares/perfis da conta
```

## Pontos importantes (porquês)

- **Voz em português é o ponto de risco.** O avatar do Nei usa um clone de voz que está cadastrado como *English* na conta. Por isso o default força `voice_settings.locale = pt-BR` — sem isso a pronúncia pode sair em inglês. Sempre confira de ouvido o primeiro render; se a pronúncia PT ficar ruim, liste vozes PT (`voices --lang pt`) e passe `--voice <id>` de uma voz PT-BR nativa.
- **Engine: o default é `avatar_iii`** (escolha do usuário). A engine vai no corpo do `POST /v3/videos` como `engine: { type: "avatar_iii" }` — **não** é propriedade do avatar nem endpoint separado; o mesmo `avatar_id` roda nas três. Se o campo for **omitido**, o HeyGen assume `avatar_iv` — por isso o CLI sempre manda explícito. O avatar do Nei aceita `avatar_iii`, `avatar_iv` e `avatar_v` (confirmado em `GET /v3/avatars/looks/<id>` → `supported_api_engines`); antes de gerar, o CLI valida a engine contra essa lista e aborta se não bater.
- **Custo: avatar do Nei é photo avatar, a faixa cara.** Por isso o default é **720p e vídeos curtos** — mantém o gasto baixo. O CLI mede o custo real (créditos de API antes/depois) e reporta; não estime de cabeça, leia o número que ele imprime.
- **Sempre confirme a duração antes de gerar.** Render só acontece se houver `--text`; rode `--dry-run` quando quiser só checar que está tudo configurado sem gastar.
- **Entrega no bot** usa `TELEGRAM_BOT_TOKEN` + `ALLOWED_CHAT_ID` do `.env` do openpcbot. A legenda já descreve como foi feito e o custo. Use `--no-send` se for só montar local.

## Config

Tudo vem de `/home/nmaldaner/projetos/openpcbot/.env` (sobrescreva o caminho com a env var `HEYGEN_ENV_PATH`): `HEYGEN_API_KEY`, `HEYGEN_AVATAR_ID_NEI`, `HEYGEN_VOICE_ID_NEI`, `TELEGRAM_BOT_TOKEN`, `ALLOWED_CHAT_ID`.
