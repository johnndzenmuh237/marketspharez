const express = require("express"), cors = require("cors"), path = require("path"), crypto = require("crypto");
const admin = require("firebase-admin"), { pool, init } = require("./db"), E = require("./engine");
admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID || "swiftchain-827f2" });
const ADMINS = (process.env.ADMIN_EMAILS || "").toLowerCase().split(",").map((s) => s.trim()).filter(Boolean);
const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : true }));
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
const rowToJS = (r) => r ? { appliedAt: num(r.applied_at), dayIdx: r.day_idx, done: r.done || {}, stage: r.stage || {}, active: r.active, activeAt: num(r.active_at), stageAt: num(r.stage_at), daysCompleted: r.days_completed, paid: Number(r.paid), history: r.history || [] }
  : { appliedAt: null, dayIdx: -1, done: {}, stage: {}, active: null, activeAt: null, stageAt: null, daysCompleted: 0, paid: 0, history: [] };
const saveJS = (c, uid, id, s) => c.query(`INSERT INTO job_state(uid,job_id,applied_at,day_idx,done,stage,active,active_at,stage_at,days_completed,paid,history) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
  ON CONFLICT (uid,job_id) DO UPDATE SET applied_at=$3,day_idx=$4,done=$5,stage=$6,active=$7,active_at=$8,stage_at=$9,days_completed=$10,paid=$11,history=$12`,
  [uid, id, s.appliedAt, s.dayIdx, JSON.stringify(s.done), JSON.stringify(s.stage), s.active, s.activeAt, s.stageAt, s.daysCompleted, s.paid, JSON.stringify(s.history)]);
const getJS = async (c, uid, id) => rowToJS((await c.query("SELECT * FROM job_state WHERE uid=$1 AND job_id=$2", [uid, id])).rows[0]);
function rollover(s, now) { // unfinished work from a past day is forfeited
  if (s.appliedAt == null) return false; const d = Math.floor((now - s.appliedAt) / E.DAY);
  if (d === s.dayIdx) return false; s.dayIdx = d; s.done = {}; s.stage = {}; s.active = null; s.activeAt = null; s.stageAt = null; return true;
}
const pubJS = (s) => ({ applied: s.appliedAt != null, appliedAt: s.appliedAt, dayIdx: s.dayIdx, done: s.done, stage: s.stage, active: s.active, daysCompleted: s.daysCompleted, pending: 0, paid: s.paid, history: s.history.slice(0, 50) });
async function metaFor(c, uid, ur) {
  const u = (await c.query("SELECT total_earned, plan, kyc FROM users WHERE uid=$1", [uid])).rows[0];
  const m = (await c.query("SELECT MIN(applied_at) m FROM job_state WHERE uid=$1 AND applied_at IS NOT NULL", [uid])).rows[0].m;
  const p = (await c.query("SELECT COALESCE(SUM((data->>'amount')::numeric),0) s FROM requests WHERE uid=$1 AND type='withdrawal' AND status='pending'", [uid])).rows[0].s;
  const d = new Date(); const ms = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
  const mo = (await c.query("SELECT COALESCE(SUM(amount),0) s FROM transactions WHERE uid=$1 AND type='earning' AND ts>=$2", [uid, ms])).rows[0].s;
  const total = Number(u.total_earned);
  return { totalEarned: total, plan: u.plan, kyc: u.kyc, available: r2(total - Number(p)), unlockAt: m == null ? null : Number(m) + 7 * E.DAY, month: Number(mo), now: Date.now() };
}
const reqPub = (r) => ({ id: r.id, type: r.type, status: r.status, adminMessage: r.admin_message, receipt: r.receipt, ts: Number(r.ts), data: r.type === "kyc" ? { fullName: r.data.fullName, docType: r.data.docType } : r.data });
async function fullState(c, uid, ur) {
  const now = Date.now(), rows = (await c.query("SELECT * FROM job_state WHERE uid=$1", [uid])).rows, by = {}; rows.forEach((r) => (by[r.job_id] = r));
  const jobs = {}, batches = {};
  for (const j of E.J) {
    const s = rowToJS(by[j.id]);
    if (rollover(s, now)) await saveJS(c, uid, j.id, s);
    jobs[j.id] = pubJS(s); if (s.appliedAt != null) batches[j.id] = E.batchFor(j, uid, s.dayIdx);
  }
  const meta = await metaFor(c, uid, ur);
  meta.tx = (await c.query("SELECT * FROM transactions WHERE uid=$1 ORDER BY ts DESC LIMIT 300", [uid])).rows.map((t) => ({ id: t.id, type: t.type, desc: t.descr, amount: Number(t.amount), status: t.status, ts: Number(t.ts), dest: t.dest, method: t.method, account: t.account }));
  const requests = (await c.query("SELECT * FROM requests WHERE uid=$1 ORDER BY ts DESC LIMIT 100", [uid])).rows.map(reqPub);
  return { jobs, batches, meta, requests, isAdmin: !!ur && ADMINS.includes((ur.email || "").toLowerCase()) };
}
const jobOr400 = (id) => E.J.find((j) => j.id === id) || (() => { throw bad("Unknown job"); })();
const newId = (p) => p + Date.now().toString(36).toUpperCase() + crypto.randomBytes(2).toString("hex").toUpperCase();

app.get("/api/health", (q, s) => s.json({ ok: true }));
app.get("/api/state", auth, wrap(async (req, res) => res.json(await tx(req.u, (c, ur) => fullState(c, req.u.uid, ur)))));

app.post("/api/apply", auth, wrap(async (req, res) => {
  const job = jobOr400(req.body.jobId), uid = req.u.uid;
  res.json(await tx(req.u, async (c, ur) => {
    const s = await getJS(c, uid, job.id); if (s.appliedAt != null) throw bad("Already applied");
    s.appliedAt = Date.now(); s.dayIdx = -1; rollover(s, s.appliedAt); await saveJS(c, uid, job.id, s);
    return { job: pubJS(s), batch: E.batchFor(job, uid, s.dayIdx), meta: await metaFor(c, uid, ur) };
  }));
}));
app.post("/api/activate", auth, wrap(async (req, res) => {
  const job = jobOr400(req.body.jobId), i = req.body.i, uid = req.u.uid;
  res.json(await tx(req.u, async (c, ur) => {
    const now = Date.now(), s = await getJS(c, uid, job.id); if (s.appliedAt == null) throw bad("Apply first");
    rollover(s, now); const b = E.batchFor(job, uid, s.dayIdx);
    if (!Number.isInteger(i) || i < 0 || i >= b.count) throw bad("Bad task");
    if (s.done[i]) throw bad("Task already done"); if (s.active != null) throw bad("Finish your active task first");
    s.active = i; s.activeAt = now; await saveJS(c, uid, job.id, s); return { job: pubJS(s) };
  }));
}));
app.post("/api/generate", auth, wrap(async (req, res) => {
  const job = jobOr400(req.body.jobId), i = req.body.i, uid = req.u.uid; if (!job.video) throw bad("Not a video job");
  res.json(await tx(req.u, async (c) => {
    const now = Date.now(), s = await getJS(c, uid, job.id); rollover(s, now);
    if (s.active !== i) throw bad("Activate this task first"); if (now - s.activeAt < 3000) throw bad("Generation still running", 429);
    s.stage[i] = "generated"; s.stageAt = now; await saveJS(c, uid, job.id, s); return { job: pubJS(s) };
  }));
}));
app.post("/api/complete", auth, wrap(async (req, res) => {
  const job = jobOr400(req.body.jobId), i = req.body.i, uid = req.u.uid;
  res.json(await tx(req.u, async (c, ur) => {
    const now = Date.now(), s = await getJS(c, uid, job.id); if (s.appliedAt == null) throw bad("Apply first");
    rollover(s, now); const b = E.batchFor(job, uid, s.dayIdx);
    if (!Number.isInteger(i) || i < 0 || i >= b.count) throw bad("Bad task");
    if (s.done[i]) throw bad("Already done"); if (s.active !== i) throw bad("Activate this task first");
    if (job.video) { if (s.stage[i] !== "generated") throw bad("Generate the video first"); if (now - s.stageAt < 2500) throw bad("Promotion still running", 429); }
    else if (now - s.activeAt < 2500) throw bad("Promotion still running", 429);
    s.done[i] = 1; s.active = null; s.activeAt = null; s.stageAt = null;
    const credit = async (amt, desc) => {
      amt = r2(amt); s.paid = r2(s.paid + amt);
      await c.query("UPDATE users SET total_earned = total_earned + $1 WHERE uid=$2", [amt, uid]);
      await c.query("INSERT INTO transactions(id,uid,type,descr,amount,status,ts) VALUES($1,$2,'earning',$3,$4,'Credited',$5)", [newId("TX-"), uid, job.title + " — " + desc, amt, now]);
      s.history.unshift({ date: new Date(now).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }), amount: amt }); s.history = s.history.slice(0, 200);
    };
    let credited = 0;
    if (job.perTask) { credited += b.tasks[i].pay; await credit(b.tasks[i].pay, "video submitted"); }
    if (Object.keys(s.done).length >= b.count) { if (!job.perTask) { credited += b.total; await credit(b.total, "daily batch complete"); } s.daysCompleted++; }
    await saveJS(c, uid, job.id, s);
    return { job: pubJS(s), credited: r2(credited), meta: await metaFor(c, uid, ur) };
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
    const m = await metaFor(c, uid, ur);
    if (!m.unlockAt || Date.now() < m.unlockAt) throw bad("Withdrawals open 7 days after you start working.");
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
