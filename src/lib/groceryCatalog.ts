/** Kuratierter Katalog gängiger Einkaufsartikel (angelehnt an Apps wie
 * "Bring!"): antippbare Kacheln statt Freitext-Tippen. Das Icon pro Artikel
 * wird nicht hier gespeichert, sondern über den Namen aus dem eigenen
 * Icon-System (`catalogIcons.tsx`) nachgeschlagen. Jeder Eintrag hat eine
 * Kategorie (für die gruppierte Übersicht) und ein paar typische
 * Mengen-Presets, die beim Antippen als Schnellauswahl-Chips erscheinen.
 * Freies Eintippen bleibt für alles, was hier fehlt, weiterhin jederzeit
 * möglich. */

export interface Amount {
  quantity: number
  unit: string
}

export interface CatalogItem {
  name: string
  category: string
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
  { name: 'Tomaten', category: 'Obst & Gemüse', amounts: [...pcs(3, 6), ...g(500), ...kg(1)] },
  { name: 'Gurke', category: 'Obst & Gemüse', amounts: pcs(1, 2) },
  { name: 'Zwiebeln', category: 'Obst & Gemüse', amounts: [...pcs(3, 6), ...kg(1)] },
  { name: 'Knoblauch', category: 'Obst & Gemüse', amounts: pcs(1, 2, 3) },
  { name: 'Kartoffeln', category: 'Obst & Gemüse', amounts: [...kg(1, 2)] },
  { name: 'Karotten', category: 'Obst & Gemüse', amounts: [...g(500), ...kg(1)] },
  { name: 'Paprika', category: 'Obst & Gemüse', amounts: pcs(2, 3, 4) },
  { name: 'Zucchini', category: 'Obst & Gemüse', amounts: pcs(1, 2, 3) },
  { name: 'Salat', category: 'Obst & Gemüse', amounts: pcs(1, 2) },
  { name: 'Champignons', category: 'Obst & Gemüse', amounts: [...g(250, 500)] },
  { name: 'Bananen', category: 'Obst & Gemüse', amounts: pcs(4, 6) },
  { name: 'Äpfel', category: 'Obst & Gemüse', amounts: [...pcs(4, 6), ...kg(1)] },
  { name: 'Zitronen', category: 'Obst & Gemüse', amounts: pcs(1, 2, 4) },
  { name: 'Avocado', category: 'Obst & Gemüse', amounts: pcs(1, 2) },
  { name: 'Beeren', category: 'Obst & Gemüse', amounts: [...g(250, 500)] },
  { name: 'Petersilie', category: 'Obst & Gemüse', amounts: pcs(1) },
  { name: 'Basilikum', category: 'Obst & Gemüse', amounts: pcs(1) },
  { name: 'Ingwer', category: 'Obst & Gemüse', amounts: pcs(1) },

  // Brot & Backwaren
  { name: 'Brot', category: 'Brot & Backwaren', amounts: pcs(1) },
  { name: 'Brötchen', category: 'Brot & Backwaren', amounts: pcs(2, 4, 6) },
  { name: 'Baguette', category: 'Brot & Backwaren', amounts: pcs(1, 2) },
  { name: 'Toastbrot', category: 'Brot & Backwaren', amounts: pcs(1) },
  { name: 'Croissants', category: 'Brot & Backwaren', amounts: pcs(2, 4) },
  { name: 'Mehl', category: 'Brot & Backwaren', amounts: [...kg(1)] },
  { name: 'Hefe', category: 'Brot & Backwaren', amounts: pcs(1, 2) },
  { name: 'Backpulver', category: 'Brot & Backwaren', amounts: pcs(1) },

  // Milchprodukte & Eier
  { name: 'Milch', category: 'Milchprodukte & Eier', amounts: [...l(1, 2)] },
  { name: 'Eier', category: 'Milchprodukte & Eier', amounts: pcs(6, 10) },
  { name: 'Butter', category: 'Milchprodukte & Eier', amounts: [...g(250)] },
  { name: 'Joghurt', category: 'Milchprodukte & Eier', amounts: pcs(1, 2, 4) },
  { name: 'Quark', category: 'Milchprodukte & Eier', amounts: [...g(250, 500)] },
  { name: 'Sahne', category: 'Milchprodukte & Eier', amounts: [...ml(200)] },
  { name: 'Käse', category: 'Milchprodukte & Eier', amounts: [...g(200, 400)] },
  { name: 'Parmesan', category: 'Milchprodukte & Eier', amounts: [...g(100, 200)] },
  { name: 'Mozzarella', category: 'Milchprodukte & Eier', amounts: pcs(1, 2) },
  { name: 'Frischkäse', category: 'Milchprodukte & Eier', amounts: [...g(200)] },

  // Fleisch & Fisch
  { name: 'Hähnchenbrust', category: 'Fleisch & Fisch', amounts: [...g(500), ...kg(1)] },
  { name: 'Hackfleisch', category: 'Fleisch & Fisch', amounts: [...g(500), ...kg(1)] },
  { name: 'Rindfleisch', category: 'Fleisch & Fisch', amounts: [...g(500)] },
  { name: 'Speck', category: 'Fleisch & Fisch', amounts: [...g(150, 200)] },
  { name: 'Wurst', category: 'Fleisch & Fisch', amounts: pcs(1) },
  { name: 'Lachs', category: 'Fleisch & Fisch', amounts: [...g(250, 400)] },
  { name: 'Garnelen', category: 'Fleisch & Fisch', amounts: [...g(200, 300)] },
  { name: 'Thunfisch (Dose)', category: 'Fleisch & Fisch', amounts: pcs(1, 2) },

  // Kühlregal
  { name: 'Hummus', category: 'Kühlregal', amounts: pcs(1) },
  { name: 'Pesto', category: 'Kühlregal', amounts: pcs(1) },
  { name: 'Aufstrich', category: 'Kühlregal', amounts: pcs(1) },
  { name: 'Fertigteig', category: 'Kühlregal', amounts: pcs(1) },
  { name: 'Tofu', category: 'Kühlregal', amounts: pcs(1, 2) },

  // Tiefkühl
  { name: 'TK-Gemüse', category: 'Tiefkühl', amounts: [...g(500)] },
  { name: 'TK-Pizza', category: 'Tiefkühl', amounts: pcs(1, 2) },
  { name: 'Eis', category: 'Tiefkühl', amounts: pcs(1) },
  { name: 'Pommes', category: 'Tiefkühl', amounts: [...g(750, 1000)] },
  { name: 'TK-Beeren', category: 'Tiefkühl', amounts: [...g(300, 500)] },

  // Vorrat & Trockenware
  { name: 'Nudeln', category: 'Vorrat & Trockenware', amounts: [...g(500), ...kg(1)] },
  { name: 'Reis', category: 'Vorrat & Trockenware', amounts: [...g(500), ...kg(1)] },
  { name: 'Couscous', category: 'Vorrat & Trockenware', amounts: [...g(500)] },
  { name: 'Linsen', category: 'Vorrat & Trockenware', amounts: [...g(400, 500)] },
  { name: 'Kichererbsen (Dose)', category: 'Vorrat & Trockenware', amounts: pcs(1, 2) },
  { name: 'Passierte Tomaten', category: 'Vorrat & Trockenware', amounts: pcs(1, 2) },
  { name: 'Kokosmilch', category: 'Vorrat & Trockenware', amounts: pcs(1, 2) },
  { name: 'Zucker', category: 'Vorrat & Trockenware', amounts: [...kg(1)] },
  { name: 'Haferflocken', category: 'Vorrat & Trockenware', amounts: [...g(500)] },
  { name: 'Müsli', category: 'Vorrat & Trockenware', amounts: [...g(500)] },
  { name: 'Brühe', category: 'Vorrat & Trockenware', amounts: pcs(1) },

  // Gewürze & Öle
  { name: 'Olivenöl', category: 'Gewürze & Öle', amounts: [...ml(500), ...l(1)] },
  { name: 'Salz', category: 'Gewürze & Öle', amounts: pcs(1) },
  { name: 'Pfeffer', category: 'Gewürze & Öle', amounts: pcs(1) },
  { name: 'Essig', category: 'Gewürze & Öle', amounts: [...ml(500)] },
  { name: 'Sojasauce', category: 'Gewürze & Öle', amounts: [...ml(150, 250)] },
  { name: 'Senf', category: 'Gewürze & Öle', amounts: pcs(1) },
  { name: 'Honig', category: 'Gewürze & Öle', amounts: pcs(1) },

  // Getränke
  { name: 'Wasser', category: 'Getränke', amounts: pcs(6, 12) },
  { name: 'Orangensaft', category: 'Getränke', amounts: [...l(1)] },
  { name: 'Kaffee', category: 'Getränke', amounts: [...g(500)] },
  { name: 'Tee', category: 'Getränke', amounts: pcs(1) },
  { name: 'Wein', category: 'Getränke', amounts: pcs(1) },
  { name: 'Bier', category: 'Getränke', amounts: pcs(6, 12) },

  // Süßes & Snacks
  { name: 'Schokolade', category: 'Süßes & Snacks', amounts: pcs(1, 2) },
  { name: 'Chips', category: 'Süßes & Snacks', amounts: pcs(1) },
  { name: 'Kekse', category: 'Süßes & Snacks', amounts: pcs(1) },
  { name: 'Nüsse', category: 'Süßes & Snacks', amounts: [...g(200)] },

  // Haushalt & Hygiene
  { name: 'Küchenrolle', category: 'Haushalt & Hygiene', amounts: pcs(1) },
  { name: 'Toilettenpapier', category: 'Haushalt & Hygiene', amounts: pcs(8, 16) },
  { name: 'Spülmittel', category: 'Haushalt & Hygiene', amounts: pcs(1) },
  { name: 'Müllbeutel', category: 'Haushalt & Hygiene', amounts: pcs(1) },
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
