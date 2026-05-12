const BACN_AUTH_KEY = "bacn_controller_logged_in";

function isLoggerPage() {
  return window.location.pathname.includes("/netlogger/");
}

function isLoginPage() {
  return window.location.pathname.endsWith("/netlogger/login.html") ||
    window.location.pathname.endsWith("/netlogger/");
}

function isLoggedIn() {
  return localStorage.getItem(BACN_AUTH_KEY) === "true";
}

function requireLogin() {
  if (!isLoggerPage()) return;
  if (isLoginPage()) return;

  if (!isLoggedIn()) {
    window.location.href = "login.html";
  }
}

function setupLoginForm() {
  const loginForm = document.getElementById("loginForm");
  const loginStatus = document.getElementById("loginStatus");

  if (!loginForm) return;

  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!email || !password) {
      showLoginStatus("Enter your email and password.", "error");
      return;
    }

    // Temporary front-end login.
    // Supabase auth will replace this.
    localStorage.setItem(BACN_AUTH_KEY, "true");
    localStorage.setItem("bacn_controller_email", email);

    showLoginStatus("Signed in. Opening dashboard...", "ok");

    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 500);
  });

  function showLoginStatus(message, type) {
    if (!loginStatus) return;
    loginStatus.textContent = message;
    loginStatus.className = `logger-status ${type}`;
  }
}

function setupLogout() {
  const logoutBtn = document.getElementById("logoutBtn");

  if (!logoutBtn) return;

  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem(BACN_AUTH_KEY);
    localStorage.removeItem("bacn_controller_email");
    window.location.href = "login.html";
  });
}

requireLogin();
setupLoginForm();
setupLogout();
