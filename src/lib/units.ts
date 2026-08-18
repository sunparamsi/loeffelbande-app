/** Bekannte Mengeneinheiten (Deutsch + Englisch, da importierte/gescannte
 * Rezepte oft von englischsprachigen Quellen stammen). Zentral gepflegt,
 * damit URL-Import, Freitext-Parsing (Foto/PDF/Social) und ggf. weitere
 * Importwege dieselbe Erkennung nutzen. */
export const UNIT_WORDS = [
  // Deutsch
  'g', 'kg', 'ml', 'l', 'el', 'tl', 'stk', 'stück', 'prise', 'bund', 'dose', 'zehe', 'zehen', 'scheibe', 'scheiben', 'päckchen', 'msp', 'tasse', 'becher',
  // Englisch
  'cup', 'cups', 'oz', 'ounce', 'ounces', 'lb', 'lbs', 'pound', 'pounds', 'tbsp', 'tbsp.', 'tablespoon', 'tablespoons', 'tsp', 'tsp.', 'teaspoon', 'teaspoons',
  'clove', 'cloves', 'can', 'cans', 'package', 'packages', 'pkg', 'slice', 'slices', 'pinch', 'bunch', 'stick', 'sticks', 'quart', 'quarts', 'pint', 'pints', 'gallon', 'gallons',
]
