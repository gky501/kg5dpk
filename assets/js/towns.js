let ARKANSAS_TOWNS = [];

async function loadArkansasTowns() {
  try {
    const response = await fetch("../assets/data/townslist.csv");

    if (!response.ok) {
      throw new Error("Could not load townslist.csv");
    }

    const text = await response.text();
    ARKANSAS_TOWNS = parseTownList(text);

    console.log("Arkansas towns loaded:", ARKANSAS_TOWNS.length);
  } catch (error) {
    console.error("Arkansas town list failed to load:", error);
    ARKANSAS_TOWNS = [];
  }
}

function parseTownList(text) {
  const rows = parseTownDelimitedText(text);

  if (rows.length < 2) return [];

  const headers = rows[0].map((header) =>
    cleanTownValue(header).replace(/^\uFEFF/, "")
  );

  return rows
    .slice(1)
    .filter((row) => row.some((cell) => cleanTownValue(cell) !== ""))
    .map((row) => {
      const item = {};

      headers.forEach((header, index) => {
        item[header] = cleanTownValue(row[index]);
      });

      return {
        name: item["Name"] || "",
        geoid: item["GEOID"] || "",
        ansiCode: item["ANSI Code"] || "",
        state: item["State"] || "",
        lsd: item["LSD"] || item["LSAD"] || "",
        lat: Number(item["Latitude"]),
        lng: Number(item["Longitude"])
      };
    })
    .filter((town) => town.name && Number.isFinite(town.lat) && Number.isFinite(town.lng));
}

function parseTownDelimitedText(text) {
  const firstLine = text.split(/\r?\n/)[0] || "";
  const delimiter = firstLine.includes("\t") ? "\t" : ",";

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

function cleanTownValue(value) {
  return String(value ?? "")
    .replace(/^\uFEFF/, "")
    .trim();
}

function normalizeTownName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/,\s*arkansas/g, "")
    .replace(/,\s*ar/g, "")
    .replace(/\barkansas\b/g, "")
    .replace(/\bar\b/g, "")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function findArkansasTown(location) {
  const search = normalizeTownName(location);

  if (!search || !Array.isArray(ARKANSAS_TOWNS)) return null;

  const aliases = {
    lr: "little rock",
    nlr: "north little rock",
    wlr: "little rock",
    "west lr": "little rock",
    "little rock area": "little rock",
    "central arkansas": "little rock"
  };

  const normalizedSearch = aliases[search] || search;

  // Exact match first
  let town = ARKANSAS_TOWNS.find((item) => {
    return normalizeTownName(item.name) === normalizedSearch;
  });

  if (town) return town;

  // Then try if user typed extra wording, like "near Cabot" or "Cabot area"
  town = ARKANSAS_TOWNS.find((item) => {
    const townName = normalizeTownName(item.name);
    return normalizedSearch.includes(townName);
  });

  if (town) return town;

  // Then try if town name contains the typed search
  town = ARKANSAS_TOWNS.find((item) => {
    const townName = normalizeTownName(item.name);
    return townName.includes(normalizedSearch);
  });

  return town || null;
}

function getArkansasTownCoordinates(location) {
  const town = findArkansasTown(location);

  if (!town) return null;

  return {
    lat: town.lat,
    lng: town.lng,
    name: town.name
  };
}

loadArkansasTowns();
