export type BottleMention = {
  name: string;
  description: string;
  reason: string;
};

export type MenuItemAnalysis = {
  name: string;
  style: string;
  taste: string;
  similarDrinks: string[];
  bottles: string[];
  confidence: number;
  strength: string;          // "light", "medium", "strong"
  barSignificance?: string;   // e.g. "House specialty", "Chef's creation", "Made fresh daily"
  rawLine?: string;           // original OCR line, used for AI enrichment context
  aiGenerated: boolean;
};

export type MenuAnalysis = {
  summary: string;
  items: MenuItemAnalysis[];
  bottleMentions: BottleMention[];
  rawOcrText?: string;
  id?: string;  // Supabase scan ID, if loaded from database
  barName?: string;  // Bar/restaurant name from saved scan
};