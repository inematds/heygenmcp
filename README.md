# heygenmcp

Skills de **vídeo de avatar falante no HeyGen** para o Claude Code. Roteiro de texto → MP4, entregue no Telegram. Um comando, sem dependências (Node 18+ nativo).

Duas skills geram o vídeo — a diferença entre elas é **qual cofre paga**:

| Skill | O que faz | Cofre que gasta |
|---|---|---|
| `heygen-cli` | O motor: roteiro → MP4 via API v2/v3. Lista vozes, avatares e looks; mede o custo real. | pool de **API** (Pay-As-You-Go) |
| `heygen-mcp` | Mesma geração, via MCP remoto (OAuth). | créditos da **assinatura** |

O HeyGen tem dois cofres separados que não se cruzam: gastar API não consome a assinatura, e vice-versa. Escolha a skill pelo cofre que você quer queimar.

Este repo é **só o operacional**: nenhum dado de conta, nenhum ID, nenhum look. A camada pessoal — qual avatar é seu, quais looks existem, qual voz é a sua — mora **fora daqui**, em config local e, se você quiser, numa skill própria num repo privado seu (veja [Camada pessoal](#camada-pessoal-fica-fora-deste-repo)).

## Instalar

Requer **Node 18+** (fetch/FormData/Blob nativos — zero `npm install`).

As skills precisam estar visíveis em `~/.claude/skills/`. Symlink, assim editar aqui já vale na hora:

```bash
git clone git@github.com:inematds/heygenmcp.git ~/projetos/heygenmcp
cd ~/projetos/heygenmcp
for s in heygen-cli heygen-mcp; do
  ln -s "$PWD/skills/$s" ~/.claude/skills/$s
done
```

Depois configure a API key e os IDs (próxima seção). Teste sem gastar nada:

```bash
node skills/heygen-cli/scripts/heygen.mjs --text "teste" --dry-run
```

## Configuração — fora deste repo, de propósito

Nada de segredo mora aqui. O código só conhece **slugs** (`escritorio`, `estudio`); os identificadores reais vivem em dois arquivos locais que nenhum repo alcança:

**1. `~/.config/heygen/.env`** — copie do [`.env.example`](.env.example) e preencha:

```bash
cp .env.example ~/.config/heygen/.env && chmod 600 ~/.config/heygen/.env
```

Só `HEYGEN_API_KEY` é obrigatória. `HEYGEN_AVATAR_ID`/`HEYGEN_VOICE_ID` são o default de quem não usa looks; `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID` ligam a entrega no bot — sem eles o vídeo só é salvo local.

**2. `~/.config/heygen/looks.json`** (permissão `600`) — opcional, e o coração da parte pessoal: o mapa `slug → avatar`.

```json
{
  "default": "escritorio",
  "looks": {
    "escritorio": {
      "id": "<avatar_id>",
      "voice": "<voice_id opcional — fixa a voz deste look>",
      "desc": "de camisa, mesa de escritório",
      "type": "digital_twin",
      "orient": "landscape"
    }
  },
  "env_path": "/caminho/opcional/para/outro/.env",
  "out_dir": "/caminho/opcional/de/saida",
  "env_names": { "voice": "MEU_NOME_DE_VAR" }
}
```

| Chave | Para quê |
|---|---|
| `looks` | mapa `slug → { id, voice?, desc?, type?, orient? }` |
| `default` | slug usado quando você não passa `--look`/`--avatar` |
| `env_path` | usar um `.env` que já existe em outro lugar, em vez de `~/.config/heygen/.env` |
| `out_dir` | base de saída (default: `~/heygen-output`) |
| `env_names` | **nomes** (não valores) das variáveis, se seu `.env` já usa outra convenção |

`env_names` existe para encaixar num setup que já existe sem renomear nada: se seu `.env` chama a voz de `HEYGEN_VOICE_ID_FULANO`, mapeie aqui. As chaves aceitas são `api_key`, `avatar`, `voice`, `tg_token`, `tg_chat`.

O campo `voice` do look existe por um motivo concreto: um avatar que **não** é o seu clone não pode herdar a voz clonada dele. Precedência da voz: **`--voice` explícito > voz do look > `.env`**.

Um slug inexistente **aborta** com a lista de slugs válidos — nunca cai no default calado. Isso é deliberado: um look errado só se descobriria depois de pagar o render.

Todos os caminhos aceitam override por env var: `HEYGEN_LOOKS_PATH`, `HEYGEN_ENV_PATH`, `HEYGEN_OUT_DIR`.

## Camada pessoal: fica fora deste repo

**Por que essa separação é regra dura:** repo privado vira público, e o histórico do git não esquece. Um ID commitado uma vez fica lá para sempre, mesmo apagado no commit seguinte. Por isso, nunca entram aqui: `avatar_id`, `voice_id`, API key, token de bot — nem em SKILL.md, nem em README, guia, commit ou issue.

O mesmo vale para o que **não é credencial mas é seu**: os nomes e descrições dos seus looks, o caminho do seu `.env`, o seu pipeline de entrega. Isso não é código compartilhável — é dado pessoal. O lugar dele é o `looks.json` local e, se você quiser uma skill que escolha o look por nome ("o de camisa branca", "o do estúdio"), um **repo privado seu**, que constrói por cima destas skills. O `.gitignore` daqui recusa `skills/avatar-*/` como rede de segurança.

## Buscar: vozes, avatares e looks

Antes de gerar, descubra o que existe na conta. Os três subcomandos são de leitura e **não gastam créditos**:

```bash
node skills/heygen-cli/scripts/heygen.mjs looks              # slugs locais (não chama a API)
node skills/heygen-cli/scripts/heygen.mjs voices             # todas as vozes da conta
node skills/heygen-cli/scripts/heygen.mjs voices --lang pt   # só português
node skills/heygen-cli/scripts/heygen.mjs avatars            # seus grupos de avatar
```

- **`looks`** lê só o `looks.json` local: slug, descrição, tipo, orientação, e marca o default.
- **`voices`** imprime `voice_id · nome · [idioma/gênero]`, até 60 por vez (avisa quantas sobraram). O `--lang` aceita atalho: `pt`, `pt-br`, `portugues`, `en`, `es` — o CLI traduz para o formato do HeyGen, que filtra pelo **nome do idioma por extenso** (`Portuguese`), não pelo código ISO. Por isso `--lang pt` funciona, mas um `pt` cru contra a API não funcionaria.
- **`avatars`** lista os grupos de avatar da conta (id, nome, tipo).

Para descobrir quais engines um avatar aceita, use `--dry-run`: ele consulta `GET /v3/avatars/looks/<id>` e imprime `supported_api_engines`.

## Gerar

```bash
# o básico — a fala é o único campo obrigatório
node skills/heygen-cli/scripts/heygen.mjs --text "O trem da IA já saiu da estação."

# roteiro em arquivo, 16:9, sem mandar no bot
node skills/heygen-cli/scripts/heygen.mjs \
  --text-file roteiro.txt --look <slug> --ratio 16:9 --slug minha-campanha --no-send
```

### Opções

| Flag | Default | Para quê |
|---|---|---|
| `--text` / `--text-file` | — (obrigatório) | a fala do avatar |
| `--look <slug>` | — | look por nome; resolve o avatar (e a voz, se o look fixar) |
| `--avatar <id>` | look default, ou `HEYGEN_AVATAR_ID` | avatar cru, sem passar pelo `looks.json` |
| `--voice <id>` | voz do look, ou `HEYGEN_VOICE_ID` | trocar a voz |
| `--ratio` | `9:16` | `9:16` Reels · `16:9` YouTube · `1:1` · `4:5` |
| `--res` | `720p` | `720p` · `1080p` · `4k` |
| `--locale` | `pt-BR` | idioma da voz — **mantém português** |
| `--engine` | `avatar_iii` | `avatar_iii` · `avatar_iv` · `avatar_v` |
| `--slug` | derivado da fala | nome da pasta de saída |
| `--title` | o `<slug>` | título no dashboard do HeyGen |
| `--out-dir` | `~/heygen-output` (ou `out_dir` do config) | base da saída |
| `--no-send` | (envia) | não mandar no bot, só salvar local |
| `--dry-run` | — | valida key/avatar/voz/engine **sem gerar** (custo 0) |

## Engines: III, IV e V

Na API v3 a engine é **campo do request** (`engine: { type: "avatar_iii" }`), **não** propriedade do avatar: o mesmo `avatar_id` pode rodar nas três, desde que a conta as suporte.

| Engine | Quando |
|---|---|
| `avatar_iii` | **default deste CLI.** Escolha explícita, não herança. |
| `avatar_iv` | **o que o HeyGen assume se você omitir o campo.** |
| `avatar_v` | a mais recente. |

**Omitir a engine já é uma escolha — e a errada.** O silêncio vira `avatar_iv` sem aviso, com custo e resultado diferentes do que você imaginou. Por isso o CLI **sempre** manda a engine explícita.

O CLI valida a engine contra `supported_api_engines` do avatar **antes** de gerar e aborta se não for aceita — falhar de graça é melhor que pagar por um render errado.

Uma ressalva de billing: pela skill `heygen-mcp`, se a tool do MCP não expuser um parâmetro de engine, **não presuma que o `avatar_iii` foi aplicado** — o vídeo sai em Avatar IV. Nesse caso vale usar o `heygen-cli`, que tem `--engine`.

## Custos: meça, não estime

**Não há tabela de preços neste README de propósito** — preço de render varia com engine, resolução, duração e plano, e um número desatualizado aqui é pior que número nenhum. O CLI **mede o custo real** em vez de estimar:

1. lê a quota de API **antes** do render (`GET /v2/user/remaining_quota`);
2. lê de novo **depois**;
3. o **delta** é o custo real, impresso no terminal, na legenda do Telegram e gravado em `resultado.json` (`cost_api_credits`).

Como gastar menos:

- **`--dry-run` antes de todo render novo.** Custo 0. Confere key, avatar, voz e engine — os quatro erros que só apareceriam depois de pagar.
- **`720p` é o default** porque é o mais barato; suba para `1080p`/`4k` só quando o destino exigir.
- `digital_twin` e `photo_avatar` custam diferente. **Leia o custo que o CLI imprime**, não estime pelo tipo.
- A quota de API e os créditos da assinatura são cofres distintos: se um acabar, a skill irmã ainda gera.

## Formatos e entrega

O `--ratio` acompanha o destino: `9:16` para Reels/Shorts (default), `16:9` para YouTube, `1:1` e `4:5` para feed.

Atenção ao enquadramento: um avatar **landscape** funciona em `9:16`, mas foi pensado para `16:9` — o corte em Reels pode ficar ruim. O subcomando `looks` mostra a orientação de cada um; se o corte não fechar, gere em `16:9`.

Terminado o render, o CLI baixa o MP4 e — se o Telegram estiver configurado — envia ao bot (`sendVideo`) com uma legenda que declara **como foi feito e quanto custou**: ratio, resolução, locale, engine, tamanho do arquivo e o custo medido. Suprima com `--no-send`.

Cada render deixa uma pasta em `<out_dir>/<slug>/`:

| Arquivo | Conteúdo |
|---|---|
| `<slug>.mp4` | o vídeo |
| `roteiro.txt` | a fala exata usada |
| `resultado.json` | `video_id`, caminho, tamanho, **custo medido**, quota restante, ratio, res, locale |

O envio só acontece se `TELEGRAM_BOT_TOKEN` e `TELEGRAM_CHAT_ID` existirem no `.env`; sem eles, o vídeo fica salvo local e o CLI diz que o envio foi pulado.

## Legenda: só existe se você pedir no estúdio

O `video_status.get` devolve três campos de legenda: `video_url` (MP4 **sem**
legenda queimada), `video_url_caption` (o mesmo vídeo **com** a legenda
queimada) e `caption_url` (a legenda solta). O CLI baixa **sempre o
`video_url`**, o limpo.

**Não há o que escolher no download.** É um `GET` numa URL pronta — sem
`?estilo=`, `?formato=`, `?idioma=`; e os endpoints de legenda da API
(`v1/video.caption`, `v2/video/caption`, `v1/video.subtitle`, `v1/caption.list`,
`v2/caption_styles`, `v2/video/<id>`) dão **404**. Estilo, fonte e posição se
decidem **no estúdio, antes de renderizar** — depois estão nos pixels, e só
regravando.

Medido em 2026-08-01, nos 25 vídeos completos mais recentes da conta:
`video_url_caption` nulo e `caption_url` vazio em todos. **Não testado:** o que
acontece com a legenda ligada no estúdio.

## Português é o ponto de risco

Clones de voz costumam ficar cadastrados como *English* na conta, mesmo quando a pessoa fala português. Por isso o CLI força `voice_settings.locale = pt-BR` — **sem isso a pronúncia sai em inglês**. Confira o primeiro render de ouvido; se a pronúncia PT não convencer, liste vozes PT (`voices --lang pt`) e passe `--voice <id>` de uma voz PT-BR nativa.

## Notas de operação

- O render é assíncrono: o CLI faz polling a cada 8s, até ~10 min. No timeout ele imprime o `video_id` — o vídeo pode ter ficado pronto depois, e ainda está no dashboard do HeyGen.
- Um render `failed` aborta com o erro do HeyGen. Falha não devolve crédito automaticamente; o delta de quota mostra o que foi cobrado.
