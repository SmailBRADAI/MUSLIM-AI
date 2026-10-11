export type Screen = "home" | "guide" | "prayers" | "map" | "sites";
export type OnboardingStep = "language" | "journey" | "hajjType";
export type PlaceholderScreen = Extract<Screen, "prayers" | "map">;
