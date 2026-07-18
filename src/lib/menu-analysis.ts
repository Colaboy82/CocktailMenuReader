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
      "Flavor Notes: Smoky (3), Grapefruit (3), Lime (2), Saline (2). If you like a drink that's refreshing but has some character to it, this is your move — bold mezcal smoke balanced against bright grapefruit, with a squeeze of lime and just enough salt to make it pop.",
    similarDrinks: ["Classic Paloma", "Oaxacan Margarita", "Salted grapefruit spritz"],
    bottleHints: ["mezcal", "grapefruit", "lime"],
  },
  {
    name: "Paper Plane",
    aliases: [],
    style: "Equal-parts modern sour",
    taste:
      "Flavor Notes: Bitter (2), Herbal (2), Citrus (3), Bourbon (2). Four equal parts — bourbon, Aperol, amaro, and lemon — that somehow add up to something better than any one of them alone. It's bright and citrusy up front, then a little bitter and warm on the way out.",
    similarDrinks: ["Bourbon Sour", "Boulevardier", "Last Word riff"],
    bottleHints: ["aperol", "amaro nonino", "lemon"],
  },
  {
    name: "French 75",
    aliases: [],
    style: "Sparkling citrus coupe",
    taste:
      "Flavor Notes: Citrus (3), Floral (1), Dry (2), Sparkling (3). Think of it as a Tom Collins that went to Paris — gin and lemon juice topped with champagne, served in a coupe. It's light, crisp, and a little fancy without being fussy.",
    similarDrinks: ["Tom Collins", "Sparkling martini", "Citrus spritz"],
    bottleHints: ["gin", "lemon", "sparkling"],
  },
  {
    name: "Oaxacan Old Fashioned",
    aliases: [],
    style: "Smoky stirred sipper",
    taste:
      "Flavor Notes: Smoky (3), Agave (2), Spice (2), Bitter (2). It's like an Old Fashioned, but made with tequila and mezcal instead of whiskey — so you get that agave sweetness and a deep, earthy smokiness that lingers in the best possible way.",
    similarDrinks: ["Old Fashioned", "Tequila Manhattan", "Smoked Boulevardier"],
    bottleHints: ["tequila", "mezcal", "agave", "bitters"],
  },
  {
    name: "Negroni Sbagliato",
    aliases: ["sbagliato"],
    style: "Bubbly bittersweet aperitivo",
    taste:
      "Flavor Notes: Bitter (2), Sweet (2), Sparkling (3), Floral (1). Someone accidentally grabbed the prosecco instead of gin — and honestly it was a great mistake. This is a Negroni with bubbles, making it lighter, more refreshing, and a little easier to love if you're not fully into bitter.",
    similarDrinks: ["Negroni", "Americano", "Aperitif spritz"],
    bottleHints: ["campari", "vermouth", "prosecco"],
  },
  {
    name: "Old Cuban",
    aliases: [],
    style: "Minted sparkling rum cocktail",
    taste:
      "Flavor Notes: Mint (2), Lime (3), Rum (2), Sparkling (3). Imagine a Mojito that decided to dress up — aged rum, fresh mint, and lime get topped with champagne instead of soda, making it feel festive and refined all at once.",
    similarDrinks: ["Mojito", "French 75", "Daiquiri"],
    bottleHints: ["rum", "mint", "sparkling"],
  },
  {
    name: "Last Word",
    aliases: [],
    style: "Equal-parts herbal sour",
    taste:
      "Flavor Notes: Herbal (3), Cherry (2), Citrus (3), Gin (1). This one's for the adventurous drinker — equal parts gin, green Chartreuse, maraschino, and lime make a drink that's herbaceous, sharp, tart, and a little mysterious all at once. Once you try it, you'll crave it.",
    similarDrinks: ["Paper Plane", "Naked and Famous", "Bijou"],
    bottleHints: ["chartreuse", "maraschino", "gin", "lime"],
  },
  {
    name: "Jungle Bird",
    aliases: [],
    style: "Tropical tiki bitter",
    taste:
      "Flavor Notes: Tropical (2), Bitter (3), Rum (2), Dry (2). Pineapple and Campari shouldn't work together — but they really do. The sweetness of the pineapple plays against the bitterness of Campari, and dark rum ties it all together into something tropical but surprisingly dry on the finish.",
    similarDrinks: ["Negroni Tropicale", "Rum Negroni", "Golden Bird"],
    bottleHints: ["campari", "rum", "pineapple"],
  },
  {
    name: "Penicillin",
    aliases: [],
    style: "Smoky-peated modern sour",
    taste:
      "Flavor Notes: Smoky (2), Ginger (2), Honey (2), Citrus (2). Honey and ginger syrup make it warming and a little spicy, lemon keeps it fresh, and then a float of peaty Scotch drifts across the top giving you this gorgeous whiff of smoke before each sip. It's more approachable than it sounds, promise.",
    similarDrinks: ["Gold Rush", "Whisky Sour", "Bee's Knees"],
    bottleHints: ["scotch", "lemon", "ginger", "honey"],
  },
  {
    name: "Espresso Martini",
    aliases: [],
    style: "Creamy coffee cocktail",
    taste:
      "Flavor Notes: Coffee (3), Bitter (2), Sweet (2), Creamy (2). Vodka, espresso, and coffee liqueur shaken hard until you get that thick, creamy foam on top — it's basically dessert in a glass. Bold coffee flavor, just sweet enough, with a smooth finish that'll keep you going all night.",
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
    // Match bottles from the library that are relevant to this specific cocktail profile
    const profileBottles = bottleLibrary
      .filter((b) => profile.bottleHints.some((hint) => lower(b.name).includes(hint) || hint.includes(lower(b.name.split(" ")[0]))))
      .map((b) => b.name);
    return {
      name: profile.name,
      style: profile.style,
      taste: profile.taste,
      similarDrinks: profile.similarDrinks,
      bottles: profileBottles,
      confidence: 0.94,
      strength: estimateStrength(line),
      aiGenerated: false,
    };
  }
  const name = extractName(line);
  const { notes, similar } = flavorFallback(line);
  return {
    name,
    style: notes.join(" / "),
    taste: notes.join(", "),
    similarDrinks: similar.slice(0, 3),
    bottles: [],
    confidence: Math.min(0.86, 0.52 + notes.length * 0.07),
    strength: estimateStrength(line),
    aiGenerated: false,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function analyzeMenuText(text: string): MenuAnalysis {
  const src = text.trim();
  if (!src) return { summary: "0 drinks · 0 bottles", items: [], bottleMentions: [] };
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
