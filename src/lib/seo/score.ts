import type { GapLevel, SearchIntent } from "../types";

/**
 * Prioriteitsscore (0-100), bewust in code en niet door de AI bepaald:
 * dezelfde input geeft altijd dezelfde score, en je kunt de weging nalezen.
 */

/** Zoekvolume waar de kans op een blog het grootst is (zie volumeScore). */
const SWEET_SPOT = 800;
const SPREAD = 0.9; // in ordes van grootte

/**
 * Volume scoort volgens een klok rond de sweet spot, niet "hoe hoger hoe beter".
 *
 * Een zoekterm met 60.000 zoekopdrachten per maand is voor een gewone site geen
 * kans maar een val: daar staan Wikipedia en grote media. Onder de ~50 per maand
 * loont een artikel nauwelijks. De echte winst zit ertussenin.
 *
 * `hasVolumeData` maakt het verschil tussen "we weten het niet" en "we hebben
 * gemeten en er zoekt vrijwel niemand op". Zonder databron nemen we neutraal
 * aan; mét databron is een leeg volume een echt signaal dat de term dood is.
 */
function volumeScore(volume: number | null, hasVolumeData: boolean): number {
  if (volume === null) return hasVolumeData ? 0.05 : 0.5;
  if (volume <= 0) return 0.05;
  const distance = Math.log10(volume) - Math.log10(SWEET_SPOT);
  return Math.exp(-(distance * distance) / (2 * SPREAD * SPREAD));
}

// Lage difficulty = makkelijker te ranken = waardevoller.
function difficultyScore(difficulty: number | null): number {
  const kd = difficulty ?? 40; // zonder data: gemiddelde aanname
  return 1 - Math.min(100, Math.max(0, kd)) / 100;
}

// Een blog bedient informatieve en commerciële intentie het best.
const INTENT_WEIGHT: Record<SearchIntent, number> = {
  informatief: 1,
  commercieel: 0.9,
  transactioneel: 0.5,
  navigatie: 0.2,
};

// Ontbrekende content is de grootste kans; bestaande content veel minder.
const GAP_WEIGHT: Record<GapLevel, number> = {
  ontbreekt: 1,
  dun: 0.7,
  bestaat: 0.25,
};

export function calculateScore(input: {
  volume: number | null;
  difficulty: number | null;
  intent: SearchIntent;
  gap: GapLevel;
  /** Draait de analyse met een echte volumebron (DataForSEO)? */
  hasVolumeData: boolean;
}): number {
  const base =
    0.5 * volumeScore(input.volume, input.hasVolumeData) +
    0.3 * difficultyScore(input.difficulty) +
    0.2 * (INTENT_WEIGHT[input.intent] ?? 0.5);
  return Math.round(100 * base * (GAP_WEIGHT[input.gap] ?? 0.5));
}
