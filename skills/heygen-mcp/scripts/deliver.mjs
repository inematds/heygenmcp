#!/usr/bin/env node
// heygen-mcp/deliver.mjs — entrega no Telegram um vídeo já gerado via MCP do HeyGen.
// Baixa de uma URL (ou usa arquivo local), salva em <out_dir>/<slug>/ e manda no bot.
// Zero dependências (Node 18+ / Bun).
//
//   node deliver.mjs --url "<mp4 url>" --slug nome --caption "texto"
//   node deliver.mjs --file /caminho/video.mp4 --slug nome --caption "texto" [--no-send]

import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// Mesmo config privado do heygen-cli: caminhos e nomes de env var, nunca segredos.
const CONFIG_PATH = process.env.HEYGEN_LOOKS_PATH || path.join(os.homedir(), ".config/heygen/looks.json");
let CFG = {};
try { CFG = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8")); } catch { /* config opcional aqui */ }

const ENV_NAMES = { tg_token: "TELEGRAM_BOT_TOKEN", tg_chat: "TELEGRAM_CHAT_ID", ...(CFG.env_names || {}) };
const ENV_PATH = process.env.HEYGEN_ENV_PATH || CFG.env_path || path.join(os.homedir(), ".config/heygen/.env");
const OUT_BASE = process.env.HEYGEN_OUT_DIR || CFG.out_dir || path.join(os.homedir(), "heygen-output");

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
  } catch { /* ignore */ }
  return out;
}

function arg(flag, def) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : def;
}
const has = (flag) => process.argv.includes(flag);

function slugify(s) {
  return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "video";
}

(async () => {
  const url = arg("--url");
  const file = arg("--file");
  const slug = slugify(arg("--slug") || "mcp-video");
  const caption = (arg("--caption") || "🎬 vídeo HeyGen (via assinatura)").replace(/\\n/g, "\n");
  const send = !has("--no-send");
  if (!url && !file) { console.error("✗ passe --url <mp4> ou --file <caminho>"); process.exit(1); }

  const outDir = path.join(process.env.HEYGEN_OUT_DIR || OUT_BASE, slug);
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${slug}.mp4`);

  let buf;
  if (file) {
    buf = fs.readFileSync(file);
    if (path.resolve(file) !== path.resolve(outFile)) fs.writeFileSync(outFile, buf);
  } else {
    const r = await fetch(url);
    if (!r.ok) { console.error("✗ download falhou http", r.status); process.exit(1); }
    buf = Buffer.from(await r.arrayBuffer());
    fs.writeFileSync(outFile, buf);
  }
  const mb = (buf.length / 1048576).toFixed(2);
  console.log("✓ salvo:", outFile, mb, "MB");

  if (!send) { console.log("✓ envio desativado (--no-send)"); return; }

  const env = parseEnv(ENV_PATH);
  const tgToken = env[ENV_NAMES.tg_token], tgChat = env[ENV_NAMES.tg_chat];
  if (!tgToken || !tgChat) {
    console.error(`✗ ${ENV_NAMES.tg_token}/${ENV_NAMES.tg_chat} ausentes em ${ENV_PATH} — vídeo salvo local, envio pulado`);
    process.exit(1);
  }
  const fd = new FormData();
  fd.append("chat_id", tgChat);
  fd.append("caption", caption.slice(0, 1024));
  fd.append("supports_streaming", "true");
  fd.append("video", new Blob([buf], { type: "video/mp4" }), `${slug}.mp4`);
  const tr = await fetch(`https://api.telegram.org/bot${tgToken}/sendVideo`, { method: "POST", body: fd });
  const tb = await tr.json();
  console.log("✓ telegram:", tb.ok ? `enviado (msg ${tb.result?.message_id})` : `falhou: ${JSON.stringify(tb).slice(0, 200)}`);
})().catch((e) => { console.error("ERR", e?.message || e); process.exit(1); });
