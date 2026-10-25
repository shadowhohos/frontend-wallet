/* Small API adapter for a Python backend (FastAPI, Flask, Django REST, etc.).
   Adjust endpoint paths and response mapping to match your API contract. */
(function () {
  const config = window.NOVAPAY_CONFIG || {};
  const base = String(config.API_BASE_URL || "").replace(/\/+$/, "");
  async function request(path, options = {}) {
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    const token = sessionStorage.getItem("novapay_access_token");
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`${base}${path}`, { ...options, headers, credentials: "include" });
    const type = response.headers.get("content-type") || "";
    const data = type.includes("application/json") ? await response.json() : await response.text();
    if (!response.ok) {
      const message = data && typeof data === "object" ? (data.detail || data.message || data.error) : data;
      throw new Error(message || `Request failed (${response.status})`);
    }
    return data;
  }
  window.NovaPayAPI = {
    isDemo: () => Boolean(config.DEMO_MODE),
    request,
    login: (email, password) => request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
    signup: (name, email, password) => request("/auth/register", { method: "POST", body: JSON.stringify({ name, email, password }) }),
    logout: () => request("/auth/logout", { method: "POST", body: JSON.stringify({}) }),
    me: () => request("/auth/me"),
    wallet: () => request("/wallet"),
    transactions: () => request("/transactions"),
    transfer: (payload) => request("/transfers", { method: "POST", body: JSON.stringify(payload) }),
    updateProfile: (payload) => request("/profile", { method: "PATCH", body: JSON.stringify(payload) }),
    support: (payload) => request("/support/tickets", { method: "POST", body: JSON.stringify(payload) })
  };
})();