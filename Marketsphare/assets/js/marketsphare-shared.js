/* ==========================================================================
   Marketsphare — shared job data + persisted, LIVE workspace engine.
   Loaded by BOTH jobs.html and index.html so both pages read/write the
   exact same data via localStorage.

   HOW THIS ENGINE WORKS
   ----------------------
   1. Apply-gating: a job's workspace is locked until the user clicks
      "Apply" on the card. Applying immediately marks it applied, stamps
      appliedAt, and generates "today's" task batch. The Apply button
      never appears again for that job once applied is true.

   2. Daily task rotation: every 24h from appliedAt, each job's task bank
      is reshuffled into a new order and dayApproved/dayCursor reset, so
      the worker gets what feels like a new batch of tasks. Honest caveat:
      the pool of unique tasks per job is fixed (10 for SEO, 25 for Paid
      Social, etc) — what changes daily is the order/selection, not the
      underlying text. Push more tasks into a job's `tasks` array at any
      time and rotation picks them up automatically.

   3. Two pay engines:
        - monthly jobs: the contract's total pay is spread across 7 daily
          batches (totalPay / 7 per day). Each approved task pays that
          day's-pay divided evenly across the tasks in that day's batch.
          Complete every task, every day, for 7 days -> full contract
          value earned. After the 7th fully-completed day the contract
          freezes (marked Completed, no further batches).
        - hourly jobs: pay is a live running timer (hours elapsed x rate)
          that only accrues while a work session is running AND the tab
          is open. Hiding the tab or closing/refreshing auto-pauses and
          banks whatever was earned so far.
   ========================================================================== */
(function (window) {
  "use strict";

  const STORAGE_KEY = "marketsphare_workspace_state_v1";
  const DAY_MS = 24 * 60 * 60 * 1000;

  function T(prompt, groups, minWords) {
    return { prompt, groups, minWords: minWords || 10 };
  }

  const jobs = [
    {
      id: "seo-strategist", logo: "BW", title: "SEO Strategist", company: "BrightWave",
      location: "Remote", match: 97, matchTone: "success", tags: ["SEO", "Content"],
      payType: "monthly", payAmount: 3200, currency: "$",
      client: "BrightWave", industry: "B2B SaaS — project management software",
      brief: "BrightWave sells project management software to small teams. Your job is to grow organic traffic to three key landing pages: <b>/pricing</b>, <b>/features</b>, and <b>/integrations</b>. Every answer should reference these pages by name so the work is auditable.",
      tasks: [
        T("Run keyword research for the /pricing landing page. List your primary keyword and 2 secondary keywords, and explain the search intent behind them.", [["keyword", "primary keyword"], ["intent", "search intent", "buyer intent", "commercial intent"]], 12),
        T("Run keyword research for the /features landing page. List your primary keyword and 2 secondary keywords, and note the estimated monthly search volume for each.", [["keyword"], ["volume", "search volume", "monthly searches"]], 12),
        T("Run keyword research for the /integrations landing page. List your primary keyword and 2 secondary keywords, and note the ranking competition level.", [["keyword"], ["competition", "difficulty", "competitive"]], 12),
        T("Write the on-page SEO brief for the /pricing page: the recommended title tag, meta description, and H1 heading.", [["title"], ["meta description", "meta"], ["h1", "heading"]], 15),
        T("Run a technical SEO audit on brightwave.com. List 3 issues you found (site speed, broken links, crawl errors, etc.) and a fix for each.", [["site speed", "page speed", "load time"], ["crawl", "broken link", "404", "index"]], 15),
        T("Build an internal linking plan for the /pricing page: which 2 existing blog posts should link to it, and what anchor text would you use?", [["internal link", "link"], ["anchor text", "anchor"]], 12),
        T("Optimize the meta title and meta description for the /features page to improve click-through rate.", [["title"], ["meta description", "description"]], 12),
        T("Do a competitor gap analysis against Asana or Trello: what keyword or content gap does BrightWave have that a competitor already ranks for?", [["competitor", "asana", "trello"], ["keyword", "content", "rank"]], 14),
        T("Write a short content brief for a new blog post supporting the /integrations page — include a working title and target keyword.", [["title", "headline"], ["keyword"]], 12),
        T("Write BrightWave's monthly SEO performance summary: the ranking change and what's driving the organic traffic trend.", [["ranking", "position", "rank"], ["traffic", "trend", "organic"]], 15)
      ]
    },
    {
      id: "paid-social-specialist", logo: "CO", title: "Paid Social Specialist", company: "Cobalt Co.",
      location: "Remote", match: 91, matchTone: "success", tags: ["Meta Ads", "TikTok"],
      payType: "hourly", payAmount: 45, currency: "$",
      client: "Cobalt Co.", industry: "DTC skincare — launching a new hydrating serum",
      brief: "Cobalt Co. is a direct-to-consumer skincare brand launching a new <b>hydrating serum</b>. You're running the paid launch across <b>Meta Ads</b> and <b>TikTok Ads</b>, from setup through optimization and reporting.",
      tasks: [
        T("Define the campaign objective for the hydrating serum launch on Meta Ads (conversions, traffic, or awareness) and explain why.", [["objective", "conversion", "traffic", "awareness"], ["why", "because", "reason"]]),
        T("Set up the Meta Ads Manager campaign structure: name your campaign, ad set, and ad naming convention.", [["campaign"], ["ad set"]]),
        T("Define the target audience for the Meta campaign: age range, interests, and location.", [["age", "audience"], ["interest"]]),
        T("Write the primary ad copy (headline + primary text) for the Meta hydrating serum ad.", [["headline"], ["serum", "hydrating"]]),
        T("Create a lookalike audience strategy based on Cobalt Co.'s existing customer list.", [["lookalike"], ["customer list", "seed audience"]]),
        T("Set the daily budget and bidding strategy for the Meta campaign.", [["budget"], ["bid", "bidding", "cpa", "cpc"]]),
        T("Set up the Meta Pixel conversion event for Purchase on the checkout page.", [["pixel"], ["purchase", "conversion event"]]),
        T("Launch the TikTok Ads campaign structure for the same hydrating serum launch.", [["tiktok"], ["campaign"]]),
        T("Write 3 short-form video hooks (first 3 seconds) for the TikTok hydrating serum ad.", [["hook"], ["tiktok", "video"]]),
        T("Choose the TikTok targeting parameters: interest categories and age range.", [["interest"], ["age"]]),
        T("Set up the TikTok Pixel and configure the purchase conversion event.", [["tiktok pixel", "pixel"], ["purchase", "conversion"]]),
        T("Describe creative variant A for the Meta ad — the visual concept for the serum.", [["visual", "creative", "image", "video"], ["serum", "product"]]),
        T("Describe creative variant B for the Meta ad, designed to A/B test against variant A.", [["variant", "test", "b"], ["creative", "visual"]]),
        T("Write the A/B test hypothesis comparing creative variant A vs variant B.", [["hypothesis"], ["variant", "a/b", "test"]]),
        T("Set the A/B test duration and the success metric you'll judge it on (e.g. CTR, CPA).", [["duration", "days"], ["ctr", "cpa", "metric"]]),
        T("Review Meta ad performance after 48 hours: report the CTR and CPC.", [["ctr"], ["cpc"]]),
        T("Review TikTok ad performance after 48 hours: report the CTR and CPA.", [["ctr"], ["cpa"]]),
        T("Identify the underperforming ad set and explain why you'd pause or adjust it.", [["pause", "adjust", "underperform"], ["why", "because"]]),
        T("Reallocate budget toward the best-performing ad set based on ROAS.", [["budget", "reallocate"], ["roas"]]),
        T("Write retargeting ad copy for users who viewed the product page but didn't purchase.", [["retarget"], ["viewed", "abandoned", "did not purchase"]]),
        T("Set up a retargeting custom audience in Meta Ads Manager based on website visitors.", [["retargeting audience", "custom audience"], ["website visitor", "viewed"]]),
        T("Write the weekly performance report summary: CTR, CPA, and ROAS across both platforms.", [["ctr"], ["roas", "cpa"]]),
        T("Recommend a scaling strategy for the best-performing ad — how much to increase budget and how.", [["scale", "scaling", "increase budget"], ["%", "percent", "gradually"]]),
        T("Identify one creative fatigue signal and how you'd refresh the ad creative.", [["fatigue", "frequency"], ["refresh", "new creative"]]),
        T("Summarize the overall campaign result for Cobalt Co.'s hydrating serum launch and next month's recommendation.", [["result", "summary", "performance"], ["recommend", "next month", "next step"]], 14)
      ]
    },
    {
      id: "email-marketing-manager", logo: "VX", title: "Email Marketing Manager", company: "Vertex Labs",
      location: "Remote", match: 78, matchTone: "warning", tags: ["Klaviyo", "Automation"],
      payType: "monthly", payAmount: 2100, currency: "$",
      client: "Vertex Labs", industry: 'Eco-friendly subscription box — "EcoBox"',
      brief: 'Vertex Labs runs <b>EcoBox</b>, a sustainable-products subscription box. You own lifecycle email in Klaviyo — welcome flows, cart recovery, segmentation, and reporting.',
      tasks: [
        T("Build the welcome email automation flow for new EcoBox subscribers — describe the trigger and the first email's content.", [["welcome"], ["trigger", "signup", "automation"]]),
        T("Design email #2 of the welcome flow, sent 2 days later, introducing the EcoBox brand story.", [["email 2", "second email", "follow up"], ["story", "brand"]]),
        T("Set up the abandoned cart recovery sequence in Klaviyo — describe the timing and content of the first reminder.", [["abandoned cart", "cart"], ["klaviyo", "reminder"]]),
        T("Write the subject line and preview text for the abandoned cart reminder email.", [["subject line", "subject"], ["preview text", "preview"]]),
        T("Segment the EcoBox list by engagement level (active vs inactive subscribers) and define your criteria.", [["segment"], ["engagement", "active", "inactive"]]),
        T("Segment the EcoBox list by purchase history — one-time buyers vs repeat subscribers.", [["segment"], ["purchase history", "repeat", "one-time"]]),
        T("Create a win-back campaign for subscribers who haven't opened an email in 60 days.", [["win-back", "winback"], ["60 days", "inactive"]]),
        T("A/B test 2 subject line variations for the next EcoBox monthly campaign.", [["subject line"], ["a/b", "variant", "test"]]),
        T("Write the monthly newsletter copy announcing EcoBox's new sustainable packaging.", [["newsletter"], ["sustainable", "packaging"]], 12),
        T("Set up a post-purchase upsell flow recommending a complementary EcoBox product.", [["upsell", "post-purchase"], ["recommend", "complementary"]]),
        T("Build a referral email flow encouraging subscribers to invite friends for a discount.", [["referral"], ["discount", "invite", "friend"]]),
        T("Review last month's email performance: report the open rate and click rate.", [["open rate"], ["click rate", "ctr"]]),
        T("Report revenue-per-email for the last campaign and explain what drove it.", [["revenue per email", "revenue"], ["drove", "because", "due to"]]),
        T("Define criteria for suppressing unengaged addresses from the EcoBox list to protect deliverability.", [["suppress", "clean", "unengaged"], ["deliverability"]]),
        T("Write the weekly email performance report summary for the Vertex Labs team.", [["report", "summary"], ["open rate", "click rate", "revenue"]])
      ]
    },
    {
      id: "content-marketing-lead", logo: "HW", title: "Content Marketing Lead", company: "Hatchway",
      location: "Remote", match: 74, matchTone: "warning", tags: ["Content", "Strategy"],
      payType: "monthly", payAmount: 3800, currency: "€",
      client: "Hatchway", industry: "B2B fintech — invoicing software for freelancers",
      brief: "Hatchway builds invoicing and payments software for freelancers. You lead content strategy end-to-end: planning, briefing writers, publishing, and reporting.",
      tasks: [
        T("Define the content strategy pillar topics for Hatchway aligned with Q3 growth goals.", [["pillar", "topic", "strategy"], ["q3", "growth"]]),
        T("Write a content brief for a blog post targeting freelancers about invoicing tips.", [["brief"], ["invoicing", "freelancer"]]),
        T("Assign the invoicing tips brief to a writer and specify the word count and deadline.", [["writer", "assign"], ["word count", "deadline"]]),
        T("Review a submitted draft for brand voice consistency — note one change you'd make.", [["brand voice", "voice", "tone"], ["change", "edit", "revise"]]),
        T("Write the SEO title and meta description for the invoicing tips blog post.", [["title"], ["meta description"]]),
        T("Publish the invoicing tips post to the CMS and confirm the on-page SEO elements are applied.", [["publish", "cms"], ["seo", "meta", "title"]]),
        T("Plan a content brief for a case study featuring a Hatchway customer.", [["case study"], ["customer"]]),
        T("Write the outline for a Hatchway ebook on getting paid faster as a freelancer.", [["outline"], ["ebook", "getting paid", "freelancer"]]),
        T("Draft 3 headline options for the Hatchway ebook.", [["headline"], ["ebook"]]),
        T("Write a content brief for a comparison article: Hatchway vs a competitor invoicing tool.", [["comparison", "vs"], ["competitor"]]),
        T("Plan the distribution channels for the new case study (e.g. email, LinkedIn, blog).", [["distribution", "channel"], ["linkedin", "email", "blog"]]),
        T("Write 3 LinkedIn post captions promoting the new case study.", [["linkedin"], ["case study"]]),
        T("Review analytics for last month's top-performing blog post and report the pageviews.", [["pageview", "traffic"], ["top performing", "best"]]),
        T("Identify a content gap Hatchway should fill, based on competitor content analysis.", [["gap"], ["competitor"]]),
        T("Write a content brief for a guest post pitch to a relevant fintech publication.", [["guest post"], ["pitch", "publication"]]),
        T("Plan next month's editorial calendar — list 3 planned topics.", [["editorial calendar", "calendar"], ["topic"]]),
        T("Write the brief for a webinar script on freelancer tax tips, co-hosted with a partner.", [["webinar"], ["tax", "freelancer"]]),
        T("Repurpose the ebook content into a 5-part email nurture sequence — outline the sequence.", [["repurpose", "nurture"], ["email", "sequence"]]),
        T("Report content marketing KPIs for the month: organic traffic and lead conversions from content.", [["organic traffic", "traffic"], ["lead", "conversion"]]),
        T("Write the quarterly content performance report summary for Hatchway leadership.", [["quarterly", "report", "summary"], ["performance", "kpi"]])
      ]
    },
    {
      id: "growth-marketing-freelancer", logo: "LM", title: "Growth Marketing Freelancer", company: "Lumio",
      location: "Remote", match: 88, matchTone: "success", tags: ["Growth", "CRO"],
      payType: "hourly", payAmount: 60, currency: "$",
      client: "Lumio", industry: "Fitness app — workout tracking with a paid subscription",
      brief: "Lumio is a fitness app with a free-to-paid subscription model. You're running growth experiments across the funnel — signup, onboarding, pricing, and retention.",
      tasks: [
        T("Audit the Lumio signup funnel and identify the step with the highest drop-off.", [["funnel", "signup"], ["drop-off", "dropoff", "drop off"]]),
        T("Propose a hypothesis for why users are dropping off at that step.", [["hypothesis"], ["because", "reason", "drop"]]),
        T("Design an A/B test for the Lumio pricing page to improve conversion rate.", [["a/b", "test", "variant"], ["pricing page", "conversion"]]),
        T("Define the success metric and required sample size for the pricing page test.", [["metric", "success"], ["sample size"]]),
        T("Implement heatmap tracking on the Lumio onboarding flow — describe what you'd track.", [["heatmap"], ["onboarding", "click"]]),
        T("Set up session recording to observe user behavior on the paywall screen.", [["session recording"], ["paywall", "behavior"]]),
        T("Analyze the pricing page test results and determine if they're statistically significant.", [["result", "test"], ["significant", "significance"]]),
        T("Recommend whether to ship the winning pricing page variant based on the test data.", [["ship", "implement", "roll out"], ["winning", "variant"]]),
        T("Design a growth experiment to improve trial-to-paid conversion for Lumio.", [["experiment"], ["trial", "paid", "conversion"]]),
        T("Write the experiment brief including hypothesis, metric, and timeline.", [["hypothesis"], ["metric", "timeline"]]),
        T("Propose a referral incentive to drive new Lumio signups from existing users.", [["referral"], ["incentive", "signup"]]),
        T("Design an in-app prompt to encourage free users to upgrade to premium.", [["in-app", "prompt"], ["upgrade", "premium"]]),
        T("Analyze churn data and identify the most common reason users cancel their Lumio subscription.", [["churn"], ["cancel", "reason"]]),
        T("Propose a win-back campaign for users who churned in the last 30 days.", [["win-back", "winback"], ["churn", "30 days"]]),
        T("Run a growth experiment on push notification timing to improve app open rate.", [["push notification"], ["open rate", "timing"]]),
        T("Report the results of the push notification experiment: open rate before vs after.", [["open rate"], ["before", "after", "result"]]),
        T("Identify a feature that correlates with higher retention among Lumio power users.", [["retention"], ["feature", "power user"]]),
        T("Propose an experiment to nudge new users toward that high-retention feature.", [["nudge", "onboarding", "experiment"], ["feature", "retention"]]),
        T("Present 3 growth experiment ideas ranked by expected impact and effort (ICE score).", [["impact", "effort", "ice"], ["rank", "priorit"]]),
        T("Write the monthly growth report summary: key experiment wins and next quarter's roadmap.", [["experiment", "growth"], ["roadmap", "next quarter", "summary"]])
      ]
    },
    {
      id: "social-media-manager", logo: "NP", title: "Social Media Manager", company: "NorthPeak",
      location: "Remote", match: 69, matchTone: "warning", tags: ["Instagram", "Community"],
      payType: "monthly", payAmount: 2800, currency: "$",
      client: "NorthPeak", industry: "Outdoor gear brand — hiking & camping equipment",
      brief: "NorthPeak sells hiking and camping gear. You manage Instagram content and community — planning, captions, Reels, and engagement reporting — for the summer hiking collection launch.",
      tasks: [
        T("Plan the 30-day Instagram content calendar theme for NorthPeak's summer hiking collection.", [["content calendar", "calendar"], ["summer", "hiking"]]),
        T("Write the caption for an Instagram post announcing the new hiking boots.", [["caption"], ["hiking boot", "boots"]]),
        T("Script a 15-second Reel concept showcasing the hiking boots in action.", [["reel", "video"], ["hiking boot", "boots"]]),
        T("Write 5 relevant hashtags to use on the hiking boots post.", [["hashtag"], ["hiking", "outdoor"]]),
        T("Plan a Reel trend NorthPeak could adapt for a camping tent product feature.", [["reel", "trend"], ["tent", "camping"]]),
        T("Write a community response to a customer comment asking about tent waterproofing.", [["response", "reply"], ["waterproof", "tent"]]),
        T("Draft a DM reply template for customers asking about NorthPeak's return policy.", [["dm", "direct message", "reply"], ["return policy", "return"]]),
        T("Plan an Instagram Story series taking followers behind the scenes of a product photoshoot.", [["story", "stories"], ["behind the scenes", "photoshoot"]]),
        T("Write the caption for a user-generated content repost featuring a customer's hiking trip.", [["repost", "ugc", "user-generated"], ["caption"]]),
        T("Plan a giveaway campaign to boost engagement — outline the prize and entry rules.", [["giveaway"], ["prize", "entry"]]),
        T("Write the giveaway announcement caption with a clear call-to-action.", [["giveaway"], ["call-to-action", "cta", "enter"]]),
        T("Identify 2 outdoor or hiking influencers NorthPeak could partner with for a collab post.", [["influencer"], ["collab", "partner"]]),
        T("Draft the outreach message to pitch a collaboration to one of those influencers.", [["outreach", "pitch"], ["collab", "partner", "influencer"]]),
        T("Plan a carousel post educating followers on how to choose the right hiking backpack.", [["carousel"], ["backpack", "hiking"]]),
        T("Write the caption and slide breakdown for the hiking backpack carousel.", [["slide", "carousel"], ["backpack"]]),
        T("Report last week's Instagram engagement rate and top-performing post.", [["engagement rate"], ["top performing", "best post"]]),
        T("Report follower growth for the month and what likely drove it.", [["follower growth", "followers"], ["drove", "because", "due to"]]),
        T("Plan a Q&A Story session addressing common hiking gear questions from followers.", [["q&a", "question"], ["hiking gear", "gear"]]),
        T("Propose a content idea leveraging a current outdoor or hiking trend/season.", [["trend", "season"], ["hiking", "outdoor"]]),
        T("Write the monthly social media performance report summary for NorthPeak leadership.", [["report", "summary"], ["engagement", "follower", "performance"]])
      ]
    }
  ];

  /* Monthly jobs: totalPay is the real contract value, paid out over 7 daily
     batches. Hourly jobs: totalPay is just a reference/estimate for display
     (real pay is hours-worked x rate, tracked separately). */
  jobs.forEach((j) => {
    j.totalPay = j.payType === "monthly" ? j.payAmount : j.payAmount * j.tasks.length;
  });

  function getNextFriday(from) {
    const d = new Date(from);
    const day = d.getDay();
    let diff = (5 - day + 7) % 7;
    if (diff === 0) diff = 7;
    d.setDate(d.getDate() + diff);
    d.setHours(17, 0, 0, 0);
    return d;
  }

  function formatDate(d) {
    return d.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  }

  function formatHMS(ms) {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const h = String(Math.floor(totalSec / 3600)).padStart(2, "0");
    const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
    const s = String(totalSec % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  }

  /* ---------------- Seeded daily rotation ---------------- */
  function hashString(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function seededShuffle(arr, seed) {
    const rand = mulberry32(seed);
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function dayIndexFor(appliedAt) {
    if (!appliedAt) return -1;
    return Math.floor((Date.now() - appliedAt) / DAY_MS);
  }

  /** Bank whatever time has accrued on a running hourly session into
   *  pending/hoursLoggedToday/totalHoursLogged, and stop the session.
   *  Safe to call even if no session is running (returns zeros). */
  function bankSession(job, s) {
    if (!s.sessionRunning || !s.sessionStartedAt) return { hours: 0, amount: 0 };
    const elapsedMs = Date.now() - s.sessionStartedAt;
    const hours = elapsedMs / 3600000;
    const amount = hours * job.payAmount;
    s.pending += amount;
    s.hoursLoggedToday += hours;
    s.totalHoursLogged += hours;
    s.sessionRunning = false;
    s.sessionStartedAt = null;
    return { hours, amount };
  }

  function startSession(job, s) {
    if (job.payType !== "hourly" || !s.applied || s.sessionRunning) return false;
    s.sessionRunning = true;
    s.sessionStartedAt = Date.now();
    return true;
  }

  /** Mark a job as applied, stamp the time, and generate its first day's
   *  task batch immediately (no reload needed). No-op if already applied. */
  function applyToJob(job, s) {
    if (s.applied) return false;
    s.applied = true;
    s.appliedAt = Date.now();
    s.dayIndex = -1;
    ensureCurrentDay(job, s);
    return true;
  }

  /** Make sure a job's "today's batch" is current. Rotates in a freshly
   *  reshuffled batch of that job's full task bank whenever 24h have passed
   *  since the last batch was generated. For monthly jobs, freezes once 7
   *  fully-completed days have been credited (contract finished). Mutates
   *  and returns whether anything changed. */
  function ensureCurrentDay(job, s) {
    if (!s.applied) return false;
    if (job.payType === "monthly" && s.daysCompleted >= 7) return false;

    const newDayIndex = dayIndexFor(s.appliedAt);
    if (newDayIndex === s.dayIndex) return false;

    // Credit the day we're leaving if every task in it was approved.
    if (s.dayIndex >= 0 && s.dayApproved && s.dayApproved.length && s.dayApproved.every(Boolean)) {
      s.daysCompleted += 1;
    }

    s.dayIndex = newDayIndex;

    // If that credit just finished a monthly contract, freeze — no new batch.
    if (job.payType === "monthly" && s.daysCompleted >= 7) {
      return true;
    }

    const order = seededShuffle(job.tasks.map((_, i) => i), hashString(job.id) ^ (newDayIndex * 2654435761));
    s.dayOrder = order;
    s.dayApproved = new Array(order.length).fill(false);
    s.dayCursor = 0;
    s.drafts = new Array(job.tasks.length).fill("");

    if (job.payType === "hourly") {
      s.hoursLoggedToday = 0;
      if (s.sessionRunning) bankSession(job, s); // a session can't span a day rollover
    }
    return true;
  }

  function msUntilNextBatch(s) {
    if (!s.applied || s.dayIndex < 0) return 0;
    const nextBoundary = s.appliedAt + (s.dayIndex + 1) * DAY_MS;
    return Math.max(0, nextBoundary - Date.now());
  }

  /** Monthly pay per approved task: today's full batch is worth totalPay/7,
   *  split evenly across however many tasks are in today's batch. */
  function monthlyPayPerTask(job, s) {
    const dailyPay = job.totalPay / 7;
    const tasksInBatch = (s.dayOrder && s.dayOrder.length) || job.tasks.length;
    return dailyPay / tasksInBatch;
  }

  /* ---------------- State ---------------- */

  function defaultState() {
    const state = {};
    jobs.forEach((j) => {
      state[j.id] = {
        applied: false,
        appliedAt: null,
        dayIndex: -1,
        dayOrder: [],
        dayApproved: [],
        dayCursor: 0,
        daysCompleted: 0,
        drafts: new Array(j.tasks.length).fill(""),

        sessionRunning: false,
        sessionStartedAt: null,
        hoursLoggedToday: 0,
        totalHoursLogged: 0,

        pending: 0,
        paid: 0,
        history: [],
        nextPayout: getNextFriday(new Date())
      };
    });
    return state;
  }

  /** Load state from localStorage, reconciled against the current job list
   *  (so adding/removing jobs or tasks later doesn't break old saves). */
  function loadState() {
    const base = defaultState();
    let raw;
    try {
      raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    } catch (e) {
      raw = null;
    }
    if (!raw) return base;

    jobs.forEach((j) => {
      const saved = raw[j.id];
      if (!saved) return;
      const s = base[j.id];

      s.applied = !!saved.applied;
      s.appliedAt = typeof saved.appliedAt === "number" ? saved.appliedAt : null;
      s.dayIndex = typeof saved.dayIndex === "number" ? saved.dayIndex : -1;
      s.dayOrder = Array.isArray(saved.dayOrder) ? saved.dayOrder : [];
      s.dayApproved = Array.isArray(saved.dayApproved) ? saved.dayApproved : [];
      s.dayCursor = typeof saved.dayCursor === "number" ? saved.dayCursor : 0;
      s.daysCompleted = typeof saved.daysCompleted === "number" ? saved.daysCompleted : 0;
      if (Array.isArray(saved.drafts)) {
        s.drafts = saved.drafts.slice(0, j.tasks.length);
        while (s.drafts.length < j.tasks.length) s.drafts.push("");
      }

      s.sessionRunning = !!saved.sessionRunning;
      s.sessionStartedAt = typeof saved.sessionStartedAt === "number" ? saved.sessionStartedAt : null;
      s.hoursLoggedToday = typeof saved.hoursLoggedToday === "number" ? saved.hoursLoggedToday : 0;
      s.totalHoursLogged = typeof saved.totalHoursLogged === "number" ? saved.totalHoursLogged : 0;

      s.pending = typeof saved.pending === "number" ? saved.pending : 0;
      s.paid = typeof saved.paid === "number" ? saved.paid : 0;
      s.history = Array.isArray(saved.history) ? saved.history : [];
      s.nextPayout = saved.nextPayout ? new Date(saved.nextPayout) : getNextFriday(new Date());

      // Roll the day forward in case 24h+ passed while the tab was closed,
      // and auto-bank any session that couldn't have legitimately kept
      // running while the page was gone.
      ensureCurrentDay(j, s);
    });
    return base;
  }

  /** Persist state to localStorage and notify listeners in this tab (the
   *  native 'storage' event only fires in OTHER tabs). */
  function saveState(state) {
    const serializable = {};
    Object.keys(state).forEach((id) => {
      const s = state[id];
      serializable[id] = {
        applied: s.applied,
        appliedAt: s.appliedAt,
        dayIndex: s.dayIndex,
        dayOrder: s.dayOrder,
        dayApproved: s.dayApproved,
        dayCursor: s.dayCursor,
        daysCompleted: s.daysCompleted,
        drafts: s.drafts,

        sessionRunning: s.sessionRunning,
        sessionStartedAt: s.sessionStartedAt,
        hoursLoggedToday: s.hoursLoggedToday,
        totalHoursLogged: s.totalHoursLogged,

        pending: s.pending,
        paid: s.paid,
        history: s.history,
        nextPayout: s.nextPayout instanceof Date ? s.nextPayout.toISOString() : s.nextPayout
      };
    });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
    } catch (e) {
      console.error("Marketsphare: failed to save state", e);
    }
    window.dispatchEvent(new CustomEvent("marketsphare:state-changed", { detail: state }));
  }

  /** Aggregate stats across all jobs, used by the Overview dashboard.
   *  status: "not-started" (never applied) / "active" (applied, in progress)
   *  / "completed" (monthly contract finished its 7 days). */
  function computeStats(state) {
    const perJob = jobs.map((job) => {
      const s = state[job.id];
      const total = (s.dayOrder && s.dayOrder.length) || job.tasks.length;
      const done = (s.dayApproved || []).filter(Boolean).length;
      const pct = total ? Math.round((done / total) * 100) : 0;
      let status = "not-started";
      if (s.applied) status = (job.payType === "monthly" && s.daysCompleted >= 7) ? "completed" : "active";
      return { job, state: s, done, total, pct, status };
    });

    const byCurrency = {}; // { "$": {paid, pending}, "€": {...} }
    function addTo(currency, key, amount) {
      if (!byCurrency[currency]) byCurrency[currency] = { paid: 0, pending: 0 };
      byCurrency[currency][key] += amount;
    }
    perJob.forEach((p) => {
      addTo(p.job.currency, "paid", p.state.paid);
      const liveSessionAmount = (p.job.payType === "hourly" && p.state.sessionRunning && p.state.sessionStartedAt)
        ? (Date.now() - p.state.sessionStartedAt) / 3600000 * p.job.payAmount
        : 0;
      addTo(p.job.currency, "pending", p.state.pending + liveSessionAmount);
    });

    const activeCount = perJob.filter((p) => p.status === "active").length;
    const completedCount = perJob.filter((p) => p.status === "completed").length;
    const startedCount = perJob.filter((p) => p.state.applied).length;
    const totalHistoryEntries = perJob.reduce((sum, p) => sum + p.state.history.length, 0);
    const daysCompletedTotal = perJob.reduce((sum, p) => sum + (p.state.daysCompleted || 0), 0);

    return { perJob, byCurrency, activeCount, completedCount, startedCount, totalHistoryEntries, daysCompletedTotal };
  }

  function formatCurrencyMap(map, key) {
    const parts = Object.keys(map)
      .filter((c) => map[c][key] > 0)
      .map((c) => `${c}${map[c][key].toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`);
    return parts.length ? parts.join(" · ") : null;
  }

  window.Marketsphare = {
    STORAGE_KEY,
    DAY_MS,
    jobs,
    getNextFriday,
    formatDate,
    formatHMS,
    dayIndexFor,
    ensureCurrentDay,
    msUntilNextBatch,
    monthlyPayPerTask,
    applyToJob,
    startSession,
    bankSession,
    defaultState,
    loadState,
    saveState,
    computeStats,
    formatCurrencyMap
  };
})(window);