#!/usr/bin/env node
// heygen-cli v1.00.00 — gera vídeo de avatar falante no HeyGen e entrega no bot do openpcbot.
// Zero dependências (Node 18+ / Bun: fetch, FormData, Blob nativos).
//
// Geração:  node heygen.mjs --text "fala do avatar" [opções]
// Listar:   node heygen.mjs voices [--lang pt]
//           node heygen.mjs avatars
//
// Credenciais e IDs default vêm do .env do openpcbot.

import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const VERSION = "1.02.00";
const ENV_PATH = process.env.HEYGEN_ENV_PATH || "/home/nmaldaner/projetos/openpcbot/.env";
// Looks do Nei: PRIVADO, fora de qualquer repo de propósito. Não mover para ~/.claude nem ~/projetos.
const LOOKS_PATH = process.env.HEYGEN_LOOKS_PATH || path.join(os.homedir(), ".config/heygen/looks.json");
const API = "https://api.heygen.com";

const HELP = `heygen-cli v${VERSION}

Gerar vídeo:
  node heygen.mjs --text "O trem da IA já saiu da estação..." [opções]
  node heygen.mjs --text-file roteiro.txt

Opções (com defaults):
  --look <slug>     look do Nei por nome (ex.: indio, computador) — veja: looks
  --avatar <id>     avatar_id cru        (default: HEYGEN_AVATAR_ID_NEI do .env)
  --voice <id>      voice_id             (default: HEYGEN_VOICE_ID_NEI do .env)
  --ratio <r>       aspect_ratio 9:16|16:9|1:1|4:5  (default: 9:16)
  --res <r>         720p|1080p|4k        (default: 720p)
  --locale <l>      idioma da voz        (default: pt-BR  -> força português)
  --engine <e>      avatar_iii|avatar_iv|avatar_v  (default: avatar_iii)
  --slug <nome>     pasta de saída       (default: derivado da fala)
  --title <t>       título no dashboard HeyGen
  --out-dir <dir>   base de saída        (default: ~/projetos/output/heygen)
  --no-send         NÃO enviar pro bot do openpcbot (default: envia)
  --dry-run         valida key/avatar/voz SEM gerar (custo 0)

Subcomandos:
  looks                lista os looks do Nei (slugs pra usar com --look)
  voices [--lang pt]   lista vozes (filtra por idioma)
  avatars              lista seus avatares (grupos de foto avatar)
`;

function parseEnv(p) {
  const out = {};
  try {
    for (const line of fs.readFileSync(p, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (!m) continue;
      let v = m[2];
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      out[m[1]] = v;
    }
  } catch { /* .env opcional para subcomandos? não: precisamos da key */ }
  return out;
}

function loadLooks() {
  try { return JSON.parse(fs.readFileSync(LOOKS_PATH, "utf8")); } catch { return null; }
}

// Resolve --look <slug> para um look. Slug desconhecido aborta com a lista — nunca cai
// silenciosamente no default, senão o vídeo sai com a cara errada e só se descobre pagando.
// O look pode fixar sua própria voz: avatar que não é o Nei não pode herdar o clone de voz dele.
function resolveLook(slug) {
  const cfg = loadLooks();
  if (!cfg) { console.error("✗ looks.json não encontrado em", LOOKS_PATH); process.exit(1); }
  const hit = cfg.looks?.[slug];
  if (!hit) {
    console.error(`✗ look "${slug}" não existe. Disponíveis: ${Object.keys(cfg.looks || {}).join(", ")}`);
    process.exit(1);
  }
  return hit;
}

async function api(env, pathname, opt = {}) {
  const r = await fetch(API + pathname, { ...opt, headers: { "X-Api-Key": env.HEYGEN_API_KEY, ...(opt.headers || {}) } });
  let b = null; try { b = await r.json(); } catch { /* não-json */ }
  return { status: r.status, b };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function slugify(s) {
  return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "video";
}

function argVal(argv, flag) {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : undefined;
}

function parseArgs(argv) {
  const a = { ratio: "9:16", res: "720p", locale: "pt-BR", engine: "avatar_iii", send: true, dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i];
    const next = () => argv[++i];
    if (k === "--text") a.text = next();
    else if (k === "--text-file") a.text = fs.readFileSync(next(), "utf8").trim();
    else if (k === "--avatar") a.avatar = next();
    else if (k === "--look") { const l = resolveLook(next()); a.avatar = l.id; a.lookVoice = l.voice; }
    else if (k === "--voice") a.voice = next();
    else if (k === "--ratio") a.ratio = next();
    else if (k === "--res") a.res = next();
    else if (k === "--locale") a.locale = next();
    else if (k === "--engine") a.engine = next();
    else if (k === "--slug") a.slug = next();
    else if (k === "--title") a.title = next();
    else if (k === "--out-dir") a.outDir = next();
    else if (k === "--no-send") a.send = false;
    else if (k === "--send") a.send = true;
    else if (k === "--dry-run") a.dryRun = true;
  }
  return a;
}

function cmdLooks() {
  const cfg = loadLooks();
  if (!cfg) { console.error("✗ looks.json não encontrado em", LOOKS_PATH); process.exit(1); }
  const e = Object.entries(cfg.looks || {});
  console.log(`${e.length} looks do Nei (default: ${cfg.default}):\n`);
  for (const [slug, l] of e) {
    const tag = slug === cfg.default ? " ← default" : "";
    console.log(`  ${slug.padEnd(18)} ${l.desc.padEnd(28)} [${l.type}, ${l.orient}]${tag}`);
  }
  console.log(`\nUso: --look <slug>   ·   IDs ficam em ${LOOKS_PATH} (privado, fora do git)`);
}

async function cmdVoices(env, argv) {
  const raw = (argVal(argv, "--lang") || "").toLowerCase();
  // HeyGen usa o nome do idioma por extenso ("Portuguese"), não código "pt".
  const ALIAS = { pt: "portug", "pt-br": "portug", portugues: "portug", en: "english", es: "spanish", espanol: "spanish" };
  const lang = ALIAS[raw] || raw;
  const r = await api(env, "/v2/voices");
  const list = r.b?.data?.voices || [];
  const filt = lang ? list.filter((v) => (v.language || "").toLowerCase().includes(lang)) : list;
  console.log(`${filt.length} vozes${lang ? ` (lang~"${lang}")` : ""}:`);
  for (const v of filt.slice(0, 60)) console.log(`  ${v.voice_id}  ${v.name}  [${v.language}/${v.gender}]`);
  if (filt.length > 60) console.log(`  ... +${filt.length - 60}`);
}

async function cmdAvatars(env) {
  const r = await api(env, "/v2/avatar_group.list");
  const raw = r.b?.data;
  const arr = Array.isArray(raw) ? raw : (raw?.avatar_group_list || raw?.avatar_groups || []);
  console.log(`${arr.length} grupos de avatar (seus):`);
  for (const g of arr) console.log(`  ${g.id || g.group_id}  ${g.name || g.group_name}  [${g.group_type || g.type || ""}]`);
}

async function generate(env, a) {
  const avatar = a.avatar || env.HEYGEN_AVATAR_ID_NEI;
  const voice = a.voice || a.lookVoice || env.HEYGEN_VOICE_ID_NEI;
  if (!avatar || !voice) { console.error("✗ avatar/voice não definidos (passe --avatar/--voice ou configure no .env)"); process.exit(1); }
  if (!a.text && !a.dryRun) { console.error("✗ faltou --text (a fala do avatar)"); process.exit(1); }

  const q0 = await api(env, "/v2/user/remaining_quota");
  if (q0.status !== 200) { console.error("✗ key inválida? quota http", q0.status, JSON.stringify(q0.b)); process.exit(1); }
  const before = q0.b.data;
  console.log("✓ key OK · créditos de API disponíveis:", before.details?.api);

  const look = await api(env, `/v3/avatars/looks/${avatar}`);
  const engines = look.b?.data?.supported_api_engines || [];
  if (engines.length && !engines.includes(a.engine)) {
    console.error(`✗ engine "${a.engine}" não é suportada por este avatar. Disponíveis: ${engines.join(", ")}`);
    process.exit(1);
  }

  if (a.dryRun) {
    const vo = await api(env, "/v2/voices");
    const vhit = (vo.b?.data?.voices || []).find((x) => x.voice_id === voice);
    console.log("DRY-RUN (nada gerado, custo 0):");
    console.log("  avatar", avatar, "->", look.status === 200 ? `OK (${look.b?.data?.avatar_type})` : `http ${look.status}`);
    console.log("  voice ", voice, "->", vhit ? `OK ${vhit.name} [${vhit.language}/${vhit.gender}]` : "NÃO encontrado");
    console.log("  engine", a.engine, "->", engines.length ? `OK (aceita: ${engines.join(", ")})` : "não verificável");
    console.log("  config:", `ratio=${a.ratio} res=${a.res} locale=${a.locale} send=${a.send}`);
    return;
  }

  const slug = a.slug || slugify(a.text);
  const outDir = path.join(a.outDir || path.join(os.homedir(), "projetos/output/heygen"), slug);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "roteiro.txt"), a.text);

  const body = {
    type: "avatar", avatar_id: avatar, voice_id: voice, script: a.text,
    aspect_ratio: a.ratio, resolution: a.res,
    voice_settings: { locale: a.locale },
    engine: { type: a.engine },
    title: a.title || `INEMA ${slug}`,
  };
  const cr = await api(env, "/v3/videos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const vid = cr.b?.data?.video_id;
  if (!vid) { console.error("✗ falha ao criar vídeo. http", cr.status, JSON.stringify(cr.b)); process.exit(1); }
  console.log("✓ render iniciado · video_id", vid);

  let url = null, last = null;
  for (let i = 0; i < 75; i++) {
    const r = await api(env, `/v3/videos/${vid}`);
    const d = r.b?.data || {}; last = d.status;
    if (d.status === "completed") { url = d.video_url; break; }
    if (d.status === "failed") { console.error("✗ render FAILED:", JSON.stringify(d.error || d.failure_message || d)); process.exit(1); }
    if (i % 3 === 0) console.log(`  ...${i * 8}s status=${d.status || "?"}`);
    await sleep(8000);
  }
  if (!url) { console.error("✗ timeout no polling (último status:", last, ") · video_id:", vid); process.exit(1); }

  const resp = await fetch(url);
  const buf = Buffer.from(await resp.arrayBuffer());
  const outFile = path.join(outDir, `${slug}.mp4`);
  fs.writeFileSync(outFile, buf);
  const mb = (buf.length / 1048576).toFixed(2);
  console.log("✓ baixado:", outFile, mb, "MB");

  const q1 = await api(env, "/v2/user/remaining_quota");
  const after = q1.b?.data;
  const cost = (before.details?.api ?? 0) - (after?.details?.api ?? 0);
  console.log("✓ custo:", cost, "créditos de API · restam", after?.details?.api);

  let tgMsg = "(envio desativado)";
  if (a.send && env.TELEGRAM_BOT_TOKEN && env.ALLOWED_CHAT_ID) {
    const caption =
`🎬 ${a.title || slug} — avatar HeyGen
${a.ratio} · ${a.res} · voz ${a.locale}

Como foi feito:
• avatar ${avatar.slice(0, 8)}… (${a.engine}) + voz ${voice.slice(0, 8)}…
• HeyGen API v3 → render → MP4 ${mb} MB
• Custo: ${cost} créditos de API (restam ${after?.details?.api})

Fala: "${a.text.slice(0, 380)}"`;
    const fd = new FormData();
    fd.append("chat_id", env.ALLOWED_CHAT_ID);
    fd.append("caption", caption);
    fd.append("supports_streaming", "true");
    fd.append("video", new Blob([buf], { type: "video/mp4" }), `${slug}.mp4`);
    const tr = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendVideo`, { method: "POST", body: fd });
    const tb = await tr.json();
    tgMsg = tb.ok ? `enviado ao bot (msg ${tb.result?.message_id})` : `falhou: ${JSON.stringify(tb).slice(0, 200)}`;
  }
  console.log("✓ telegram:", tgMsg);

  fs.writeFileSync(path.join(outDir, "resultado.json"), JSON.stringify(
    { video_id: vid, file: outFile, sizeMB: mb, cost_api_credits: cost, quota_after: after?.details?.api, ratio: a.ratio, res: a.res, locale: a.locale }, null, 2));
  console.log("\nresumo:", path.join(outDir, "resultado.json"));
}

(async () => {
  const argv = process.argv;
  const sub = argv[2];
  if (sub === "--help" || sub === "-h" || !sub) { console.log(HELP); return; }
  const env = parseEnv(ENV_PATH);
  if (!env.HEYGEN_API_KEY) { console.error("✗ HEYGEN_API_KEY não encontrada em", ENV_PATH); process.exit(1); }

  if (sub === "voices") return cmdVoices(env, argv);
  if (sub === "avatars") return cmdAvatars(env);
  if (sub === "looks") return cmdLooks();
  return generate(env, parseArgs(argv));
})().catch((e) => { console.error("ERR", e?.message || e); process.exit(1); });
