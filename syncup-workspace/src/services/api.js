const BASE_URL = '/api';

const defaultHeaders = {
  'Content-Type': 'application/json',
};

/** Resolve relative upload paths for img/src and downloads (Vite proxies /api). */
export const resolveMediaUrl = (url) => {
  if (!url || typeof url !== 'string') return url;
  if (url.startsWith('blob:') || url.startsWith('data:')) return url;
  const localApi = url.match(/^https?:\/\/(localhost|127\.0\.0\.1)(?::\d+)?(\/api\/.*)$/i);
  if (localApi) return localApi[2];
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/api/')) return url;
  if (url.startsWith('/uploads/')) return `/api${url}`;
  if (url.startsWith('/')) return url;
  return `${BASE_URL}/uploads/${url.replace(/^\/?uploads\//, '')}`;
};

// #region agent log
const agentDebugLog = (location, message, data, hypothesisId) => {
  const entry = { sessionId: 'c75bf6', location, message, data, hypothesisId, timestamp: Date.now() };
  try {
    const key = 'debug_c75bf6';
    const prev = JSON.parse(localStorage.getItem(key) || '[]');
    prev.push(entry);
    localStorage.setItem(key, JSON.stringify(prev.slice(-40)));
  } catch { /* ignore */ }
  fetch('/api/_debug/log', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  }).catch(() => {});
};
// #endregion

const triggerFileDownload = (href, filename, { revokeBlob = false } = {}) => {
  const a = document.createElement('a');
  a.href = href;
  a.download = filename || 'download';
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    if (revokeBlob && href.startsWith('blob:')) URL.revokeObjectURL(href);
  }, 500);
};

/** Download via same-origin API proxy (works for Cloudinary + local uploads). */
export const downloadMediaFile = async (url, filename = 'download') => {
  const resolved = resolveMediaUrl(url);
  agentDebugLog('api.js:downloadMediaFile:entry', 'download start', { url, resolved, filename }, 'B');
  if (!resolved) return;

  if (resolved.startsWith('blob:') || resolved.startsWith('data:')) {
    triggerFileDownload(resolved, filename, { revokeBlob: resolved.startsWith('blob:') });
    agentDebugLog('api.js:downloadMediaFile:blob', 'download blob path', { resolved }, 'D');
    return;
  }

  const proxyUrl = `/api/files/download?url=${encodeURIComponent(resolved)}&name=${encodeURIComponent(filename)}`;

  try {
    const res = await fetch(proxyUrl, { credentials: 'include' });
    agentDebugLog('api.js:downloadMediaFile:proxy', 'proxy fetch', {
      proxyUrl, ok: res.ok, status: res.status,
    }, 'C');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    triggerFileDownload(objectUrl, filename, { revokeBlob: true });
    agentDebugLog('api.js:downloadMediaFile:proxyOk', 'proxy blob download', { filename }, 'C');
  } catch (err) {
    console.error('Download failed:', err);
    agentDebugLog('api.js:downloadMediaFile:proxyErr', 'proxy failed', {
      proxyUrl, err: String(err?.message || err),
    }, 'C');
    const fallback = `${resolved}${resolved.includes('?') ? '&' : '?'}download=1`;
    triggerFileDownload(fallback, filename);
  }
};

const apiErrorMessage = (data, status, statusText) => {
  if (typeof data === 'string' && data.trim()) {
    const trimmed = data.trim();
    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed?.message) return String(parsed.message);
      } catch { /* use raw text */ }
    }
    return trimmed.length > 200 ? `${trimmed.slice(0, 200)}…` : trimmed;
  }
  if (data && typeof data === 'object' && data.message) {
    return Array.isArray(data.message) ? data.message.join(', ') : String(data.message);
  }
  return `API Error: ${status} ${statusText}`;
};

async function fetchClient(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;

  const config = {
    ...options,
    credentials: 'include',
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  if (options.body instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  try {
    const response = await fetch(url, config);

    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      throw new Error(apiErrorMessage(data, response.status, response.statusText));
    }

    return data;
  } catch (error) {
    console.error(`API Request failed for ${endpoint}:`, error);
    throw error;
  }
}

// -----------------------------------------------------------------------------
// Auth API
// -----------------------------------------------------------------------------
export const authAPI = {
  register: (userData) => fetchClient('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  }),

  login: (credentials) => fetchClient('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }),

  logout: () => fetchClient('/auth/logout', {
    method: 'POST',
  }),

  getMe: () => fetchClient('/auth/me', {
    method: 'GET',
  }),
};

// -----------------------------------------------------------------------------
// Workspace API
// -----------------------------------------------------------------------------
export const workspaceAPI = {
  getAll: () => fetchClient('/workspaces', { method: 'GET' }),

  getById: (id) => fetchClient(`/workspaces/${id}`, { method: 'GET' }),

  create: (data) => fetchClient('/workspaces', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  joinByCode: (code) => fetchClient(`/workspaces/join/${code}`, {
    method: 'POST',
  }),

  addMember: (workspaceId, userId) => fetchClient(`/workspaces/${workspaceId}/members`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  }),

  delete: (id) => fetchClient(`/workspaces/${id}`, {
    method: 'DELETE',
  }),
};

// -----------------------------------------------------------------------------
// Channel API
// -----------------------------------------------------------------------------
export const channelAPI = {
  getAll: (workspaceId) => fetchClient(`/workspaces/${workspaceId}/channels`, { method: 'GET' }),

  getById: (channelId) => fetchClient(`/channels/${channelId}`, { method: 'GET' }),

  // NEW: create now supports isPrivate
  create: (workspaceId, data) => fetchClient(`/workspaces/${workspaceId}/channels`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  joinByCode: (code) => fetchClient(`/channels/join/${code}`, {
    method: 'POST',
  }),

  getOrCreateDm: (workspaceId, userId) => fetchClient(`/workspaces/${workspaceId}/channels/dm/${userId}`, {
    method: 'POST',
  }),

  addMember: (channelId, userId) => fetchClient(`/channels/${channelId}/members`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  }),

  // NEW: kick member (creator only)
  kickMember: (channelId, userId) => fetchClient(`/channels/${channelId}/members/${userId}`, {
    method: 'DELETE',
  }),

  removeMember: (channelId, userId) => fetchClient(`/channels/${channelId}/members/${userId}`, {
    method: 'DELETE',
  }),

  // NEW: pinned messages
  getPinnedMessages: (channelId) => fetchClient(`/channels/${channelId}/pins`, {
    method: 'GET',
  }),

  pinMessage: (channelId, messageId) => fetchClient(`/channels/${channelId}/pins/${messageId}`, {
    method: 'POST',
  }),

  unpinMessage: (channelId, messageId) => fetchClient(`/channels/${channelId}/pins/${messageId}`, {
    method: 'DELETE',
  }),
};

// -----------------------------------------------------------------------------
// Message API
// -----------------------------------------------------------------------------
export const messageAPI = {
  getMessages: (channelId, page = 1, limit = 50) =>
    fetchClient(`/channels/${channelId}/messages?page=${page}&limit=${limit}`, { method: 'GET' }),

  uploadFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return fetchClient('/upload', {
      method: 'POST',
      body: formData,
    });
  },

  sendMessage: async (channelId, text, file = null, options = {}) => {
    let fileData = {};

    if (file) {
      const uploadRes = await messageAPI.uploadFile(file);
      agentDebugLog('api.js:sendMessage:upload', 'upload response', {
        fileUrl: uploadRes?.fileUrl, fileName: uploadRes?.fileName, fileType: uploadRes?.fileType,
      }, 'A');
      if (!uploadRes?.fileUrl) {
        throw new Error('Upload succeeded but no file URL was returned');
      }
      fileData = uploadRes;
    }

    return fetchClient(`/channels/${channelId}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        text: text || '',
        fileUrl: fileData.fileUrl || undefined,
        fileType: fileData.fileType || (
          file?.type?.startsWith('image/')
            ? 'image'
            : file?.type?.startsWith('video/')
              ? 'video'
              : file?.type
        ) || undefined,
        fileName: fileData.fileName || file?.name || undefined,
        fileSize: fileData.fileSize ?? file?.size ?? undefined,
        system: Boolean(options.system),
      }),
    });
  },

  // NEW: delete message (own messages within 5 min)
  deleteMessage: (messageId) => fetchClient(`/messages/${messageId}`, {
    method: 'DELETE',
  }),

  pinMessage: (messageId) => fetchClient(`/messages/${messageId}/pin`, {
    method: 'PATCH',
  }),
};

// -----------------------------------------------------------------------------
// Call log API
// -----------------------------------------------------------------------------
export const callAPI = {
  logEvent: (data) => fetchClient('/calls/log', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  getHistory: (channelId, limit = 50) =>
    fetchClient(`/channels/${channelId}/calls?limit=${limit}`, { method: 'GET' }),
};

// -----------------------------------------------------------------------------
// Scheduled calls API
// -----------------------------------------------------------------------------
export const scheduledCallAPI = {
  list: (workspaceId, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    const suffix = qs ? `?${qs}` : '';
    return fetchClient(`/workspaces/${workspaceId}/scheduled-calls${suffix}`, { method: 'GET' });
  },

  create: (workspaceId, data) => fetchClient(`/workspaces/${workspaceId}/scheduled-calls`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  cancel: (workspaceId, callId) => fetchClient(`/workspaces/${workspaceId}/scheduled-calls/${callId}`, {
    method: 'DELETE',
  }),
};

// -----------------------------------------------------------------------------
// User API
// -----------------------------------------------------------------------------
export const userAPI = {
  search: (query) => fetchClient(`/users/search?q=${query}`, { method: 'GET' }),

  updateProfile: (id, data) => fetchClient(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),

  uploadAvatar: (id, file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return fetchClient(`/users/${id}`, {
      method: 'PATCH',
      body: formData,
    });
  },
};