/* Admin guard: must be signed in (normal login page) AND the server must confirm the email is in ADMIN_EMAILS.
   If access fails, this page now shows exactly why. */
window.MS_ADMIN_PAGE = true; window.Marketsphare = window.Marketsphare || {};
(function () {
  const M = window.Marketsphare, esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));
  function unhide() { const h = document.getElementById("ms-hide"); if (h) h.remove(); }
  function problem(email, msg, hint) {
    unhide();
    document.body.innerHTML = '<div style="font-family:system-ui,sans-serif;max-width:560px;margin:60px auto;padding:24px;border:1px solid #ddd;border-radius:14px;line-height:1.6">'
      + '<h2 style="margin-top:0">Admin access problem</h2>'
      + (email ? '<p>Signed in as: <b>' + esc(email) + '</b></p>' : "")
      + '<p>Server says: <b>' + esc(msg) + '</b></p><p>' + hint + '</p>'
      + '<p><button id="msOut" style="padding:9px 16px;border-radius:8px;border:0;background:#4f46e5;color:#fff;font-weight:700;cursor:pointer">Log out and use another account</button> '
      + '<a href="../dashboard/index.html" style="margin-left:10px">Back to dashboard</a></p></div>';
    const b = document.getElementById("msOut");
    if (b) b.onclick = () => (typeof auth !== "undefined" ? auth.signOut() : Promise.resolve()).then(() => (location.href = "../auth/login.html"));
  }
  M.authReady = new Promise((resolve) => {
    if (typeof auth === "undefined") { problem("", "Firebase did not load on this page", "Check that <code>assets/js/firebase-config.js</code> is uploaded and that the page has internet access."); return; }
    const timer = setTimeout(() => problem("", "No response from sign-in", "Refresh the page. If it keeps happening, check your internet connection and that your Render domain is in Firebase Authorized domains."), 15000);
    auth.onAuthStateChanged(async (user) => {
      clearTimeout(timer);
      if (!user) { location.href = "../auth/login.html"; return; }
      M.currentUser = user;
      try { await M.call("/admin/ping"); }
      catch (e) {
        const m = e.message || "Request failed";
        let hint = "Tell your developer this exact message.";
        if (/admins only/i.test(m)) hint = "This email is <b>not</b> in <code>ADMIN_EMAILS</code> on Render. Open Render → your service → Environment → set <code>ADMIN_EMAILS</code> to exactly <b>" + esc(user.email || "") + "</b>, save, and wait for the redeploy to finish.";
        else if (/verify your email/i.test(m)) hint = "This account's email isn't verified yet. Open the verification email Firebase sent to this address and click the link, then log in again.";
        else if (/invalid session|not signed in/i.test(m)) hint = "The server could not validate your login. In Render, set <code>FIREBASE_PROJECT_ID</code> to the <code>projectId</code> shown in <code>assets/js/firebase-config.js</code>.";
        else if (/failed to fetch|request failed|networkerror/i.test(m)) hint = "The server could not be reached. If you are on Render's free plan it may be waking up — wait a minute and refresh.";
        problem(user.email, m, hint); return;
      }
      unhide(); resolve(user);
    });
  });
})();
