// T048: landmark points for the Live mode tests (approximate, like the shapes they check).
import type { LatLon } from "../../src/data/places-geo";

export const POINTS = {
  mataf: [21.4225, 39.8258], // about 45 m west of the Kaaba
  maqam: [21.42262, 39.82634],
  masa: [21.4235, 39.82717], // halfway between Safa and Marwah
  haram: [21.424, 39.825], // northern halls of Masjid al-Haram, about 190 m from the Kaaba
  makkah: [21.4123, 39.8187], // a district of Makkah away from the Haram
  jamarat: [21.4228, 39.8733], // middle of the Jamarat bridge
  mina: [21.413, 39.893],
  muzdalifah: [21.3839, 39.9149], // al-Mash'ar al-Haram
  arafah: [21.3549, 39.9842], // Jabal al-Rahmah
  namirah: [21.353, 39.966], // Masjid Namirah
  abyarAli: [24.4136, 39.5431],
  jeddah: [21.5433, 39.1728],
} satisfies Record<string, LatLon>;
