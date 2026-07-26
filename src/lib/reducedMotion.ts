export const getBrowserReducedMotion = (): boolean => {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return false;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

export const getDocumentReducedMotion = (): boolean => {
  if (typeof document === "undefined") return getBrowserReducedMotion();

  const preference = document.documentElement.dataset.reducedMotion;
  if (preference === "true") return true;
  if (preference === "false") return false;

  return getBrowserReducedMotion();
};
