export const PUBLIC_CHECKOUT_OFFERS = ["event", "pro_year", "pro_month", "setup"] as const;
export type PublicCheckoutOffer = (typeof PUBLIC_CHECKOUT_OFFERS)[number];

export function parsePublicCheckoutOffer(value: string | null): PublicCheckoutOffer | null {
  return PUBLIC_CHECKOUT_OFFERS.find((offer) => offer === value) ?? null;
}

export function stripeCheckoutUrl(data: unknown): string {
  if (!data || typeof data !== "object" || !("url" in data) || typeof data.url !== "string") {
    throw new Error("Invalid checkout response");
  }
  const url = new URL(data.url);
  if (url.protocol !== "https:" || url.hostname !== "checkout.stripe.com" || url.username || url.password) {
    throw new Error("Invalid checkout destination");
  }
  return url.href;
}