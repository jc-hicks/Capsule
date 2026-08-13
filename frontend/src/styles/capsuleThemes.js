// Curated accent presets for capsule customization. Picked for vividness —
// fun, whimsical jewel tones — while every one still clears WCAG's 4.5:1
// contrast floor against the app's parchment background, since an accent is
// used both as small text and as a background behind light text.
export const CAPSULE_THEMES = [
  { id: "indigo", label: "Indigo", accent: "#4c3bcf" },
  { id: "rose", label: "Raspberry", accent: "#a61e4d" },
  { id: "amber", label: "Amber", accent: "#a8460b" },
  { id: "sage", label: "Emerald", accent: "#166534" },
  { id: "slate", label: "Teal", accent: "#0a6275" },
  { id: "plum", label: "Violet", accent: "#862e9c" }
];

export const DEFAULT_CAPSULE_THEME = "indigo";

export const isCapsuleTheme = (value) =>
  CAPSULE_THEMES.some((theme) => theme.id === value);
