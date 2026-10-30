/* Server-side task engine: deterministic daily batches (same logic the demo used in the browser). */
const DAY = 864e5;
const hs = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const rg = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pk = (r, a) => a[Math.floor(r() * a.length)];
const N = ["project management software","hydrating skincare","eco-friendly products","fitness apps","freelance invoicing","hiking gear","online courses","smart home devices","organic coffee","remote team tools"];
const CT = ["","in London","in Lagos","in Toronto","in Dubai","in Sydney"];
const SJ = ["Save 20% this week","Your free trial is waiting","3 reasons customers switch","Don't miss this launch","A quick tip for you","Last chance to join"];
const HK = ["Stop scrolling —","Nobody tells you this:","Real results in 7 days:","Tired of the old way?","Meet your new favourite:"];
const TG = ["#growth","#marketing","#smallbusiness","#trending","#musthave","#deals"];
const TP = ["How {n} saves you time","5 mistakes to avoid with {n}","The beginner's guide to {n}","Why {n} is booming","{n}: myths vs facts","Case study: scaling with {n}"];
const CTA = ["Tap the link to get started.","Join today.","Claim your offer now.","Learn more below."];
const pitch = (r) => pk(r, HK) + " " + pk(r, N) + " made simple. " + pk(r, CTA);
const J = [
  { id: "seo-strategist", min: 128, max: 143, pmin: 3, pmax: 5, gen: (r) => { const k = (pk(r, ["best {n}","{n} pricing","{n} reviews","how to choose {n}","{n} alternatives","cheap {n}","{n} guide"]).replace("{n}", pk(r, N)) + " " + pk(r, CT)).trim(); return { title: k, text: 'Publish the keyword "' + k + '" in a page title, H1 and meta description. Intent: ' + pk(r, ["buyer","comparison","how-to","local"]) + "." }; } },
  { id: "email-marketing-manager", min: 130, max: 150, pmin: 4, pmax: 5.5, gen: (r) => { const s = pk(r, SJ); return { title: "Email: " + s, text: "Subject: " + s + "\n\nHi {first_name},\n" + pitch(r) }; } },
  { id: "paid-social-specialist", min: 145, max: 155, pmin: 5, pmax: 5, gen: (r) => ({ title: "Ad: " + pk(r, N), text: "Headline: " + pk(r, HK) + "\nPrimary text: " + pitch(r) + "\nAudience: " + pk(r, ["18-24","25-34","35-44"]) + ", interested in " + pk(r, N) }) },
  { id: "social-media-post", min: 140, max: 165, pmin: 2, pmax: 2.8, gen: (r) => ({ title: "Post: " + pk(r, N), text: pitch(r) + " " + pk(r, TG) + " " + pk(r, TG) }) },
  { id: "content-marketing-lead", min: 136, max: 156, pmin: 3.45, pmax: 4.6, gen: (r) => { const t = pk(r, TP).replace("{n}", pk(r, N)); return { title: t, text: 'Share the article "' + t + '" with this intro: ' + pitch(r) }; } },
  { id: "social-media-manager", min: 145, max: 155, pmin: 5, pmax: 5, gen: (r) => ({ title: "Caption: " + pk(r, N), text: "Caption: " + pitch(r) + "\nReel idea: show " + pk(r, N) + " in 15 seconds. " + pk(r, TG) }) },
  { id: "advert-videos", min: 100, max: 120, pmin: 4, pmax: 4, video: true, perTask: true, gen: (r) => ({ title: "Video: " + pk(r, N), text: "Hook: " + pk(r, HK) + "\nScene 1: show " + pk(r, N) + "\nScene 2: show the result\nCTA: " + pk(r, CTA) }) }
];
const cache = new Map();
function batchFor(job, uid, dayIdx) {
  const k = uid + job.id + dayIdx; if (cache.has(k)) return cache.get(k);
  const r = rg(hs(k)), count = job.min + Math.floor(r() * (job.max - job.min + 1)), tasks = []; let total = 0;
  for (let i = 0; i < count; i++) { const g = job.gen(r), pay = +(job.pmin + r() * (job.pmax - job.pmin)).toFixed(2); tasks.push({ i, title: g.title, text: g.text, pay }); total += pay; }
  const b = { count, tasks, total: +total.toFixed(2) }; if (cache.size > 2000) cache.clear(); cache.set(k, b); return b;
}

/* ================= Workspace rules (pure functions, no database) =================
   - Tasks are added every day (24h windows from the day you applied) and skipped tasks ROLL OVER: nothing is cleared.
   - A day's earnings are credited when every task of THAT day's group is done (video jobs credit per video).
   - A workspace is deactivated only after 7 days with no activity. Earnings and worked days are always kept.
   - Skipped tasks older than 7 days are dropped so the queue cannot grow forever. */
const STRIDE = 200, INACTIVE_MS = 7 * DAY, BACKLOG_DAYS = 7;
const newJS = () => ({ appliedAt: null, dayIdx: -1, baseDay: 0, done: {}, stage: {}, credited: {}, active: null, activeAt: null, stageAt: null, lastActive: null, daysCompleted: 0, paid: 0, history: [], ver: 2 });
const dayOf = (k) => Math.floor(k / STRIDE), idxOf = (k) => k % STRIDE;
function dropDays(s, from, to) { // remove bookkeeping for days in [from, to)
  for (const m of [s.done, s.stage]) for (const k of Object.keys(m)) { const d = dayOf(+k); if (d >= from && d < to) delete m[k]; }
  for (const k of Object.keys(s.credited)) if (+k >= from && +k < to) delete s.credited[k];
  if (s.active != null && dayOf(s.active) >= from && dayOf(s.active) < to) { s.active = null; s.activeAt = null; s.stageAt = null; }
}
const doneCount = (s, d) => { let n = 0; for (const k of Object.keys(s.done)) if (dayOf(+k) === d) n++; return n; };
function migrate(job, uid, s) { // old rows stored one day only, keyed by task number
  if (s.ver >= 2) return false;
  const d = Math.max(0, s.dayIdx), b = s.appliedAt != null ? batchFor(job, uid, d) : null, sh = (m) => { const o = {}; for (const k of Object.keys(m || {})) o[d * STRIDE + (+k)] = m[k]; return o; };
  s.done = sh(s.done); s.stage = sh(s.stage); if (s.active != null) s.active = d * STRIDE + s.active;
  s.credited = {}; s.baseDay = d; if (b && Object.keys(s.done).length >= b.count && b.count) s.credited[d] = 1;
  s.ver = 2; return true;
}
/** Brings a job state up to date for time `now`. Returns true if anything changed (so it must be saved). */
function normalize(job, uid, s, now) {
  let ch = migrate(job, uid, s);
  if (s.appliedAt == null) return ch;
  if (s.lastActive == null) { s.lastActive = now; ch = true; }
  if (now - s.lastActive >= INACTIVE_MS) { // deactivated: earnings (paid), history and worked days are kept
    Object.assign(s, { appliedAt: null, dayIdx: -1, baseDay: 0, done: {}, stage: {}, credited: {}, active: null, activeAt: null, stageAt: null, lastActive: null });
    return true;
  }
  const d = Math.floor((now - s.appliedAt) / DAY);
  if (d !== s.dayIdx) { s.dayIdx = d; ch = true; }
  const minBase = Math.max(0, s.dayIdx - BACKLOG_DAYS);
  if (s.baseDay < minBase) { dropDays(s, s.baseDay, minBase); s.baseDay = minBase; ch = true; }
  while (s.baseDay < s.dayIdx && doneCount(s, s.baseDay) >= batchFor(job, uid, s.baseDay).count) { dropDays(s, s.baseDay, s.baseDay + 1); s.baseDay++; ch = true; }
  return ch;
}
/** All tasks currently in the workspace, oldest day first. `k` is the stable task key. */
function queue(job, uid, s) {
  const tasks = []; let total = 0;
  if (s.appliedAt == null) return { count: 0, tasks, total: 0 };
  for (let d = s.baseDay; d <= s.dayIdx; d++) { const b = batchFor(job, uid, d); for (const t of b.tasks) { tasks.push({ k: d * STRIDE + t.i, d, title: t.title, text: t.text, pay: t.pay }); total += t.pay; } }
  return { count: tasks.length, tasks, total: +total.toFixed(2) };
}
function validKey(job, uid, s, k) {
  if (!Number.isInteger(k) || k < 0) return false; const d = dayOf(k);
  return d >= s.baseDay && d <= s.dayIdx && idxOf(k) < batchFor(job, uid, d).count;
}
/** Marks task k done. Returns the credits to pay: [{amount, desc}]. */
function finishTask(job, uid, s, k) {
  const d = dayOf(k), b = batchFor(job, uid, d), credits = [];
  s.done[k] = 1; s.active = null; s.activeAt = null; s.stageAt = null; delete s.stage[k];
  if (job.perTask) credits.push({ amount: b.tasks[idxOf(k)].pay, desc: "video submitted" });
  if (doneCount(s, d) >= b.count) { if (!job.perTask && !s.credited[d]) { s.credited[d] = 1; credits.push({ amount: b.total, desc: "daily batch complete" }); } s.daysCompleted++; }
  return credits;
}
module.exports = { DAY, J, batchFor, STRIDE, INACTIVE_MS, newJS, normalize, queue, validKey, finishTask, dayOf, idxOf };