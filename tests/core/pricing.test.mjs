// What a rental costs: the first 24 hours at the daily rate, every further day possibly cheaper.
import test from 'node:test';
import assert from 'node:assert/strict';
import {rentalPrice} from '../../core/booking/pricing.mjs';

const plain = {price: {rental: 119000}, currency: 'VND'};
const cheaperAfterDayOne = {price: {rental: 119000, additionalDay: 30000}, currency: 'VND'};

test('without a second rate every day costs the same, as it always did', () => {
  assert.deepEqual(rentalPrice(plain, 1), {daily: 119000, additionalDay: 119000, additionalDays: 0, days: 1, total: 119000, discounted: false, currency: 'VND'});
  assert.equal(rentalPrice(plain, 3).total, 357000);
  assert.equal(rentalPrice(plain, 3).discounted, false);
});

test('a cheaper rate applies from the second day, never to the first', () => {
  // One day is one day: there is nothing to discount.
  const one = rentalPrice(cheaperAfterDayOne, 1);
  assert.equal(one.total, 119000);
  assert.equal(one.additionalDays, 0);
  assert.equal(one.discounted, true, 'the product does offer a cheaper rate');
  // Two days: the first at full price, the second at the flat rate.
  assert.equal(rentalPrice(cheaperAfterDayOne, 2).total, 149000);
  assert.equal(rentalPrice(cheaperAfterDayOne, 3).total, 179000);
  assert.equal(rentalPrice(cheaperAfterDayOne, 7).total, 119000 + 30000 * 6);
  assert.equal(rentalPrice(cheaperAfterDayOne, 3).additionalDay, 30000);
  assert.equal(rentalPrice(cheaperAfterDayOne, 3).additionalDays, 2);
});

test('a second rate above the daily rate would be a surcharge, so it is ignored', () => {
  const surcharge = {price: {rental: 100000, additionalDay: 150000}, currency: 'VND'};
  assert.equal(rentalPrice(surcharge, 3).additionalDay, 100000);
  assert.equal(rentalPrice(surcharge, 3).total, 300000);
  assert.equal(rentalPrice(surcharge, 3).discounted, false);
  // Free further days are a real offer and are kept.
  const freeAfter = {price: {rental: 100000, additionalDay: 0}, currency: 'VND'};
  assert.equal(rentalPrice(freeAfter, 5).total, 100000);
  assert.equal(rentalPrice(freeAfter, 5).discounted, true);
});

test('a product with no rental price cannot be quoted', () => {
  assert.equal(rentalPrice({price: {}}, 2), null);
  assert.equal(rentalPrice({}, 2), null);
  assert.equal(rentalPrice(null, 2), null);
  // A length below one day is still one day.
  assert.equal(rentalPrice(plain, 0).days, 1);
  assert.equal(rentalPrice(plain, 0).total, 119000);
});
