const BACN_CHECKINS_KEY = "bacn_current_checkins";
const BACN_SESSION_KEY = "bacn_current_session";

function getTodayString() {
  return new Date().toISOString().slice(0, 10);
}

function getTimeString() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getCheckins() {
  try {
    return JSON.parse(localStorage.getItem(BACN_CHECKINS_KEY)) || [];
  } catch {
    return [];
  }
}

function saveCheckins(checkins) {
  localStorage.setItem(BACN_CHECKINS_KEY, JSON.stringify(checkins));
}

function getSession() {
  try {
    return JSON.parse(localStorage.getItem(BACN_SESSION_KEY)) || null;
  } catch {
    return null;
  }
}

function saveSession(session) {
  localStorage.setItem(BACN_SESSION_KEY, JSON.stringify(session));
}

function setupDashboard() {
  const netDate = document.getElementById("netDate");
  const newNetForm = document.getElementById("newNetForm");
  const recentSessions = document.getElementById("recentSessions");

  if (netDate) {
    netDate.value = getTodayString();
  }

  if (newNetForm) {
    newNetForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const session = {
        netName: document.getElementById("netName").value.trim() || "BACN Net",
        controllerCallsign: document.getElementById("controllerCallsign").value.trim(),
        netDate: document.getElementById("netDate").value || getTodayString(),
        startedAt: new Date().toISOString()
      };

      saveSession(session);
      saveCheckins([]);

      window.location.href = "session.html";
    });
  }

  if (recentSessions) {
    const session = getSession();
    const checkins = getCheckins();

    if (!session) {
      recentSessions.innerHTML = `
        <div class="empty-state">
          No saved net sessions yet. Start a new session to begin logging check-ins.
        </div>
      `;
      return;
    }

    recentSessions.innerHTML = `
      <div class="session-row">
        <div>
          <strong>${escapeHtml(session.netName)}</strong><br>
          <span>${escapeHtml(session.netDate)} • ${checkins.length} check-ins</span>
        </div>
        <a class="button button-secondary" href="session.html">Resume</a>
      </div>
    `;
  }
}

function setupSessionPage() {
  const checkinForm = document.getElementById("checkinForm");
  const checkinRows = document.getElementById("checkinRows");
  const checkinCount = document.getElementById("checkinCount");
  const checkinStatus = document.getElementById("checkinStatus");
  const clearSessionBtn = document.getElementById("clearSessionBtn");
  const copyLogBtn = document.getElementById("copyLogBtn");
  const sessionMeta = document.getElementById("sessionMeta");
  const lookupCallsignBtn = document.getElementById("lookupCallsignBtn");

  if (!checkinForm) return;

  const session = getSession();

  if (session && sessionMeta) {
    const controller = session.controllerCallsign
      ? ` • Net Control: ${session.controllerCallsign}`
      : "";

    sessionMeta.textContent = `${session.netName} • ${session.netDate}${controller}`;
  }

  renderCheckins();
  if (lookupCallsignBtn) {
  lookupCallsignBtn.addEventListener("click", () => {
    lookupAndFillCallsign();
  });
}

const callsignInput = document.getElementById("callsign");

if (callsignInput) {
  callsignInput.addEventListener("blur", () => {
    lookupAndFillCallsign();
  });
}

function lookupAndFillCallsign() {
  const callsign = document.getElementById("callsign").value.trim().toUpperCase();

  if (!callsign) return;

  if (!Array.isArray(BACN_MEMBERS) || BACN_MEMBERS.length === 0) {
    showStatus("Member directory is still loading. Try again in a second.", "error");
    return;
  }

  const member = typeof findBacnMemberByCallsign === "function"
    ? findBacnMemberByCallsign(callsign)
    : null;

  const nameInput = document.getElementById("name");
  const licenseInput = document.getElementById("licenseType");
  const statusInput = document.getElementById("membershipStatus");

  if (member) {
    nameInput.value = member.name || "";
    licenseInput.value = member.licenseType || "";
    statusInput.value = "Club Member";

    showStatus(`${callsign} found: ${member.name} — ${member.licenseType} — Club Member`, "ok");
  } else {
    statusInput.value = "Guest";
    showStatus(`${callsign} not found in BACN roster. Marked as Guest.`, "error");
  }
}
  checkinForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const checkins = getCheckins();

    const checkin = {
      id: crypto.randomUUID(),
      time: getTimeString(),
      callsign: document.getElementById("callsign").value.trim().toUpperCase(),
      name: document.getElementById("name").value.trim(),
      licenseType: document.getElementById("licenseType").value.trim(),
      membershipStatus: document.getElementById("membershipStatus").value,
      location: document.getElementById("location").value.trim(),
      traffic: document.getElementById("traffic").value,
      notes: document.getElementById("notes").value.trim()
    };

    if (!checkin.callsign) {
      showStatus("Callsign is required.", "error");
      return;
    }

    checkins.push(checkin);
    saveCheckins(checkins);

    checkinForm.reset();
    document.getElementById("traffic").value = "No traffic";
    document.getElementById("callsign").focus();

    renderCheckins();
    showStatus(`${checkin.callsign} added.`, "ok");
  });

  if (clearSessionBtn) {
    clearSessionBtn.addEventListener("click", () => {
      const confirmed = confirm("Clear the locally saved check-in log?");

      if (!confirmed) return;

      saveCheckins([]);
      renderCheckins();
      showStatus("Local check-in log cleared.", "ok");
    });
  }

  if (copyLogBtn) {
    copyLogBtn.addEventListener("click", async () => {
      await navigator.clipboard.writeText(buildPlainTextLog());
      showStatus("Log copied to clipboard.", "ok");
    });
  }

  function renderCheckins() {
    const checkins = getCheckins();

    if (checkinCount) {
      checkinCount.textContent = checkins.length;
    }

    if (!checkinRows) return;

    if (checkins.length === 0) {
      checkinRows.innerHTML = `
        <tr>
          <td colspan="8" class="empty-table">No check-ins logged yet.</td>
        </tr>
      `;
      return;
    }

    checkinRows.innerHTML = checkins.map((item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(item.time)}</td>
        <td><strong>${escapeHtml(item.callsign)}</strong></td>
        <td>${escapeHtml(item.name)}</td>
        <td>${escapeHtml(item.location)}</td>
        <td>${escapeHtml(item.traffic)}</td>
        <td>${escapeHtml(item.notes)}</td>
        <td>
          <button class="delete-checkin" type="button" data-id="${item.id}">Delete</button>
        </td>
      </tr>
    `).join("");

    document.querySelectorAll(".delete-checkin").forEach((button) => {
      button.addEventListener("click", () => {
        const id = button.dataset.id;
        const updated = getCheckins().filter((item) => item.id !== id);
        saveCheckins(updated);
        renderCheckins();
      });
    });
  }

  function showStatus(message, type) {
    if (!checkinStatus) return;

    checkinStatus.textContent = message;
    checkinStatus.className = `logger-status ${type}`;

    setTimeout(() => {
      checkinStatus.textContent = "";
      checkinStatus.className = "logger-status";
    }, 2500);
  }
}

function setupExportPage() {
  const exportText = document.getElementById("exportText");
  const exportCount = document.getElementById("exportCount");
  const copyExportBtn = document.getElementById("copyExportBtn");
  const downloadCsvBtn = document.getElementById("downloadCsvBtn");

  if (!exportText) return;

  const checkins = getCheckins();
  exportText.value = buildPlainTextLog();

  if (exportCount) {
    exportCount.textContent = checkins.length;
  }

  if (copyExportBtn) {
    copyExportBtn.addEventListener("click", async () => {
      await navigator.clipboard.writeText(exportText.value);
      copyExportBtn.textContent = "Copied";
      setTimeout(() => {
        copyExportBtn.textContent = "Copy Log";
      }, 1500);
    });
  }

  if (downloadCsvBtn) {
    downloadCsvBtn.addEventListener("click", () => {
      downloadCsv();
    });
  }
}

function buildPlainTextLog() {
  const session = getSession();
  const checkins = getCheckins();

  const title = session?.netName || "BACN Net";
  const date = session?.netDate || getTodayString();
  const controller = session?.controllerCallsign || "";

  const lines = [
    `${title}`,
    `Date: ${date}`,
    `Repeater: KG5DPK / 443.475 MHz / +5.000 MHz / Tone 156.700`,
    controller ? `Net Control: ${controller}` : null,
    "",
    `Check-ins: ${checkins.length}`,
    "----------------------------------------"
  ].filter(Boolean);

  checkins.forEach((item, index) => {
    lines.push(
      `${index + 1}. ${item.time} | ${item.callsign} | ${item.name || ""} | ${item.location || ""} | ${item.traffic || ""} | ${item.notes || ""}`
    );
  });

  return lines.join("\n");
}

function downloadCsv() {
  const session = getSession();
  const checkins = getCheckins();

  const rows = [
    ["Number", "Time", "Callsign", "Name", "Location", "Traffic", "Notes"]
  ];

  checkins.forEach((item, index) => {
    rows.push([
      index + 1,
      item.time,
      item.callsign,
      item.name,
      item.location,
      item.traffic,
      item.notes
    ]);
  });

  const csv = rows
    .map((row) => row.map(csvEscape).join(","))
    .join("\n");

  const date = session?.netDate || getTodayString();
  const filename = `bacn-net-log-${date}.csv`;

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

function csvEscape(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

setupDashboard();
setupSessionPage();
setupExportPage();
