/* ==========================================================================
   auth.js — Authentication forms (login, register, forgot/reset, verify)
   Now backed by Firebase Authentication (see firebase-config.js).
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
    };
    return map[err.code] || err.message || 'Something went wrong. Please try again.';
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
        window.location.href = '../dashboard/index.html';
        return;
      }

      const poll = setInterval(async () => {
        await user.reload();
        if (user.emailVerified) {
          clearInterval(poll);
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
    initForgotForm();
    initVerifyEmailPage();
    initLogout();
  });
})();
