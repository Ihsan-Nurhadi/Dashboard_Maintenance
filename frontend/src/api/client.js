// Helper untuk mendapatkan CSRF token dari cookie Django
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === name + '=') {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

export async function apiRequest(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `/api${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const method = (options.method || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') {
    const csrftoken = getCookie('csrftoken');
    if (csrftoken) {
      headers['X-CSRFToken'] = csrftoken;
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (response.status === 204) {
    return null;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error((data && (data.detail || data.message)) || 'Terjadi kesalahan sistem');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // Auth
  me: () => apiRequest('/auth/me/'),
  login: (credentials) => apiRequest('/auth/login/', { method: 'POST', body: JSON.stringify(credentials) }),
  logout: () => apiRequest('/auth/logout/', { method: 'POST' }),

  // Summary & Meta
  getSummary: () => apiRequest('/dashboard/summary/'),
  getMeta: () => apiRequest('/meta/'),

  // Sites
  getSites: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiRequest(`/sites/?${q}`);
  },
  getSite: (siteId) => apiRequest(`/sites/${encodeURIComponent(siteId)}/`),
  getSiteSummary: (siteId) => apiRequest(`/sites/${encodeURIComponent(siteId)}/summary/`),
  lookupSites: (query) => apiRequest(`/sites/lookup/?q=${encodeURIComponent(query)}`),
  getSiteOptions: () => apiRequest('/sites/options/'),
  createSite: (data) => apiRequest('/sites/', { method: 'POST', body: JSON.stringify(data) }),
  updateSite: (siteId, data) => apiRequest(`/sites/${encodeURIComponent(siteId)}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteSite: (siteId) => apiRequest(`/sites/${encodeURIComponent(siteId)}/`, { method: 'DELETE' }),

  // Status Logs & CCTV
  getSiteStatusLogs: (siteId, page = 1) => apiRequest(`/sites/${encodeURIComponent(siteId)}/status-logs/?page=${page}`),
  addSiteStatusLog: (siteId, data) => apiRequest(`/sites/${encodeURIComponent(siteId)}/status-logs/`, { method: 'POST', body: JSON.stringify(data) }),
  getSiteCctv: (siteId) => apiRequest(`/sites/${encodeURIComponent(siteId)}/cctv/`),
  addSiteCctv: (siteId, data) => apiRequest(`/sites/${encodeURIComponent(siteId)}/cctv/`, { method: 'POST', body: JSON.stringify(data) }),

  // Troubleshoots
  getTroubleshoots: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiRequest(`/troubleshoots/?${q}`);
  },
  getTroubleshoot: (id) => apiRequest(`/troubleshoots/${id}/`),
  createTroubleshoot: (data) => apiRequest('/troubleshoots/', { method: 'POST', body: JSON.stringify(data) }),
  updateTroubleshoot: (id, data) => apiRequest(`/troubleshoots/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteTroubleshoot: (id) => apiRequest(`/troubleshoots/${id}/`, { method: 'DELETE' }),
  startTroubleshoot: (id) => apiRequest(`/troubleshoots/${id}/start/`, { method: 'POST' }),
  submitReport: (id, data) => apiRequest(`/troubleshoots/${id}/report/`, { method: 'POST', body: JSON.stringify(data) }),
  getTroubleshootsBySite: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiRequest(`/troubleshoots/by-site/?${q}`);
  },

  // Installations
  getInstallations: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiRequest(`/installations/?${q}`);
  },
  createInstallation: (data) => apiRequest('/installations/', { method: 'POST', body: JSON.stringify(data) }),
  updateInstallation: (id, data) => apiRequest(`/installations/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteInstallation: (id) => apiRequest(`/installations/${id}/`, { method: 'DELETE' }),

  // PICs (Person In Charge / Teknisi & Leader)
  getPics: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiRequest(`/pics/?${q}`);
  },
  getPic: (id) => apiRequest(`/pics/${id}/`),
  getPicActivities: (id) => apiRequest(`/pics/${id}/activities/`),
  getPicOptions: () => apiRequest('/pics/options/'),
  createPic: (data) => apiRequest('/pics/', { method: 'POST', body: JSON.stringify(data) }),
  updatePic: (id, data) => apiRequest(`/pics/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  deletePic: (id) => apiRequest(`/pics/${id}/`, { method: 'DELETE' }),
};

