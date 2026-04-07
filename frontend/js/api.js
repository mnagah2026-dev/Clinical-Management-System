/**
 * CMS API Service Layer
 * Wraps fetch() with JWT Bearer headers and standard error handling.
 */

const API_BASE = '/api/v1';

class ApiService {
  constructor() {
    this.baseUrl = API_BASE;
  }

  /** Get stored JWT token */
  getToken() {
    return localStorage.getItem('cms_token');
  }

  /** Get stored user role */
  getRole() {
    return localStorage.getItem('cms_role');
  }

  /** Build default headers with optional auth */
  _headers(includeAuth = true) {
    const headers = { 'Content-Type': 'application/json' };
    if (includeAuth) {
      const token = this.getToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  /** Core request handler */
  async _request(method, endpoint, body = null, includeAuth = true) {
    const config = {
      method,
      headers: this._headers(includeAuth),
    };
    if (body) config.body = JSON.stringify(body);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, config);

      // Handle 401 Unauthorized — bounce to login
      if (response.status === 401) {
        localStorage.removeItem('cms_token');
        localStorage.removeItem('cms_role');
        window.location.href = '/pages/login.html';
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw { status: response.status, detail: data.detail || 'Request failed' };
      }

      return data;
    } catch (error) {
      if (error.status) throw error; // Re-throw API errors
      console.error('Network error:', error);
      throw { status: 0, detail: 'Network error. Please check your connection.' };
    }
  }

  /* ── HTTP Methods ── */
  get(endpoint)           { return this._request('GET', endpoint); }
  post(endpoint, body)    { return this._request('POST', endpoint, body); }
  patch(endpoint, body)   { return this._request('PATCH', endpoint, body); }
  put(endpoint, body)     { return this._request('PUT', endpoint, body); }
  delete(endpoint)        { return this._request('DELETE', endpoint); }

  /* ── Auth Convenience ── */
  async login(email, password) {
    const data = await this._request('POST', '/auth/login', { email, password }, false);
    if (data && data.access_token) {
      localStorage.setItem('cms_token', data.access_token);
      localStorage.setItem('cms_role', data.role);
    }
    return data;
  }

  async register(patientData) {
    const data = await this._request('POST', '/auth/register', patientData, false);
    if (data && data.access_token) {
      localStorage.setItem('cms_token', data.access_token);
      localStorage.setItem('cms_role', data.role);
    }
    return data;
  }

  logout() {
    localStorage.removeItem('cms_token');
    localStorage.removeItem('cms_role');
    window.location.href = '/pages/login.html';
  }
}

// Singleton export
const api = new ApiService();
