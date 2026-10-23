/* Marketsphare client engine (server-backed). All money logic lives on the server (server/server.js);
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
  J.forEach((j) => { j.payType = "daily"; j.currency = "$"; j.match = 90; j.matchTone = "success"; j.payAmount = j.pmax; j.location = "Remote"; });

  let cache = null, offset = 0;
  const emptyJob = () => ({ applied: false, appliedAt: null, dayIdx: -1, done: {}, stage: {}, active: null, daysCompleted: 0, pending: 0, paid: 0, history: [] });
  const blank = () => { const st = { _meta: { totalEarned: 0, tx: [], plan: "Free", kyc: null, available: 0, unlockAt: null, month: 0 }, _batches: {}, _requests: [] }; J.forEach((j) => (st[j.id] = emptyJob())); return st; };
  const fire = () => w.dispatchEvent(new CustomEvent("marketsphare:state-changed", { detail: cache }));
  const now = () => Date.now() + offset;

  async function call(path, body, method) {
    const u = M.currentUser; if (!u) throw new Error("Not signed in");
    const token = await u.getIdToken();
    const r = await fetch(API + "/api" + path, { method: method || (body ? "POST" : "GET"), headers: { "Content-Type": "application/json", Authorization: "Bearer " + token }, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(j.error || "Request failed"), { status: r.status });
    return j;
  }
  async function refresh() {
    try {
      const s = await call("/state"), st = blank();
      J.forEach((j) => s.jobs[j.id] && (st[j.id] = s.jobs[j.id]));
      st._meta = s.meta; st._batches = s.batches; st._requests = s.requests; offset = s.meta.now - Date.now(); M.isAdmin = s.isAdmin; M.offline = false;
      cache = st; fire();
    } catch (e) { console.error("Marketsphare: could not load state", e); M.offline = true; if (!cache) cache = blank(); }
    return cache;
  }
  const merge = (id, r) => { if (!cache) cache = blank(); if (r.job) cache[id] = r.job; if (r.batch) cache._batches[id] = r.batch; if (r.meta) cache._meta = Object.assign({}, cache._meta, r.meta, { tx: cache._meta.tx }); fire(); };
  const msg = (e) => e.message || "Something went wrong";

  const act = {
    async applyToJob(id) { const r = await call("/apply", { jobId: id }); merge(id, r); return r; },
    async activate(id, i) { const r = await call("/activate", { jobId: id, i }); merge(id, r); return r; },
    async generate(id, i) { const r = await call("/generate", { jobId: id, i }); merge(id, r); return r; },
    async completeTask(id, i) { const r = await call("/complete", { jobId: id, i }); merge(id, r); if (r.credited > 0) await refresh(); return r; },
    async requestWithdrawal(o) { try { await call("/withdraw", o); await refresh(); return { ok: true }; } catch (e) { return { ok: false, msg: msg(e) }; } },
    async submitRequest(type, data) { try { await call("/" + type, data); await refresh(); return { ok: true }; } catch (e) { return { ok: false, msg: msg(e) }; } },
    async getChat() { try { return (await call("/chat")).messages; } catch (e) { return []; } },
    async saveChat(messages) { try { await call("/chat", { messages }, "PUT"); } catch (e) {} },
    async adminList(types) { return call("/admin/requests?types=" + types.join(",")); },
    async adminReview(id, decision, message) { return call("/admin/review", { id, decision, message }); }
  };
  const st0 = () => cache || (cache = blank());
  const lock = (st) => { const u = (st || st0())._meta.unlockAt; return { open: !!u && now() >= u, unlockAt: u || null }; };
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

  if (!w.MS_ADMIN_PAGE && M.authReady) {
    M.stateReady = M.authReady.then(refresh);
    setInterval(() => { if (!document.hidden && M.currentUser) refresh(); }, 20000);
    document.addEventListener("visibilitychange", () => { if (!document.hidden && M.currentUser) refresh(); });
  }
})(window);
