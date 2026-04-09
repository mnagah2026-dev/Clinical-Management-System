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
    
    navActions.append(badge, dashBtn, logoutBtn);
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
