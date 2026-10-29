/* wording.js — shows professional "Feedback" wording on screen.
   Safe: it only rewrites visible text, never data, buttons or logic. */
(function () {
  var R = [
    [/Message from admin:/g, "Feedback:"],
    [/Admin message:/g, "Feedback:"],
    [/Admin note/g, "Feedback"],
    [/awaiting admin review/g, "awaiting review"],
    [/Requests are reviewed by an admin\./g, "Every request is reviewed by our team."],
    [/Verify your identity so an admin can confirm your account\./g, "Verify your identity to confirm your account."],
    [/(An admin will confirm or reject your documents shortly\.|Our team will review your documents shortly\.)/g, "Your documents are being reviewed. The outcome will appear here once the review is complete."],
    [/(Files are kept in this browser's storage and shown to the admin demo page\.|Files are stored securely on the server for review by our team\.)/g, "Files are stored securely on the server for review."],
    [/(An admin confirms or rejects it and sends you a message\.|Our team reviews every request and sends you feedback\.)/g, "Every request is reviewed. You will receive confirmation, or feedback if it can't be approved, once the review is complete."],
    [/(Request this plan for an admin to confirm\.|Request this plan and our team will confirm it\.)/g, "Submit a request for this plan. Confirmation follows after review."],
    [/(An admin reviews each request;[^.]*\.|Our team reviews each request\. If it is approved,[\s\S]*?the money stays available\.)/g, "Each request goes through a quick review. Once approved, the amount is deducted from your job balance and Total Earnings and a receipt appears in Earnings. If it can't be approved, the reason is shown to you and the money stays available."],
    [/(An admin reviews it and sends you a confirmation or rejection message on that page\.|Our team reviews it and sends you feedback on that page\.)/g, "After review, the confirmation (or the reason, if it can't be approved) appears on that page."],
    [/(Your request goes to the admin, who confirms or rejects it and sends you a message there\.|Your request goes to our team, who review it and send you feedback there\.)/g, "Your request is reviewed, and the confirmation appears there once the review is complete."],
    [/(the admin's message is shown on that page|our team's feedback is shown on that page)/g, "the reason is shown on that page"],
    [/KYC or upgrade is rejected,/g, "KYC or upgrade can't be approved,"],
    [/For rejected withdrawals your funds stay in your available balance\./g, "Funds from a withdrawal that can't be approved stay in your available balance."],
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
})();
