import { describe, expect, it } from "vitest";
import { parsePublicCheckoutOffer, stripeCheckoutUrl } from "@/lib/publicCheckout";

describe("public purchase links", () => {
  it.each(["event", "pro_year", "pro_month", "setup"])("accepts the agreed offer %s", (offer) => {
    expect(parsePublicCheckoutOffer(offer)).toBe(offer);
  });
  it.each([null, "", "starter", "EVENT", "https://example.com"])("rejects unknown offer %s", (offer) => {
    expect(parsePublicCheckoutOffer(offer)).toBeNull();
  });
  it("accepts a secure Stripe checkout URL", () => {
    expect(stripeCheckoutUrl({ url: "https://checkout.stripe.com/c/pay/cs_test_example" })).toBe("https://checkout.stripe.com/c/pay/cs_test_example");
  });
  it.each([{}, { url: "http://checkout.stripe.com/pay" }, { url: "https://checkout.stripe.com.evil.example/pay" }, { url: "javascript:alert(1)" }])("rejects an invalid redirect", (data) => {
    expect(() => stripeCheckoutUrl(data)).toThrow();
  });
});