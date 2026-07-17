---
name: heygen-mcp
description: Gera vídeos de AVATAR FALANTE do Nei no HeyGen usando os CRÉDITOS DA ASSINATURA (plano web), via MCP remoto do HeyGen — NÃO gasta o wallet de API Pay-As-You-Go. Use SEMPRE que o usuário disser "assinatura", "usa os créditos do plano", "gera pela assinatura", "sem gastar API", "via mcp", "pelo mcp do heygen", ou quando pedir um vídeo de avatar e quiser priorizar os créditos do plano que já estão pagos. Entrega o MP4 no bot do openpcbot (Telegram), igual à skill irmã. NÃO confundir com a skill `heygen-cli`, que faz a MESMA coisa porém via API key (gasta o pool de API, não a assinatura) — escolha esta quando o objetivo for queimar os créditos da assinatura. Também cobre conectar/checar o conector MCP do HeyGen quando ele ainda não estiver ligado.
---

# heygen-mcp

Gera o **avatar falante do Nei** no HeyGen consumindo os **créditos da assinatura** (plano web) em vez do wallet de API. A diferença é só de **billing**: o HeyGen tem dois cofres separados que não se cruzam.

| Caminho | Cofre que gasta | Skill |
|---|---|---|
| **MCP remoto** (OAuth) | créditos da **assinatura / plano** | **esta** (`heygen-mcp`) |
| **API key** (v2/v3) | pool de **API** (Pay-As-You-Go) | `heygen-cli` |

Use esta skill quando o usuário falar em **assinatura / créditos do plano / "sem gastar API"**. Para o caminho via API key, veja `heygen-cli`.

## Pré-requisito: o conector MCP precisa estar ligado

A geração aqui acontece chamando as **ferramentas do HeyGen MCP** (`mcp__heygen__*`). Elas só existem quando o conector está conectado e autenticado.

**1. Verifique** se as ferramentas `mcp__heygen__*` já estão disponíveis na sessão (ex.: `create_avatar_video`, `create_video_agent`, `get_current_user`). Se sim, pule pra geração.

**2. Se não estiverem, conecte:**
```bash
claude mcp add --transport http heygen https://mcp.heygen.com/mcp/v1/
```
Depois o **usuário** precisa autenticar (login é dele): no Claude Code, rodar `/mcp` → escolher **heygen** → **Authenticate** → logar na conta HeyGen no navegador (OAuth, uma vez só). Sem API key.

- Endpoint: `https://mcp.heygen.com/mcp/v1/` · Auth: OAuth · Billing: **plano + premium credits**.
- O HeyGen usa whitelist de domínio, mas Claude (Web/Desktop/Code) é suportado oficialmente → conecta direto. Se o OAuth reclamar de domínio, há o formulário de liberação na doc.

## Confirmar que está batendo na assinatura

Antes de gerar, rode a tool `get_current_user` (do MCP) — ela mostra o perfil e os **créditos restantes do plano**. Anote o saldo; depois de gerar, rode de novo pra medir o **custo real** (delta) — mesma lógica de "medir, não chutar" do `heygen-cli`.

## Gerar o vídeo

Chame a tool de geração do MCP do HeyGen (nomes podem variar conforme a versão do conector — use a que existir):

- `create_avatar_video` — controlado: passe `avatar_id`, `voice_id`, o texto/script, `aspect_ratio`, `resolution` e, se existir, a engine (ver abaixo).
- `create_video_agent` — one-shot por prompt (o HeyGen roteiriza e escolhe sozinho). Útil quando o usuário só dá o tema.

**Defaults do usuário (sempre):** formato **9:16**, **720p**, **voz em português**, engine **`avatar_iii`**, vídeos **curtos**.

**IDs do Nei — dados privados, NÃO ficam escritos aqui.** Busque na hora:
- avatar: `~/.config/heygen/looks.json` (11 looks; liste com `node ~/.claude/skills/heygen-cli/scripts/heygen.mjs looks` e use o slug pra pegar o `id`). Escolha do look: skill `avatar-heygen-nei`.
- voz "INEMA TIME" (clone, cadastrada como English): `HEYGEN_VOICE_ID_NEI` no `.env` do openpcbot.

**Nunca** cole esses IDs em SKILL.md, README, guia ou qualquer arquivo de repo — nem privado.

**Engine — o default do usuário é `avatar_iii`, e o do HeyGen NÃO é.** Na API v3 a engine é um campo do request (`engine: { type: "avatar_iii" }`), não uma propriedade do avatar: o mesmo `avatar_id` roda em `avatar_iii`, `avatar_iv` e `avatar_v` (as três confirmadas para o avatar do Nei via `GET /v3/avatars/looks/<id>` → `supported_api_engines`). **Omitir o campo = o HeyGen assume `avatar_iv`** — ou seja, o silêncio já é uma escolha, e a errada.

Se a tool do MCP expuser um parâmetro de engine/model, passe **`avatar_iii`** explicitamente. **Se não expuser, não presuma que deu certo:** o vídeo sai em Avatar IV. Nesse caso, avise o usuário antes de gerar e ofereça o `heygen-cli` (que tem `--engine`) como alternativa — a diferença é só de billing, e a escolha de engine dele vale mais do que economizar créditos de API sem ele saber.

**Português é o ponto de risco:** a voz do Nei está como English. Force o idioma da fala para PT-BR no parâmetro de voz/locale que a tool expuser. Se a pronúncia ficar ruim, troque por uma voz PT nativa (há 46 na conta; ex.: *Donato - Natural*, *Pedro Lima*, *Calm Carlos*).

Acompanhe o status pela própria tool (ou pela tool de status do MCP) até o vídeo ficar pronto e devolver a **URL do MP4**.

## Entregar no bot do openpcbot

Depois que o MCP devolver a URL (ou o arquivo) do vídeo, entregue no Telegram do openpcbot com o helper bundlado — ele baixa (se for URL), salva em `~/projetos/output/heygen/<slug>/` e manda no bot com legenda:

```bash
node ~/.claude/skills/heygen-mcp/scripts/deliver.mjs \
  --url "<URL_DO_MP4>" --slug minha-campanha \
  --caption "🎬 <titulo> — avatar HeyGen (via assinatura)\n9:16 · 720p · PT-BR\nCusto: <delta> créditos do plano"
```

(Use `--file <caminho>` no lugar de `--url` se já tiver o arquivo local. `--no-send` só salva.)

## Recomendação de uso

Prefira **esta skill** (assinatura) quando houver saldo de plano — são créditos **já pagos** na mensalidade. Deixe o `heygen-cli` (wallet de API) como **fallback** pra quando o plano zerar. Documentação completa do ecossistema HeyGen do usuário: ver a página de guia do projeto VideosAvatar.
