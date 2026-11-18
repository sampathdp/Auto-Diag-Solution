/**
 * Public tracking-page links per courier. The carrier comes either from the admin's
 * manual "Ship" form or from Fulfillor (fulfillments[].carrierPartyId, e.g. "IMILE"),
 * so matching is case- and punctuation-insensitive. Unknown carriers get no link — the
 * tracking number is still shown.
 */
const TRACKING_URLS: Record<string, { name: string; url: (n: string) => string }> = {
  aramex: { name: "Aramex", url: (n) => `https://www.aramex.com/track/results?ShipmentNumber=${n}` },
  imile: { name: "iMile", url: (n) => `https://www.imile.com/track/?waybillNo=${n}` },
  dhl: { name: "DHL", url: (n) => `https://www.dhl.com/ae-en/home/tracking/tracking-express.html?submit=1&tracking-id=${n}` },
  fedex: { name: "FedEx", url: (n) => `https://www.fedex.com/fedextrack/?trknbr=${n}` },
  ups: { name: "UPS", url: (n) => `https://www.ups.com/track?tracknum=${n}` },
  usps: { name: "USPS", url: (n) => `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}` },
};

export function getTrackingLink(
  carrier: string | null | undefined,
  trackingNumber: string | null | undefined
): { name: string; href: string } | null {
  if (!carrier || !trackingNumber) return null;
  const entry = TRACKING_URLS[carrier.toLowerCase().replace(/[^a-z]/g, "")];
  return entry ? { name: entry.name, href: entry.url(encodeURIComponent(trackingNumber)) } : null;
}
