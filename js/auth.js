document.querySelectorAll("[data-year]").forEach(n => n.textContent = new Date().getFullYear());
const panels = { login: document.querySelector("#loginPanel"), signup: document.querySelector("#signupPanel") };
function setMode(mode) {
  const signup = mode === "signup";
  panels.login.hidden = signup; panels.signup.hidden = !signup;
  document.querySelectorAll("[data-mode]").forEach(btn => {
    const active = btn.dataset.mode === mode;
    if (btn.classList.contains("auth-tab")) btn.classList.toggle("active", active);
    btn.setAttribute("aria-selected", String(active));
  });
  clearMessages();
}
document.querySelectorAll("[data-mode]").forEach(btn => btn.addEventListener("click", () => setMode(btn.dataset.mode)));
document.querySelectorAll("[data-reveal]").forEach(btn => btn.addEventListener("click", () => {
  const input = document.getElementById(btn.dataset.reveal), visible = input.type === "password";
  input.type = visible ? "text" : "password"; btn.textContent = visible ? "Hide" : "Show";
}));
function message(id, text, error = false) {
  const el = document.getElementById(id); el.textContent = text; el.classList.toggle("error", error); el.classList.add("show");
}
function clearMessages() { document.querySelectorAll(".form-message").forEach(el => { el.textContent = ""; el.classList.remove("show", "error"); }); }
function validEmail(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }
function demoOrBackend() { return !window.NovaPayAPI || window.NovaPayAPI.isDemo(); }

document.querySelector("#loginForm").addEventListener("submit", async event => {
  event.preventDefault(); clearMessages();
  const email = document.querySelector("#loginEmail").value.trim(), password = document.querySelector("#loginPassword").value;
  if (!validEmail(email)) return message("loginMessage", "Enter a valid email address.", true);
  if (password.length < 8) return message("loginMessage", "Password must be at least 8 characters.", true);
  if (demoOrBackend()) {
    sessionStorage.setItem("novapay_demo_user", JSON.stringify({ name: email.split("@")[0], email }));
    location.href = "app.html"; return;
  }
  try {
    const result = await NovaPayAPI.login(email, password);
    if (result.access_token) sessionStorage.setItem("novapay_access_token", result.access_token);
    location.href = "app.html";
  } catch (err) { message("loginMessage", err.message || "Unable to log in. Please try again.", true); }
});

document.querySelector("#signupForm").addEventListener("submit", async event => {
  event.preventDefault(); clearMessages();
  const name = document.querySelector("#signupName").value.trim(), email = document.querySelector("#signupEmail").value.trim(), password = document.querySelector("#signupPassword").value;
  if (name.length < 2) return message("signupMessage", "Enter your full name.", true);
  if (!validEmail(email)) return message("signupMessage", "Enter a valid email address.", true);
  if (password.length < 8) return message("signupMessage", "Choose a password with at least 8 characters.", true);
  if (!document.querySelector("#acceptTerms").checked) return message("signupMessage", "Please agree to the terms to continue.", true);
  if (demoOrBackend()) {
    sessionStorage.setItem("novapay_demo_user", JSON.stringify({ name, email }));
    message("signupMessage", "Demo account details accepted. Opening the sample dashboard…");
    setTimeout(() => location.href = "app.html", 650); return;
  }
  try {
    await NovaPayAPI.signup(name, email, password);
    message("signupMessage", "Account created. You can now log in.", false);
    setMode("login"); document.querySelector("#loginEmail").value = email;
  } catch (err) { message("signupMessage", err.message || "Unable to create your account.", true); }
});
document.querySelector("#forgotButton").addEventListener("click", () => message("loginMessage", "Connect your backend's password-reset endpoint and email verification flow to enable password recovery."));
document.querySelectorAll("[data-static-message]").forEach(a => a.addEventListener("click", event => { event.preventDefault(); message("signupMessage", a.dataset.staticMessage); }));
const queryMode = new URLSearchParams(location.search).get("mode"); if (queryMode === "signup") setMode("signup");