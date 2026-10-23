/* ==========================================================================
   dashboard.js — User dashboard interactivity

   Note: user name/initial/avatar rendering is now owned entirely by
   dashboard-auth.js (driven by the signed-in Firebase user + their saved
   Marketsphare profile), so this file no longer touches [data-user-name]
   or [data-user-initial].
   ========================================================================== */

(function () {
  'use strict';

  function initSidebarToggle() {
    const burger = document.querySelector('.sidebar-burger');
    const sidebar = document.querySelector('.app-sidebar');
    if (!burger || !sidebar) return;
    burger.addEventListener('click', () => sidebar.classList.toggle('open'));
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 960 && sidebar.classList.contains('open') && !sidebar.contains(e.target) && !burger.contains(e.target)) {
        sidebar.classList.remove('open');
      }
    });
  }

  function initTabs() {
    document.querySelectorAll('.tabs').forEach((tabGroup) => {
      const links = tabGroup.querySelectorAll('.tab-link');
      links.forEach((link) => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          links.forEach((l) => l.classList.remove('active'));
          link.classList.add('active');
          const target = link.dataset.tabTarget;
          const panelGroup = tabGroup.dataset.panelsFor ? document.querySelector(tabGroup.dataset.panelsFor) : tabGroup.parentElement;
          if (target && panelGroup) {
            panelGroup.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
            const panel = panelGroup.querySelector(`#${target}`);
            if (panel) panel.classList.add('active');
          }
        });
      });
    });
  }

  /* ---------------- Settings sub-nav (settings.html) ---------------- */
  function initSettingsNav() {
    const nav = document.querySelector('.settings-nav');
    if (!nav) return;
    const links = nav.querySelectorAll('a[data-settings-target]');
    links.forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        links.forEach((l) => l.classList.remove('active'));
        link.classList.add('active');
        document.querySelectorAll('.settings-panel').forEach((p) => (p.style.display = 'none'));
        const panel = document.getElementById(link.dataset.settingsTarget);
        if (panel) panel.style.display = 'block';
      });
    });
  }

  /* ---------------- Chat module (messages.html) ---------------- */
  function initChat() {
    const list = document.querySelector('.chat-list');
    const input = document.querySelector('.chat-input-row input');
    const sendBtn = document.querySelector('.chat-input-row button');
    const messages = document.querySelector('.chat-messages');
    if (!list || !messages) return;

    list.querySelectorAll('.chat-list-item').forEach((item) => {
      item.addEventListener('click', () => {
        list.querySelectorAll('.chat-list-item').forEach((i) => i.classList.remove('active'));
        item.classList.add('active');
        const nameEl = document.querySelector('.chat-header .name');
        if (nameEl) nameEl.textContent = item.querySelector('.name').textContent;
      });
    });

    function appendMessage(text, sent) {
      const bubble = document.createElement('div');
      bubble.className = `msg-bubble ${sent ? 'sent' : 'received'}`;
      bubble.textContent = text;
      messages.appendChild(bubble);
      messages.scrollTop = messages.scrollHeight;
    }

    function sendMessage() {
      const text = input.value.trim();
      if (!text) return;
      appendMessage(text, true);
      input.value = '';
      setTimeout(() => appendMessage('Thanks for the update — I will review and get back to you shortly.', false), 900);
    }

    if (sendBtn) sendBtn.addEventListener('click', sendMessage);
    if (input) input.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
  }

  /* ---------------- Resume / work-sample upload (profile.html) ---------------- */
  function initUploadZone() {
    document.querySelectorAll('.upload-zone').forEach((zone) => {
      const fileInput = zone.querySelector('input[type="file"]');
      if (!fileInput) return;
      zone.addEventListener('click', () => fileInput.click());
      zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.style.borderColor = 'var(--color-primary)'; });
      zone.addEventListener('dragleave', () => { zone.style.borderColor = ''; });
      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.style.borderColor = '';
        if (e.dataTransfer.files.length) {
          fileInput.files = e.dataTransfer.files;
          updateUploadLabel(zone, e.dataTransfer.files[0]);
        }
      });
      fileInput.addEventListener('change', () => {
        if (fileInput.files.length) updateUploadLabel(zone, fileInput.files[0]);
      });
    });
  }

  function updateUploadLabel(zone, file) {
    const label = zone.querySelector('.upload-filename') || (() => {
      const el = document.createElement('p');
      el.className = 'upload-filename mt-2';
      zone.appendChild(el);
      return el;
    })();
    label.textContent = `Selected: ${file.name}`;
    if (window.MS && window.MS.toast) window.MS.toast('File ready to upload', 'success');
  }

  /* ---------------- Notification dropdown ---------------- */
  function initNotifDropdown() {
    const bell = document.querySelector('.notif-bell');
    const panel = document.querySelector('.notif-panel');
    if (!bell || !panel) return;
    bell.addEventListener('click', (e) => {
      e.stopPropagation();
      panel.classList.toggle('open');
    });
    document.addEventListener('click', (e) => {
      if (!panel.contains(e.target)) panel.classList.remove('open');
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initSidebarToggle();
    initTabs();
    initSettingsNav();
    initChat();
    initUploadZone();
    initNotifDropdown();
    // Logout buttons are wired in dashboard-auth.js (window.MS.logout).
  });
})();
