// T058 (FR-034): the main sites, their facilities and typical busy times. Everything here is general
// information drafted without access to official sources: the Sites page marks it as pending verification.

export const SITE_IDS = ["haram", "mina", "arafah", "muzdalifah"] as const;
export type SiteId = (typeof SITE_IDS)[number];

export interface Site {
  id: SiteId;
  /** Approximate centre, used only to ask a weather service about the site. Never the pilgrim's position. */
  latitude: number;
  longitude: number;
  /** Keys of `sites.facilities` in the UI strings, in the order shown. */
  facilities: readonly string[];
}

export const SITES: readonly Site[] = [
  { id: "haram", latitude: 21.4225, longitude: 39.8262, facilities: ["zamzam", "restrooms", "medical", "wheelchair", "prayerAreas"] },
  { id: "mina", latitude: 21.4133, longitude: 39.8933, facilities: ["tents", "jamaratBridge", "medical", "restrooms", "mashairTrain"] },
  { id: "arafah", latitude: 21.3549, longitude: 39.9842, facilities: ["namirah", "shade", "water", "medical", "mashairTrain"] },
  { id: "muzdalifah", latitude: 21.3833, longitude: 39.9366, facilities: ["openArea", "restrooms", "water", "mashairTrain"] },
];
