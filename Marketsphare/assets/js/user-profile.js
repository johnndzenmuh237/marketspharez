/* ==========================================================================
   user-profile.js — single source of truth for "who is this user & what
   have they told us about themselves".

   Firebase Auth only natively stores email + displayName + photoURL. Every
   other field on the Profile / Settings pages (job title, bio, phone,
   location, rate, skills, portfolio link, role) is kept here, namespaced
   per Firebase uid in localStorage, so it survives reloads and never leaks
   between two different accounts signed in on the same browser.

   Loaded BEFORE dashboard-auth.js (dashboard pages) or auth.js (login/
   register pages) — both depend on window.MarketsphareProfile.
   ========================================================================== */
(function (window) {
  "use strict";

  const PREFIX = "marketsphare_profile_";

  function defaultProfile(user) {
    return {
      fullName: (user && user.displayName) || "",
      email: (user && user.email) || "",
      phone: "",
      jobTitle: "",
      bio: "",
      location: "",
      hourlyRate: "",
      portfolioLink: "",
      skills: [],
      role: "worker"
    };
  }

  function getProfile(user) {
    const base = defaultProfile(user);
    if (!user) return base;
    let raw;
    try {
      raw = JSON.parse(localStorage.getItem(PREFIX + user.uid) || "null");
    } catch (e) {
      raw = null;
    }
    return raw ? Object.assign(base, raw) : base;
  }

  /** Shallow-merges `data` into whatever is already stored for this user
   *  and persists it. Returns the merged profile. */
  function saveProfile(user, data) {
    if (!user) return null;
    const merged = Object.assign(getProfile(user), data);
    try {
      localStorage.setItem(PREFIX + user.uid, JSON.stringify(merged));
    } catch (e) {
      console.error("Marketsphare: failed to save profile", e);
    }
    window.dispatchEvent(new CustomEvent("marketsphare:profile-changed", { detail: merged }));
    return merged;
  }

  function initials(nameOrEmail) {
    const s = (nameOrEmail || "").trim();
    if (!s) return "?";
    const parts = s.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  window.MarketsphareProfile = { getProfile, saveProfile, defaultProfile, initials, STORAGE_PREFIX: PREFIX };
})(window);
