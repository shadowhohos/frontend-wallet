(() => {
  const $ = (s) => document.querySelector(s);
  const loginForm = $("#login-form"), signupForm = $("#signup-form");
  const loginTab = $("#login-tab"), signupTab = $("#signup-tab");
  const title = $("#auth-title"), subtitle = $("#auth-subtitle"), message = $("#auth-message");
  const setMessage = (text, type = "success") => { message.textContent = text; message.className = `form-message ${type}`; message.hidden = false; };
  const switchMode = (mode) => {
    const signup = mode === "signup";
    loginForm.hidden = signup; signupForm.hidden = !signup;
    loginTab.classList.toggle("active", !signup); signupTab.classList.toggle("active", signup);
    title.textContent = signup ? "Create your account" : "Welcome back";
    subtitle.textContent = signup ? "A few details and you're ready to explore." : "Log in to pick up where you left off.";
    message.hidden = true;
    history.replaceState(null, "", signup ? "?mode=signup" : "?mode=login");
  };
  loginTab.addEventListener("click", () => switchMode("login"));
  signupTab.addEventListener("click", () => switchMode("signup"));
  document.querySelectorAll(".toggle-password").forEach(btn => btn.addEventListener("click", () => {
    const input = btn.closest("label").querySelector("input");
    input.type = input.type === "password" ? "text" : "password";
    btn.textContent = input.type === "password" ? "Show" : "Hide";
  }));
  const getUsers = () => { try { return JSON.parse(localStorage.getItem("novapay_demo_users") || "[]"); } catch { return []; } };
  signupForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(signupForm);
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim().toLowerCase();
    const password = String(data.get("password") || "");
    if (!name || !email || password.length < 8 || !data.get("terms")) { setMessage("Please complete all fields and accept the demo terms.", "error"); return; }
    const users = getUsers();
    if (users.some(user => user.email === email)) { setMessage("An account with that email already exists. Try logging in.", "error"); return; }
    // Demo only: localStorage is not secure authentication and passwords are not sent to a server.
    users.push({ id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), name, email, password, createdAt: new Date().toISOString() });
    localStorage.setItem("novapay_demo_users", JSON.stringify(users));
    localStorage.setItem("novapay_demo_current_user", JSON.stringify({ name, email }));
    localStorage.setItem("novapay_demo_transactions", JSON.stringify([
      { id: "welcome-" + Date.now(), title: "Welcome to NovaPay", detail: "Demo account created", type: "in", amount: 0, status: "Completed", date: new Date().toISOString() }
    ]));
    setMessage("Demo account created! Opening your dashboard…");
    setTimeout(() => location.href = "app.html", 500);
  });
  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(loginForm);
    const email = String(data.get("email") || "").trim().toLowerCase();
    const password = String(data.get("password") || "");
    const user = getUsers().find(item => item.email === email && item.password === password);
    if (!user) { setMessage("We couldn't find a matching demo account. Create an account first or check your details.", "error"); return; }
    localStorage.setItem("novapay_demo_current_user", JSON.stringify({ name: user.name, email: user.email }));
    location.href = "app.html";
  });
  const params = new URLSearchParams(location.search);
  switchMode(params.get("mode") === "signup" ? "signup" : "login");
})();