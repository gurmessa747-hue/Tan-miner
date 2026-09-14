const { cors, parseInitData, kv } = require("./_lib");

module.exports = async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  const db = kv();

  if (req.method === "GET") {
    const id = String(req.query.referrerId || "");
    return res.json({ list: db.refs[id] || [] });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body || "{}"); } catch (e) { body = {}; }
  }
  body = body || {};

  const init = parseInitData(req.headers["x-telegram-init-data"] || body.initData || "");
  const referrerId = String(body.referrerId || "");
  const userId = String((init && init.user && init.user.id) || body.userId || "");

  if (!referrerId || !userId || referrerId === userId) {
    return res.json({ ok: false, list: db.refs[referrerId] || [] });
  }

  db.refs[referrerId] = db.refs[referrerId] || [];
  if (!db.refs[referrerId].some((x) => String(x.id) === userId)) {
    db.refs[referrerId].push({
      id: userId,
      at: Date.now(),
      reward: 100
    });
  }

  res.json({ ok: true, list: db.refs[referrerId] });
};
