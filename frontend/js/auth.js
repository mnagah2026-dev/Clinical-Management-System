/**
 * CMS Authentication Guard & Utilities
 * Handles route protection, role-based redirects, and toast notifications.
 */

const Auth = {
  /** Check if user is logged in */
  isLoggedIn() {
    return !!localStorage.getItem('cms_token');
  },

  /** Get current role */
  getRole() {
    return localStorage.getItem('cms_role');
  },

  /** Decode JWT payload (base64) */
  getTokenData() {
    const token = localStorage.getItem('cms_token');
    if (!token) return null;
    try {
      const payload = token.split('.')[1];
      return JSON.parse(atob(payload));
    } catch (e) {
      return null;
    }
  },

  /** Get current user ID from token */
  getUserId() {
    const data = this.getTokenData();
    return data ? data.sub : null;
  },

  /** Require login — redirect if not authenticated */
  requireAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = '/pages/login.html';
      return false;
    }
    return true;
  },

  /** Require specific role */
  requireRole(role) {
    if (!this.requireAuth()) return false;
    if ((this.getRole() || '').toLowerCase() !== (role || '').toLowerCase()) {
      window.location.href = '/pages/index.html';
      return false;
    }
    return true;
  },

  /** Redirect authenticated user to their dashboard */
  redirectToDashboard() {
    const role = (this.getRole() || '').toLowerCase();
    const redirectMap = {
      'patient': '/pages/patient/dashboard.html',
      'doctor':  '/pages/doctor/dashboard.html',
      'nurse':   '/pages/nurse/dashboard.html',
      'admin':   '/pages/admin/dashboard.html',
    };
    window.location.href = redirectMap[role] || '/pages/index.html';
  }
};

/* ── Toast Notification System ── */
const Toast = {
  container: null,

  _ensureContainer() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  },

  show(message, type = 'info', duration = 4000) {
    this._ensureContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    this.container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(40px)';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  success(msg) { this.show(msg, 'success'); },
  error(msg)   { this.show(msg, 'error'); },
  warning(msg) { this.show(msg, 'warning'); },
  info(msg)    { this.show(msg, 'info'); }
};

/* ── Navbar Scroll Effect ── */
document.addEventListener('DOMContentLoaded', () => {
  const nav = document.querySelector('.nav');
  if (nav) {
    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 20);
    });
  }

  // Update nav auth state
  updateNavAuth();
});

function updateNavAuth() {
  const navActions = document.querySelector('.nav__actions');
  if (!navActions) return;

  if (Auth.isLoggedIn()) {
    const role = Auth.getRole();
    navActions.textContent = '';
    
    // Notification Bell
    const notifWrapper = document.createElement('div');
    notifWrapper.className = 'nav-notifications';
    
    const notifBtn = document.createElement('button');
    notifBtn.className = 'nav-notifications__btn';
    notifBtn.innerHTML = '🔔<span class="nav-notifications__badge" id="nav-notif-badge" style="display:none">0</span>';
    
    const notifDropdown = document.createElement('div');
    notifDropdown.className = 'nav-notifications__dropdown';
    notifDropdown.id = 'nav-notif-dropdown';
    notifDropdown.innerHTML = `
      <div class="nav-notifications__header">Notifications</div>
      <div id="nav-notif-list"><div class="nav-notifications__empty">Loading...</div></div>
    `;

    notifBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      notifDropdown.classList.toggle('active');
    });
    document.addEventListener('click', (e) => {
      if (!notifWrapper.contains(e.target)) {
        notifDropdown.classList.remove('active');
      }
    });

    notifWrapper.append(notifBtn, notifDropdown);

    const badge = document.createElement('span');
    badge.className = 'badge badge--primary';
    badge.style.padding = '6px 14px';
    badge.textContent = role;
    
    const dashBtn = document.createElement('a');
    dashBtn.href = '#';
    dashBtn.id = 'nav-dashboard';
    dashBtn.className = 'btn btn-secondary btn-sm';
    dashBtn.textContent = 'Dashboard';
    
    const logoutBtn = document.createElement('a');
    logoutBtn.href = '#';
    logoutBtn.id = 'nav-logout';
    logoutBtn.className = 'btn btn-ghost btn-sm';
    logoutBtn.textContent = 'Logout';
    
    navActions.append(notifWrapper, badge, dashBtn, logoutBtn);
    document.getElementById('nav-dashboard')?.addEventListener('click', (e) => {
      e.preventDefault();
      Auth.redirectToDashboard();
    });
    document.getElementById('nav-logout')?.addEventListener('click', (e) => {
      e.preventDefault();
      api.logout();
    });
  }
}

/* ── Intersection Observer for animations ── */
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('fade-in-up');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.animate-on-scroll').forEach(el => {
    observer.observe(el);
  });
}

document.addEventListener('DOMContentLoaded', initScrollAnimations);

/* ── Notification Manager (Polling) ── */
const NotificationManager = {
  active: false,
  intervalId: null,
  knownIds: new Set(),
  unreadCount: 0,
  notifications: [],

  init() {
    if (!Auth.isLoggedIn()) return;
    this.active = true;
    this.fetchNotifications();
    this.intervalId = setInterval(() => this.fetchNotifications(), 15000);
  },

  async fetchNotifications() {
    try {
      const data = await api.get('/portal/notifications');
      this.notifications = data;
      this.unreadCount = data.filter(n => !n.is_read).length;
      this.updateUI();

      // Check for new ones
      data.forEach(n => {
        if (!n.is_read && !this.knownIds.has(n.id)) {
          this.knownIds.add(n.id);
          Toast.info(n.message);
        }
      });
    } catch (e) {
      console.warn('Failed to fetch notifications', e);
    }
  },

  updateUI() {
    const badge = document.getElementById('nav-notif-badge');
    if (badge) {
      badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
      badge.style.display = this.unreadCount > 0 ? 'flex' : 'none';
    }
    this.renderDropdown();
  },

  renderDropdown() {
    const list = document.getElementById('nav-notif-list');
    if (!list) return;
    if (this.notifications.length === 0) {
      list.innerHTML = '<div class="nav-notifications__empty">No new notifications</div>';
      return;
    }
    list.innerHTML = '';
    this.notifications.forEach(n => {
      if (n.is_read) return;
      const item = document.createElement('div');
      item.className = 'notification-item notification-item--unread';
      const dateStr = new Date(n.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      item.innerHTML = `
        <div class="notification-item__msg">${n.message}</div>
        <div class="notification-item__time">${dateStr}</div>
      `;
      item.addEventListener('click', async () => {
        try {
          await api.patch(`/portal/notifications/${n.id}/read`);
          n.is_read = true;
          this.unreadCount--;
          this.updateUI();
        } catch(e) {
          console.error(e);
        }
      });
      list.appendChild(item);
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  NotificationManager.init();
});
