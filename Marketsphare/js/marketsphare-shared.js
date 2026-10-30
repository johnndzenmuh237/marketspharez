/* build: notif-2 — Marketsphare client engine (server-backed). All money logic lives on the server (server/server.js);
   this file only fetches state, sends actions and keeps a cache the pages read synchronously. */
(function (w) {
  "use strict";
  const DAY = 864e5, M = (w.Marketsphare = w.Marketsphare || {}), API = (w.MS_API || "").replace(/\/$/, "");
  const J = [
    { id: "seo-strategist", logo: "BW", title: "SEO Strategist", company: "BrightWave", min: 128, max: 143, pmin: 3, pmax: 5, unit: "SEO keywords to publish", platforms: ["Google","Bing","YouTube","Pinterest"], q: "In your own words, what is a keyword?" },
    { id: "email-marketing-manager", logo: "VX", title: "Email Marketing Manager", company: "Vertex Labs", min: 130, max: 150, pmin: 4, pmax: 5.5, unit: "email marketing scripts to promote", platforms: ["Gmail","Mailchimp","Klaviyo","Outlook"], q: "What is an email subject line?" },
    { id: "paid-social-specialist", logo: "CO", title: "Paid Social Specialist", company: "Cobalt Co.", min: 145, max: 155, pmin: 5, pmax: 5, unit: "social media paid ads to promote", platforms: ["Meta Ads","TikTok Ads","Snapchat","Pinterest"], q: "What is a paid ad, in simple words?" },
    { id: "social-media-post", logo: "PP", title: "Social Media Posts", company: "PostPulse", min: 140, max: 165, pmin: 2, pmax: 2.8, unit: "social media posts to promote", platforms: ["Instagram","Facebook","X","TikTok","LinkedIn"], q: "What do you usually see in a social media post?" },
    { id: "content-marketing-lead", logo: "HW", title: "Content Marketing Lead", company: "Hatchway", min: 136, max: 156, pmin: 3.45, pmax: 4.6, unit: "content pieces to promote", platforms: ["Medium","LinkedIn","Substack","Blog"], q: "What is a blog post?" },
    { id: "social-media-manager", logo: "NP", title: "Social Media Manager", company: "NorthPeak", min: 145, max: 155, pmin: 5, pmax: 5, unit: "social media tasks to promote", platforms: ["Instagram","TikTok","Facebook","Pinterest"], q: "Name one social media app you know." },
    { id: "advert-videos", logo: "AR", title: "Advert Videos", company: "AdReel", min: 100, max: 120, pmin: 4, pmax: 4, unit: "video scripts to generate and promote", platforms: ["YouTube","TikTok","Instagram Reels","Facebook"], q: "What is a short video advert?", video: true, perTask: true }
  ];
  J.forEach((j) => { j.payType = "daily"; j.currency = "$"; j.match = 90; j.matchTone = "success"; j.payAmount = j.pmax; j.location = "Worldwide"; });

  let cache = null, offset = 0, lastMut = 0; const raw = {}; // raw[id] = { job, batch } exactly as the server sent them
  const emptyJob = () => ({ applied: false, appliedAt: null, dayIdx: -1, done: {}, stage: {}, active: null, daysCompleted: 0, pending: 0, paid: 0, history: [] });
  const blank = () => { const st = { _meta: { totalEarned: 0, tx: [], plan: "Free", kyc: null, available: 0, unlockAt: null, month: 0, workedDays: 0 }, _batches: {}, _requests: [] }; J.forEach((j) => (st[j.id] = emptyJob())); return st; };
  const fire = () => w.dispatchEvent(new CustomEvent("marketsphare:state-changed", { detail: cache }));
  const now = () => Date.now() + offset, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  function bar(msg) {
    let b = document.getElementById("ms-net"); if (!msg) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement("div"); b.id = "ms-net"; b.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:3000;background:#f59e0b;color:#111;text-align:center;padding:8px 12px;font:600 13px system-ui,sans-serif"; (document.body || document.documentElement).appendChild(b); }
    b.textContent = msg;
  }
  /* The server keeps tasks under stable keys. Pages work with plain positions 0..n-1, so we translate both ways here. */
  function project(id) {
    const r = raw[id]; if (!r || !r.job) return;
    const tasks = (r.batch && r.batch.tasks) || [], pos = {}; tasks.forEach((t, i) => (pos[t.k] = i));
    const rekey = (m) => { const o = {}; Object.keys(m || {}).forEach((k) => { if (pos[k] != null) o[pos[k]] = m[k]; }); return o; };
    const j = Object.assign({}, r.job);
    j.done = rekey(r.job.done); j.stage = rekey(r.job.stage); j.active = r.job.active != null && pos[r.job.active] != null ? pos[r.job.active] : null;
    cache[id] = j;
    cache._batches[id] = { count: tasks.length, total: r.batch ? r.batch.total : 0, tasks: tasks.map((t, i) => ({ i, title: t.title, text: t.text || "", pay: t.pay, day: t.d })) };
  }
  const keyOf = (id, i) => { const t = raw[id] && raw[id].batch && raw[id].batch.tasks[i]; if (!t) throw new Error("That task is no longer available"); return t.k; };

  async function call(path, body, method) {
    const u = M.currentUser; if (!u) throw new Error("Not signed in");
    const token = await u.getIdToken();
    const r = await fetch(API + "/api" + path, { method: method || (body ? "POST" : "GET"), headers: { "Content-Type": "application/json", Authorization: "Bearer " + token }, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(j.error || "Request failed"), { status: r.status });
    return j;
  }
  async function fetchState(force) {
    const t0 = Date.now(), s = await call("/state");
    if (!force && lastMut > t0) return cache; // an action finished while this request was in flight: keep the newer data
    const st = blank(); cache = st;
    J.forEach((j) => { raw[j.id] = { job: s.jobs[j.id], batch: s.batches[j.id] }; project(j.id); });
    st._meta = s.meta; st._requests = s.requests; offset = s.meta.now - Date.now(); M.isAdmin = s.isAdmin; M.offline = false; fire(); return cache;
  }
  /* First load never falls back to an empty "apply again" screen: it waits for the server (which may be waking up). */
  async function boot() {
    for (let n = 0; ; n++) {
      try { await fetchState(true); bar(""); return cache; }
      catch (e) {
        if (e.status && e.status < 500 && e.status !== 429 && e.status !== 408) { bar(e.message); if (!cache) cache = blank(); return cache; }
        bar("Connecting to the server… this can take up to a minute after a quiet period."); await sleep(Math.min(2000 + n * 1000, 8000));
      }
    }
  }
  async function refresh(force) { try { await fetchState(force); bar(""); } catch (e) { console.error("Marketsphare: refresh failed", e); if (!e.status || e.status >= 500) bar("Connection lost — retrying…"); } return cache; }
  const merge = (id, r) => {
    lastMut = Date.now(); raw[id] = raw[id] || {};
    if (r.job) raw[id].job = r.job; if (r.batch) raw[id].batch = r.batch;
    if (r.text != null && r.key != null && raw[id].batch) { const t = raw[id].batch.tasks.find((x) => x.k === r.key); if (t) t.text = r.text; }
    if (r.meta) cache._meta = Object.assign({}, cache._meta, r.meta, { tx: cache._meta.tx });
    project(id); fire();
  };
  const msg = (e) => e.message || "Something went wrong";

  const act = {
    async applyToJob(id) { const r = await call("/apply", { jobId: id }); if (!cache) cache = blank(); merge(id, r); return r; },
    async activate(id, i) { const r = await call("/activate", { jobId: id, i: keyOf(id, i) }); merge(id, r); return r; },
    async generate(id, i) { const r = await call("/generate", { jobId: id, i: keyOf(id, i) }); merge(id, r); return r; },
    async completeTask(id, i) { const r = await call("/complete", { jobId: id, i: keyOf(id, i) }); merge(id, r); if (r.credited > 0) await refresh(true); return r; },
    async requestWithdrawal(o) { try { await call("/withdraw", o); await refresh(true); return { ok: true }; } catch (e) { return { ok: false, msg: msg(e) }; } },
    async submitRequest(type, data) { try { await call("/" + type, data); await refresh(true); return { ok: true }; } catch (e) { return { ok: false, msg: msg(e) }; } },
    async getChat() { try { return (await call("/chat")).messages; } catch (e) { return []; } },
    async saveChat(messages) { try { await call("/chat", { messages }, "PUT"); } catch (e) {} },
    async adminList(types) { return call("/admin/requests?types=" + types.join(",")); },
    async adminReview(id, decision, message) { return call("/admin/review", { id, decision, message }); }
  };
  const st0 = () => cache || (cache = blank());
  const lock = (st) => { const u = (st || st0())._meta.unlockAt; return { open: !!u && now() >= u, unlockAt: u && u > 1e6 ? u : null }; };
  const myRequests = (type) => (st0()._requests || []).filter((r) => !type || r.type === type);
  const batchFor = (job) => st0()._batches[job.id] || { count: 0, tasks: [], total: 0 };

  function computeStats(st) {
    const perJob = J.map((job) => { const s = st[job.id], b = batchFor(job), done = Object.keys(s.done || {}).length; return { job, state: s, done, total: b.count, pct: b.count ? Math.round((done / b.count) * 100) : 0, status: s.applied ? "active" : "not-started" }; });
    return { perJob, byCurrency: { "$": { paid: perJob.reduce((a, p) => a + p.state.paid, 0), pending: 0 } }, activeCount: perJob.filter((p) => p.status === "active").length, completedCount: 0, startedCount: perJob.filter((p) => p.state.applied).length, totalHistoryEntries: perJob.reduce((a, p) => a + p.state.history.length, 0), daysCompletedTotal: perJob.reduce((a, p) => a + p.state.daysCompleted, 0) };
  }
  const formatCurrencyMap = (map, key) => { const v = map["$"] && map["$"][key]; return v > 0 ? "$" + v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : null; };
  const formatHMS = (ms) => { const t = Math.max(0, Math.floor(ms / 1000)), p = (n) => String(n).padStart(2, "0"); return p(Math.floor(t / 3600)) + ":" + p(Math.floor((t % 3600) / 60)) + ":" + p(t % 60); };
  const compressImage = (file, max) => new Promise((res, rej) => { const fr = new FileReader(); fr.onerror = rej; fr.onload = () => { const im = new Image(); im.onerror = rej; im.onload = () => { const k = Math.min(1, (max || 700) / Math.max(im.width, im.height)), c = document.createElement("canvas"); c.width = im.width * k; c.height = im.height * k; c.getContext("2d").drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL("image/jpeg", 0.6)); }; im.src = fr.result; }; fr.readAsDataURL(file); });

  Object.assign(M, act, { jobs: J, DAY_MS: DAY, call, refresh, getStorageKey: () => "ms-server", loadState: st0, saveState() {}, ensureDay: () => false, ensureCurrentDay: () => false,
    msUntilNextBatch: (s) => (s.applied ? Math.max(0, s.appliedAt + (s.dayIdx + 1) * DAY - now()) : 0), batchFor, setStage: () => {}, myRequests, latestRequest: (t) => myRequests(t)[0] || null,
    withdrawLock: lock, availableBalance: () => st0()._meta.available, computeStats, formatCurrencyMap, formatHMS, formatDate: (d) => new Date(d).toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
    compressImage, simpleAnswerOk: (t) => t.trim().split(/\s+/).filter(Boolean).length >= 3,
    POSTED_JOBS_KEY: "marketsphare_posted_jobs_v1", loadPostedJobs: () => [], savePostedJobs() {} });

  /* ---------- Notification bell: opens a panel with real updates (feedback, credits, withdrawals) ---------- */
  let notifRender = null, notifLoaded = false;
  function initNotifications() {
    const bell = document.querySelector(".notif-bell"); if (!bell || bell.dataset.msNotif) return; bell.dataset.msNotif = "1";
    if (!document.getElementById("ms-notif-css")) {
      const css = document.createElement("style"); css.id = "ms-notif-css";
      css.textContent = ".ms-notif-panel{display:none;position:fixed;z-index:1600;width:min(380px,calc(100vw - 24px));max-height:min(70vh,520px);flex-direction:column;overflow:hidden;background:var(--bg-surface);color:var(--text-primary);border:1px solid var(--border-color);border-radius:14px;box-shadow:var(--shadow-lg)}"
        + ".ms-notif-panel.open{display:flex}.ms-notif-panel .hd{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-bottom:1px solid var(--border-color)}"
        + ".ms-notif-panel .hd button{border:0;background:none;color:var(--color-primary);font-weight:700;font-size:12px;cursor:pointer}.ms-notif-panel .bd{overflow-y:auto}"
        + ".ms-notif-panel .it{display:flex;gap:12px;padding:12px 16px;border-bottom:1px solid var(--border-color)}.ms-notif-panel .it.new{background:color-mix(in srgb,var(--color-primary) 8%,transparent)}"
        + ".ms-notif-panel .ic{width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:var(--bg-surface-alt);flex-shrink:0}"
        + ".ms-notif-panel .ic.good{background:rgba(26,158,107,.15);color:#1a9e6b}.ms-notif-panel .ic.bad{background:rgba(194,59,59,.15);color:#c23b3b}.ms-notif-panel .ic.warn{background:rgba(185,119,14,.15);color:#b9770e}"
        + ".ms-notif-panel .it b{font-size:13px;display:block}.ms-notif-panel .it p{margin:3px 0 0;font-size:12.5px;color:var(--text-secondary);overflow-wrap:anywhere}.ms-notif-panel .it small{color:var(--text-muted);font-size:11px}"
        + ".ms-notif-panel .em{padding:26px 16px;text-align:center;color:var(--text-muted);font-size:13px}.ms-notif-panel .ft{display:block;text-align:center;padding:12px;font-size:13px;font-weight:700;color:var(--color-primary);border-top:1px solid var(--border-color)}";
      document.head.appendChild(css);
    }
    const panel = document.createElement("div"); panel.className = "ms-notif-panel"; document.body.appendChild(panel);
    const keyName = () => "ms_notif_seen:" + ((M.currentUser && M.currentUser.uid) || "guest"), seenList = () => { try { return JSON.parse(localStorage.getItem(keyName()) || "[]"); } catch (e) { return []; } };
    const esc = (x) => String(x == null ? "" : x).replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));
    const fmt = (ts) => new Date(ts).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    let current = [];
    function items() {
      const st = st0(), out = [];
      (st._requests || []).slice(0, 12).forEach((r) => {
        const label = r.type === "withdrawal" ? "Withdrawal" : r.type === "kyc" ? "KYC verification" : "Plan upgrade";
        const extra = r.type === "withdrawal" ? " ($" + Number(r.data.amount).toFixed(2) + ")" : r.type === "upgrade" ? " to " + r.data.plan : "";
        const what = r.status === "pending" ? "is awaiting review" : r.status === "approved" ? "was approved" : "was declined";
        out.push({ key: "r:" + r.id + ":" + r.status, icon: r.status === "approved" ? "okc" : r.status === "rejected" ? "xc" : "clock", tone: r.status === "approved" ? "good" : r.status === "rejected" ? "bad" : "warn", title: label + extra + " " + what, body: r.status !== "pending" && r.adminMessage ? "Feedback: " + r.adminMessage : "", ts: r.ts });
      });
      (st._meta.tx || []).slice(0, 8).forEach((t) => out.push({ key: "t:" + t.id, icon: t.type === "withdrawal" ? "bank" : "cash", tone: t.type === "withdrawal" ? "good" : "", title: t.type === "withdrawal" ? "Withdrawal completed — $" + Math.abs(t.amount).toFixed(2) : "$" + Number(t.amount).toFixed(2) + " credited", body: t.desc, ts: t.ts }));
      return out.sort((a, b) => b.ts - a.ts).slice(0, 15);
    }
    function render() {
      if (!notifLoaded) { panel.innerHTML = '<div class="hd"><b>Notifications</b></div><div class="bd"><div class="em">Loading your notifications…</div></div><a class="ft" href="messages.html">Need help? Open Messages</a>'; bell.classList.remove("badge-notification"); bell.removeAttribute("data-count"); return; }
      try { current = items(); } catch (err) { current = []; console.error(err); } const sn = new Set(seenList()), unread = current.filter((i) => !sn.has(i.key)).length;
      panel.innerHTML = '<div class="hd"><b>Notifications</b>' + (unread ? '<button data-read="1">Mark all read</button>' : "") + '</div><div class="bd">'
        + (current.length ? current.map((i) => '<div class="it ' + (sn.has(i.key) ? "" : "new") + '"><span class="ic ' + (i.tone || "") + '"><i class=mi-' + i.icon + "></i></span><div><b>" + esc(i.title) + "</b>" + (i.body ? "<p>" + esc(i.body) + "</p>" : "") + "<small>" + fmt(i.ts) + "</small></div></div>").join("") : '<div class="em">No notifications yet. Apply to a job to get started.</div>')
        + '</div><a class="ft" href="messages.html">Need help? Open Messages</a>';
      if (unread) { bell.classList.add("badge-notification"); bell.setAttribute("data-count", unread > 9 ? "9+" : String(unread)); } else { bell.classList.remove("badge-notification"); bell.removeAttribute("data-count"); }
    }
    function markRead() { try { localStorage.setItem(keyName(), JSON.stringify(Array.from(new Set(seenList().concat(current.map((i) => i.key)))).slice(-300))); } catch (e) {} }
    function close() { if (panel.classList.contains("open")) { panel.classList.remove("open"); markRead(); render(); } }
    function open() { try { render(); } catch (err) { console.error(err); } const r = bell.getBoundingClientRect(); panel.style.top = r.bottom + 8 + "px"; panel.style.right = Math.max(12, innerWidth - r.right) + "px"; panel.classList.add("open"); }
    bell.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); panel.classList.contains("open") ? close() : open(); });
    panel.addEventListener("click", (e) => { e.stopPropagation(); if (e.target.closest("[data-read]")) { markRead(); render(); } });
    document.addEventListener("click", () => close()); document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
    notifRender = (force) => { if (force || !panel.classList.contains("open")) render(); };
    render();
  }

  if (!w.MS_ADMIN_PAGE && M.authReady) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initNotifications); else initNotifications();
    M.stateReady = M.authReady.then(boot);
    M.stateReady.then(() => { notifLoaded = true; if (notifRender) notifRender(true); });
    w.addEventListener("marketsphare:state-changed", () => { if (notifRender) notifRender(); });
    setInterval(() => { if (!document.hidden && M.currentUser) refresh(); }, 30000);
    document.addEventListener("visibilitychange", () => { if (!document.hidden && M.currentUser) refresh(); });
  }
})(window);
