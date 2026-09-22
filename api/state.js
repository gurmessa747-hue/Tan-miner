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

    global.__TAN_STATE = global.__TAN_STATE || {};
    global.__TAN_STATE_HITS = global.__TAN_STATE_HITS || {};

    function readBody(req) {
      let body = req.body;
      if (typeof body === "string") {
        try { body = JSON.parse(body || "{}"); } catch (e) { body = {}; }
      }
      return body && typeof body === "object" ? body : {};
    }

    function getUserId(req, body) {
      const q = (req.query && (req.query.userId || req.query.id)) || "";
      return String((body && body.userId) || q || "").trim();
    }

    if (req.method === "GET") {
      const userId = getUserId(req, {});
      if (!userId) {
        res.status(200).json({ ok: false, state: null });
        return;
      }
      res.status(200).json({ ok: true, state: global.__TAN_STATE[userId] || null });
      return;
    }

    if (req.method !== "POST") {
      res.status(200).json({ ok: false });
      return;
    }

    const body = readBody(req);
    const userId = getUserId(req, body);
    if (!userId) {
      res.status(200).json({ ok: false });
      return;
    }

    const incoming = body.state && typeof body.state === "object" ? body.state : body;
    const now = Date.now();
    const prevHit = global.__TAN_STATE_HITS[userId] || 0;
    const current = global.__TAN_STATE[userId] || null;

    const incomingSeq = Number(incoming.claimSeq) || 0;
    const currentSeq = Number(current && current.claimSeq) || 0;
    const incomingTs = Number(incoming.updatedAt) || 0;
    const currentTs = Number(current && current.updatedAt) || 0;

    const newer = !current || incomingSeq > currentSeq || (incomingSeq === currentSeq && incomingTs >= currentTs);

    if (!newer) {
      res.status(200).json({ ok: true, unchanged: true, state: current });
      return;
    }

    if (now - prevHit < 3000 && incomingSeq <= currentSeq) {
      res.status(200).json({ ok: true, throttled: true, state: current || incoming });
      return;
    }

    global.__TAN_STATE_HITS[userId] = now;
    global.__TAN_STATE[userId] = incoming;
    res.status(200).json({ ok: true, state: incoming });
  } catch (err) {
    res.status(200).json({ ok: false, error: String(err && err.message ? err.message : err) });
  }
};
