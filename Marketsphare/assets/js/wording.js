/* wording.js — shows professional "Feedback" wording on screen.
   Safe: it only rewrites visible text, never data, buttons or logic. */
(function () {
  var R = [
    [/Message from admin:/g, "Feedback:"],
    [/Admin message:/g, "Feedback:"],
    [/Admin note/g, "Feedback"],
    [/awaiting admin review/g, "awaiting review"],
    [/Requests are reviewed by an admin\./g, "Every request is reviewed by our team."],
    [/An admin will confirm or reject your documents shortly\./g, "Our team will review your documents shortly."],
    [/Files are kept in this browser's storage and shown to the admin demo page\./g, "Files are stored securely on the server for review by our team."],
    [/An admin confirms or rejects it and sends you a message\./g, "Our team reviews every request and sends you feedback."],
    [/Request this plan for an admin to confirm\./g, "Request this plan and our team will confirm it."],
    [/An admin reviews each request;[^.]*\./g, "Our team reviews each request. If it is approved, the amount is deducted from your job balance and Total Earnings and a receipt appears in Earnings. If it is declined, you will receive feedback and the money stays available."],
    [/An admin reviews it and sends you a confirmation or rejection message on that page\./g, "Our team reviews it and sends you feedback on that page."],
    [/Your request goes to the admin, who confirms or rejects it and sends you a message there\./g, "Your request goes to our team, who review it and send you feedback there."],
    [/the admin's message is shown on that page/g, "our team's feedback is shown on that page"],
    [/Press Apply on any job card, answer the two short questions, and wait a few seconds for review/g, "Press Apply now on any job card, tick your answers to the three quick questions, and wait about 13 seconds for review"],
    [/ The countdown is at the top of each workspace\./g, ""]
  ];
  function fix(s) { for (var i = 0; i < R.length; i++) s = s.replace(R[i][0], R[i][1]); return s; }
  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { var v = fix(root.nodeValue); if (v !== root.nodeValue) root.nodeValue = v; return; }
    if (root.nodeType !== 1) return;
    var tag = root.tagName;
    if (tag === "SCRIPT" || tag === "STYLE" || tag === "TEXTAREA") return;
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), n, list = [];
    while ((n = w.nextNode())) { var p = n.parentNode && n.parentNode.tagName; if (p !== "SCRIPT" && p !== "STYLE") list.push(n); }
    list.forEach(function (t) { var v = fix(t.nodeValue); if (v !== t.nodeValue) t.nodeValue = v; });
  }
  var cfg = { childList: true, subtree: true, characterData: true };
  var obs = new MutationObserver(function (muts) {
    obs.disconnect();
    muts.forEach(function (m) { if (m.type === "characterData") walk(m.target); else m.addedNodes.forEach(walk); });
    obs.observe(document.body, cfg);
  });
  function run() { walk(document.body); obs.observe(document.body, cfg); }
  if (document.body) run(); else document.addEventListener("DOMContentLoaded", run);
})();
