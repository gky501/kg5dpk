let BACN_MEMBERS = [];

async function loadBacnMembers() {
  try {
    const response = await fetch("../assets/data/MemberDirectory.csv");

    if (!response.ok) {
      throw new Error("Could not load MemberDirectory.csv");
    }

    const csvText = await response.text();
    BACN_MEMBERS = parseMemberCsv(csvText);

    console.log("BACN members loaded:", BACN_MEMBERS.length);
  } catch (error) {
    console.error("BACN member directory failed to load:", error);
    BACN_MEMBERS = [];
  }
}

function parseMemberCsv(csvText) {
  const rows = parseCsv(csvText);

  if (rows.length < 2) return [];

  const headers = rows[0].map((header) => header.trim());

  return rows.slice(1)
    .filter((row) => row.some((cell) => String(cell || "").trim() !== ""))
    .map((row) => {
      const item = {};

      headers.forEach((header, index) => {
        item[header] = row[index] || "";
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

function parseCsv(text) {
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
    } else if (char === "," && !insideQuotes) {
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

function findBacnMemberByCallsign(callsign) {
  const search = String(callsign || "").trim().toUpperCase();

  if (!search) return null;

  return BACN_MEMBERS.find((member) => {
    const ham = String(member.ham || "").trim().toUpperCase();
    const alias = String(member.alias || "").trim().toUpperCase();
    const gmrs = String(member.gmrs || "").trim().toUpperCase();

    return ham === search || alias === search || gmrs === search;
  }) || null;
}

loadBacnMembers();
