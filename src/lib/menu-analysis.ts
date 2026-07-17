import { BottleMention, MenuItemAnalysis, MenuAnalysis } from "./types";

// ─── Internal types ───────────────────────────────────────────────────────────

type CocktailProfile = {
  name: string;
  aliases: string[];
  style: string;
  taste: string;
  similarDrinks: string[];
  bottleHints: string[];
};

type FlavorGroup = {
  match: RegExp;
  notes: string[];
  similar: string[];
};

// ─── Cocktail catalog ─────────────────────────────────────────────────────────

const cocktailProfiles: CocktailProfile[] = [
  {
    name: "Mezcal Paloma",
    aliases: ["paloma"],
    style: "Smoky citrus highball",
    taste:
      "Expect smoky agave up front, bright grapefruit, a lime snap, and a dry saline finish that keeps the drink sharp instead of sweet.",
    similarDrinks: ["Classic Paloma", "Oaxacan Margarita", "Salted grapefruit spritz"],
    bottleHints: ["mezcal", "grapefruit", "lime"],
  },
  {
    name: "Paper Plane",
    aliases: [],
    style: "Equal-parts modern sour",
    taste:
      "Expect a bright, balanced sour with bourbon warmth, bittersweet Aperol, herbal amaro depth, and a clean lemon edge.",
    similarDrinks: ["Bourbon Sour", "Boulevardier", "Last Word riff"],
    bottleHints: ["aperol", "amaro nonino", "lemon"],
  },
  {
    name: "French 75",
    aliases: [],
    style: "Sparkling citrus coupe",
    taste:
      "Expect a crisp gin lift, lemon brightness, subtle sweetness, and a dry sparkling finish that makes the drink feel elegant and light.",
    similarDrinks: ["Tom Collins", "Sparkling martini", "Citrus spritz"],
    bottleHints: ["gin", "lemon", "sparkling"],
  },
  {
    name: "Oaxacan Old Fashioned",
    aliases: [],
    style: "Smoky stirred sipper",
    taste:
      "Expect a deeper, rounder sip — tequila structure, mezcal smoke, agave sweetness, and bitters that linger long after the first sip.",
    similarDrinks: ["Old Fashioned", "Tequila Manhattan", "Smoked Boulevardier"],
    bottleHints: ["tequila", "mezcal", "agave", "bitters"],
  },
  {
    name: "Negroni Sbagliato",
    aliases: ["sbagliato"],
    style: "Bubbly bittersweet aperitivo",
    taste:
      "Expect Campari bitterness, vermouth sweetness, and a sparkling lift that softens the edges and makes the drink more quaffable than a classic Negroni.",
    similarDrinks: ["Negroni", "Americano", "Aperitif spritz"],
    bottleHints: ["campari", "vermouth", "prosecco"],
  },
  {
    name: "Old Cuban",
    aliases: [],
    style: "Minted sparkling rum cocktail",
    taste:
      "Expect aged rum richness, mint freshness, lime brightness, and a champagne-like finish that keeps it lively.",
    similarDrinks: ["Mojito", "French 75", "Daiquiri"],
    bottleHints: ["rum", "mint", "sparkling"],
  },
  {
    name: "Last Word",
    aliases: [],
    style: "Equal-parts herbal sour",
    taste:
      "Expect a sharp green-herbal punch from Chartreuse, maraschino cherry sweetness, gin spine, and lime acid — all perfectly balanced.",
    similarDrinks: ["Paper Plane", "Naked and Famous", "Bijou"],
    bottleHints: ["chartreuse", "maraschino", "gin", "lime"],
  },
  {
    name: "Jungle Bird",
    aliases: [],
    style: "Tropical tiki bitter",
    taste:
      "Expect pineapple sweetness cut hard by Campari bitterness, with dark rum depth and a long, dry, pleasantly bitter finish.",
    similarDrinks: ["Negroni Tropicale", "Rum Negroni", "Golden Bird"],
    bottleHints: ["campari", "rum", "pineapple"],
  },
  {
    name: "Penicillin",
    aliases: [],
    style: "Smoky-peated modern sour",
    taste:
      "Expect blended Scotch sweetness layered over ginger spice, honey warmth, lemon acidity, and a peated Islay float that arrives as a smoky whisper on the nose.",
    similarDrinks: ["Gold Rush", "Whisky Sour", "Bee's Knees"],
    bottleHints: ["scotch", "lemon", "ginger", "honey"],
  },
  {
    name: "Espresso Martini",
    aliases: [],
    style: "Creamy coffee cocktail",
    taste:
      "Expect bold espresso bitterness rounded by vodka and coffee liqueur sweetness, with a thick, velvety foam and a long roasted finish.",
    similarDrinks: ["Black Russian", "Vodka Negroni", "White Russian"],
    bottleHints: ["vodka", "kahlua", "espresso"],
  },
];

// ─── Bottle library ───────────────────────────────────────────────────────────

const bottleLibrary: Array<{ name: string; description: string }> = [
  {
    name: "Del Maguey Vida Mezcal",
    description: "Smoky agave mezcal — pushes drinks toward a drier, more savory finish.",
  },
  {
    name: "Aperol",
    description: "Bitter orange aperitif with low proof and a bright orange-peel profile.",
  },
  {
    name: "Campari",
    description: "Classic Italian bitter with red fruit, orange, and a long bitter finish.",
  },
  {
    name: "Amaro Nonino",
    description: "Herbal, lightly sweet amaro with spice and citrus peel notes.",
  },
  {
    name: "Cointreau",
    description: "Clear orange liqueur — adds dryness and concentrated citrus aroma.",
  },
  {
    name: "Luxardo Maraschino",
    description: "Cherry-almond liqueur that gives cocktails a floral, nutty lift.",
  },
  {
    name: "St-Germain",
    description: "Elderflower liqueur with soft floral sweetness.",
  },
  {
    name: "Fernet-Branca",
    description: "Minty, bitter amaro with a powerful herbal and menthol finish.",
  },
  {
    name: "Chartreuse",
    description: "Intense alpine herbal liqueur with deep green, spicy complexity.",
  },
  {
    name: "Prosecco",
    description: "Sparkling Italian wine that lifts and lightens any cocktail.",
  },
  {
    name: "Angostura Bitters",
    description: "Classic cocktail bitters — adds spice, structure, and aromatic depth.",
  },
  {
    name: "Amaro Montenegro",
    description: "Soft, citrusy amaro with gentle sweetness and herbaceous depth.",
  },
  {
    name: "Kahlúa",
    description: "Coffee liqueur with rich roasted sweetness and vanilla notes.",
  },
  {
    name: "Italicus",
    description: "Bergamot and citrus rosolio — floral, light, and gently bitter.",
  },
];

// ─── Flavor keyword fallback ──────────────────────────────────────────────────

const flavorGroups: FlavorGroup[] = [
  {
    match: /smok|mezcal|char|roast/i,
    notes: ["smoky", "savory", "dry"],
    similar: ["Oaxacan Old Fashioned", "Mezcal Paloma", "Smoked Margarita"],
  },
  {
    match: /bitter|amaro|aperol|campari|fernet/i,
    notes: ["bitter", "citrusy", "aperitivo-like"],
    similar: ["Negroni", "Americano", "Paper Plane"],
  },
  {
    match: /citrus|lemon|lime|grapefruit|yuzu/i,
    notes: ["bright", "zesty", "fresh"],
    similar: ["French 75", "Daiquiri", "Paloma"],
  },
  {
    match: /herb|mint|basil|chartreuse|green/i,
    notes: ["herbal", "green", "fragrant"],
    similar: ["Last Word", "South Side", "Basil Gimlet"],
  },
  {
    match: /cream|espresso|coffee|dessert|vanilla/i,
    notes: ["rich", "rounded", "dessert-leaning"],
    similar: ["Espresso Martini", "White Russian", "Brandy Alexander"],
  },
  {
    match: /sparkling|prosecco|champagne|soda|spritz/i,
    notes: ["bubbly", "light", "lifted"],
    similar: ["French 75", "Sbagliato", "Aperol Spritz"],
  },
  {
    match: /trop|pineapple|coconut|mango|tiki/i,
    notes: ["tropical", "fruity", "refreshing"],
    similar: ["Jungle Bird", "Piña Colada", "Mai Tai"],
  },
  {
    match: /whisky|whiskey|bourbon|scotch|rye/i,
    notes: ["spirit-forward", "warm", "oaky"],
    similar: ["Old Fashioned", "Manhattan", "Whisky Sour"],
  },
];

export { cocktailProfiles };

// ─── Sample data ──────────────────────────────────────────────────────────────

export const sampleMenuText = [
  "Old Fashioned | bourbon, sugar, bitters, orange",
  "Margarita | tequila, lime, triple sec, agave",
  "Daiquiri | rum, lime, sugar",
  "Negroni | gin, Campari, sweet vermouth",
  "Mojito | rum, mint, lime, sugar, soda",
  "Whiskey Sour | bourbon, lemon, sugar, egg white",
  "Cosmopolitan | vodka, triple sec, cranberry, lime",
  "Manhattan | rye whiskey, sweet vermouth, bitters",
  "Martini | gin or vodka, dry vermouth",
  "Tom Collins | gin, lemon, sugar, soda",
  "Mai Tai | rum, lime, orgeat, orange liqueur",
  "Bloody Mary | vodka, tomato juice, spices",
  "Pina Colada | rum, coconut cream, pineapple juice",
  "Caipirinha | cachaça, lime, sugar",
  "Sazerac | rye whiskey or cognac, absinthe rinse, bitters",
  "Gimlet | gin or vodka, lime juice, simple syrup",
  "Sidecar | cognac, triple sec, lemon juice",
  "Aperol Spritz | Aperol, prosecco, soda",
  "Mezcal Paloma | Del Maguey Vida mezcal, grapefruit, lime, agave, saline",
  "Paper Plane | bourbon, Aperol, Amaro Nonino, lemon",
  "French 75 | gin, lemon, sugar, Prosecco",
  "Oaxacan Old Fashioned | reposado tequila, mezcal, agave, Angostura bitters",
  "Negroni Sbagliato | Campari, sweet vermouth, Prosecco",
  "Old Cuban | aged rum, mint, lime, sparkling wine, Angostura bitters",
  "Last Word | gin, green Chartreuse, maraschino liqueur, lime",
  "Jungle Bird | dark rum, Campari, pineapple, lime, simple syrup",
  "Penicillin | blended Scotch, honey-ginger syrup, lemon, peated Islay float",
  "Espresso Martini | vodka, Kahlúa, espresso, simple syrup",
].join("\n");

// ─── Helpers ──────────────────────────────────────────────────────────────────

function lower(text: string) {
  return text.toLowerCase();
}

function findProfile(line: string): CocktailProfile | undefined {
  const l = lower(line);
  return cocktailProfiles.find(
    (p) =>
      l.includes(lower(p.name)) || p.aliases.some((a) => l.includes(lower(a))),
  );
}

function extractName(line: string): string {
  // Colon format from OCR prompt: "DRINK NAME: ingredient1, ingredient2"
  const colon = line.indexOf(":");
  if (colon > 0 && colon <= 50) return line.slice(0, colon).trim();
  for (const sep of [" | ", " — ", " - "]) {
    if (line.includes(sep)) return line.split(sep)[0].trim();
  }
  const comma = line.indexOf(",");
  if (comma > 0 && comma <= 36) return line.slice(0, comma).trim();
  return line.trim();
}

function flavorFallback(line: string): { notes: string[]; similar: string[] } {
  const notes: string[] = [];
  const similar: string[] = [];
  for (const group of flavorGroups) {
    if (group.match.test(line)) {
      notes.push(...group.notes);
      similar.push(...group.similar);
    }
  }
  if (notes.length === 0) {
    notes.push("balanced", "bar-friendly", "easy to drink");
    similar.push("Classic Sour", "House Margarita", "Seasonal Spritz");
  }
  return {
    notes: Array.from(new Set(notes)),
    similar: Array.from(new Set(similar)),
  };
}

function estimateStrength(line: string): string {
  const l = lower(line);
  // Strong: multiple spirits, high-proof bases, dark liqueurs
  if (/whiskey|whisky|rye|bourbon|rum|tequila|mezcal|brandy|cognac|scotch|fernet|chartreuse|overproof|cask.proof|barrel/.test(l)) {
    if (/(?:double|aged|barrel|reserve|cask|overproof|neat|stirred|up)/.test(l)) return "strong";
  }
  // Light: sparkling, low-abv, effervescent, citrus-focused
  if (/prosecco|champagne|sparkling|soda|juice|mocktail|low.abv|aperol|vermouth|sherry/.test(l)) {
    if (!/(whiskey|whisky|rum|vodka|tequila|mezcal|brandy)/.test(l)) return "light";
  }
  // Medium: balanced cocktails
  return "medium";
}

function detectBottles(text: string): BottleMention[] {
  const l = lower(text);
  return bottleLibrary
    .filter((b) => l.includes(lower(b.name)) || l.includes(lower(b.name.replace(/[^a-z0-9]+/gi, " "))))
    .map((b) => ({ name: b.name, description: b.description, reason: "Referenced by name in the menu text." }));
}

function parseLine(line: string): MenuItemAnalysis {
  const profile = findProfile(line);
  if (profile) {
    return {
      name: profile.name,
      style: profile.style,
      taste: profile.taste,
      similarDrinks: profile.similarDrinks,
      bottles: profile.bottleHints.filter((h) => lower(line).includes(h)),
      confidence: 0.94,
      strength: estimateStrength(line),
      aiGenerated: false,
    };
  }
  const name = extractName(line);
  const { notes, similar } = flavorFallback(line);
  const primaryNote = notes[0];
  const otherNotes = notes.length > 1 ? notes.slice(1).join(", ") : "nuanced undertones";
  return {
    name,
    style: notes.join(" / "),
    taste: `This drink brings ${primaryNote} as its defining character, complemented by ${otherNotes}. A well-rounded option that's approachable and satisfying.`,
    similarDrinks: similar.slice(0, 3),
    bottles: [],
    confidence: Math.min(0.86, 0.52 + notes.length * 0.07),
    strength: estimateStrength(line),
    aiGenerated: false,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function analyzeMenuText(text: string): MenuAnalysis {
  const src = text.trim() || sampleMenuText;
  const lines = src
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // Skip lines that are just prices (e.g. "$14", "18.00", "14 / 18")
  const isPriceLine = (l: string) => /^\$?\d+(\.\d{1,2})?(\s*[\/|]\s*\$?\d+(\.\d{1,2})?)*$/.test(l);

  // Skip lines that look like section headers:
  // all-caps short words (e.g. "COCKTAILS", "LIGHT & PLAYFUL"), or common menu header words,
  // or short title-case phrases with no commas (e.g. "Light & Playful", "Dark and Stirred")
  const isSectionHeader = (l: string) => {
    if (l.length > 50) return false; // headers are short
    // All-caps (allows spaces, &, /, -, –, —, digits)
    if (/^[A-Z0-9\s&\/\-–—]+$/.test(l) && l.split(/\s+/).length <= 6) return true;
    // Title-case short phrase with no commas and no colon (e.g. "Light & Playful", "Small Bites")
    if (!l.includes(",") && !l.includes(":") && l.split(/\s+/).length <= 5 &&
        /^[A-Z][a-z]+(\s+(&|and|or|the|\+)\s+[A-Z][a-z]+)*$/.test(l)) return true;
    // Common menu section keyword (case-insensitive, whole line)
    if (/^(cocktails?|spirits?|wines?|beers?|mocktails?|appetizers?|starters?|mains?|desserts?|menu|drinks?|specials?|classics?|signatures?|non.alcoholic|low.abv|seasonal|featured|light|playful|dark|stirred|refreshing|boozy|tropical|sours?|highballs?|digestifs?|aperitifs?)$/i.test(l.trim())) return true;
    return false;
  };

  const filteredLines = lines.filter((l) => !isPriceLine(l) && !isSectionHeader(l));

  const candidates = filteredLines.filter(
    (l) => findProfile(l) || /[|—:-]/.test(l) || l.split(/\s+/).length <= 9,
  );

  const items = (candidates.length > 0 ? candidates : filteredLines)
    .slice(0, 8)
    .map(parseLine);

  const bottleMentions = detectBottles(src);
  const uniqueBottles = new Set(bottleMentions.map((b) => lower(b.name))).size;

  return {
    summary: `${items.length} drink${items.length === 1 ? "" : "s"} · ${uniqueBottles} bottle${uniqueBottles === 1 ? "" : "s"}`,
    items,
    bottleMentions,
  };
}
