/* ==========================================================================
   auth.js — Authentication forms (login, register, forgot/reset, verify)
   Backed by Firebase Authentication (see firebase-config.js).

   Integration note: this file now also talks to window.MarketsphareProfile
   (assets/js/user-profile.js) so that a registered/logged-in user's name +
   email are recorded in the same per-uid profile store that
   profile.html / settings.html / dashboard-auth.js read from. Every call
   into MarketsphareProfile is guarded with a typeof check so this file
   still works fine on any page that doesn't happen to load user-profile.js.
   ========================================================================== */

(function () {
  'use strict';

  function toast(message, type) {
    if (window.MS && typeof window.MS.toast === 'function') {
      window.MS.toast(message, type);
    } else {
      console[type === 'error' ? 'error' : 'log'](message);
    }
  }

  function setLoading(btn, loading) {
    if (!btn) return;
    btn.disabled = loading;
    btn.dataset.originalText = btn.dataset.originalText || btn.textContent;
    btn.textContent = loading ? 'Please wait…' : btn.dataset.originalText;
  }

  function showError(form, message) {
    let err = form.querySelector('.form-error.general');
    if (!err) {
      err = document.createElement('div');
      err.className = 'form-error general';
      form.prepend(err);
    }
    err.textContent = message;
    err.style.display = 'block';
  }

  function friendlyError(err) {
    const map = {
      'auth/email-already-in-use': 'An account with this email already exists.',
      'auth/invalid-email': "That email address doesn't look right.",
      'auth/weak-password': 'Password should be at least 8 characters.',
      'auth/user-not-found': 'No account found with that email.',
      'auth/wrong-password': 'Incorrect password.',
      'auth/invalid-credential': 'Incorrect email or password.',
      'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
      'auth/network-request-failed': 'Network error — check your connection and try again.',
      'auth/unauthorized-domain': 'This domain is not authorized in Firebase. Add it under Authentication → Settings → Authorized domains.',
      'auth/popup-closed-by-user': 'Sign-in was cancelled.',
    };
    return map[err.code] || err.message || 'Something went wrong. Please try again.';
  }

  /** Make sure a MarketsphareProfile record exists for this Firebase user
   *  and has at least a name/email on it. Safe no-op if user-profile.js
   *  isn't loaded on this page, or if a profile already has data. */
  function ensureProfileRecord(user, extra) {
    if (!window.MarketsphareProfile || !user) return;
    const existing = window.MarketsphareProfile.getProfile(user);
    const patch = Object.assign({}, extra || {});
    if (!existing.fullName && user.displayName) patch.fullName = user.displayName;
    if (!existing.email && user.email) patch.email = user.email;
    if (Object.keys(patch).length) window.MarketsphareProfile.saveProfile(user, patch);
  }

  /* ---------------- Password visibility toggle ---------------- */
  function initPasswordToggles() {
    document.querySelectorAll('.toggle-pass').forEach((btn) => {
      btn.addEventListener('click', () => {
        const input = btn.closest('.input-icon-wrap').querySelector('input');
        input.type = input.type === 'password' ? 'text' : 'password';
        btn.classList.toggle('showing');
      });
    });
  }

  /* ---------------- Role toggle (Worker / Employer) on register ---------------- */
  function initRoleToggle() {
    const toggle = document.querySelector('.role-toggle');
    if (!toggle) return;
    const input = document.getElementById('selectedRole');
    toggle.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => {
        toggle.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        if (input) input.value = btn.dataset.role;
      });
    });
  }

  /* ---------------- Login form ---------------- */
  function initLoginForm() {
    const form = document.getElementById('loginForm');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      setLoading(btn, true);
      try {
        const email = form.email.value.trim();
        const password = form.password.value;
        const remember = form.remember ? form.remember.checked : true;

        await auth.setPersistence(
          remember ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION
        );
        const cred = await auth.signInWithEmailAndPassword(email, password);

        if (!cred.user.emailVerified) {
          toast('Please verify your email first.');
          window.location.href = 'verify-email.html';
          return;
        }

        // Legacy accounts created before the profile store existed won't
        // have a record yet — make sure one exists so profile.html /
        // settings.html / the sidebar all have something to show.
        ensureProfileRecord(cred.user);

        toast('Welcome back! Redirecting…');
        setTimeout(() => (window.location.href = '../dashboard/index.html'), 500);
      } catch (err) {
        const message = friendlyError(err);
        showError(form, message);
        toast(message, 'error');
      } finally {
        setLoading(btn, false);
      }
    });
  }

  /* ---------------- Register form ---------------- */
  function initRegisterForm() {
    const form = document.getElementById('registerForm');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');

      if (form.password.value !== form.confirmPassword.value) {
        showError(form, 'Passwords do not match.');
        return;
      }
      if (form.password.value.length < 8) {
        showError(form, 'Password must be at least 8 characters.');
        return;
      }
      if (!form.terms.checked) {
        showError(form, 'Please accept the Terms of Service to continue.');
        return;
      }

      setLoading(btn, true);
      try {
        const fullName = form.fullName.value.trim();
        const email = form.email.value.trim();
        const password = form.password.value;
        const role = (document.getElementById('selectedRole') || {}).value || 'worker';

        const cred = await auth.createUserWithEmailAndPassword(email, password);
        await cred.user.updateProfile({ displayName: fullName });

        // Keep the chosen role until this is backed by Firestore/a real DB.
        localStorage.setItem('ms_role_' + cred.user.uid, role);

        // Also record it (plus name/email) in the shared profile store so
        // profile.html / settings.html / the sidebar show real details
        // immediately instead of a placeholder.
        if (window.MarketsphareProfile) {
          window.MarketsphareProfile.saveProfile(cred.user, { fullName, email, role });
        }

        await cred.user.sendEmailVerification();
        toast('Account created! Check your email to verify.');
        setTimeout(() => (window.location.href = 'verify-email.html'), 700);
      } catch (err) {
        const message = friendlyError(err);
        showError(form, message);
        toast(message, 'error');
      } finally {
        setLoading(btn, false);
      }
    });
  }

  /* ---------------- Social sign-in (Google / Apple) ---------------- */
  function initSocialAuth() {
    const buttons = document.querySelectorAll('.social-auth .btn');
    if (!buttons.length) return;
    const form = document.getElementById('loginForm') || document.getElementById('registerForm');

    if (buttons[0]) {
      buttons[0].addEventListener('click', async () => {
        try {
          const provider = new firebase.auth.GoogleAuthProvider();
          const cred = await auth.signInWithPopup(provider);
          ensureProfileRecord(cred.user);
          toast('Welcome! Redirecting…');
          setTimeout(() => (window.location.href = '../dashboard/index.html'), 500);
        } catch (err) {
          const message = friendlyError(err);
          if (form) showError(form, message);
          toast(message, 'error');
        }
      });
    }
    if (buttons[1]) {
      buttons[1].addEventListener('click', () => {
        const message = "Apple sign-in isn't configured yet — please use email or Google for now.";
        if (form) showError(form, message);
        toast(message);
      });
    }
  }

  /* ---------------- Forgot password form ---------------- */
  function initForgotForm() {
    const form = document.getElementById('forgotForm');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      setLoading(btn, true);
      try {
        await auth.sendPasswordResetEmail(form.email.value.trim());
        document.getElementById('forgotSuccess').style.display = 'block';
        form.style.display = 'none';
      } catch (err) {
        if (err.code === 'auth/user-not-found') {
          document.getElementById('forgotSuccess').style.display = 'block';
          form.style.display = 'none';
        } else {
          showError(form, friendlyError(err));
        }
      } finally {
        setLoading(btn, false);
      }
    });
  }

  /* ---------------- Verify email page ---------------- */
  function initVerifyEmailPage() {
    const btn = document.getElementById('resendVerification');
    if (!btn) return;

    let cooldownTimer = null;
    function startCooldown(seconds) {
      let remaining = seconds;
      btn.disabled = true;
      const originalText = 'Resend Verification Email';
      cooldownTimer = setInterval(() => {
        remaining--;
        btn.textContent = `Resend Verification Email (${remaining}s)`;
        if (remaining <= 0) {
          clearInterval(cooldownTimer);
          btn.disabled = false;
          btn.textContent = originalText;
        }
      }, 1000);
    }

    auth.onAuthStateChanged((user) => {
      if (!user) {
        window.location.href = 'login.html';
        return;
      }

      const emailSlot = document.querySelector('.auth-box p.text-secondary strong');
      if (emailSlot) emailSlot.textContent = user.email;

      if (user.emailVerified) {
        ensureProfileRecord(user);
        window.location.href = '../dashboard/index.html';
        return;
      }

      const poll = setInterval(async () => {
        await user.reload();
        if (user.emailVerified) {
          clearInterval(poll);
          ensureProfileRecord(user);
          window.location.href = '../dashboard/index.html';
        }
      }, 4000);
    });

    btn.addEventListener('click', async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        await user.sendEmailVerification();
        btn.textContent = 'Sent! Check your inbox.';
        setTimeout(() => startCooldown(30), 1200);
      } catch (err) {
        toast(friendlyError(err), 'error');
      }
    });
  }

  /* ---------------- Logout (any page with [data-logout]) ---------------- */
  function initLogout() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-logout]');
      if (!btn) return;
      e.preventDefault();
      auth.signOut().then(() => {
        const inDashboard = window.location.pathname.includes('/dashboard/');
        window.location.href = inDashboard ? '../auth/login.html' : 'login.html';
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initPasswordToggles();
    initRoleToggle();
    initLoginForm();
    initRegisterForm();
    initSocialAuth();
    initForgotForm();
    initVerifyEmailPage();
    initLogout();
  });
})();

