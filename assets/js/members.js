let BACN_MEMBERS = [];

async function loadBacnMembers() {
  try {
    const response = await fetch("../assets/data/MemberDirectory.csv");

    if (!response.ok) {
      throw new Error("Could not load MemberDirectory.csv");
    }

    const text = await response.text();
    BACN_MEMBERS = parseMemberDirectory(text);

    console.log("BACN members loaded:", BACN_MEMBERS.length);
    console.table(BACN_MEMBERS);
  } catch (error) {
    console.error("BACN member directory failed to load:", error);
    BACN_MEMBERS = [];
  }
}

function parseMemberDirectory(text) {
  const firstLine = text.split(/\r?\n/)[0] || "";
  const delimiter = firstLine.includes("\t") ? "\t" : ",";

  const rows = parseDelimitedText(text, delimiter);

  if (rows.length < 2) return [];

  const headers = rows[0].map((header) =>
    cleanValue(header).replace(/^\uFEFF/, "")
  );

  return rows
    .slice(1)
    .filter((row) => row.some((cell) => cleanValue(cell) !== ""))
    .map((row) => {
      const item = {};

      headers.forEach((header, index) => {
        item[header] = cleanValue(row[index]);
      });

      return {
        name: item["Name"] || "",
        romeo: item["Romeo"] || "",
        ham: item["HAM"] || "",
        licenseType: item["HAM License Type"] || "",
        expiration: item["HAM Expiration"] || "",
        gmrs: item["GMRS"] || "",
        phone: item["Phone Number"] || "",
        alias: item["Alias or Former"] || ""
      };
    });
}

function parseDelimitedText(text, delimiter) {
  const rows = [];
  let row = [];
  let value = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      value += '"';
      i++;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === delimiter && !insideQuotes) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (value || row.length) {
        row.push(value);
        rows.push(row);
        row = [];
        value = "";
      }

      if (char === "\r" && nextChar === "\n") {
        i++;
      }
    } else {
      value += char;
    }
  }

  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }

  return rows;
}

function cleanValue(value) {
  return String(value ?? "")
    .replace(/^\uFEFF/, "")
    .trim();
}

function normalizeCallsign(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function findBacnMemberByCallsign(callsign) {
  const search = normalizeCallsign(callsign);

  if (!search) return null;

  return BACN_MEMBERS.find((member) => {
    const ham = normalizeCallsign(member.ham);
    const alias = normalizeCallsign(member.alias);
    const gmrs = normalizeCallsign(member.gmrs);

    return ham === search || alias === search || gmrs === search;
  }) || null;
}

loadBacnMembers();
