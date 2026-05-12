let ARKANSAS_TOWNS = [];

async function loadArkansasTowns() {
  try {
    const response = await fetch("../assets/data/townslist.csv");

    if (!response.ok) {
      throw new Error("Could not load townslist.csv");
    }

    let text = await response.text();

    // Fix some Excel/Windows export weirdness
    text = text
      .replace(/\u0000/g, "")
      .replace(/^\uFEFF/, "")
      .trim();

    ARKANSAS_TOWNS = parseTownList(text);

    console.log("Arkansas towns loaded:", ARKANSAS_TOWNS.length);
    console.table(ARKANSAS_TOWNS.slice(0, 10));

    if (ARKANSAS_TOWNS.length === 0) {
      console.warn("Town list loaded but parsed zero rows. First 500 chars:", text.slice(0, 500));
    }
  } catch (error) {
    console.error("Arkansas town list failed to load:", error);
    ARKANSAS_TOWNS = [];
  }
}

function parseTownList(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const delimiter = detectDelimiter(lines[0]);

  const headers = splitLine(lines[0], delimiter).map(cleanTownValue);

  console.log("Town headers:", headers);
  console.log("Detected town delimiter:", delimiter === "\t" ? "TAB" : delimiter);

  return lines.slice(1)
    .map((line) => splitLine(line, delimiter))
    .map((cells) => {
      const row = {};

      headers.forEach((header, index) => {
        row[header] = cleanTownValue(cells[index]);
      });

      const name = row["Name"] || row["NAME"] || row["name"] || "";
      const state = row["State"] || row["STATE"] || row["state"] || "";
      const latRaw = row["Latitude"] || row["LATITUDE"] || row["Lat"] || row["lat"] || "";
      const lngRaw =
        row["Longitude"] ||
        row["LONGITUDE"] ||
        row["Long"] ||
        row["Lng"] ||
        row["lon"] ||
        row["lng"] ||
        "";

      const lat = parseCoordinate(latRaw);
      const lng = parseCoordinate(lngRaw);

      return {
        name,
        state,
        geoid: row["GEOID"] || "",
        ansiCode: row["ANSI Code"] || "",
        lsad: row["LSAD"] || row["LSD"] || "",
        lat,
        lng
      };
    })
    .filter((town) => {
      return town.name && Number.isFinite(town.lat) && Number.isFinite(town.lng);
    });
}

function detectDelimiter(headerLine) {
  const tabCount = (headerLine.match(/\t/g) || []).length;
  const commaCount = (headerLine.match(/,/g) || []).length;
  const semicolonCount = (headerLine.match(/;/g) || []).length;

  if (tabCount >= commaCount && tabCount >= semicolonCount && tabCount > 0) return "\t";
  if (semicolonCount > commaCount && semicolonCount > 0) return ";";
  return ",";
}

function splitLine(line, delimiter) {
  const result = [];
  let value = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      value += '"';
      i++;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === delimiter && !insideQuotes) {
      result.push(value);
      value = "";
    } else {
      value += char;
    }
  }

  result.push(value);
  return result;
}

function cleanTownValue(value) {
  return String(value ?? "")
    .replace(/^\uFEFF/, "")
    .replace(/\u0000/g, "")
    .trim();
}

function parseCoordinate(value) {
  const cleaned = cleanTownValue(value)
    .replace(/[^\d.-]/g, "");

  return Number(cleaned);
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

  let town = ARKANSAS_TOWNS.find((item) => {
    return normalizeTownName(item.name) === normalizedSearch;
  });

  if (town) return town;

  town = ARKANSAS_TOWNS.find((item) => {
    const townName = normalizeTownName(item.name);
    return normalizedSearch.includes(townName);
  });

  if (town) return town;

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
