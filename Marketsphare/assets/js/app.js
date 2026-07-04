/* ==========================================================================
   app.js — Core site behavior shared across all pages
   ========================================================================== */

(function () {
  'use strict';

  /* ---------------- Theme (Dark / Light) ---------------- */
  const THEME_KEY = 'ms_theme';

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }

  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(saved || (prefersDark ? 'dark' : 'light'));

    document.querySelectorAll('.theme-toggle').forEach((btn) => {
      btn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        applyTheme(current === 'dark' ? 'light' : 'dark');
      });
    });
  }

  /* ---------------- Sticky header shrink ---------------- */
  function initHeaderScroll() {
    const header = document.querySelector('.site-header');
    if (!header) return;
    window.addEventListener('scroll', () => {
      header.classList.toggle('scrolled', window.scrollY > 10);
    });
  }

  /* ---------------- Scroll reveal animations ---------------- */
  function initScrollReveal() {
    const els = document.querySelectorAll('.fade-up');
    if (!els.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    els.forEach((el) => observer.observe(el));
  }

  /* ---------------- Active nav link by current path ---------------- */
  function initActiveNav() {
    const path = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-links a').forEach((link) => {
      const href = link.getAttribute('href');
      if (href && href.endsWith(path) && path !== '') {
        link.classList.add('active');
      }
    });
  }

  /* ---------------- Generic dropdown filter chips (services/jobs pages) ---------------- */
  function initFilterChips() {
    document.querySelectorAll('.filters-row').forEach((row) => {
      row.querySelectorAll('.filter-chip').forEach((chip) => {
        chip.addEventListener('click', () => {
          row.querySelectorAll('.filter-chip').forEach((c) => c.classList.remove('active'));
          chip.classList.add('active');
        });
      });
    });
  }

  /* ---------------- Toast notification helper (used across app) ---------------- */
  window.MS = window.MS || {};
  window.MS.toast = function (message, type = 'success') {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:10px;';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    const colors = { success: '#10b981', error: '#ef4444', info: '#4f46e5' };
    toast.textContent = message;
    toast.style.cssText = `background:${colors[type] || colors.info};color:#fff;padding:14px 20px;border-radius:10px;font-size:14px;font-weight:500;box-shadow:0 8px 24px rgba(0,0,0,0.2);opacity:0;transform:translateY(10px);transition:all .3s ease;`;
    container.appendChild(toast);
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  };

  /* ---------------- Simple auth-state aware nav (reads localStorage demo token) ---------------- */
  window.MS.isLoggedIn = function () {
    return !!localStorage.getItem('ms_token');
  };

  window.MS.logout = function () {
    localStorage.removeItem('ms_token');
    localStorage.removeItem('ms_user');
    window.location.href = '/index.html';
  };

  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initHeaderScroll();
    initScrollReveal();
    initActiveNav();
    initFilterChips();
  });
})();
