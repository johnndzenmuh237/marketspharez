/* Admin guard: must be signed in (normal login page) AND the server must confirm the email is in ADMIN_EMAILS. */
window.MS_ADMIN_PAGE = true; window.Marketsphare = window.Marketsphare || {};
window.Marketsphare.authReady = new Promise((resolve) => {
  auth.onAuthStateChanged(async (user) => {
    if (!user) { location.href = "../auth/login.html"; return; }
    window.Marketsphare.currentUser = user;
    try { await window.Marketsphare.call("/admin/ping"); }
    catch (e) { document.documentElement.innerHTML = '<body style="font-family:system-ui;padding:40px"><h2>Not authorized</h2><p>' + (e.status === 403 ? "This account is not an admin." : "Could not reach the server.") + '</p><p><a href="../dashboard/index.html">Back to dashboard</a></p></body>'; return; }
    const h = document.getElementById("ms-hide"); if (h) h.remove(); resolve(user);
  });
});
