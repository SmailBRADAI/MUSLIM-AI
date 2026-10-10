export type Screen = "home" | "guide" | "prayers" | "map";
export type OnboardingStep = "language" | "journey" | "hajjType";
export type PlaceholderScreen = Extract<Screen, "prayers" | "map">;
