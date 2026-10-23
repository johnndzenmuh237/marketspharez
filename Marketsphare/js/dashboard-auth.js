/* ==========================================================================
   Dashboard auth guard (Firebase-based).

   Required script order on every page inside /dashboard/:
     firebase-app-compat.js, firebase-auth-compat.js, firebase-config.js,
     user-profile.js, app.js, THIS FILE, marketsphare-shared.js, dashboard.js

   app.js must load BEFORE this file: app.js sets a generic
   window.MS.logout()/toast() for the whole site, and this file
   intentionally overrides window.MS.logout() afterwards with a real
   Firebase sign-out (see bottom of this file). If the order were
   reversed, app.js would clobber the Firebase logout and "Log Out" would
   silently stop signing the user out of Firebase.

   Responsibilities:
   - Redirect to login if nobody is signed in, or to email verification
     if their address isn't verified yet (matches auth.js's flow).
   - Load this user's saved profile (name, title, bio, etc.) and push it
     into every [data-user-name] / [data-user-initial] element on the page,
     so the signed-in user's own details show everywhere — sidebar,
     topbar avatar, welcome banner — instead of a hardcoded placeholder.
   - Re-apply automatically whenever profile.html/settings.html saves a
     change, so other open tabs/sections update without a reload.
   ========================================================================== */
window.Marketsphare = window.Marketsphare || {};

function msApplyProfileToDOM(user, profile) {
  const displayName = profile.fullName || (user.email ? user.email.split("@")[0] : "there");
  document.querySelectorAll("[data-user-name]").forEach((el) => (el.textContent = displayName));
  document.querySelectorAll("[data-user-initial]").forEach((el) => {
    el.textContent = window.MarketsphareProfile.initials(profile.fullName || user.email || "?");
  });
  document.querySelectorAll("[data-user-title]").forEach((el) => {
    el.textContent = profile.jobTitle || "Worker Account";
  });
  document.querySelectorAll("[data-user-email]").forEach((el) => {
    el.textContent = profile.email || user.email || "";
  });
}

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
    const profile = window.MarketsphareProfile.getProfile(user);
    window.Marketsphare.currentProfile = profile;
    msApplyProfileToDOM(user, profile);

    resolve(user);
  });
});

// Live-refresh the DOM the instant profile.html / settings.html saves a
// change, even without navigating away.
window.addEventListener("marketsphare:profile-changed", (e) => {
  if (window.Marketsphare.currentUser) {
    window.Marketsphare.currentProfile = e.detail;
    msApplyProfileToDOM(window.Marketsphare.currentUser, e.detail);
  }
});

/* ---------------- Shared logout ----------------
   app.js defines a generic, non-Firebase window.MS.logout() (it clears an
   old 'ms_token'/'ms_user' localStorage scheme and sends the user to
   /index.html) — fine for marketing pages, wrong for the dashboard, where
   we need an actual Firebase sign-out. This file loads AFTER app.js on
   every dashboard page specifically so this assignment runs last and
   wins, overriding app.js's version with the real one. Do not add an
   "if (!window.MS.logout)" guard here — it must always override. */
window.MS = window.MS || {};
window.MS.logout = function () {
  auth.signOut().then(() => {
    window.location.href = "../auth/login.html";
  });
};

/* Toast: app.js already defines window.MS.toast globally and is loaded
   before this file on every dashboard page, so nothing to add here. */

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-logout]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      window.MS.logout();
    });
  });
});
