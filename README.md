# heygenmcp

Skills de **vídeo de avatar falante no HeyGen** para o Claude Code. Roteiro de texto → MP4, entregue no bot do openpcbot (Telegram). Um comando, sem dependências (Node 18+ nativo).

Duas skills geram o vídeo — a diferença entre elas é **qual cofre paga**:

| Skill | O que faz | Cofre que gasta |
|---|---|---|
| `heygen-cli` | O motor: roteiro → MP4 via API v2/v3. Lista vozes, avatares e looks; mede o custo real. | pool de **API** (Pay-As-You-Go) |
| `heygen-mcp` | Mesma geração, via MCP remoto (OAuth). | créditos da **assinatura** |

O HeyGen tem dois cofres separados que não se cruzam: gastar API não consome a assinatura, e vice-versa. Escolha a skill pelo cofre que você quer queimar.

Uma terceira skill, que escolhe **qual look fala**, é pessoal e **não é versionada** (veja [Configuração](#configuração--fora-deste-repo-de-propósito)). As duas acima funcionam sem ela.

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

Nada de segredo mora aqui. O código só conhece **slugs** (`indio`, `computador`); os identificadores reais vivem em dois lugares que nenhum repo alcança:

- **`.env` do openpcbot** — `HEYGEN_API_KEY`, `HEYGEN_AVATAR_ID_NEI`, `HEYGEN_VOICE_ID_NEI`, `TELEGRAM_BOT_TOKEN`, `ALLOWED_CHAT_ID`. Caminho padrão em `ENV_PATH`; mude com `HEYGEN_ENV_PATH=/outro/.env`.
- **`~/.config/heygen/looks.json`** (permissão `600`) — o mapa `slug → avatar`, o look default e, opcionalmente, a voz de cada look. Mude com `HEYGEN_LOOKS_PATH`.

**Por que essa separação é regra dura:** repo privado vira público, e o histórico do git não esquece. Um ID commitado uma vez fica lá para sempre, mesmo apagado no commit seguinte. Por isso: nenhum `avatar_id` ou `voice_id` em SKILL.md, README, guia, commit ou issue — nem aqui, nem em repo privado.

Pela mesma lógica, a skill de seleção de look (`skills/avatar-heygen-nei/`) está no `.gitignore`: ela não contém credencial nenhuma, mas descreve os **looks pessoais** do dono da conta — nomes, roupas, cenários. Isso é dado pessoal, não código compartilhável. Ela fica no disco e funciona normalmente; só não é publicada.

Estrutura de um look em `looks.json`:

```json
{
  "default": "<slug>",
  "looks": {
    "<slug>": {
      "id": "<avatar_id>",
      "voice": "<voice_id opcional — fixa a voz deste look>",
      "desc": "descrição curta",
      "type": "digital_twin | photo_avatar",
      "orient": "portrait | landscape"
    }
  }
}
```

O campo `voice` é opcional e existe por um motivo concreto: um avatar que **não** é o dono da conta não pode herdar o clone de voz dele. Precedência da voz: **`--voice` explícito > voz do look > default do `.env`**.

Um slug inexistente **aborta** com a lista de slugs válidos — nunca cai no default calado. Isso é deliberado: um look errado só se descobriria depois de pagar o render.

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
| `--avatar <id>` | `HEYGEN_AVATAR_ID_NEI` | avatar cru, sem passar pelo `looks.json` |
| `--voice <id>` | voz do look, ou `HEYGEN_VOICE_ID_NEI` | trocar a voz |
| `--ratio` | `9:16` | `9:16` Reels · `16:9` YouTube · `1:1` · `4:5` |
| `--res` | `720p` | `720p` · `1080p` · `4k` |
| `--locale` | `pt-BR` | idioma da voz — **mantém português** |
| `--engine` | `avatar_iii` | `avatar_iii` · `avatar_iv` · `avatar_v` |
| `--slug` | derivado da fala | nome da pasta de saída |
| `--title` | `INEMA <slug>` | título no dashboard do HeyGen |
| `--out-dir` | `~/projetos/output/heygen` | base da saída |
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

Terminado o render, o CLI baixa o MP4 e envia ao bot do openpcbot (`sendVideo`) com uma legenda que declara **como foi feito e quanto custou**: ratio, resolução, locale, engine, tamanho do arquivo e o custo medido. Suprima com `--no-send`.

Cada render deixa uma pasta em `~/projetos/output/heygen/<slug>/`:

| Arquivo | Conteúdo |
|---|---|
| `<slug>.mp4` | o vídeo |
| `roteiro.txt` | a fala exata usada |
| `resultado.json` | `video_id`, caminho, tamanho, **custo medido**, quota restante, ratio, res, locale |

O envio só acontece se `TELEGRAM_BOT_TOKEN` e `ALLOWED_CHAT_ID` existirem no `.env`; sem eles, o vídeo fica salvo local e o CLI diz que o envio foi pulado.

## Português é o ponto de risco

O clone de voz está cadastrado como *English* na conta. Por isso o CLI força `voice_settings.locale = pt-BR` — **sem isso a pronúncia sai em inglês**. Confira o primeiro render de ouvido; se a pronúncia PT não convencer, liste vozes PT (`voices --lang pt`) e passe `--voice <id>` de uma voz PT-BR nativa.

## Notas de operação

- O render é assíncrono: o CLI faz polling a cada 8s, até ~10 min. No timeout ele imprime o `video_id` — o vídeo pode ter ficado pronto depois, e ainda está no dashboard do HeyGen.
- Um render `failed` aborta com o erro do HeyGen. Falha não devolve crédito automaticamente; o delta de quota mostra o que foi cobrado.
