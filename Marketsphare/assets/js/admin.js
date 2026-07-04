/* ==========================================================================
   admin.js — Admin panel interactivity
   ========================================================================== */

(function () {
  'use strict';

  /* ---------------- Bulk select rows in data tables ---------------- */
  function initBulkSelect() {
    document.querySelectorAll('.data-table').forEach((table) => {
      const selectAll = table.querySelector('thead input[type="checkbox"]');
      const rowChecks = () => table.querySelectorAll('tbody input[type="checkbox"]');
      const toolbar = document.querySelector('.bulk-toolbar');
      const countEl = toolbar ? toolbar.querySelector('.bulk-count') : null;

      function updateToolbar() {
        const checked = Array.from(rowChecks()).filter((c) => c.checked).length;
        if (toolbar) {
          toolbar.style.display = checked > 0 ? 'flex' : 'none';
          if (countEl) countEl.textContent = `${checked} selected`;
        }
      }

      if (selectAll) {
        selectAll.addEventListener('change', () => {
          rowChecks().forEach((c) => (c.checked = selectAll.checked));
          updateToolbar();
        });
      }
      rowChecks().forEach((c) => c.addEventListener('change', updateToolbar));
    });
  }

  /* ---------------- Settings sidebar nav ---------------- */
  function initSettingsNav() {
    const nav = document.querySelector('.settings-nav');
    if (!nav) return;
    nav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        nav.querySelectorAll('a').forEach((l) => l.classList.remove('active'));
        link.classList.add('active');
        const target = link.dataset.settingsTarget;
        document.querySelectorAll('.settings-panel').forEach((p) => p.style.display = 'none');
        const panel = document.getElementById(target);
        if (panel) panel.style.display = 'block';
      });
    });
  }

  /* ---------------- Simple bar chart renderer (no external lib) ---------------- */
  function initBarCharts() {
    document.querySelectorAll('.bar-chart[data-values]').forEach((chart) => {
      const values = chart.dataset.values.split(',').map(Number);
      const labels = (chart.dataset.labels || '').split(',');
      const max = Math.max(...values);
      chart.innerHTML = '';
      values.forEach((v, i) => {
        const col = document.createElement('div');
        col.className = 'bar-col';
        const bar = document.createElement('div');
        bar.className = 'bar';
        bar.style.height = '0%';
        const label = document.createElement('span');
        label.className = 'bar-label';
        label.textContent = labels[i] || '';
        col.appendChild(bar);
        col.appendChild(label);
        chart.appendChild(col);
        requestAnimationFrame(() => {
          bar.style.transition = 'height 0.8s ease';
          bar.style.height = `${(v / max) * 100}%`;
        });
      });
    });
  }

  /* ---------------- Confirm delete modals (simple confirm) ---------------- */
  function initDeleteConfirm() {
    document.querySelectorAll('[data-confirm-delete]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const ok = window.confirm('Are you sure you want to delete this item? This action cannot be undone.');
        if (!ok) e.preventDefault();
        else window.MS.toast('Item deleted', 'success');
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initBulkSelect();
    initSettingsNav();
    initBarCharts();
    initDeleteConfirm();
  });
})();
