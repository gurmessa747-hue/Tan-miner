const crypto = require("crypto");

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Telegram-Init-Data");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
}

function parseInitData(raw) {
  const params = new URLSearchParams(raw || "");
  const hash = params.get("hash") || "";
  params.delete("hash");
  const dataCheck = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join("\n");
  const secret = crypto
    .createHmac("sha256", "WebAppData")
    .update(process.env.BOT_TOKEN || "")
    .digest();
  const calc = crypto.createHmac("sha256", secret).update(dataCheck).digest("hex");
  if (!hash || calc !== hash) return null;
  let user = null;
  try { user = params.get("user") ? JSON.parse(params.get("user")) : null; } catch (e) {}
  return { user, startParam: params.get("start_param") || "" };
}

function kv() {
  global.__TAN = global.__TAN || { refs: {}, users: {}, board: {}, wd: [] };
  return global.__TAN;
}

module.exports = { cors, parseInitData, kv };
