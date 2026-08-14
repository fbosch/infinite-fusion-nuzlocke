const APP_TITLE = "Infinite Fusion Nuzlocke Tracker";

export function getPlaythroughPageTitle(
  playthroughName?: string | null,
): string {
  const normalizedName = playthroughName?.trim();
  return normalizedName ? `${normalizedName} | ${APP_TITLE}` : APP_TITLE;
}
