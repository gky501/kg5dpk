const BACN_AUTH_KEY = "bacn_controller_logged_in";

const path = window.location.pathname.toLowerCase();
const file = path.split("/").pop();

console.log("BACN auth loaded:", { path, file });

function isLoggedIn() {
  return localStorage.getItem(BACN_AUTH_KEY) === "true";
}

function isLoginPage() {
  return file === "login.html";
}

function isNetloggerPage() {
  return path.includes("/netlogger/");
}

function setupPageProtection() {
  // Do nothing outside netlogger
  if (!isNetloggerPage()) return;

  // Never redirect from login page
  if (isLoginPage()) return;

  // Protect dashboard/session/export
  if (!isLoggedIn()) {
    console.log("Not logged in. Redirecting to login.");
    window.location.replace("login.html");
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

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
      showStatus("Enter your email and password.", "error");
      return;
    }

    localStorage.setItem(BACN_AUTH_KEY, "true");
    localStorage.setItem("bacn_controller_email", email);

    showStatus("Signed in. Opening dashboard...", "ok");

    window.location.href = "dashboard.html";
  });

  function showStatus(message, type) {
    if (!loginStatus) return;
    loginStatus.textContent = message;
    loginStatus.className = "logger-status " + type;
  }
}

function setupLogoutButton() {
  const logoutBtn = document.getElementById("logoutBtn");

  if (!logoutBtn) return;

  logoutBtn.addEventListener("click", function () {
    localStorage.removeItem(BACN_AUTH_KEY);
    localStorage.removeItem("bacn_controller_email");
    window.location.href = "login.html";
  });
}

setupPageProtection();
setupLoginForm();
setupLogoutButton();
