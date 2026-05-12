const BACN_AUTH_KEY = "bacn_controller_logged_in";

function isLoggedIn() {
  return localStorage.getItem(BACN_AUTH_KEY) === "true";
}

function protectPage() {
  if (!isLoggedIn()) {
    window.location.href = "login.html";
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

protectPage();
setupLogoutButton();
