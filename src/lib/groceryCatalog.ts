/** Kuratierter Katalog gängiger Einkaufsartikel (angelehnt an Apps wie
 * "Bring!"): antippbare Kacheln statt Freitext-Tippen. Jeder Eintrag hat ein
 * Emoji als Icon, eine Kategorie (für die gruppierte Übersicht) und ein paar
 * typische Mengen-Presets, die beim Antippen als Schnellauswahl-Chips
 * erscheinen. Freies Eintippen bleibt für alles, was hier fehlt, weiterhin
 * jederzeit möglich. */

export interface Amount {
  quantity: number
  unit: string
}

export interface CatalogItem {
  name: string
  category: string
  emoji: string
  amounts: Amount[]
}

export const CATEGORY_ORDER = [
  'Obst & Gemüse',
  'Brot & Backwaren',
  'Milchprodukte & Eier',
  'Fleisch & Fisch',
  'Kühlregal',
  'Tiefkühl',
  'Vorrat & Trockenware',
  'Gewürze & Öle',
  'Getränke',
  'Süßes & Snacks',
  'Haushalt & Hygiene',
]

const pcs = (...n: number[]): Amount[] => n.map((quantity) => ({ quantity, unit: 'Stk' }))
const g = (...n: number[]): Amount[] => n.map((quantity) => ({ quantity, unit: 'g' }))
const kg = (...n: number[]): Amount[] => n.map((quantity) => ({ quantity, unit: 'kg' }))
const ml = (...n: number[]): Amount[] => n.map((quantity) => ({ quantity, unit: 'ml' }))
const l = (...n: number[]): Amount[] => n.map((quantity) => ({ quantity, unit: 'l' }))

export const GROCERY_CATALOG: CatalogItem[] = [
  // Obst & Gemüse
  { name: 'Tomaten', category: 'Obst & Gemüse', emoji: '🍅', amounts: [...pcs(3, 6), ...g(500), ...kg(1)] },
  { name: 'Gurke', category: 'Obst & Gemüse', emoji: '🥒', amounts: pcs(1, 2) },
  { name: 'Zwiebeln', category: 'Obst & Gemüse', emoji: '🧅', amounts: [...pcs(3, 6), ...kg(1)] },
  { name: 'Knoblauch', category: 'Obst & Gemüse', emoji: '🧄', amounts: pcs(1, 2, 3) },
  { name: 'Kartoffeln', category: 'Obst & Gemüse', emoji: '🥔', amounts: [...kg(1, 2)] },
  { name: 'Karotten', category: 'Obst & Gemüse', emoji: '🥕', amounts: [...g(500), ...kg(1)] },
  { name: 'Paprika', category: 'Obst & Gemüse', emoji: '🫑', amounts: pcs(2, 3, 4) },
  { name: 'Zucchini', category: 'Obst & Gemüse', emoji: '🥒', amounts: pcs(1, 2, 3) },
  { name: 'Salat', category: 'Obst & Gemüse', emoji: '🥬', amounts: pcs(1, 2) },
  { name: 'Champignons', category: 'Obst & Gemüse', emoji: '🍄', amounts: [...g(250, 500)] },
  { name: 'Bananen', category: 'Obst & Gemüse', emoji: '🍌', amounts: pcs(4, 6) },
  { name: 'Äpfel', category: 'Obst & Gemüse', emoji: '🍎', amounts: [...pcs(4, 6), ...kg(1)] },
  { name: 'Zitronen', category: 'Obst & Gemüse', emoji: '🍋', amounts: pcs(1, 2, 4) },
  { name: 'Avocado', category: 'Obst & Gemüse', emoji: '🥑', amounts: pcs(1, 2) },
  { name: 'Beeren', category: 'Obst & Gemüse', emoji: '🫐', amounts: [...g(250, 500)] },
  { name: 'Petersilie', category: 'Obst & Gemüse', emoji: '🌿', amounts: pcs(1) },
  { name: 'Basilikum', category: 'Obst & Gemüse', emoji: '🌿', amounts: pcs(1) },
  { name: 'Ingwer', category: 'Obst & Gemüse', emoji: '🫚', amounts: pcs(1) },

  // Brot & Backwaren
  { name: 'Brot', category: 'Brot & Backwaren', emoji: '🍞', amounts: pcs(1) },
  { name: 'Brötchen', category: 'Brot & Backwaren', emoji: '🥐', amounts: pcs(2, 4, 6) },
  { name: 'Baguette', category: 'Brot & Backwaren', emoji: '🥖', amounts: pcs(1, 2) },
  { name: 'Toastbrot', category: 'Brot & Backwaren', emoji: '🍞', amounts: pcs(1) },
  { name: 'Croissants', category: 'Brot & Backwaren', emoji: '🥐', amounts: pcs(2, 4) },
  { name: 'Mehl', category: 'Brot & Backwaren', emoji: '🌾', amounts: [...kg(1)] },
  { name: 'Hefe', category: 'Brot & Backwaren', emoji: '🍞', amounts: pcs(1, 2) },
  { name: 'Backpulver', category: 'Brot & Backwaren', emoji: '🧁', amounts: pcs(1) },

  // Milchprodukte & Eier
  { name: 'Milch', category: 'Milchprodukte & Eier', emoji: '🥛', amounts: [...l(1, 2)] },
  { name: 'Eier', category: 'Milchprodukte & Eier', emoji: '🥚', amounts: pcs(6, 10) },
  { name: 'Butter', category: 'Milchprodukte & Eier', emoji: '🧈', amounts: [...g(250)] },
  { name: 'Joghurt', category: 'Milchprodukte & Eier', emoji: '🥛', amounts: pcs(1, 2, 4) },
  { name: 'Quark', category: 'Milchprodukte & Eier', emoji: '🥛', amounts: [...g(250, 500)] },
  { name: 'Sahne', category: 'Milchprodukte & Eier', emoji: '🥛', amounts: [...ml(200)] },
  { name: 'Käse', category: 'Milchprodukte & Eier', emoji: '🧀', amounts: [...g(200, 400)] },
  { name: 'Parmesan', category: 'Milchprodukte & Eier', emoji: '🧀', amounts: [...g(100, 200)] },
  { name: 'Mozzarella', category: 'Milchprodukte & Eier', emoji: '🧀', amounts: pcs(1, 2) },
  { name: 'Frischkäse', category: 'Milchprodukte & Eier', emoji: '🧀', amounts: [...g(200)] },

  // Fleisch & Fisch
  { name: 'Hähnchenbrust', category: 'Fleisch & Fisch', emoji: '🍗', amounts: [...g(500), ...kg(1)] },
  { name: 'Hackfleisch', category: 'Fleisch & Fisch', emoji: '🥩', amounts: [...g(500), ...kg(1)] },
  { name: 'Rindfleisch', category: 'Fleisch & Fisch', emoji: '🥩', amounts: [...g(500)] },
  { name: 'Speck', category: 'Fleisch & Fisch', emoji: '🥓', amounts: [...g(150, 200)] },
  { name: 'Wurst', category: 'Fleisch & Fisch', emoji: '🌭', amounts: pcs(1) },
  { name: 'Lachs', category: 'Fleisch & Fisch', emoji: '🐟', amounts: [...g(250, 400)] },
  { name: 'Garnelen', category: 'Fleisch & Fisch', emoji: '🦐', amounts: [...g(200, 300)] },
  { name: 'Thunfisch (Dose)', category: 'Fleisch & Fisch', emoji: '🐟', amounts: pcs(1, 2) },

  // Kühlregal
  { name: 'Hummus', category: 'Kühlregal', emoji: '🥣', amounts: pcs(1) },
  { name: 'Pesto', category: 'Kühlregal', emoji: '🌿', amounts: pcs(1) },
  { name: 'Aufstrich', category: 'Kühlregal', emoji: '🥪', amounts: pcs(1) },
  { name: 'Fertigteig', category: 'Kühlregal', emoji: '🥧', amounts: pcs(1) },
  { name: 'Tofu', category: 'Kühlregal', emoji: '🧊', amounts: pcs(1, 2) },

  // Tiefkühl
  { name: 'TK-Gemüse', category: 'Tiefkühl', emoji: '🧊', amounts: [...g(500)] },
  { name: 'TK-Pizza', category: 'Tiefkühl', emoji: '🍕', amounts: pcs(1, 2) },
  { name: 'Eis', category: 'Tiefkühl', emoji: '🍨', amounts: pcs(1) },
  { name: 'Pommes', category: 'Tiefkühl', emoji: '🍟', amounts: [...g(750, 1000)] },
  { name: 'TK-Beeren', category: 'Tiefkühl', emoji: '🫐', amounts: [...g(300, 500)] },

  // Vorrat & Trockenware
  { name: 'Nudeln', category: 'Vorrat & Trockenware', emoji: '🍝', amounts: [...g(500), ...kg(1)] },
  { name: 'Reis', category: 'Vorrat & Trockenware', emoji: '🍚', amounts: [...g(500), ...kg(1)] },
  { name: 'Couscous', category: 'Vorrat & Trockenware', emoji: '🍚', amounts: [...g(500)] },
  { name: 'Linsen', category: 'Vorrat & Trockenware', emoji: '🫘', amounts: [...g(400, 500)] },
  { name: 'Kichererbsen (Dose)', category: 'Vorrat & Trockenware', emoji: '🫘', amounts: pcs(1, 2) },
  { name: 'Passierte Tomaten', category: 'Vorrat & Trockenware', emoji: '🥫', amounts: pcs(1, 2) },
  { name: 'Kokosmilch', category: 'Vorrat & Trockenware', emoji: '🥥', amounts: pcs(1, 2) },
  { name: 'Zucker', category: 'Vorrat & Trockenware', emoji: '🧂', amounts: [...kg(1)] },
  { name: 'Haferflocken', category: 'Vorrat & Trockenware', emoji: '🥣', amounts: [...g(500)] },
  { name: 'Müsli', category: 'Vorrat & Trockenware', emoji: '🥣', amounts: [...g(500)] },
  { name: 'Brühe', category: 'Vorrat & Trockenware', emoji: '🍲', amounts: pcs(1) },

  // Gewürze & Öle
  { name: 'Olivenöl', category: 'Gewürze & Öle', emoji: '🫒', amounts: [...ml(500), ...l(1)] },
  { name: 'Salz', category: 'Gewürze & Öle', emoji: '🧂', amounts: pcs(1) },
  { name: 'Pfeffer', category: 'Gewürze & Öle', emoji: '🧂', amounts: pcs(1) },
  { name: 'Essig', category: 'Gewürze & Öle', emoji: '🍶', amounts: [...ml(500)] },
  { name: 'Sojasauce', category: 'Gewürze & Öle', emoji: '🍶', amounts: [...ml(150, 250)] },
  { name: 'Senf', category: 'Gewürze & Öle', emoji: '🍯', amounts: pcs(1) },
  { name: 'Honig', category: 'Gewürze & Öle', emoji: '🍯', amounts: pcs(1) },

  // Getränke
  { name: 'Wasser', category: 'Getränke', emoji: '💧', amounts: pcs(6, 12) },
  { name: 'Orangensaft', category: 'Getränke', emoji: '🧃', amounts: [...l(1)] },
  { name: 'Kaffee', category: 'Getränke', emoji: '☕', amounts: [...g(500)] },
  { name: 'Tee', category: 'Getränke', emoji: '🍵', amounts: pcs(1) },
  { name: 'Wein', category: 'Getränke', emoji: '🍷', amounts: pcs(1) },
  { name: 'Bier', category: 'Getränke', emoji: '🍺', amounts: pcs(6, 12) },

  // Süßes & Snacks
  { name: 'Schokolade', category: 'Süßes & Snacks', emoji: '🍫', amounts: pcs(1, 2) },
  { name: 'Chips', category: 'Süßes & Snacks', emoji: '🍟', amounts: pcs(1) },
  { name: 'Kekse', category: 'Süßes & Snacks', emoji: '🍪', amounts: pcs(1) },
  { name: 'Nüsse', category: 'Süßes & Snacks', emoji: '🥜', amounts: [...g(200)] },

  // Haushalt & Hygiene
  { name: 'Küchenrolle', category: 'Haushalt & Hygiene', emoji: '🧻', amounts: pcs(1) },
  { name: 'Toilettenpapier', category: 'Haushalt & Hygiene', emoji: '🧻', amounts: pcs(8, 16) },
  { name: 'Spülmittel', category: 'Haushalt & Hygiene', emoji: '🧴', amounts: pcs(1) },
  { name: 'Müllbeutel', category: 'Haushalt & Hygiene', emoji: '🗑️', amounts: pcs(1) },
]

export function searchCatalog(query: string): CatalogItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return GROCERY_CATALOG.filter((item) => item.name.toLowerCase().includes(q))
}

export function catalogByCategory(): { category: string; items: CatalogItem[] }[] {
  return CATEGORY_ORDER.map((category) => ({
    category,
    items: GROCERY_CATALOG.filter((i) => i.category === category),
  })).filter((g) => g.items.length > 0)
}
