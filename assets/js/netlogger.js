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

  const scriptViewerBtn = document.getElementById("scriptViewerBtn");
  const scriptModal = document.getElementById("scriptModal");
  const closeScriptBtn = document.getElementById("closeScriptBtn");

  let map = null;
  let markerLayer = null;
  let editingCheckinId = null;

  if (!checkinForm) return;

  const session = getSession();

  if (session && sessionMeta) {
    const controller = session.controllerCallsign
      ? ` • Net Control: ${session.controllerCallsign}`
      : "";

    sessionMeta.textContent = `${session.netName} • ${session.netDate}${controller}`;
  }

  setupMap();
  renderCheckins();

  if (scriptViewerBtn && scriptModal) {
    scriptViewerBtn.addEventListener("click", () => {
      scriptModal.hidden = false;
    });
  }

  if (closeScriptBtn && scriptModal) {
    closeScriptBtn.addEventListener("click", () => {
      scriptModal.hidden = true;
    });
  }

  if (scriptModal) {
    scriptModal.addEventListener("click", (event) => {
      if (event.target === scriptModal) {
        scriptModal.hidden = true;
      }
    });
  }

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

  checkinForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const checkins = getCheckins();

    const callsign = document.getElementById("callsign").value.trim().toUpperCase();
    const location = document.getElementById("location").value.trim();
    const coords = getArkansasCoordinates(location);

    if (!callsign) {
      showStatus("Callsign is required.", "error");
      return;
    }

    const checkin = {
      id: editingCheckinId || crypto.randomUUID(),
      time: getTimeString(),
      callsign,
      name: document.getElementById("name").value.trim(),
      licenseType: document.getElementById("licenseType").value.trim(),
      membershipStatus: document.getElementById("membershipStatus").value,
      location,
      lat: coords ? coords.lat : null,
      lng: coords ? coords.lng : null,
      traffic: document.getElementById("traffic").value,
      notes: document.getElementById("notes").value.trim()
    };

    if (editingCheckinId) {
      const updated = checkins.map((item) => {
        return item.id === editingCheckinId ? checkin : item;
      });

      saveCheckins(updated);
      editingCheckinId = null;

      const submitButton = checkinForm.querySelector("button[type='submit']");
      if (submitButton) {
        submitButton.textContent = "Add Check-In";
      }

      showStatus(`${checkin.callsign} updated.`, "ok");
    } else {
      checkins.push(checkin);
      saveCheckins(checkins);
      showStatus(`${checkin.callsign} added.`, "ok");
    }

    checkinForm.reset();
    document.getElementById("traffic").value = "No traffic";
    document.getElementById("membershipStatus").value = "Guest";
    document.getElementById("callsign").focus();

    renderCheckins();
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

  function renderCheckins() {
    const checkins = getCheckins();

    if (checkinCount) {
      checkinCount.textContent = checkins.length;
    }

    if (!checkinRows) return;

    if (checkins.length === 0) {
      checkinRows.innerHTML = `
        <tr>
          <td colspan="6" class="empty-table">No check-ins logged yet.</td>
        </tr>
      `;

      renderMapMarkers(checkins);
      return;
    }

    checkinRows.innerHTML = checkins.map((item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(item.time || "")}</td>
        <td>
          <strong>${escapeHtml(item.callsign)}</strong><br>
          <span class="station-subline">
            ${escapeHtml(item.name || "")}
            ${item.licenseType ? " • " + escapeHtml(item.licenseType) : ""}
            ${item.membershipStatus ? " • " + escapeHtml(item.membershipStatus) : ""}
          </span>
          ${item.notes ? `<div class="station-notes">${escapeHtml(item.notes)}</div>` : ""}
        </td>
        <td>${escapeHtml(item.location || "")}</td>
        <td>${escapeHtml(item.traffic || "")}</td>
        <td class="table-actions">
          <button class="small-button edit-checkin" type="button" data-id="${item.id}">Edit</button>
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

    document.querySelectorAll(".edit-checkin").forEach((button) => {
      button.addEventListener("click", () => {
        const id = button.dataset.id;
        startEditCheckin(id);
      });
    });

    renderMapMarkers(checkins);
  }

  function startEditCheckin(id) {
    const checkin = getCheckins().find((item) => item.id === id);

    if (!checkin) return;

    editingCheckinId = id;

    document.getElementById("callsign").value = checkin.callsign || "";
    document.getElementById("name").value = checkin.name || "";
    document.getElementById("licenseType").value = checkin.licenseType || "";
    document.getElementById("membershipStatus").value = checkin.membershipStatus || "Guest";
    document.getElementById("location").value = checkin.location || "";
    document.getElementById("traffic").value = checkin.traffic || "No traffic";
    document.getElementById("notes").value = checkin.notes || "";

    const submitButton = checkinForm.querySelector("button[type='submit']");
    if (submitButton) {
      submitButton.textContent = "Update Check-In";
    }

    showStatus(`Editing ${checkin.callsign}. Save changes when ready.`, "ok");
    document.getElementById("callsign").focus();
  }

  function setupMap() {
    const mapEl = document.getElementById("checkinMap");

    if (!mapEl || typeof L === "undefined") {
      console.warn("Map not loaded. Missing #checkinMap or Leaflet.");
      return;
    }

    map = L.map("checkinMap", {
      scrollWheelZoom: false
    }).setView([34.7465, -92.2896], 7);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

    markerLayer = L.layerGroup().addTo(map);

    setTimeout(() => {
      map.invalidateSize();
    }, 300);
  }

  function renderMapMarkers(checkins) {
    if (!map || !markerLayer) return;

    markerLayer.clearLayers();

    const mapped = checkins.filter((item) => item.lat && item.lng);

    mapped.forEach((item) => {
      L.marker([item.lat, item.lng])
        .bindPopup(`
          <strong>${escapeHtml(item.callsign)}</strong><br>
          ${escapeHtml(item.name || "")}<br>
          ${escapeHtml(item.membershipStatus || "Guest")}<br>
          ${escapeHtml(item.location || "")}
        `)
        .addTo(markerLayer);
    });

    if (mapped.length > 0) {
      const bounds = L.latLngBounds(mapped.map((item) => [item.lat, item.lng]));

      map.fitBounds(bounds, {
        padding: [30, 30],
        maxZoom: 10
      });
    }
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
 function renderCheckins() {
  const checkins = getCheckins();

  if (checkinCount) {
    checkinCount.textContent = checkins.length;
  }

  if (!checkinRows) return;

  if (checkins.length === 0) {
    checkinRows.innerHTML = `
      <tr>
        <td colspan="6" class="empty-table">No check-ins logged yet.</td>
      </tr>
    `;

    renderMapMarkers(checkins);
    return;
  }

  checkinRows.innerHTML = checkins.map((item, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(item.time || "")}</td>
      <td>
        <strong>${escapeHtml(item.callsign)}</strong><br>
        <span class="station-subline">
          ${escapeHtml(item.name || "")}
          ${item.licenseType ? " • " + escapeHtml(item.licenseType) : ""}
          ${item.membershipStatus ? " • " + escapeHtml(item.membershipStatus) : ""}
        </span>
        ${item.notes ? `<div class="station-notes">${escapeHtml(item.notes)}</div>` : ""}
      </td>
      <td>${escapeHtml(item.location || "")}</td>
      <td>${escapeHtml(item.traffic || "")}</td>
      <td class="table-actions">
        <button class="small-button edit-checkin" type="button" data-id="${item.id}">Edit</button>
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

  document.querySelectorAll(".edit-checkin").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.id;
      startEditCheckin(id);
    });
  });

  renderMapMarkers(checkins);
}
function startEditCheckin(id) {
  const checkin = getCheckins().find((item) => item.id === id);

  if (!checkin) return;

  editingCheckinId = id;

  document.getElementById("callsign").value = checkin.callsign || "";
  document.getElementById("name").value = checkin.name || "";
  document.getElementById("licenseType").value = checkin.licenseType || "";
  document.getElementById("membershipStatus").value = checkin.membershipStatus || "Guest";
  document.getElementById("location").value = checkin.location || "";
  document.getElementById("traffic").value = checkin.traffic || "No traffic";
  document.getElementById("notes").value = checkin.notes || "";

  const submitButton = checkinForm.querySelector("button[type='submit']");
  if (submitButton) {
    submitButton.textContent = "Update Check-In";
  }

  showStatus(`Editing ${checkin.callsign}. Save changes when ready.`, "ok");
  document.getElementById("callsign").focus();
}
const scriptViewerBtn = document.getElementById("scriptViewerBtn");
const scriptModal = document.getElementById("scriptModal");
const closeScriptBtn = document.getElementById("closeScriptBtn");

if (scriptViewerBtn && scriptModal) {
  scriptViewerBtn.addEventListener("click", () => {
    scriptModal.hidden = false;
  });
}

if (closeScriptBtn && scriptModal) {
  closeScriptBtn.addEventListener("click", () => {
    scriptModal.hidden = true;
  });
}

if (scriptModal) {
  scriptModal.addEventListener("click", (event) => {
    if (event.target === scriptModal) {
      scriptModal.hidden = true;
    }
  });
}
function setupMap() {
  const mapEl = document.getElementById("checkinMap");

  if (!mapEl || typeof L === "undefined") return;

  map = L.map("checkinMap", {
    scrollWheelZoom: false
  }).setView([34.7465, -92.2896], 7);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  markerLayer = L.layerGroup().addTo(map);

  setTimeout(() => {
    map.invalidateSize();
  }, 300);
}

function renderMapMarkers(checkins) {
  if (!map || !markerLayer) return;

  markerLayer.clearLayers();

  const mapped = checkins.filter((item) => item.lat && item.lng);

  mapped.forEach((item) => {
    L.marker([item.lat, item.lng])
      .bindPopup(`
        <strong>${escapeHtml(item.callsign)}</strong><br>
        ${escapeHtml(item.name || "")}<br>
        ${escapeHtml(item.membershipStatus || "Guest")}<br>
        ${escapeHtml(item.location || "")}
      `)
      .addTo(markerLayer);
  });

  if (mapped.length > 0) {
    const bounds = L.latLngBounds(mapped.map((item) => [item.lat, item.lng]));

    map.fitBounds(bounds, {
      padding: [30, 30],
      maxZoom: 10
    });
  }
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
function getArkansasCoordinates(location) {
  const key = String(location || "")
    .trim()
    .toLowerCase()
    .replace(/,\s*arkansas/g, "")
    .replace(/,\s*ar/g, "");

  const places = {
    "little rock": { lat: 34.7465, lng: -92.2896 },
    "north little rock": { lat: 34.7695, lng: -92.2671 },
    "jacksonville": { lat: 34.8662, lng: -92.1101 },
    "sherwood": { lat: 34.8151, lng: -92.2243 },
    "maumelle": { lat: 34.8668, lng: -92.4043 },
    "conway": { lat: 35.0887, lng: -92.4421 },
    "benton": { lat: 34.5645, lng: -92.5868 },
    "bryant": { lat: 34.5959, lng: -92.4890 },
    "cabot": { lat: 34.9745, lng: -92.0165 },
    "lonoke": { lat: 34.7831, lng: -91.8999 },
    "sheridan": { lat: 34.3070, lng: -92.4013 },
    "hot springs": { lat: 34.5037, lng: -93.0552 },
    "pine bluff": { lat: 34.2284, lng: -92.0032 },
    "searcy": { lat: 35.2506, lng: -91.7362 },
    "batesville": { lat: 35.7698, lng: -91.6409 },
    "jonesboro": { lat: 35.8423, lng: -90.7043 },
    "fort smith": { lat: 35.3859, lng: -94.3985 },
    "fayetteville": { lat: 36.0626, lng: -94.1574 },
    "springdale": { lat: 36.1867, lng: -94.1288 },
    "rogers": { lat: 36.3320, lng: -94.1185 },
    "bentonville": { lat: 36.3729, lng: -94.2088 },
    "russellville": { lat: 35.2784, lng: -93.1338 }
  };

  return places[key] || null;
}
setupDashboard();
setupSessionPage();
setupExportPage();
