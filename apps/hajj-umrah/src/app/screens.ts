export type Screen = "home" | "guide" | "prayers" | "map" | "sites" | "ask" | "emergency";
export type OnboardingStep = "language" | "journey" | "hajjType";
export type PlaceholderScreen = Extract<Screen, "map">;
