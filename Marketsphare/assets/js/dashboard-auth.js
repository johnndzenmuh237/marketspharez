/* ==========================================================================
   Dashboard auth guard (Firebase-based).
   Include AFTER firebase-config.js and BEFORE marketsphare-shared.js on
   every page inside /dashboard/.
   ========================================================================== */
window.Marketsphare = window.Marketsphare || {};

window.Marketsphare.authReady = new Promise((resolve) => {
  auth.onAuthStateChanged((user) => {
    if (!user) {
      window.location.href = "../auth/login.html";
      return;
    }
    if (!user.emailVerified) {
      window.location.href = "../auth/verify-email.html";
      return;
    }

    window.Marketsphare.currentUser = user;

    const displayName = user.displayName || (user.email ? user.email.split("@")[0] : "there");
    document.querySelectorAll("[data-user-name]").forEach((el) => (el.textContent = displayName));
    document.querySelectorAll("[data-user-initial]").forEach((el) => {
      el.textContent = displayName.charAt(0).toUpperCase();
    });

    resolve(user);
  });
});