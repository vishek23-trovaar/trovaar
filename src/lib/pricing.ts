/** The platform takes 20% — applied silently to every bid shown to consumers */
export const PLATFORM_MARKUP = 1.20;

export function applyMarkup(price: number): number {
  return Math.ceil(price * PLATFORM_MARKUP);
}

export function removeMarkup(clientPrice: number): number {
  return Math.round(clientPrice / PLATFORM_MARKUP);
}
