# heygenmcp

Skills de **vídeo de avatar falante no HeyGen** para o Claude Code. Roteiro de texto → MP4, entregue no bot do openpcbot (Telegram).

Duas skills que geram o vídeo — a diferença entre elas é **qual cofre paga**:

| Skill | O que faz | Cofre que gasta |
|---|---|---|
| `heygen-cli` | O motor: roteiro → MP4 via API v2/v3. Lista vozes, avatares e looks; mede o custo real (delta de quota). | pool de **API** (Pay-As-You-Go) |
| `heygen-mcp` | Mesma geração, via MCP remoto (OAuth). | créditos da **assinatura** |

Uma terceira skill, que escolhe **qual look fala**, é pessoal e por isso **não é versionada** (veja abaixo): ela existe só no disco do dono da conta e constrói por cima do `heygen-cli`. As duas skills acima funcionam sem ela.

## Instalar

As skills precisam estar visíveis em `~/.claude/skills/`. Symlink (assim editar aqui já vale na hora):

```bash
for s in heygen-cli heygen-mcp; do
  ln -s "$PWD/skills/$s" ~/.claude/skills/$s
done
```

Requer Node 18+ (sem dependências — só o runtime nativo).

## Configuração — fora deste repo, de propósito

Nada de segredo mora aqui. O código só conhece **slugs** (`indio`, `computador`); os identificadores reais vivem em dois lugares que nenhum repo alcança:

- `~/.config/heygen/looks.json` (permissão `600`) — o mapa `slug → avatar`, o look default e, opcionalmente, a voz de cada look.
- `.env` do openpcbot — a API key, o avatar/voz default e o token do bot.

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

O campo `voice` é opcional e existe por um motivo concreto: um avatar que **não** é o dono da conta não pode herdar o clone de voz dele. Sem `voice`, o look usa a voz default do `.env`. Um `--voice` explícito na linha de comando ganha de ambos.

## Usar

```bash
node skills/heygen-cli/scripts/heygen.mjs looks              # slugs disponíveis
node skills/heygen-cli/scripts/heygen.mjs voices --lang pt   # vozes PT
node skills/heygen-cli/scripts/heygen.mjs --text "a fala" --look <slug>
node skills/heygen-cli/scripts/heygen.mjs --text "..." --dry-run   # valida sem gerar (custo 0)
```

Defaults: `9:16`, `720p`, `pt-BR`, engine `avatar_iii`, entrega no bot. Saída em `~/projetos/output/heygen/<slug>/`.

**`--dry-run` antes de render novo.** Ele confere key, avatar, voz e engine sem gastar nada — render é pago, e um slug errado só se descobre pagando.

## Dois porquês que economizam dinheiro e retrabalho

- **Português é o ponto de risco.** O clone de voz está cadastrado como *English* na conta; por isso o CLI força `voice_settings.locale = pt-BR`. Sem isso a pronúncia sai em inglês. Confira o primeiro render de ouvido.
- **Omitir a engine já é uma escolha — e a errada.** Na API v3 a engine é campo do request, não propriedade do avatar: o mesmo avatar roda em `avatar_iii`, `avatar_iv` e `avatar_v`. Silêncio = o HeyGen assume `avatar_iv`. O default aqui é `avatar_iii`, explícito.
