const BACN_AUTH_KEY = "bacn_controller_logged_in";

const currentPath = window.location.pathname.toLowerCase();
const currentPage = currentPath.split("/").pop();

function isNetloggerPage() {
  return currentPath.includes("netlogger");
}

function isLoginPage() {
  return currentPage === "login.html";
}

function isLoggedIn() {
  return localStorage.getItem(BACN_AUTH_KEY) === "true";
}

function protectNetloggerPages() {
  if (!isNetloggerPage()) return;
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

    const email = document.getElementById("email")?.value.trim();
    const password = document.getElementById("password")?.value.trim();

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

protectNetloggerPages();
setupLoginForm();
setupLogoutButton();
