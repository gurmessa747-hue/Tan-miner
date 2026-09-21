module.exports = async (req, res) => {
  try {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Telegram-Init-Data");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Cache-Control", "no-store");

    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }

    global.__TAN_REFS = global.__TAN_REFS || {};
    global.__TAN_REF_HITS = global.__TAN_REF_HITS || {};

    function listFor(id) {
      const key = String(id || "");
      if (!key) return [];
      return global.__TAN_REFS[key] || [];
    }

    function tooMany(key) {
      const now = Date.now();
      const prev = global.__TAN_REF_HITS[key] || 0;
      if (now - prev < 8000) return true; // 1 write / 8s per pair
      global.__TAN_REF_HITS[key] = now;
      return false;
    }

    if (req.method === "GET") {
      const id = String((req.query && req.query.referrerId) || "");
      if (!id) {
        res.status(400).json({ list: [] });
        return;
      }
      res.status(200).json({ list: listFor(id) });
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({ ok: false, list: [] });
      return;
    }

    let body = req.body;
    if (typeof body === "string") {
      try { body = JSON.parse(body || "{}"); } catch (e) { body = {}; }
    }
    if (!body || typeof body !== "object") body = {};

    const referrerId = String(body.referrerId || "").trim();
    const userId = String(body.userId || "").trim();
    const wallet = String(body.wallet || "").trim();
    const qualified = !!(body.qualified || wallet);
    const username = String(body.username || "").trim();

    if (!referrerId || !userId || referrerId === userId) {
      res.status(400).json({ ok: false, list: listFor(referrerId) });
      return;
    }

    const list = listFor(referrerId).slice();
    const idx = list.findIndex((x) => String(x.id) === userId);

    if (idx >= 0) {
      const cur = list[idx];
      const same =
        !!cur.qualified === !!qualified &&
        String(cur.wallet || "") === wallet &&
        String(cur.username || "") === (username || String(cur.username || ""));

      if (same || (!qualified && !wallet && !username)) {
        res.status(200).json({ ok: true, unchanged: true, list: listFor(referrerId) });
        return;
      }
    }

    if (tooMany(referrerId + ":" + userId)) {
      res.status(200).json({ ok: true, throttled: true, list: listFor(referrerId) });
      return;
    }

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
