/* wording.js — shows professional "Feedback" wording on screen.
   Safe: it only rewrites visible text, never data, buttons or logic. */
(function () {
  var R = [
    [/Message from admin:/g, "Feedback:"],
    [/Admin message:/g, "Feedback:"],
    [/Admin note/g, "Feedback"],
    [/await/* wording.js — shows professional "Feedback" wording on screen.
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
    [/ The countdown is at the top of each workspace\./g, ""],
    [/7 days after you apply to your first job/g, "once you complete 7 days of work"],
    [/\(7 days after you start working\)/g, "(if you keep working every day)"],
    [/Your day's total is credited[\s\S]*?that batch is forfeited\./g, "Each day's earnings are credited to your job balance and Total Earnings once you complete every task in that day's group (Advert Videos credit each video straight away). Tasks you skip are never lost — they roll over to your next day until you finish them."],
    [/Every job gets a fresh set of tasks every 24 hours after you apply\./g, "New tasks are added to your workspace every day, and anything you skip stays available."],
    [/Withdrawals open 7 days after you start working, and you can withdraw/g, "Earnings from every completed 7 days of work can be withdrawn at any time, and you can withdraw"],
    [/Apply to a job to start the 7-day countdown\./g, "Work for 7 days to unlock your first withdrawal."],
    [/WhatsApp/g, "Telegram"]
  ];
  var TG = "https://t.me/marketSphare";
  function links(root) {
    var list = [];
    if (root.nodeType === 1 && root.tagName === "A") list.push(root);
    if (root.querySelectorAll) { var q = root.querySelectorAll("a"); for (var i = 0; i < q.length; i++) list.push(q[i]); }
    list.forEach(function (a) {
      var h = a.getAttribute("href") || "";
      if (h.indexOf("https://wa.me/") === 0) {
        a.setAttribute("href", TG); a.setAttribute("target", "_blank"); a.setAttribute("rel", "noopener");
        var ic = a.querySelector("i.mi-wa, i[class='mi-wa']"); if (ic) ic.className = "mi-send";
      }
    });
  }
  function fix(s) { for (var i = 0; i < R.length; i++) s = s.replace(R[i][0], R[i][1]); return s; }
  function walk(root) {
    if (!root) return;
    if (root.nodeType === 1) links(root);
    if (root.nodeType === 3) { var v = fix(root.nodeValue); if (v !== root.nodeValue) root.nodeValue = v; return; }
    if (root.nodeType !== 1) return;
    var tag = root.tagName;
    if (tag === "SCRIPT" || tag === "STYLE" || tag === "TEXTAREA") return;
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), n, list = [];
    while ((n = w.nextNode())) { var p = n.parentNode && n.parentNode.tagName; if (p !== "SCRIPT" && p !== "STYLE") list.push(n); }
    list.forEach(function (t) { var v = fix(t.nodeValue); if (v !== t.nodeValue) t.nodeValue = v; });
  }
  var cfg = { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["href"] };
  var obs = new MutationObserver(function (muts) {
    obs.disconnect();
    muts.forEach(function (m) { if (m.type === "attributes") links(m.target); else if (m.type === "characterData") walk(m.target); else m.addedNodes.forEach(walk); });
    obs.observe(document.body, cfg);
  });
  function run() { walk(document.body); obs.observe(document.body, cfg); }
  if (document.body) run(); else document.addEventListener("DOMContentLoaded", run);
})();ing admin review/g, "awaiting review"],
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
