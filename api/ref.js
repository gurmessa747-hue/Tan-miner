module.exports = async (req, res) => {
  try {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Telegram-Init-Data");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");

    if (req.method === "OPTIONS") {
      res.status(200).end();
      return;
    }

    global.__TAN_REFS = global.__TAN_REFS || {};

    if (req.method === "GET") {
      const id = String((req.query && req.query.referrerId) || "");
      res.status(200).json({ list: global.__TAN_REFS[id] || [] });
      return;
    }

    let body = req.body;
    if (typeof body === "string") {
      try { body = JSON.parse(body || "{}"); } catch (e) { body = {}; }
    }
    if (!body || typeof body !== "object") body = {};

    const referrerId = String(body.referrerId || "");
    const userId = String(body.userId || "");

    if (!referrerId || !userId || referrerId === userId) {
      res.status(200).json({ ok: false, list: global.__TAN_REFS[referrerId] || [] });
      return;
    }

    const list = global.__TAN_REFS[referrerId] || [];
    if (!list.some((x) => String(x.id) === userId)) {
      list.push({ id: userId, at: Date.now(), reward: 100 });
      global.__TAN_REFS[referrerId] = list;
    }

    res.status(200).json({ ok: true, list: global.__TAN_REFS[referrerId] });
  } catch (err) {
    res.status(200).json({ ok: false, error: String(err && err.message ? err.message : err) });
  }
};
