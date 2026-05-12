const BACN_AUTH_KEY = "bacn_controller_logged_in";

function getCurrentPage() {
  return window.location.pathname.split("/").pop().toLowerCase();
}

function isInsideNetlogger() {
  return window.location.pathname.toLowerCase().includes("/netlogger/");
}

function isLoginPage() {
  const page = getCurrentPage();
  return page === "login.html" || page === "";
}

function isLoggedIn() {
  return localStorage.getItem(BACN_AUTH_KEY) === "true";
}

function requireLogin() {
  if (!isInsideNetlogger()) return;
  if (isLoginPage()) return;

  if (!isLoggedIn()) {
    window.location.href = "login.html";
  }
}

function setupLoginForm() {
  const loginForm = document.getElementById("loginForm");
  const loginStatus = document.getElementById("loginStatus");

  if (!loginForm) return;

  loginForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");

    const email = emailInput ? emailInput.value.trim() : "";
    const password = passwordInput ? passwordInput.value.trim() : "";

    if (!email || !password) {
      showLoginStatus("Enter your email and password.", "error");
      return;
    }

    localStorage.setItem(BACN_AUTH_KEY, "true");
    localStorage.setItem("bacn_controller_email", email);

    showLoginStatus("Signed in. Opening dashboard...", "ok");

    setTimeout(function () {
      window.location.href = "dashboard.html";
    }, 400);
  });

  function showLoginStatus(message, type) {
    if (!loginStatus) return;

    loginStatus.textContent = message;
    loginStatus.className = "logger-status " + type;
  }
}

function setupLogout() {
  const logoutBtn = document.getElementById("logoutBtn");

  if (!logoutBtn) return;

  logoutBtn.addEventListener("click", function () {
    localStorage.removeItem(BACN_AUTH_KEY);
    localStorage.removeItem("bacn_controller_email");
    window.location.href = "login.html";
  });
}

requireLogin();
setupLoginForm();
setupLogout();
