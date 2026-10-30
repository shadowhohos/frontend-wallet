(() => {
  const base = String((window.NOVAPAY_CONFIG || {}).API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/+$/, "");
  async function request(path, options = {}) {
    const headers = { Accept: "application/json", ...(options.headers || {}) };
    if (options.body) headers["Content-Type"] = "application/json";
    const token = sessionStorage.getItem("novapay_access_token");
    if (token) headers.Authorization = `Bearer ${token}`;
    let response;
    try { response = await fetch(base + path, { ...options, headers }); }
    catch { throw new Error(`Cannot reach API at ${base}. Start backend and check CORS.`); }
    const type = response.headers.get("content-type") || "";
    const data = type.includes("application/json") ? await response.json() : await response.text();
    if (!response.ok) {
      const detail = typeof data === "object" && data ? (data.detail || data.message || data.error) : data;
      throw new Error(detail || `Request failed (${response.status})`);
    }
    return data;
  }
  window.NovaPayAPI = {
    base, request,
    login: (username, password) => request("/login", { method: "POST", body: JSON.stringify({ username, password }) }),
    signup: (username, email, password) => request("/register", { method: "POST", body: JSON.stringify({ username, email, password }) }),
    wallet: () => request("/wallet"),
    transactions: () => request("/transactions")
  };
  console.info("NovaPay API loaded:", base);
})();