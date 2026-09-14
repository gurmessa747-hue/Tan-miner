import crypto from "crypto";

const CHANNEL = "@Tanolaminer";
const GROUP = "@Tanminercommunity";
const MAX_AGE_SEC = 24 * 60 * 60;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Telegram-Init-Data");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ joined: false, error: "POST only" });
  }

  const token = process.env.BOT_TOKEN;
  if (!token) {
    return res.status(500).json({ joined: false, error: "BOT_TOKEN missing" });
  }

  const body = typeof req.body === "string" ? safeJson(req.body) : (req.body || {});
  const initData = String(
    body.initData ||
    req.headers["x-telegram-init-data"] ||
    ""
  ).trim();

  const checked = verifyInitData(initData, token);
  if (!checked.ok) {
    return res.status(200).json({ joined: false, error: checked.error || "bad initData" });
  }

  const kind = body.kind === "group" ? "group" : "channel";
  const chat = kind === "group" ? GROUP : CHANNEL;
  const userId = checked.user.id;

  try {
    const tg = await fetch(`https://api.telegram.org/bot${token}/getChatMember`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chat, user_id: userId })
    });
    const data = await tg.json();
    const status = data && data.result && data.result.status;
    const joined = ["creator", "administrator", "member"].includes(status);

    return res.status(200).json({
      ok: true,
      joined,
      kind,
      status: status || (data && data.description) || "left"
    });
  } catch (e) {
    return res.status(200).json({ joined: false, error: "telegram request failed" });
  }
}

function safeJson(s) {
  try { return JSON.parse(s); } catch (e) { return {}; }
}

function verifyInitData(initData, botToken) {
  if (!initData) return { ok: false, error: "no initData" };

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return { ok: false, error: "no hash" };

  const pairs = [];
  params.forEach((value, key) => {
    if (key !== "hash") pairs.push(key + "=" + value);
  });
  pairs.sort();
  const dataCheckString = pairs.join("\n");

  const secret = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  const computed = crypto
    .createHmac("sha256", secret)
    .update(dataCheckString)
    .digest("hex");

  const a = Buffer.from(computed, "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, error: "bad signature" };
  }

  const authDate = Number(params.get("auth_date") || 0);
  if (!authDate || Math.abs(Date.now() / 1000 - authDate) > MAX_AGE_SEC) {
    return { ok: false, error: "initData expired" };
  }

  let user = {};
  try { user = JSON.parse(params.get("user") || "{}"); } catch (e) {}
  if (!user.id) return { ok: false, error: "no user" };

  return { ok: true, user };
}
