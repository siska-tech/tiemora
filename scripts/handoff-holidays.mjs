// Build-time only: public holidays become plain dates in store.json, so no holiday library ships to
// the browser or the Worker. `booking.handoff.holidayCountry` names the country (any code the
// date-holidays package knows); `holidayDates` already in the configuration are kept, which is where
// a store adds officially announced extra days the base calendar does not know about.
import Holidays from 'date-holidays';
import {shiftDate} from '../core/booking/dates.mjs';

export function populateHandoffHolidays(config, year = new Date().getUTCFullYear(), {warn = console.warn} = {}) {
  const handoff = config.booking.handoff;
  const country = handoff.holidayCountry;
  if (!country) return;
  const holidays = new Holidays();
  if (!Object.hasOwn(holidays.getCountries(), country)) {
    warn(`booking.handoff.holidayCountry: date-holidays has no calendar for "${country}"; only holidayDates are used.`);
    return;
  }
  holidays.init(country);
  const dates = new Set(handoff.holidayDates || []);
  // Cover the booking horizon, plus a full extra year so an annual rebuild never leaves a gap.
  const lastYear = year + Math.ceil(config.booking.maxDaysAhead / 365) + 1;
  for (let y = year; y <= lastYear; y++) {
    for (const holiday of holidays.getHolidays(y).filter(entry => entry.type === 'public')) {
      // A holiday may run several days (Tet); every one of them counts.
      const duration = Math.ceil((holiday.end.getTime() - holiday.start.getTime()) / 86400000);
      for (let n = 0; n < duration; n++) dates.add(shiftDate(holiday.date.slice(0, 10), n));
    }
  }
  handoff.holidayDates = [...dates].sort();
  handoff.holidayCalendarThrough = `${lastYear}-12-31`;
}
