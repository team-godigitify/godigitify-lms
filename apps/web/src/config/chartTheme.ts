// Single source of chart colors, derived from the brand scale in
// globals.css (--color-primary-*) instead of each chart hand-picking its own
// hex palette.
//
// Charts sit on white cards, so the series colors start at --color-primary-600
// rather than at the base ink (#181925) — a near-black fill reads as a UI
// element rather than as data. The periwinkle (#9e99ff) is used as a fill,
// never as a label color, since it only reaches 2.4:1 on a light surface.
export const CHART_COLORS = {
  primary: "#5a58bb",
  primaryLight: "#827fe1",
  primaryLighter: "#9e99ff",
  primaryLightest: "#cac7ff",
  accentGreen: "#22c55e",
  grid: "#e6e6e0",
};

export const CHART_PALETTE = [
  "#5a58bb",
  "#9e99ff",
  "#424285",
  "#cac7ff",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#ec4899",
  "#181925",
];
