// The staff digest: at the times set in admin.digest, every subscribed admin device gets one push
// listing a day's pick-ups and returns -- `today` in the morning, `tomorrow` the evening before.
// A Cron Trigger runs this every 30 minutes (wrangler.jsonc); each run works out the store's own
// clock and sends whichever digest falls due in its window, so any time zone and any HH:MM work.
import * as db from './db.mjs';
import {loadStore} from './store.mjs';
import {notifyAdmins, pushEnabled} from './push.mjs';
import {shiftDate, todayIn, timeIn} from '../core/booking/dates.mjs';
import {minutesOfDay} from '../core/booking/schedule.mjs';

export const DIGEST_WINDOW_MINUTES = 30;
const MAX_LINES = 12;

const TEXT = {
  en: {today: 'Today', tomorrow: 'Tomorrow', pickups: '{n} pick-up(s)', returns: '{n} return(s)', pickup: 'Pick-up', fitting: 'Fitting', return: 'Return', unconfirmed: 'Not confirmed yet: {n}', overdue: 'Overdue', more: '…and {n} more'},
  vi: {today: 'Hôm nay', tomorrow: 'Ngày mai', pickups: 'Giao {n}', returns: 'Trả {n}', pickup: 'Giao', fitting: 'Thử đồ', return: 'Trả', unconfirmed: 'Chưa xác nhận: {n}', overdue: 'Quá hạn trả', more: '…và {n} mục khác'},
  ja: {today: '今日', tomorrow: '明日', pickups: '受取 {n}件', returns: '返却 {n}件', pickup: '受取', fitting: '試着', return: '返却', unconfirmed: '未確定の予約: {n}件', overdue: '返却期限超過', more: '…ほか{n}件'}
};

/** Which digests fall due at `time` ("HH:MM", store clock): a configured time within the last window. */
export function dueDigests(digest = {}, time, window = DIGEST_WINDOW_MINUTES) {
  const now = minutesOfDay(time);
  return ['today', 'tomorrow'].filter(kind => {
    if (!digest[kind]) return false;
    const at = minutesOfDay(digest[kind]);
    return now >= at && now < at + window;
  });
}

// "07:00 Nguyễn Mai · ad-0001-01": when, who, which piece. A booking without a time says nothing.
function line(label, reservation) {
  const items = (reservation.items || []).map(item => item.inventory_item_id).join(', ') || reservation.request_product_id || '';
  return `${label}${reservation.start_time ? ' ' + reservation.start_time : ''} ${reservation.customer_name}${items ? ' · ' + items : ''}`;
}
/** The push for one day's plan (see db.dayPlan), or null when there is nothing to say. */
export function digestPayload(plan, {kind, language = 'en'}) {
  const t = TEXT[language] || TEXT.en;
  const {pickups, returns, unconfirmed, overdue} = plan;
  if (!pickups.length && !returns.length && !unconfirmed.length && !overdue.length) return null;
  const lines = [
    ...overdue.map(r => `⚠ ${t.overdue}: ${r.customer_name}${r.items?.length ? ' · ' + r.items.map(i => i.inventory_item_id).join(', ') : ''}`),
    ...pickups.map(r => line(r.purpose === 'fitting' ? t.fitting : t.pickup, r)),
    ...returns.map(r => line(t.return, r))
  ];
  const shown = lines.slice(0, MAX_LINES);
  if (lines.length > shown.length) shown.push(t.more.replace('{n}', String(lines.length - shown.length)));
  if (unconfirmed.length) shown.push(t.unconfirmed.replace('{n}', String(unconfirmed.length)));
  const [, month, day] = plan.date.split('-');
  return {
    type: 'digest',
    title: `${t[kind]} ${Number(day)}/${Number(month)} · ${t.pickups.replace('{n}', String(pickups.length))} · ${t.returns.replace('{n}', String(returns.length))}`,
    body: shown.join('\n'),
    url: `/admin/#/reservations?from=${plan.date}&to=${plan.date}`,
    // One per day and kind: a repeated run replaces the notification instead of adding another.
    tag: `digest-${kind}-${plan.date}`
  };
}

/** The cron entry point. `scheduledTime` is the trigger's own time, in ms; `options` go to the push sender. */
export async function runDigest(env, scheduledTime = Date.now(), options = {}) {
  if (!pushEnabled(env)) return [];
  // There is no request in a scheduled run; store.json is read through the assets binding all the same.
  const store = await loadStore(env, new Request('https://scheduled.invalid/'));
  const timezone = env.STORE_TIMEZONE || store.timezone;
  const moment = new Date(scheduledTime);
  const today = todayIn(timezone, moment), time = timeIn(timezone, moment);
  const sent = [];
  for (const kind of dueDigests(store.admin?.digest, time)) {
    const date = kind === 'today' ? today : shiftDate(today, 1);
    const payload = digestPayload(await db.dayPlan(env.DB, date, {today: kind === 'today' ? today : ''}), {kind, language: store.admin?.defaultLanguage});
    if (!payload) continue;
    await notifyAdmins(env, payload, options);
    sent.push(payload);
  }
  return sent;
}
