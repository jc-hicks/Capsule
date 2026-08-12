// Curated accent presets for capsule customization. Colors are picked to sit
// alongside the app's parchment/indigo palette while staying dark enough for
// safe contrast wherever an accent is used as a background behind light text.
export const CAPSULE_THEMES = [
  { id: "indigo", label: "Indigo", accent: "#22223b" },
  { id: "rose", label: "Rose", accent: "#7a3b42" },
  { id: "amber", label: "Amber", accent: "#7a5a1e" },
  { id: "sage", label: "Sage", accent: "#3f5a44" },
  { id: "slate", label: "Slate", accent: "#2f4858" },
  { id: "plum", label: "Plum", accent: "#4f2f52" }
];

export const DEFAULT_CAPSULE_THEME = "indigo";

export const isCapsuleTheme = (value) =>
  CAPSULE_THEMES.some((theme) => theme.id === value);
