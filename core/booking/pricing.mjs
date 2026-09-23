// What a rental costs. The first 24 hours are charged at the product's daily rate; every further day
// may be charged less, because a garment that is already out costs the shop little more to leave out.
// The cheaper rate is a price, not a percentage: a shop quotes "30,000 a day after the first", and a
// round number is easier to say to a customer than a rate applied to five different daily rates.
//
// A product that names no second rate is charged its daily rate throughout, which is what every
// rental did before this existed.

/** @param {{price?: {rental?: number, additionalDay?: number}, currency?: string}} product @param {number} days */
export function rentalPrice(product, days) {
  const daily = product?.price?.rental;
  if (typeof daily !== 'number' || !Number.isFinite(daily)) return null;
  const whole = Math.max(1, Math.floor(Number(days) || 0));
  const additionalDay = typeof product.price.additionalDay === 'number' && product.price.additionalDay >= 0 && product.price.additionalDay <= daily
    ? product.price.additionalDay
    : daily;
  const additionalDays = whole - 1;
  return {
    daily,
    additionalDay,
    additionalDays,
    days: whole,
    total: daily + additionalDay * additionalDays,
    // Whether the customer is actually paying less for the later days, which is what decides how the
    // total is spelled out: one multiplication, or the first day and the rest.
    discounted: additionalDay < daily,
    currency: product.currency || 'VND'
  };
}
