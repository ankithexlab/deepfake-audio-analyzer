/**
 * services/api.js
 * ─────────────────────────────────────────────────────────────
 * API Client for DeepFake Audio Analyzer Backend
 * Connects to http://localhost:5000/api/v1 (or VITE_API_URL)
 * ─────────────────────────────────────────────────────────────
 */

export const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

/**
 * Authentication token storage helpers
 */
export function getStoredToken() {
  try {
    return localStorage.getItem('aura_auth_token') || localStorage.getItem('deepfake_auth_token') || null;
  } catch {
    return null;
  }
}

export function setStoredToken(token) {
  try {
    localStorage.setItem('deepfake_auth_token', token);
    // Maintain backwards compatibility if legacy was accessed
    localStorage.setItem('aura_auth_token', token);
  } catch {
    // ignore local storage errors
  }
}

export function removeStoredToken() {
  try {
    localStorage.removeItem('deepfake_auth_token');
    localStorage.removeItem('aura_auth_token');
    localStorage.removeItem('deepfake_auth_user');
  } catch {
    // ignore
  }
}

export function getAuthHeaders() {
  const token = getStoredToken();
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export function handleAuthResponse(res) {
  if (res.status === 401) {
    removeStoredToken();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('deepfake:auth_expired'));
    }
  }
  return res;
}

/**
 * User Signup
 * @param {{ name: string, email: string, password: string }} data
 */
export async function signupUser(data) {
  const res = await fetch(`${BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Signup failed');
  }
  if (json.data?.token) {
    setStoredToken(json.data.token);
  }
  return json.data;
}

/**
 * User Login
 * @param {{ email: string, password: string }} data
 */
export async function loginUser(data) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Login failed');
  }
  if (json.data?.token) {
    setStoredToken(json.data.token);
  }
  return json.data;
}

/**
 * Instant Guest / Examiner Login (for Viva Evaluation)
 */
export async function guestLoginUser() {
  const res = await fetch(`${BASE_URL}/auth/guest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Guest session activation failed');
  }
  if (json.data?.token) {
    setStoredToken(json.data.token);
  }
  return json.data;
}

/**
 * Fetch Current Authenticated User Profile
 */
export async function getCurrentUserProfile() {
  const token = getStoredToken();
  if (!token) return null;
  try {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: { ...getAuthHeaders() },
    });
    if (res.status === 401) {
      removeStoredToken();
      return null;
    }
    const json = await res.json();
    if (!res.ok || !json.success) {
      removeStoredToken();
      return null;
    }
    return json.data?.user || null;
  } catch (err) {
    console.warn('API Error (getCurrentUserProfile):', err);
    removeStoredToken();
    return null;
  }
}

/**
 * Check backend health and model status
 */
export async function checkHealth() {
  try {
    const res = await fetch(`${BASE_URL}/health`);
    if (!res.ok) throw new Error(`Health check failed with status ${res.status}`);
    const json = await res.json();
    return json;
  } catch (err) {
    console.error('API Error (checkHealth):', err);
    throw err;
  }
}

/**
 * Get AI Model Information
 */
export async function getModelInfo() {
  try {
    const res = await fetch(`${BASE_URL}/analysis/model-info`);
    if (!res.ok) throw new Error('Failed to fetch model info');
    const json = await res.json();
    return json.data;
  } catch (err) {
    console.error('API Error (getModelInfo):', err);
    throw err;
  }
}

/**
 * Upload Audio File (WAV, MP3, FLAC, OGG)
 * @param {File|Blob} file 
 * @param {string} [fileName] 
 */
export async function uploadAudioFile(file, fileName = 'recording.wav') {
  const formData = new FormData();
  
  if (file instanceof File) {
    formData.append('audio', file);
  } else {
    // If Blob (e.g. from microphone recorder)
    formData.append('audio', file, fileName);
  }

  const res = await fetch(`${BASE_URL}/upload`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
    body: formData,
  });
  handleAuthResponse(res);

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'File upload failed');
  }

  return json.data; // { fileId, originalName, format, sizeHuman, status, ... }
}

/**
 * Trigger Preprocessing Pipeline for uploaded file
 * @param {string} fileId 
 */
export async function preprocessAudio(fileId) {
  const res = await fetch(`${BASE_URL}/preprocess/${fileId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
  });
  handleAuthResponse(res);

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Preprocessing failed');
  }

  return json.data; // { status: 'completed', samplingRateHz, featuresSummary, visualizations... }
}

/**
 * Run Deepfake AI Analysis on preprocessed file
 * @param {string} fileId 
 */
export async function runDeepfakeAnalysis(fileId) {
  const res = await fetch(`${BASE_URL}/analysis/${fileId}/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
  });
  handleAuthResponse(res);

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'AI Analysis failed');
  }

  return json.data; // { fileId, status, analysisResult: { isDeepfake, label, confidence, fakeProbability, realProbability... } }
}

/**
 * Get Full Feature JSON payload
 * @param {string} fileId 
 */
export async function getExtractedFeatures(fileId) {
  const res = await fetch(`${BASE_URL}/preprocess/${fileId}/features`, {
    headers: { ...getAuthHeaders() },
  });
  handleAuthResponse(res);
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Failed to retrieve raw features');
  }
  return json.data;
}

/**
 * Get structured forensic analysis report JSON
 * @param {string} fileId
 */
export async function getAnalysisReport(fileId) {
  const res = await fetch(`${BASE_URL}/analysis/${fileId}/report`, {
    headers: { ...getAuthHeaders() },
  });
  handleAuthResponse(res);
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Failed to fetch forensic report');
  }
  return json.data;
}

/**
 * Get direct URL to download PDF analysis report
 * @param {string} fileId
 */
export function getAnalysisPdfUrl(fileId) {
  const token = getStoredToken();
  return token 
    ? `${BASE_URL}/analysis/${fileId}/pdf?token=${encodeURIComponent(token)}`
    : `${BASE_URL}/analysis/${fileId}/pdf`;
}

/**
 * Fetch scan history from PostgreSQL database
 * @param {Object} [params] - { search, verdict, page, limit }
 */
export async function getHistory(params = {}) {
  const query = new URLSearchParams();
  if (params.search) query.append('search', params.search);
  if (params.verdict && params.verdict !== 'ALL') query.append('verdict', params.verdict);
  if (params.page) query.append('page', params.page);
  if (params.limit) query.append('limit', params.limit);

  const res = await fetch(`${BASE_URL}/history?${query.toString()}`, {
    headers: { ...getAuthHeaders() },
  });
  handleAuthResponse(res);
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Failed to load scan history');
  }
  return json.data; // { records, pagination }
}

/**
 * Fetch dashboard statistics from PostgreSQL database
 */
export async function getHistoryStats() {
  const res = await fetch(`${BASE_URL}/history/stats`, {
    headers: { ...getAuthHeaders() },
  });
  handleAuthResponse(res);
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Failed to load history stats');
  }
  return json.data;
}

/**
 * Delete a scan history record from PostgreSQL database and disk
 * @param {string} fileId 
 */
export async function deleteHistoryItem(fileId) {
  const res = await fetch(`${BASE_URL}/history/${fileId}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() },
  });
  handleAuthResponse(res);
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Failed to delete record');
  }
  return json;
}

/**
 * Get direct CSV export download URL
 */
export function getExportCsvUrl() {
  const token = getStoredToken();
  return token 
    ? `${BASE_URL}/history/export/csv?token=${encodeURIComponent(token)}`
    : `${BASE_URL}/history/export/csv`;
}

/**
 * Helper to build visualization image URLs
 * @param {string} fileId
 * @param {'waveform'|'spectrogram'|'mel'} type
 */
export function getVisualizationImageUrl(fileId, type) {
  const token = getStoredToken();
  return token 
    ? `${BASE_URL}/preprocess/${fileId}/visualization/${type}?token=${encodeURIComponent(token)}`
    : `${BASE_URL}/preprocess/${fileId}/visualization/${type}`;
}
