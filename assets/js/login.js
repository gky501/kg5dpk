const BACN_AUTH_KEY = "bacn_controller_logged_in";

const loginForm = document.getElementById("loginForm");
const loginStatus = document.getElementById("loginStatus");

if (loginForm) {
  loginForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!email || !password) {
      showStatus("Enter your email and password.", "error");
      return;
    }

    localStorage.setItem(BACN_AUTH_KEY, "true");
    localStorage.setItem("bacn_controller_email", email);

    showStatus("Signed in. Opening dashboard...", "ok");

    setTimeout(function () {
      window.location.href = "dashboard.html";
    }, 300);
  });
}

function showStatus(message, type) {
  if (!loginStatus) return;

  loginStatus.textContent = message;
  loginStatus.className = "logger-status " + type;
}
