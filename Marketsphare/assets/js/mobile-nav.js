/* ==========================================================================
   mobile-nav.js — Mobile drawer navigation with nested dropdowns
   ========================================================================== */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.querySelector('.mobile-toggle');
    const drawer = document.querySelector('.mobile-drawer');
    const overlay = document.querySelector('.mobile-drawer-overlay');
    const closeBtn = document.querySelector('.mobile-drawer-close');

    if (!toggleBtn || !drawer || !overlay) return;

    function openDrawer() {
      drawer.classList.add('open');
      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
    }

    function closeDrawer() {
      drawer.classList.remove('open');
      overlay.classList.remove('open');
      document.body.style.overflow = '';
    }

    toggleBtn.addEventListener('click', openDrawer);
    overlay.addEventListener('click', closeDrawer);
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);

    // Nested dropdown accordion behavior
    document.querySelectorAll('.mobile-nav-item.has-children .mobile-nav-link').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const item = link.closest('.mobile-nav-item');
        const wasOpen = item.classList.contains('open');
        // close siblings for accordion feel
        item.parentElement.querySelectorAll('.mobile-nav-item.open').forEach((openItem) => {
          if (openItem !== item) openItem.classList.remove('open');
        });
        item.classList.toggle('open', !wasOpen);
      });
    });

    // Close drawer on resize to desktop
    window.addEventListener('resize', () => {
      if (window.innerWidth > 900) closeDrawer();
    });

    // Escape key closes drawer
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeDrawer();
    });
  });
})();
