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
module.exports = { DAY, J, batchFor };
