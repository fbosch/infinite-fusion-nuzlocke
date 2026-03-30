export const APP_TITLE = "Infinite Fusion Nuzlocke Tracker";
export const APP_TITLE_TEMPLATE = `%s | ${APP_TITLE}`;

export const getPlaythroughPageTitle = (
  playthroughName?: string | null,
): string => {
  const normalizedName = playthroughName?.trim();
  return normalizedName ? `${normalizedName} | ${APP_TITLE}` : APP_TITLE;
};
