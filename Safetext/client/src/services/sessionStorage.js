const SESSION_KEY = "Safetext_session_id";

export function getStoredSessionId() {
  try {
    return localStorage.getItem(SESSION_KEY) || "";
  } catch {
    return "";
  }
}

export function setStoredSessionId(id) {
  try {
    localStorage.setItem(SESSION_KEY, id);
  } catch {
    /* ignore */
  }
}
