export type Screen = "home" | "guide" | "prayers" | "map" | "sites" | "ask";
export type OnboardingStep = "language" | "journey" | "hajjType";
export type PlaceholderScreen = Extract<Screen, "prayers" | "map">;
