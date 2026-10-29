const express = require("express"), cors = require("cors"), path = require("path"), crypto = require("crypto");
const admin = require("firebase-admin"), { pool, init } = require("./db"), E = require("./engine");
admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID || "swiftchain-827f2" });
const ADMINS = (process.env.ADMIN_EMAILS || "").toLowerCase().split(",").map((s) => s.trim()).filter(Boolean);
const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : true }));
try { app.use(require("compression")()); } catch (e) { /* optional */ }
app.use(express.json({ limit: "3mb" }));

const bad = (m, c) => { const e = new Error(m); e.http = c || 400; return e; };
const wrap = (fn) => (req, res) => fn(req, res).catch((e) => { if (e.http) return res.status(e.http).json({ error: e.message }); console.error(e); res.status(500).json({ error: "Server error" }); });
async function auth(req, res, next) {
  try {
    const h = req.headers.authorization || "", t = h.startsWith("Bearer ") ? h.slice(7) : null;
    if (!t) return res.status(401).json({ error: "Not signed in" });
    const d = await admin.auth().verifyIdToken(t);
    if (!d.email_verified) return res.status(403).json({ error: "Verify your email first" });
    req.u = { uid: d.uid, email: (d.email || "").toLowerCase(), name: d.name || d.email || "User" };
    req.u.isAdmin = ADMINS.includes(req.u.email); next();
  } catch (e) { res.status(401).json({ error: "Invalid session" }); }
}
const adminOnly = (req, res, next) => (req.u.isAdmin ? next() : res.status(403).json({ error: "Admins only" }));
async function tx(u, fn) {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await c.query("INSERT INTO users(uid,email,name) VALUES($1,$2,$3) ON CONFLICT (uid) DO UPDATE SET email=EXCLUDED.email, name=EXCLUDED.name", [u.uid, u.email, u.name]);
    const ur = (await c.query("SELECT * FROM users WHERE uid=$1 FOR UPDATE", [u.uid])).rows[0];
    const out = await fn(c, ur); await c.query("COMMIT"); return out;
  } catch (e) { await c.query("ROLLBACK"); throw e; } finally { c.release(); }
}
const r2 = (n) => Math.round(n * 100) / 100, num = (x) => (x == null ? null : Number(x));
const rowToJS = (r) => !r ? E.newJS() : { appliedAt: num(r.applied_at), dayIdx: r.day_idx, baseDay: r.base_day || 0, done: r.done || {}, stage: r.stage || {}, credited: r.credited || {}, active: r.active, activeAt: num(r.active_at), stageAt: num(r.stage_at), lastActive: num(r.last_active), daysCompleted: r.days_completed, paid: Number(r.paid), history: r.history || [], ver: r.ver || 0 };
const saveJS = (c, uid, id, s) => c.query(`INSERT INTO job_state(uid,job_id,applied_at,day_idx,done,stage,active,active_at,stage_at,days_completed,paid,history,last_active,base_day,credited,ver)
  VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
  ON CONFLICT (uid,job_id) DO UPDATE SET applied_at=EXCLUDED.applied_at, day_idx=EXCLUDED.day_idx, done=EXCLUDED.done, stage=EXCLUDED.stage, active=EXCLUDED.active, active_at=EXCLUDED.active_at, stage_at=EXCLUDED.stage_at,
  days_completed=EXCLUDED.days_completed, paid=EXCLUDED.paid, history=EXCLUDED.history, last_active=EXCLUDED.last_active, base_day=EXCLUDED.base_day, credited=EXCLUDED.credited, ver=EXCLUDED.ver`,
  [uid, id, s.appliedAt, s.dayIdx, JSON.stringify(s.done), JSON.stringify(s.stage), s.active, s.activeAt, s.stageAt, s.daysCompleted, s.paid, JSON.stringify(s.history), s.lastActive, s.baseDay, JSON.stringify(s.credited), 2]);
/* loads a job's state, brings it up to date (new day, deactivation after 7 idle days) and saves if it changed */
async function loadJS(c, uid, job, now) {
  const row = (await c.query("SELECT * FROM job_state WHERE uid=$1 AND job_id=$2", [uid, job.id])).rows[0], s = rowToJS(row), was = s.appliedAt != null;
  const ch = E.normalize(job, uid, s, now); if (ch || (row && row.ver !== 2)) await saveJS(c, uid, job.id, s);
  s.wasDeactivated = was && s.appliedAt == null; return s;
}
const pubJS = (s) => ({ applied: s.appliedAt != null, appliedAt: s.appliedAt, dayIdx: s.dayIdx, done: s.done, stage: s.stage, active: s.active, daysCompleted: s.daysCompleted, pending: 0, paid: s.paid, history: s.history.slice(0, 50) });
const slim = (q, s) => ({ count: q.count, total: q.total, tasks: q.tasks.map((t) => (t.k === s.active ? t : { k: t.k, d: t.d, title: t.title, pay: t.pay })) });
const DAYMS = E.DAY, utcDay = (ms) => new Date(ms).toISOString().slice(0, 10);
/* Withdrawal rules: every completed block of 7 WORKED days unlocks the earnings made up to the 7th day of that block.
   Unlocked earnings stay withdrawable at any time and add up, while the next block keeps counting. */
async function metaFor(c, uid) {
  const now = Date.now();
  const u = (await c.query("SELECT total_earned, plan, kyc FROM users WHERE uid=$1", [uid])).rows[0];
  const W = (await c.query("SELECT COUNT(*)::int AS n FROM work_days WHERE uid=$1", [uid])).rows[0].n, blocks = Math.floor(W / 7);
  let unlocked = 0;
  if (blocks > 0) {
    const d = (await c.query("SELECT to_char(day,'YYYY-MM-DD') AS d FROM work_days WHERE uid=$1 ORDER BY day OFFSET $2 LIMIT 1", [uid, blocks * 7 - 1])).rows[0];
    const until = Date.parse(d.d + "T00:00:00Z") + DAYMS;
    unlocked = Number((await c.query("SELECT COALESCE(SUM(amount),0) AS s FROM transactions WHERE uid=$1 AND type='earning' AND ts < $2", [uid, until])).rows[0].s);
  }
  const withdrawn = Number((await c.query("SELECT COALESCE(SUM(-amount),0) AS s FROM transactions WHERE uid=$1 AND type='withdrawal'", [uid])).rows[0].s);
  const pend = Number((await c.query("SELECT COALESCE(SUM((data->>'amount')::numeric),0) AS s FROM requests WHERE uid=$1 AND type='withdrawal' AND status='pending'", [uid])).rows[0].s);
  const today = (await c.query("SELECT 1 FROM work_days WHERE uid=$1 AND day=$2::date", [uid, utcDay(now)])).rows.length > 0;
  const hasJob = (await c.query("SELECT 1 FROM job_state WHERE uid=$1 AND applied_at IS NOT NULL LIMIT 1", [uid])).rows.length > 0;
  const mo = Number((await c.query("SELECT COALESCE(SUM(amount),0) AS s FROM transactions WHERE uid=$1 AND type='earning' AND ts>=$2", [uid, Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)])).rows[0].s);
  const total = Number(u.total_earned), open = blocks > 0, remaining = 7 - (W % 7);
  const unlockAt = open ? 1 : (W > 0 || hasJob ? now + Math.max(1, remaining - (today ? 1 : 0)) * DAYMS : null); // estimate while locked
  return { totalEarned: total, plan: u.plan, kyc: u.kyc, available: Math.max(0, r2(unlocked - withdrawn - pend)), open, workedDays: W, daysToUnlock: remaining, unlockAt, month: mo, now };
}
const reqPub = (r) => ({ id: r.id, type: r.type, status: r.status, adminMessage: r.admin_message, receipt: r.receipt, ts: Number(r.ts), data: r.type === "kyc" ? { fullName: r.data.fullName, docType: r.data.docType } : r.data });
async function fullState(c, uid, ur) {
  const now = Date.now(), jobs = {}, batches = {};
  for (const j of E.J) { const s = await loadJS(c, uid, j, now); jobs[j.id] = pubJS(s); if (s.appliedAt != null) batches[j.id] = slim(E.queue(j, uid, s), s); }
  const meta = await metaFor(c, uid);
  meta.tx = (await c.query("SELECT * FROM transactions WHERE uid=$1 ORDER BY ts DESC LIMIT 300", [uid])).rows.map((t) => ({ id: t.id, type: t.type, desc: t.descr, amount: Number(t.amount), status: t.status, ts: Number(t.ts), dest: t.dest, method: t.method, account: t.account }));
  const requests = (await c.query("SELECT * FROM requests WHERE uid=$1 ORDER BY ts DESC LIMIT 100", [uid])).rows.map(reqPub);
  return { jobs, batches, meta, requests, isAdmin: !!ur && ADMINS.includes((ur.email || "").toLowerCase()) };
}
const jobOr400 = (id) => E.J.find((j) => j.id === id) || (() => { throw bad("Unknown job"); })();
const newId = (p) => p + Date.now().toString(36).toUpperCase() + crypto.randomBytes(2).toString("hex").toUpperCase();
const GONE = "Your workspace for this job was deactivated after 7 days without activity. Your earnings are safe — apply again to continue.";

app.get("/api/health", (q, s) => s.json({ ok: true }));
app.get("/api/state", auth, wrap(async (req, res) => res.json(await tx(req.u, (c, ur) => fullState(c, req.u.uid, ur)))));

app.post("/api/apply", auth, wrap(async (req, res) => {
  const job = jobOr400(req.body.jobId), uid = req.u.uid;
  res.json(await tx(req.u, async (c) => {
    const now = Date.now(), s = await loadJS(c, uid, job, now); if (s.appliedAt != null) throw bad("Already applied");
    Object.assign(s, { appliedAt: now, dayIdx: -1, baseDay: 0, done: {}, stage: {}, credited: {}, active: null, activeAt: null, stageAt: null, lastActive: now });
    E.normalize(job, uid, s, now); await saveJS(c, uid, job.id, s);
    return { job: pubJS(s), batch: slim(E.queue(job, uid, s), s), meta: await metaFor(c, uid) };
  }));
}));
app.post("/api/activate", auth, wrap(async (req, res) => {
  const job = jobOr400(req.body.jobId), k = req.body.i, uid = req.u.uid;
  res.json(await tx(req.u, async (c) => {
    const now = Date.now(), s = await loadJS(c, uid, job, now); if (s.appliedAt == null) throw bad(s.wasDeactivated ? GONE : "Apply first");
    if (!E.validKey(job, uid, s, k)) throw bad("That task is no longer available");
    if (s.done[k]) throw bad("Task already done"); if (s.active != null) throw bad("Finish your active task first");
    s.active = k; s.activeAt = now; s.lastActive = now; await saveJS(c, uid, job.id, s);
    const t = E.queue(job, uid, s).tasks.find((x) => x.k === k); return { job: pubJS(s), key: k, text: t.text };
  }));
}));
app.post("/api/generate", auth, wrap(async (req, res) => {
  const job = jobOr400(req.body.jobId), k = req.body.i, uid = req.u.uid; if (!job.video) throw bad("Not a video job");
  res.json(await tx(req.u, async (c) => {
    const now = Date.now(), s = await loadJS(c, uid, job, now); if (s.appliedAt == null) throw bad(s.wasDeactivated ? GONE : "Apply first");
    if (s.active !== k) throw bad("Activate this task first"); if (now - s.activeAt < 3000) throw bad("Generation still running", 429);
    s.stage[k] = "generated"; s.stageAt = now; s.lastActive = now; await saveJS(c, uid, job.id, s); return { job: pubJS(s) };
  }));
}));
app.post("/api/complete", auth, wrap(async (req, res) => {
  const job = jobOr400(req.body.jobId), k = req.body.i, uid = req.u.uid;
  res.json(await tx(req.u, async (c) => {
    const now = Date.now(), s = await loadJS(c, uid, job, now); if (s.appliedAt == null) throw bad(s.wasDeactivated ? GONE : "Apply first");
    if (!E.validKey(job, uid, s, k)) throw bad("That task is no longer available");
    if (s.done[k]) throw bad("Already done"); if (s.active !== k) throw bad("Activate this task first");
    if (job.video) { if (s.stage[k] !== "generated") throw bad("Generate the video first"); if (now - s.stageAt < 2500) throw bad("Promotion still running", 429); }
    else if (now - s.activeAt < 2500) throw bad("Promotion still running", 429);
    const before = s.baseDay + ":" + s.dayIdx, credits = E.finishTask(job, uid, s, k); let credited = 0;
    for (const cr of credits) {
      const amt = r2(cr.amount); credited += amt; s.paid = r2(s.paid + amt);
      await c.query("UPDATE users SET total_earned = total_earned + $1 WHERE uid=$2", [amt, uid]);
      await c.query("INSERT INTO transactions(id,uid,type,descr,amount,status,ts) VALUES($1,$2,'earning',$3,$4,'Credited',$5)", [newId("TX-"), uid, job.title + " — " + cr.desc, amt, now]);
      s.history.unshift({ date: new Date(now).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }), amount: amt }); s.history = s.history.slice(0, 200);
    }
    await c.query("INSERT INTO work_days(uid, day) VALUES($1, $2::date) ON CONFLICT DO NOTHING", [uid, utcDay(now)]);
    s.lastActive = now; E.normalize(job, uid, s, now); await saveJS(c, uid, job.id, s);
    const out = { job: pubJS(s), credited: r2(credited), meta: await metaFor(c, uid) };
    if (before !== s.baseDay + ":" + s.dayIdx) out.batch = slim(E.queue(job, uid, s), s);
    return out;
  }));
}));

const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max || 200) : "");
app.post("/api/withdraw", auth, wrap(async (req, res) => {
  const b = req.body || {}, amount = r2(Number(b.amount)), uid = req.u.uid;
  const data = { method: b.method === "bank" ? "bank" : "crypto", amount };
  if (data.method === "crypto") { data.coin = str(b.coin, 40); data.wallet = str(b.wallet, 200); if (!data.coin || data.wallet.length < 20) throw bad("Enter a valid coin and wallet address."); }
  else { ["bankName", "accountName", "accountNumber", "swift", "country"].forEach((k) => (data[k] = str(b[k], 100))); if (!data.bankName || !data.accountName || data.accountNumber.length < 6 || data.swift.length < 6 || !data.country) throw bad("Please complete all bank details."); }
  if (!(amount > 0)) throw bad("Enter an amount.");
  await tx(req.u, async (c, ur) => {
    const m = await metaFor(c, uid);
    if (!m.open) throw bad("Withdrawals unlock after you complete 7 days of work (" + m.workedDays + " of 7 so far).");
    if (amount > m.available + 1e-6) throw bad("Amount exceeds your available balance.");
    await c.query("INSERT INTO requests(id,uid,user_name,type,data,ts) VALUES($1,$2,$3,'withdrawal',$4,$5)", [newId("RQ-"), uid, req.u.name, JSON.stringify(data), Date.now()]);
  });
  res.json({ ok: true });
}));
const okImg = (v) => typeof v === "string" && /^data:image\/(jpeg|png|webp);base64,/.test(v) && v.length < 600000;
app.post("/api/kyc", auth, wrap(async (req, res) => {
  const b = req.body || {}, name = str(b.fullName, 100); if (name.length < 3) throw bad("Enter your full name.");
  if (!okImg(b.selfie) || !okImg(b.idFront) || !okImg(b.idBack)) throw bad("Please add your selfie, ID front and ID back (smaller images).");
  await tx(req.u, async (c) => {
    const l = (await c.query("SELECT status FROM requests WHERE uid=$1 AND type='kyc' ORDER BY ts DESC LIMIT 1", [req.u.uid])).rows[0];
    if (l && (l.status === "pending" || l.status === "approved")) throw bad("You already have a KYC request " + l.status + ".");
    await c.query("INSERT INTO requests(id,uid,user_name,type,data,ts) VALUES($1,$2,$3,'kyc',$4,$5)", [newId("RQ-"), req.u.uid, req.u.name, JSON.stringify({ fullName: name, docType: str(b.docType, 40), selfie: b.selfie, idFront: b.idFront, idBack: b.idBack }), Date.now()]);
  });
  res.json({ ok: true });
}));
app.post("/api/upgrade", auth, wrap(async (req, res) => {
  const plan = str(req.body.plan, 20); if (!["Pro", "Premium"].includes(plan)) throw bad("Unknown plan");
  await tx(req.u, async (c, ur) => {
    const p = (await c.query("SELECT 1 FROM requests WHERE uid=$1 AND type='upgrade' AND status='pending'", [req.u.uid])).rows[0]; if (p) throw bad("You already have a pending upgrade request.");
    await c.query("INSERT INTO requests(id,uid,user_name,type,data,ts) VALUES($1,$2,$3,'upgrade',$4,$5)", [newId("RQ-"), req.u.uid, req.u.name, JSON.stringify({ plan, from: ur.plan }), Date.now()]);
  });
  res.json({ ok: true });
}));
app.get("/api/chat", auth, wrap(async (req, res) => { const r = (await pool.query("SELECT messages FROM chats WHERE uid=$1", [req.u.uid])).rows[0]; res.json({ messages: r ? r.messages : [] }); }));
app.put("/api/chat", auth, wrap(async (req, res) => {
  const m = (Array.isArray(req.body.messages) ? req.body.messages : []).slice(-60).map((x) => ({ role: x.role === "me" ? "me" : "bot", t: str(x.t, 2000), html: x.t === "__contact__" && x.role !== "me" }));
  await pool.query("INSERT INTO chats(uid,messages) VALUES($1,$2) ON CONFLICT (uid) DO UPDATE SET messages=$2", [req.u.uid, JSON.stringify(m)]); res.json({ ok: true });
}));

/* ---------- admin ---------- */
app.get("/api/admin/ping", auth, adminOnly, (q, s) => s.json({ ok: true }));
app.get("/api/admin/requests", auth, adminOnly, wrap(async (req, res) => {
  const types = String(req.query.types || "withdrawal,kyc,upgrade").split(",").filter((t) => ["withdrawal", "kyc", "upgrade"].includes(t));
  const rows = (await pool.query("SELECT * FROM requests WHERE type = ANY($1) ORDER BY ts DESC LIMIT 300", [types])).rows;
  res.json(rows.map((r) => ({ id: r.id, uid: r.uid, userName: r.user_name, type: r.type, data: r.data, status: r.status, adminMessage: r.admin_message, receipt: r.receipt, ts: Number(r.ts) })));
}));
app.post("/api/admin/review", auth, adminOnly, wrap(async (req, res) => {
  const { id, decision } = req.body, msg = str(req.body.message, 500);
  if (!["approved", "rejected"].includes(decision)) throw bad("Bad decision"); if (decision === "rejected" && !msg) throw bad("A message is required to reject.");
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    const r = (await c.query("SELECT * FROM requests WHERE id=$1 FOR UPDATE", [id])).rows[0];
    if (!r) throw bad("Request not found", 404); if (r.status !== "pending") throw bad("Already reviewed");
    let receipt = null;
    if (decision === "approved") {
      const u = (await c.query("SELECT * FROM users WHERE uid=$1 FOR UPDATE", [r.uid])).rows[0]; const d = r.data;
      if (r.type === "withdrawal") {
        if (Number(u.total_earned) + 1e-6 < d.amount) throw bad("User balance is below the request amount.");
        let left = d.amount; const js = (await c.query("SELECT job_id, paid FROM job_state WHERE uid=$1 AND paid>0 ORDER BY paid DESC FOR UPDATE", [r.uid])).rows;
        for (const j of js) { if (left <= 0) break; const t = Math.min(Number(j.paid), left); await c.query("UPDATE job_state SET paid = paid - $1 WHERE uid=$2 AND job_id=$3", [t, r.uid, j.job_id]); left = r2(left - t); }
        await c.query("UPDATE users SET total_earned = total_earned - $1 WHERE uid=$2", [d.amount, r.uid]);
        receipt = { ref: newId("WD-"), method: d.method };
        const dest = d.method === "bank" ? d.bankName + " · ****" + String(d.accountNumber).slice(-4) : d.coin + " · " + d.wallet.slice(0, 6) + "…" + d.wallet.slice(-4);
        await c.query("INSERT INTO transactions(id,uid,type,descr,amount,status,ts,dest,method,account) VALUES($1,$2,'withdrawal',$3,$4,'Completed',$5,$6,$7,$8)",
          [receipt.ref, r.uid, "Withdrawal via " + (d.method === "bank" ? "International Bank Transfer" : d.coin + " wallet"), -d.amount, Date.now(), dest, d.method, d.accountName || ""]);
      }
      if (r.type === "upgrade") await c.query("UPDATE users SET plan=$1 WHERE uid=$2", [d.plan, r.uid]);
      if (r.type === "kyc") await c.query("UPDATE users SET kyc='verified' WHERE uid=$1", [r.uid]);
    }
    await c.query("UPDATE requests SET status=$1, admin_message=$2, receipt=$3, reviewed_ts=$4 WHERE id=$5", [decision, msg, receipt ? JSON.stringify(receipt) : null, Date.now(), id]);
    await c.query("COMMIT"); res.json({ ok: true });
  } catch (e) { await c.query("ROLLBACK"); throw e; } finally { c.release(); }
}));

/* ---------- static site (optional: serve the whole project from this one service) ---------- */
const root = path.join(__dirname, "..");
app.use("/server", (q, s) => s.status(404).end());
app.use(express.static(root, { index: "index.html" }));
const port = process.env.PORT || 3000;
init().then(() => app.listen(port, () => console.log("Marketsphare server on " + port))).catch((e) => { console.error("DB init failed", e); process.exit(1); });
