export const AMBIENT_STORAGE_KEY = "sla-ambient-effects";
export const LEGACY_SNOW_STORAGE_KEY = "sla-snow";

export const SNOW_LEVELS = [
  { id: "off", label: "Spenta", description: "Nessun fiocco" },
  { id: "low", label: "Basso", description: "Fiocchi leggeri" },
  { id: "medium", label: "Medio", description: "Nevicata soffice" },
  { id: "blizzard", label: "Bufera", description: "Vento e fiocchi fitti" },
];

export const EXTRA_EFFECTS = [
  {
    id: "sparkles",
    label: "Scintille",
    description: "Stelline dorate che brillano nell’aria",
  },
  {
    id: "fireworks",
    label: "Fuochi d’artificio",
    description: "Razzi e scie festive tra oro e cremisi",
  },
  {
    id: "fireplace",
    label: "Fumo caminetto",
    description: "Sbuffi caldi di fumo e braci dal fondo",
  },
  {
    id: "candies",
    label: "Apparizione caramelle",
    description: "Bastoncini di zucchero e dolcetti di Natale",
  },
  {
    id: "lights",
    label: "Luci dell’albero",
    description: "Bagliori caldi che pulsano dolcemente",
  },
  {
    id: "meteors",
    label: "Stelle comete",
    description: "Scie luminose nella notte d’inverno",
  },
];

const VALID_SNOW_IDS = new Set(SNOW_LEVELS.map((level) => level.id));
const VALID_EXTRA_IDS = new Set(EXTRA_EFFECTS.map((effect) => effect.id));

export const DEFAULT_AMBIENT_EFFECTS = {
  snow: "low",
  extras: [],
};

/**
 * Normalizes untrusted or partial ambient effect settings into a safe object.
 */
export function normalizeAmbientEffects(value) {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_AMBIENT_EFFECTS, extras: [] };
  }
  const snow = VALID_SNOW_IDS.has(value.snow)
    ? value.snow
    : DEFAULT_AMBIENT_EFFECTS.snow;
  const rawExtras = Array.isArray(value.extras) ? value.extras : [];
  const extras = [];
  for (const id of rawExtras) {
    if (VALID_EXTRA_IDS.has(id) && !extras.includes(id)) {
      extras.push(id);
    }
  }
  return { snow, extras };
}

/**
 * Loads ambient effect preferences from storage, preserving legacy sla-snow.
 */
export function loadAmbientEffects(storage = globalThis.localStorage) {
  if (!storage) return { ...DEFAULT_AMBIENT_EFFECTS, extras: [] };
  try {
    const raw = storage.getItem(AMBIENT_STORAGE_KEY);
    if (raw) {
      return normalizeAmbientEffects(JSON.parse(raw));
    }
    const legacySnow = storage.getItem(LEGACY_SNOW_STORAGE_KEY);
    if (legacySnow === "off") {
      return { snow: "off", extras: [] };
    }
  } catch {
    // Ignore storage/JSON errors and fall back to defaults.
  }
  return { ...DEFAULT_AMBIENT_EFFECTS, extras: [] };
}

/**
 * Persists ambient effect preferences and keeps legacy sla-snow in sync.
 */
export function saveAmbientEffects(effects, storage = globalThis.localStorage) {
  const normalized = normalizeAmbientEffects(effects);
  if (!storage) return normalized;
  try {
    storage.setItem(AMBIENT_STORAGE_KEY, JSON.stringify(normalized));
    storage.setItem(
      LEGACY_SNOW_STORAGE_KEY,
      normalized.snow === "off" ? "off" : "on",
    );
  } catch {
    // Ignore storage quota or private-browsing errors.
  }
  return normalized;
}

/**
 * Counts how many ambient effects are currently active.
 */
export function countActiveEffects(effects) {
  const normalized = normalizeAmbientEffects(effects);
  return (normalized.snow !== "off" ? 1 : 0) + normalized.extras.length;
}
