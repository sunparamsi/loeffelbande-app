export function currentSeason(date = new Date()): { label: string; keywords: string[] } {
  const m = date.getMonth() // 0-11
  if (m === 11 || m <= 1) return { label: 'Winter', keywords: ['winter', 'weihnacht', 'glühwein', 'kohl', 'grünkohl'] }
  if (m >= 2 && m <= 4) return { label: 'Frühling', keywords: ['frühling', 'spargel', 'bärlauch', 'radieschen'] }
  if (m >= 5 && m <= 7) return { label: 'Sommer', keywords: ['sommer', 'grill', 'salat', 'beeren', 'melone'] }
  return { label: 'Herbst', keywords: ['herbst', 'kürbis', 'pilz', 'pflaume', 'apfel'] }
}
