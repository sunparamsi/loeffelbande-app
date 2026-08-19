/** Icon-System im Stil der "Bring!"-App-Referenz: statt Tinte + Füllfarbe
 * zeichnet jedes Icon nur noch eine einzelne, skizzenhafte Kontur ohne
 * Füllung. Die Farbe kommt nicht vom Icon, sondern von der Kachel: weiße
 * Kontur auf orangener Kachel im Normalzustand, orangene Kontur auf heller
 * Kachel im ausgewählten/invertierten Zustand (siehe `tone`-Prop unten).
 *
 * Die Geometrie selbst stammt weiterhin aus einer eigenen, einfachen
 * Formensprache (keine übernommenen Fremd-Icons) und wird über "roughjs"
 * gezeichnet – eine kleine Bibliothek, die dieselbe Geometrie mit leicht
 * wackeliger, mehrfach übermalter Linienführung neu aufbaut (genau der
 * Trick, den z. B. Excalidraw für den Hand-gezeichnet-Look verwendet).
 * Jeder Artikelname bekommt einen deterministischen "Seed", damit dasselbe
 * Icon bei jedem Rendern gleich wackelig aussieht, statt bei jedem Neuladen
 * neu zu "zittern". */

import { useEffect, useRef } from 'react'
import rough from 'roughjs'
import type { RoughSVG } from 'roughjs/bin/svg'
import type { Options } from 'roughjs/bin/core'

const INK = '#2a241c'
const LEAF = '#8fae73'
const NEUTRAL = '#ede6d8'
const PIT = '#b98657'

/** Einzige Akzentfarbe des Icon-Systems (entspricht --color-rust-solid). */
const ORANGE = '#f2814a'
const WHITE = '#ffffff'

function hash(seed: string): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return h
}
function hashSeed(name: string): number {
  return (hash(name) % 900) + 1
}

// Grundeinstellungen für den Skizzen-Look: mittlere "roughness" (Wackelanteil
// der Linie), etwas "bowing" (Geraden werden leicht durchgebogen statt
// schnurgerade). fillStyle bleibt "solid", wird aber pro Aufruf über
// fillOpts/lineOpts auf "kein Füllung, nur Kontur in der aktuellen
// Akzentfarbe" gezwungen (siehe `currentStroke` weiter unten) – so bleiben
// alle ~45 Formen unten unverändert, nur die Farbgebung ändert sich global.
const BASE: Options = {
  roughness: 1.1,
  bowing: 0.9,
  strokeWidth: 2.6,
  fillStyle: 'solid',
  curveFitting: 0.97,
  fixedDecimalPlaceDigits: 2,
}

/** Wird unmittelbar vor jedem Render-Durchlauf auf die passende Farbe (weiß
 * oder orange, je nach `tone`-Prop) gesetzt. fillOpts/lineOpts lesen diesen
 * Wert und überschreiben damit jede in den Formen fest verdrahtete Farbe
 * (z. B. LEAF/NEUTRAL/PIT), sodass am Ende immer nur eine einzige Kontur-
 * farbe zu sehen ist – unabhängig davon, welche Farbe eine Form ursprünglich
 * (aus der Tinte-plus-Füllung-Ära) übergeben bekommt. */
let currentStroke: string = WHITE

function fillOpts(_fill: string, seed: number, extra: Options = {}): Options {
  return { ...BASE, ...extra, fill: 'none', stroke: currentStroke, seed }
}
function lineOpts(seed: number, extra: Options = {}): Options {
  return { ...BASE, ...extra, stroke: currentStroke, seed }
}

function group(parts: SVGGElement[]): SVGGElement {
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  parts.forEach((p) => g.appendChild(p))
  return g
}

type Shape = (rc: RoughSVG, fill: string, seed: number) => SVGGElement

const SHAPES: Record<string, Shape> = {
  roundFruit: (rc, fill, seed) =>
    group([
      rc.circle(24, 27, 26, fillOpts(fill, seed)),
      rc.path('M24 14c0-3 2-5 4-6', lineOpts(seed + 1)),
      rc.path('M27 9c2-1 4 0 4 2s-2 3-4 2Z', fillOpts(LEAF, seed + 2, { strokeWidth: 1.3 })),
    ]),
  roundFruitPlain: (rc, fill, seed) => group([rc.ellipse(24, 25, 28, 26, fillOpts(fill, seed))]),
  citrusWedge: (rc, fill, seed) =>
    group([
      rc.path('M8 34a16 16 0 0 1 32 0z', fillOpts(fill, seed)),
      rc.path('M24 34V18M24 34l-9-13M24 34l9-13', lineOpts(seed + 1, { strokeWidth: 1.2 })),
    ]),
  banana: (rc, fill, seed) =>
    group([
      rc.path(
        'M14 33c-2-9 4-19 14-21 2 0 2.5 2 1 2.5-8 3-12 10-10 18 3 7 11 8 16 3 1-1 3 0 2 2-5 6-15 6-19 0-1-1-3-2.5-4-4.5z',
        fillOpts(fill, seed),
      ),
    ]),
  pear: (rc, fill, seed) =>
    group([
      rc.path('M24 13c3 3 2 6 0 8-5 2-8 7-8 12a8 8 0 0 0 16 0c0-5-3-10-8-12-2-2-3-5 0-8z', fillOpts(fill, seed)),
      rc.path('M24 13v-3', lineOpts(seed + 1, { strokeWidth: 1.6 })),
    ]),
  bellPepper: (rc, fill, seed) =>
    group([
      rc.path('M24 15c6 0 10 6 9 13-1 7-5 12-9 12s-8-5-9-12c-1-7 3-13 9-13z', fillOpts(fill, seed)),
      rc.path('M22 15c0-2 1-4 2-4s2 2 2 4', lineOpts(seed + 1, { strokeWidth: 1.6 })),
      rc.path('M22 12c-1-1-3-1-3 1Z', fillOpts(LEAF, seed + 2, { strokeWidth: 1.2 })),
    ]),
  carrot: (rc, fill, seed) =>
    group([
      rc.path('M24 17l6 21c1 3-2 5-4 3l-2-3-2 3c-2 2-5 0-4-3l6-21z', fillOpts(fill, seed)),
      rc.path('M20 16c1-3 2-5 4-6M24 15c1-4 2-6 3-7M28 16c-1-3-1-5-1-6', lineOpts(seed + 1, { stroke: LEAF, strokeWidth: 1.6 })),
    ]),
  elongatedVeg: (rc, fill, seed) =>
    group([
      rc.path('M16 34c-3-3-3-9 0-14l6-6c5-3 11-3 14 0s3 9 0 14l-6 6c-5 3-11 3-14 0z', fillOpts(fill, seed)),
      rc.path('M20 29l6-12M25 31l6-12', lineOpts(seed + 1, { strokeWidth: 1.1 })),
    ]),
  leafyGreen: (rc, fill, seed) =>
    group([
      rc.path(
        'M24 39c8 0 13-5 13-12 0-3-1-6-4-8 1 3-1 5-3 6 0-3-2-6-4-7 1 3-1 5-3 5s-4-2-3-5c-2 1-4 4-4 7-2-1-4-3-3-6-3 2-4 5-4 8 0 7 5 12 13 12z',
        fillOpts(fill, seed),
      ),
    ]),
  bulb: (rc, fill, seed) =>
    group([
      rc.path('M24 36c-6 0-10-4-10-10 0-7 4-12 10-15 6 3 10 8 10 15 0 6-4 10-10 10z', fillOpts(fill, seed)),
      rc.path('M24 11v-4M21 9l3-3 3 3', lineOpts(seed + 1, { strokeWidth: 1.5 })),
      rc.path('M20 36l-1 3M28 36l1 3', lineOpts(seed + 2, { strokeWidth: 1.2 })),
    ]),
  gingerRoot: (rc, fill, seed) =>
    group([
      rc.path(
        'M14 27c-2-4 1-8 5-8 1-3 5-5 8-3 3-1 7 1 7 5 3 1 4 5 2 8 2 3 0 7-4 7-2 2-6 2-8 0-3 1-6-1-6-4-3 0-5-3-4-5z',
        fillOpts(fill, seed, { strokeWidth: 1.7 }),
      ),
    ]),
  mushroom: (rc, fill, seed) =>
    group([
      rc.path('M14 24c0-6 5-10 10-10s10 4 10 10H14z', fillOpts(fill, seed)),
      rc.path('M19 24v7a5 5 0 0 0 10 0v-7', fillOpts(NEUTRAL, seed + 1)),
    ]),
  berryCluster: (rc, fill, seed) =>
    group([
      rc.circle(18, 21, 10, fillOpts(fill, seed, { strokeWidth: 1.6 })),
      rc.circle(28, 21, 10, fillOpts(fill, seed + 1, { strokeWidth: 1.6 })),
      rc.circle(14, 30, 10, fillOpts(fill, seed + 2, { strokeWidth: 1.6 })),
      rc.circle(24, 30, 10, fillOpts(fill, seed + 3, { strokeWidth: 1.6 })),
      rc.circle(34, 30, 10, fillOpts(fill, seed + 4, { strokeWidth: 1.6 })),
      rc.path('M22 12c1-2 3-2 4-1', lineOpts(seed + 5, { stroke: LEAF, strokeWidth: 1.4 })),
    ]),
  singleBerry: (rc, fill, seed) =>
    group([
      rc.path('M24 15c8 0 12 8 10 15-2 7-6 11-10 11s-8-4-10-11c-2-7 2-15 10-15z', fillOpts(fill, seed)),
      rc.path('M18 13c2 1 4 2 6 2s4-1 6-2c1 2 0 3-2 3h-8c-2 0-3-1-2-3z', fillOpts(LEAF, seed + 1, { strokeWidth: 1.3 })),
    ]),
  cornCob: (rc, fill, seed) =>
    group([
      rc.path('M20 10c6 0 9 6 9 16s-3 18-9 18-9-8-9-18 3-16 9-16z', fillOpts(fill, seed)),
      rc.path('M15 10c-3 0-5 2-5 5M25 10c3 0 5 2 5 5', lineOpts(seed + 1, { stroke: LEAF, strokeWidth: 1.6 })),
    ]),
  broccoli: (rc, fill, seed) =>
    group([
      rc.path(
        'M16 24c-2-4 1-8 4-7 0-3 3-5 6-4 1-2 4-2 5 0 3-1 6 1 6 4 3-1 6 3 4 7-2 3-6 4-9 3-3 2-8 2-11 0-2 1-4 0-5-3z',
        fillOpts(fill, seed, { strokeWidth: 1.7 }),
      ),
      rc.rectangle(20, 26, 8, 12, fillOpts(NEUTRAL, seed + 1)),
    ]),
  herbSprig: (rc, _fill, seed) =>
    group([rc.path('M24 39V15M24 20l-6-5M24 24l7-5M24 28l-6-4M24 32l6-4', lineOpts(seed, { strokeWidth: 1.7 }))]),
  avocado: (rc, fill, seed) =>
    group([
      rc.path('M24 12c7 2 11 9 11 16 0 8-6 12-11 12s-11-4-11-12c0-7 4-14 11-16z', fillOpts(fill, seed)),
      rc.circle(24, 28, 12, fillOpts(PIT, seed + 1, { strokeWidth: 1.6 })),
    ]),
  eggplantFig: (rc, fill, seed) =>
    group([
      rc.path(
        'M24 15c4-2 7 1 6 4-1 2-1 3 1 4 5 3 6 10 2 15-4 4-11 4-15 0-4-4-4-11 1-15 2-2 2-3 1-5-1-2 0-3 4-3z',
        fillOpts(fill, seed),
      ),
      rc.path('M23 15c0-2 0-4 1-5', lineOpts(seed + 1, { stroke: LEAF, strokeWidth: 1.6 })),
    ]),
  loaf: (rc, fill, seed) =>
    group([
      rc.path('M10 31c0-9 6-16 14-16s14 7 14 16v1a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2z', fillOpts(fill, seed)),
      rc.path('M17 20l3 6M24 17v9M31 20l-3 6', lineOpts(seed + 1, { strokeWidth: 1.3 })),
    ]),
  baguette: (rc, fill, seed) =>
    group([
      rc.path('M10 34c-2-2-2-5 0-7l17-17c2-2 5-2 7 0s2 5 0 7L17 34c-2 2-5 2-7 0z', fillOpts(fill, seed)),
      rc.path('M16 28l3 3M21 23l3 3M26 18l3 3', lineOpts(seed + 1, { strokeWidth: 1.2 })),
    ]),
  croissant: (rc, fill, seed) =>
    group([
      rc.path(
        'M9 31c2-11 11-19 20-19 4 0 6 1 8 3-3 0-6 1-8 3 4 0 7 2 8 5-3-1-6-1-8 1 3 1 5 3 6 6-8-4-19-1-26 1z',
        fillOpts(fill, seed, { strokeWidth: 1.7 }),
      ),
    ]),
  roll: (rc, fill, seed) =>
    group([
      rc.ellipse(24, 27, 26, 20, fillOpts(fill, seed)),
      rc.path('M18 22c2 3 2 6 0 9M30 22c-2 3-2 6 0 9', lineOpts(seed + 1, { strokeWidth: 1.3 })),
    ]),
  milkBottle: (rc, fill, seed) =>
    group([
      rc.path('M20 11h8v5l4 4v18a3 3 0 0 1-3 3H19a3 3 0 0 1-3-3V20l4-4z', fillOpts(fill, seed)),
      rc.rectangle(20, 8, 8, 4, fillOpts(NEUTRAL, seed + 1, { strokeWidth: 1.5 })),
    ]),
  eggShape: (rc, fill, seed) => group([rc.path('M24 12c6 0 10 9 10 16a10 10 0 0 1-20 0c0-7 4-16 10-16z', fillOpts(fill, seed))]),
  butterBlock: (rc, fill, seed) =>
    group([
      rc.path('M12 19h24v17a2 2 0 0 1-2 2H14a2 2 0 0 1-2-2z', fillOpts(fill, seed)),
      rc.path('M12 19l4-5h16l4 5', lineOpts(seed + 1, { strokeWidth: 1.6 })),
    ]),
  cheeseWedge: (rc, fill, seed) =>
    group([
      rc.path('M9 33L24 11l15 22a2 2 0 0 1-2 3H11a2 2 0 0 1-2-3z', fillOpts(fill, seed)),
      rc.circle(22, 26, 4, fillOpts(NEUTRAL, seed + 1, { strokeWidth: 1.2 })),
      rc.circle(29, 30, 3.2, fillOpts(NEUTRAL, seed + 2, { strokeWidth: 1.2 })),
    ]),
  cheeseRound: (rc, fill, seed) =>
    group([
      rc.circle(24, 25, 26, fillOpts(fill, seed)),
      rc.circle(20, 22, 3.6, fillOpts(NEUTRAL, seed + 1, { strokeWidth: 1 })),
      rc.circle(28, 28, 3.6, fillOpts(NEUTRAL, seed + 2, { strokeWidth: 1 })),
      rc.circle(27, 19, 2.8, fillOpts(NEUTRAL, seed + 3, { strokeWidth: 1 })),
    ]),
  meatCut: (rc, fill, seed) =>
    group([rc.path('M12 30c-2-6 2-13 9-15 6-2 12 0 15 5 3 4 2 10-2 13-5 4-13 4-18 1-2-1-3-2-4-4z', fillOpts(fill, seed))]),
  baconStrip: (rc, fill, seed) =>
    group([
      rc.path('M10 15c6 5 1 9 8 14s1 9 8 14', lineOpts(seed, { stroke: fill, strokeWidth: 7 })),
      rc.path('M10 15c6 5 1 9 8 14s1 9 8 14', lineOpts(seed + 1, { strokeWidth: 1.6 })),
    ]),
  sausage: (rc, fill, seed) =>
    group([
      rc.path('M12 26c0-5 4-9 9-9h14c5 0 9 4 9 9s-4 9-9 9H21c-5 0-9-4-9-9z', fillOpts(fill, seed)),
      rc.path('M23 17v18M33 17v18', lineOpts(seed + 1, { strokeWidth: 1.3 })),
    ]),
  fish: (rc, fill, seed) =>
    group([
      rc.path('M8 26l-6-6v12z', fillOpts(fill, seed)),
      rc.path('M8 26c4-6 12-9 20-7 4 1 8 3 10 7-2 4-6 6-10 7-8 2-16-1-20-7z', fillOpts(fill, seed + 1)),
      rc.circle(30, 24, 3, fillOpts(INK, seed + 2, { strokeWidth: 1 })),
    ]),
  shrimp: (rc, fill, seed) =>
    group([
      rc.path(
        'M14 34c-4-8 0-18 10-22 6-2 12 0 14 4-4 0-8 2-10 6 4-1 8 1 9 5-4-1-7 1-8 4 3 0 5 2 5 5-6 3-15 2-20-2z',
        fillOpts(fill, seed, { strokeWidth: 1.7 }),
      ),
    ]),
  canTin: (rc, fill, seed) =>
    group([
      rc.rectangle(13, 14, 22, 24, fillOpts(fill, seed)),
      rc.path('M13 19h22M13 33h22', lineOpts(seed + 1, { strokeWidth: 1.2 })),
    ]),
  jar: (rc, fill, seed) =>
    group([
      rc.path('M16 20h16v16a4 4 0 0 1-4 4h-8a4 4 0 0 1-4-4z', fillOpts(fill, seed)),
      rc.rectangle(15, 12, 18, 8, fillOpts(NEUTRAL, seed + 1)),
    ]),
  tub: (rc, fill, seed) =>
    group([
      rc.path('M15 18h18l-2 18a3 3 0 0 1-3 3H20a3 3 0 0 1-3-3z', fillOpts(fill, seed)),
      rc.ellipse(24, 18, 18, 6, fillOpts(NEUTRAL, seed + 1, { strokeWidth: 1.6 })),
    ]),
  iceCube: (rc, fill, seed) =>
    group([
      rc.rectangle(13, 13, 22, 22, fillOpts(fill, seed)),
      rc.path('M13 24h22M24 13v22', lineOpts(seed + 1, { strokeWidth: 1 })),
    ]),
  pizzaSlice: (rc, fill, seed) =>
    group([
      rc.path('M24 11l17 27a2 2 0 0 1-2 3H9a2 2 0 0 1-2-3z', fillOpts(fill, seed)),
      rc.circle(22, 29, 4, fillOpts(PIT, seed + 1, { strokeWidth: 1 })),
      rc.circle(28, 24, 4, fillOpts(PIT, seed + 2, { strokeWidth: 1 })),
    ]),
  iceCreamScoop: (rc, fill, seed) =>
    group([
      rc.path('M19 26h10l-4 14a1 1 0 0 1-2 0z', fillOpts(NEUTRAL, seed, { strokeWidth: 1.6 })),
      rc.circle(24, 20, 20, fillOpts(fill, seed + 1)),
    ]),
  friesBag: (rc, fill, seed) =>
    group([
      rc.path('M15 18h18l-2 20a2 2 0 0 1-2 2H19a2 2 0 0 1-2-2z', fillOpts(fill, seed)),
      rc.path('M20 18v-6M24 18v-8M28 18v-6', lineOpts(seed + 1, { strokeWidth: 1.6 })),
    ]),
  bagStandUp: (rc, fill, seed) =>
    group([
      rc.path('M14 16h20l2 22a3 3 0 0 1-3 3H15a3 3 0 0 1-3-3z', fillOpts(fill, seed)),
      rc.path('M17 16l1-4h12l1 4', lineOpts(seed + 1, { strokeWidth: 1.6 })),
    ]),
  bottleGeneric: (rc, fill, seed) =>
    group([
      rc.path('M21 10h6v6l3 4v20a3 3 0 0 1-3 3h-6a3 3 0 0 1-3-3V20l3-4z', fillOpts(fill, seed)),
      rc.rectangle(21, 8, 6, 3, fillOpts(NEUTRAL, seed + 1, { strokeWidth: 1.4 })),
    ]),
  shaker: (rc, fill, seed) =>
    group([
      rc.path('M18 18h12l-1 18a5 5 0 0 1-5 5 5 5 0 0 1-5-5z', fillOpts(fill, seed)),
      rc.rectangle(18, 12, 12, 6, fillOpts(NEUTRAL, seed + 1, { strokeWidth: 1.5 })),
    ]),
  cupMug: (rc, fill, seed) =>
    group([
      rc.path('M12 18h18v12a9 9 0 0 1-9 9 9 9 0 0 1-9-9z', fillOpts(fill, seed)),
      rc.path('M30 22h3a4 4 0 0 1 0 8h-3', lineOpts(seed + 1, { strokeWidth: 1.8 })),
    ]),
  wineGlass: (rc, fill, seed) =>
    group([
      rc.path('M17 12h14l-2 12a5 5 0 0 1-10 0z', fillOpts(fill, seed)),
      rc.path('M24 24v10M17 36h14', lineOpts(seed + 1, { strokeWidth: 1.8 })),
    ]),
  chocolateBar: (rc, fill, seed) =>
    group([
      rc.rectangle(11, 15, 26, 18, fillOpts(fill, seed)),
      rc.path('M20 15v18M28 15v18M11 24h26', lineOpts(seed + 1, { strokeWidth: 1.2 })),
    ]),
  cookieRound: (rc, fill, seed) =>
    group([
      rc.circle(24, 24, 26, fillOpts(fill, seed)),
      rc.circle(19, 20, 3.2, fillOpts(PIT, seed + 1)),
      rc.circle(28, 19, 3.2, fillOpts(PIT, seed + 2)),
      rc.circle(20, 28, 3.2, fillOpts(PIT, seed + 3)),
      rc.circle(29, 27, 3.2, fillOpts(PIT, seed + 4)),
      rc.circle(24, 24, 3.2, fillOpts(PIT, seed + 5)),
    ]),
  nutShape: (rc, fill, seed) =>
    group([rc.path('M24 12c6 2 9 9 7 16-2 6-6 10-7 10s-5-4-7-10c-2-7 1-14 7-16z', fillOpts(fill, seed))]),
  paperRoll: (rc, fill, seed) =>
    group([
      rc.rectangle(15, 12, 18, 24, fillOpts(fill, seed)),
      rc.ellipse(24, 14, 18, 6, fillOpts(NEUTRAL, seed + 1, { strokeWidth: 1.5 })),
    ]),
  bottleSpray: (rc, fill, seed) =>
    group([
      rc.path('M20 16h6v5l3 3v14a3 3 0 0 1-3 3h-6a3 3 0 0 1-3-3V24l3-3z', fillOpts(fill, seed)),
      rc.path('M26 16v-3h6l-2 4', lineOpts(seed + 1, { strokeWidth: 1.6 })),
    ]),
  trashBag: (rc, fill, seed) =>
    group([
      rc.path('M14 18h20l-2 18c-1 3-4 5-8 5s-7-2-8-5z', fillOpts(fill, seed)),
      rc.path('M21 18c0-3 1-5 3-5s3 2 3 5', lineOpts(seed + 1, { strokeWidth: 1.6 })),
    ]),

  // --- Gezielte Zusatzformen, um Verwechslungen zwischen Artikeln zu
  // vermeiden, die sich vorher eine identische (oder unpassende) Form
  // geteilt haben (siehe Kommentare bei SHAPE_BY_ITEM weiter unten). ---
  bagPasta: (rc, fill, seed) =>
    group([
      rc.path('M14 16h20l2 22a3 3 0 0 1-3 3H15a3 3 0 0 1-3-3z', fillOpts(fill, seed)),
      rc.path('M17 16l1-4h12l1 4', lineOpts(seed + 1, { strokeWidth: 1.6 })),
      rc.path('M19 16v-7M22 16v-9M25 16v-6M28 16v-8', lineOpts(seed + 2, { strokeWidth: 1.3 })),
    ]),
  bagGrain: (rc, fill, seed) =>
    group([
      rc.path('M14 16h20l2 22a3 3 0 0 1-3 3H15a3 3 0 0 1-3-3z', fillOpts(fill, seed)),
      rc.path('M17 16l1-4h12l1 4', lineOpts(seed + 1, { strokeWidth: 1.6 })),
      rc.circle(19, 24, 2, fillOpts(fill, seed + 2, { strokeWidth: 1 })),
      rc.circle(24, 22, 2, fillOpts(fill, seed + 3, { strokeWidth: 1 })),
      rc.circle(28, 25, 2, fillOpts(fill, seed + 4, { strokeWidth: 1 })),
      rc.circle(21, 29, 2, fillOpts(fill, seed + 5, { strokeWidth: 1 })),
      rc.circle(26, 30, 2, fillOpts(fill, seed + 6, { strokeWidth: 1 })),
      rc.circle(23, 33, 2, fillOpts(fill, seed + 7, { strokeWidth: 1 })),
    ]),
  bagLentil: (rc, fill, seed) =>
    group([
      rc.path('M14 16h20l2 22a3 3 0 0 1-3 3H15a3 3 0 0 1-3-3z', fillOpts(fill, seed)),
      rc.path('M17 16l1-4h12l1 4', lineOpts(seed + 1, { strokeWidth: 1.6 })),
      rc.ellipse(19, 24, 3.4, 2, fillOpts(fill, seed + 2, { strokeWidth: 1 })),
      rc.ellipse(25, 22.5, 3.4, 2, fillOpts(fill, seed + 3, { strokeWidth: 1 })),
      rc.ellipse(29, 27, 3.4, 2, fillOpts(fill, seed + 4, { strokeWidth: 1 })),
      rc.ellipse(21, 30, 3.4, 2, fillOpts(fill, seed + 5, { strokeWidth: 1 })),
      rc.ellipse(27, 32, 3.4, 2, fillOpts(fill, seed + 6, { strokeWidth: 1 })),
    ]),
  bagSugar: (rc, fill, seed) =>
    group([
      rc.path('M14 16h20l2 22a3 3 0 0 1-3 3H15a3 3 0 0 1-3-3z', fillOpts(fill, seed)),
      rc.path('M17 16l1-4h12l1 4', lineOpts(seed + 1, { strokeWidth: 1.6 })),
      ...([
        [18, 23], [21, 21], [24, 23], [27, 21], [30, 23],
        [19, 27], [22, 26], [25, 28], [28, 26], [30, 29],
        [20, 32], [24, 31], [27, 33],
      ] as const).map(([x, y], i) => rc.circle(x, y, 1.1, fillOpts(fill, seed + 8 + i, { strokeWidth: 0.8 }))),
    ]),
  bagOats: (rc, fill, seed) =>
    group([
      rc.path('M14 16h20l2 22a3 3 0 0 1-3 3H15a3 3 0 0 1-3-3z', fillOpts(fill, seed)),
      rc.path('M17 16l1-4h12l1 4', lineOpts(seed + 1, { strokeWidth: 1.6 })),
      rc.path('M18 23c2-1 3 1 5 0', lineOpts(seed + 2, { strokeWidth: 1.3 })),
      rc.path('M24 22c2-1 3 1 5 0', lineOpts(seed + 3, { strokeWidth: 1.3 })),
      rc.path('M20 27c2-1 3 1 5 0', lineOpts(seed + 4, { strokeWidth: 1.3 })),
      rc.path('M26 28c2-1 3 1 5 0', lineOpts(seed + 5, { strokeWidth: 1.3 })),
      rc.path('M19 32c2-1 3 1 5 0', lineOpts(seed + 6, { strokeWidth: 1.3 })),
      rc.path('M25 33c2-1 3 1 5 0', lineOpts(seed + 7, { strokeWidth: 1.3 })),
    ]),
  bagMuesli: (rc, fill, seed) =>
    group([
      rc.path('M14 16h20l2 22a3 3 0 0 1-3 3H15a3 3 0 0 1-3-3z', fillOpts(fill, seed)),
      rc.path('M17 16l1-4h12l1 4', lineOpts(seed + 1, { strokeWidth: 1.6 })),
      rc.path('M19 24c2-1 3 1 5 0', lineOpts(seed + 2, { strokeWidth: 1.3 })),
      rc.path('M26 23c2-1 3 1 5 0', lineOpts(seed + 3, { strokeWidth: 1.3 })),
      rc.circle(21, 30, 2.4, fillOpts(fill, seed + 4, { strokeWidth: 1 })),
      rc.circle(27, 31, 2.4, fillOpts(fill, seed + 5, { strokeWidth: 1 })),
      rc.circle(24, 28, 1.6, fillOpts(fill, seed + 6, { strokeWidth: 0.9 })),
    ]),
  bagFrozenVeg: (rc, fill, seed) =>
    group([
      rc.path('M14 16h20l2 22a3 3 0 0 1-3 3H15a3 3 0 0 1-3-3z', fillOpts(fill, seed)),
      rc.path('M17 16l1-4h12l1 4', lineOpts(seed + 1, { strokeWidth: 1.6 })),
      rc.circle(20, 25, 2.2, fillOpts(fill, seed + 2, { strokeWidth: 1 })),
      rc.circle(27, 24, 2.2, fillOpts(fill, seed + 3, { strokeWidth: 1 })),
      rc.circle(23, 30, 2.2, fillOpts(fill, seed + 4, { strokeWidth: 1 })),
      rc.circle(29, 30, 2.2, fillOpts(fill, seed + 5, { strokeWidth: 1 })),
      rc.path('M29 19v4M27 21h4M27.6 19.6l2.8 2.8M30.4 19.6l-2.8 2.8', lineOpts(seed + 6, { strokeWidth: 1 })),
    ]),
  bagChips: (rc, fill, seed) =>
    group([
      rc.path('M13 21c-1 8 1 15 6 16h10c5-1 7-8 6-16-2-2-16-2-22 0z', fillOpts(fill, seed)),
      rc.path('M13 21c3-2 19-2 22 0', lineOpts(seed + 1, { strokeWidth: 1.4 })),
      rc.path('M20 26c2-1 4-1 5 1-1 2-3 2-5 1-1-1-1-1 0-2z', fillOpts(fill, seed + 2, { strokeWidth: 1.1 })),
    ]),
  teaBox: (rc, fill, seed) =>
    group([
      rc.rectangle(15, 14, 18, 22, fillOpts(fill, seed)),
      rc.path('M24 14v-5', lineOpts(seed + 1, { strokeWidth: 1.4 })),
      rc.rectangle(21, 5, 6, 4, fillOpts(fill, seed + 2, { strokeWidth: 1.1 })),
    ]),
  sachet: (rc, fill, seed) =>
    group([
      rc.rectangle(16, 18, 16, 16, fillOpts(fill, seed, { strokeWidth: 1.6 })),
      rc.path('M16 18c3-2 13-2 16 0', lineOpts(seed + 1, { strokeWidth: 1.2 })),
      rc.path('M16 34c3 2 13 2 16 0', lineOpts(seed + 2, { strokeWidth: 1.2 })),
    ]),
  yeastCube: (rc, fill, seed) =>
    group([
      rc.rectangle(17, 19, 14, 14, fillOpts(fill, seed, { strokeWidth: 1.7 })),
      rc.path('M17 19l4 4M31 19l-4 4', lineOpts(seed + 1, { strokeWidth: 1.1 })),
    ]),
  bouillonCubes: (rc, fill, seed) =>
    group([
      rc.rectangle(14, 23, 11, 11, fillOpts(fill, seed, { strokeWidth: 1.5 })),
      rc.rectangle(23, 17, 11, 11, fillOpts(fill, seed + 1, { strokeWidth: 1.5 })),
    ]),
  chickenBreast: (rc, fill, seed) =>
    group([
      rc.path('M14 30c-2-7 2-13 9-15 7-2 13 1 15 7 2 6-1 12-7 14-6 2-13 0-15-4-1-1-2-1-2-2z', fillOpts(fill, seed)),
      rc.path('M20 18c2 4 2 9 0 13', lineOpts(seed + 1, { strokeWidth: 1.3 })),
    ]),
  groundMeat: (rc, fill, seed) =>
    group([
      rc.path(
        'M12 33c-2-5 1-9 5-10-1-3 2-6 5-5 1-3 5-4 7-2 3-1 6 1 6 4 3 0 5 3 4 6 1 3-1 5-4 5-6 1-13 1-18 1-3 0-5 0-5 1z',
        fillOpts(fill, seed, { strokeWidth: 1.7 }),
      ),
      rc.path('M15 22c1-2 3-2 4 0', lineOpts(seed + 1, { strokeWidth: 1.2 })),
      rc.path('M20 20c1-2 3-2 4 0', lineOpts(seed + 2, { strokeWidth: 1.2 })),
      rc.path('M25 21c1-2 3-2 4 0', lineOpts(seed + 3, { strokeWidth: 1.2 })),
      rc.path('M29 23c1-2 3-2 4 0', lineOpts(seed + 4, { strokeWidth: 1.2 })),
    ]),
  beefSteak: (rc, fill, seed) =>
    group([
      rc.path('M11 18h22c2 0 3 2 2 4l-3 15c-1 2-2 3-4 3H16c-2 0-3-1-4-3l-3-15c-1-2 0-4 2-4z', fillOpts(fill, seed)),
      rc.path('M16 22c3 3 3 8 0 12', lineOpts(seed + 1, { strokeWidth: 1.2 })),
      rc.path('M22 20c3 4 3 10 0 15', lineOpts(seed + 2, { strokeWidth: 1.2 })),
      rc.path('M28 22c2 3 2 8 0 12', lineOpts(seed + 3, { strokeWidth: 1.2 })),
    ]),
  garlicBulb: (rc, fill, seed) =>
    group([
      rc.path(
        'M24 34c-5 0-9-4-9-9 0-6 3-10 6-13-1-2 0-4 1-5 1-1 2 0 2 1 0 1 1 3 1 5 3 3 6 7 6 13 0 5-4 9-9 9z',
        fillOpts(fill, seed, { strokeWidth: 1.7 }),
      ),
      rc.path('M24 12v22', lineOpts(seed + 1, { strokeWidth: 1.1 })),
      rc.path('M20 15c0 6 1 13 2 19', lineOpts(seed + 2, { strokeWidth: 1.1 })),
      rc.path('M28 15c0 6-1 13-2 19', lineOpts(seed + 3, { strokeWidth: 1.1 })),
      rc.path('M21 34l-1 3M27 34l1 3', lineOpts(seed + 4, { strokeWidth: 1.2 })),
    ]),
  toastStack: (rc, fill, seed) =>
    group([
      rc.rectangle(11, 26, 15, 11, fillOpts(fill, seed, { strokeWidth: 1.6 })),
      rc.rectangle(15, 19, 15, 11, fillOpts(fill, seed + 1, { strokeWidth: 1.6 })),
      rc.rectangle(19, 12, 15, 11, fillOpts(fill, seed + 2, { strokeWidth: 1.6 })),
    ]),
  creamCarton: (rc, fill, seed) =>
    group([
      rc.path('M17 18h14v20a1 1 0 0 1-1 1H18a1 1 0 0 1-1-1z', fillOpts(fill, seed)),
      rc.path('M17 18l7-6 7 6', lineOpts(seed + 1, { strokeWidth: 1.5 })),
    ]),
  doughTube: (rc, fill, seed) =>
    group([
      rc.path('M14 20a10 4 0 0 1 20 0v10a10 4 0 0 1-20 0z', fillOpts(fill, seed, { strokeWidth: 1.6 })),
      rc.path('M14 25h20', lineOpts(seed + 1, { strokeWidth: 1.1 })),
      rc.path('M12 22l2-2M12 18l2 2', lineOpts(seed + 2, { strokeWidth: 1.3 })),
    ]),
}

/** Ordnet jeden Katalog-Artikelnamen einer Icon-Form zu. Für Artikel, die
 * hier fehlen (z. B. frei/manuell hinzugefügte Einträge), greift ein
 * generischer Beutel-Icon-Fallback statt gar kein Icon zu zeigen. */
const SHAPE_BY_ITEM: Record<string, keyof typeof SHAPES> = {
  Tomaten: 'roundFruit',
  Gurke: 'elongatedVeg',
  Zwiebeln: 'bulb',
  Knoblauch: 'garlicBulb',
  Kartoffeln: 'roundFruitPlain',
  Karotten: 'carrot',
  Paprika: 'bellPepper',
  Zucchini: 'elongatedVeg',
  Salat: 'leafyGreen',
  Champignons: 'mushroom',
  Bananen: 'banana',
  Äpfel: 'roundFruit',
  Zitronen: 'citrusWedge',
  Avocado: 'avocado',
  Beeren: 'berryCluster',
  Petersilie: 'herbSprig',
  Basilikum: 'herbSprig',
  Ingwer: 'gingerRoot',

  Brot: 'loaf',
  Brötchen: 'roll',
  Baguette: 'baguette',
  Toastbrot: 'toastStack',
  Croissants: 'croissant',
  Mehl: 'bagStandUp',
  Hefe: 'yeastCube',
  Backpulver: 'sachet',

  Milch: 'milkBottle',
  Eier: 'eggShape',
  Butter: 'butterBlock',
  Joghurt: 'tub',
  Quark: 'tub',
  Sahne: 'creamCarton',
  Käse: 'cheeseWedge',
  Parmesan: 'cheeseWedge',
  Mozzarella: 'cheeseRound',
  Frischkäse: 'tub',

  Hähnchenbrust: 'chickenBreast',
  Hackfleisch: 'groundMeat',
  Rindfleisch: 'beefSteak',
  Speck: 'baconStrip',
  Wurst: 'sausage',
  Lachs: 'fish',
  Garnelen: 'shrimp',
  'Thunfisch (Dose)': 'canTin',

  Hummus: 'tub',
  Pesto: 'jar',
  Aufstrich: 'jar',
  Fertigteig: 'doughTube',
  Tofu: 'iceCube',

  'TK-Gemüse': 'bagFrozenVeg',
  'TK-Pizza': 'pizzaSlice',
  Eis: 'iceCreamScoop',
  Pommes: 'friesBag',
  'TK-Beeren': 'berryCluster',

  Nudeln: 'bagPasta',
  Reis: 'bagGrain',
  Couscous: 'bagGrain',
  Linsen: 'bagLentil',
  'Kichererbsen (Dose)': 'canTin',
  'Passierte Tomaten': 'canTin',
  Kokosmilch: 'canTin',
  Zucker: 'bagSugar',
  Haferflocken: 'bagOats',
  Müsli: 'bagMuesli',
  Brühe: 'bouillonCubes',

  Olivenöl: 'bottleGeneric',
  Salz: 'shaker',
  Pfeffer: 'shaker',
  Essig: 'bottleGeneric',
  Sojasauce: 'bottleGeneric',
  Senf: 'jar',
  Honig: 'jar',

  Wasser: 'bottleGeneric',
  Orangensaft: 'bottleGeneric',
  Kaffee: 'cupMug',
  Tee: 'teaBox',
  Wein: 'wineGlass',
  Bier: 'bottleGeneric',

  Schokolade: 'chocolateBar',
  Chips: 'bagChips',
  Kekse: 'cookieRound',
  Nüsse: 'nutShape',

  Küchenrolle: 'paperRoll',
  Toilettenpapier: 'paperRoll',
  Spülmittel: 'bottleSpray',
  Müllbeutel: 'trashBag',
}

const FALLBACK_SHAPE: keyof typeof SHAPES = 'bagStandUp'

/** Rendert das zu einem Artikelnamen passende Icon aus dem selbstgebauten
 * Formen-System – über roughjs mit wackeliger Hand-Skizzen-Linienführung
 * gezeichnet und deterministisch eingefärbt (gleicher Name -> immer gleiche
 * Farbe/Wackeligkeit), damit "Zuletzt verwendet" und Katalog-Kachel optisch
 * identisch bleiben. Unbekannte (z. B. frei eingetippte) Namen bekommen
 * einen neutralen Beutel statt gar kein Icon.
 *
 * Rendert imperativ per useEffect statt deklarativ als JSX, weil roughjs
 * fertige SVG-DOM-Knoten zurückgibt (über eine an das echte <svg>-Element
 * gebundene RoughSVG-Instanz), keine React-Elemente. */
// Die einzelnen Formen sind (mit etwas Luft drumherum) auf ein 48x48-Raster
// gezeichnet, füllen es also nicht ganz aus. Ein Zoom-Faktor um den
// Mittelpunkt herum lässt sie die Kachel deutlicher ausfüllen, ohne jede der
// ~45 Formen einzeln neu vermessen zu müssen.
const ZOOM = 1.35

export function CatalogIcon({
  name,
  size = 40,
  tone = 'white',
  className,
}: {
  name: string
  size?: number
  /** 'white' für die Standard-Kachel (orangener Untergrund), 'orange' für
   * hellen/invertierten Untergrund (ausgewählte Kachel, oder freistehend
   * neben Text ohne farbige Kachel dahinter). */
  tone?: 'white' | 'orange'
  className?: string
}) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const key = SHAPE_BY_ITEM[name] ?? FALLBACK_SHAPE
  const seed = hashSeed(name)
  const color = tone === 'orange' ? ORANGE : WHITE

  useEffect(() => {
    const svgEl = svgRef.current
    if (!svgEl) return
    while (svgEl.firstChild) svgEl.removeChild(svgEl.firstChild)
    currentStroke = color
    const rc = rough.svg(svgEl)
    const render = SHAPES[key] ?? SHAPES[FALLBACK_SHAPE]
    const zoomed = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    zoomed.setAttribute('transform', `translate(24 24) scale(${ZOOM}) translate(-24 -24)`)
    zoomed.appendChild(render(rc, color, seed))
    svgEl.appendChild(zoomed)
  }, [key, seed, color])

  return <svg ref={svgRef} width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden="true" />
}
