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

    function listFor(id) {
      return global.__TAN_REFS[String(id)] || [];
    }

    if (req.method === "GET") {
      const id = String((req.query && req.query.referrerId) || "");
      res.status(200).json({ list: listFor(id) });
      return;
    }

    let body = req.body;
    if (typeof body === "string") {
      try { body = JSON.parse(body || "{}"); } catch (e) { body = {}; }
    }
    if (!body || typeof body !== "object") body = {};

    const referrerId = String(body.referrerId || "");
    const userId = String(body.userId || "");
    const wallet = String(body.wallet || "");
    const qualified = !!(body.qualified || wallet);
    const username = String(body.username || "");

    if (!referrerId || !userId || referrerId === userId) {
      res.status(200).json({ ok: false, list: listFor(referrerId) });
      return;
    }

    const list = listFor(referrerId);
    const idx = list.findIndex((x) => String(x.id) === userId);

    if (idx < 0) {
      list.push({
        id: userId,
        at: Date.now(),
        reward: 100,
        qualified: qualified,
        wallet: wallet,
        qualifiedAt: qualified ? Date.now() : null,
        username: username
      });
    } else {
      list[idx] = Object.assign({}, list[idx], {
        qualified: !!(list[idx].qualified || qualified),
        wallet: wallet || list[idx].wallet || "",
        qualifiedAt: (list[idx].qualified || qualified)
          ? (list[idx].qualifiedAt || Date.now())
          : null,
        username: username || list[idx].username || ""
      });
    }

    global.__TAN_REFS[referrerId] = list;
    res.status(200).json({ ok: true, list: list });
  } catch (err) {
    res.status(200).json({ ok: false, error: String(err && err.message ? err.message : err) });
  }
};
