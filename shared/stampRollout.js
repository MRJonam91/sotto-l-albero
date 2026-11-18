export const releaseStampIds = Object.freeze([
  "office_ipod",
  "polar_bell",
  "grinch_ornament",
  "elf_snowglobe",
  "kevin_pizza",
  "klaus_letter",
  "charlie_tree",
  "frosty_hat",
  "arthur_slippers",
  "rudolph_nose",
]);

const dayMilliseconds = 86400000;
const romeCalendar = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Rome",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function calendarDay(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return null;
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  if (
    !Number.isFinite(timestamp) ||
    new Date(timestamp).toISOString().slice(0, 10) !== value
  )
    return null;
  return timestamp / dayMilliseconds;
}

function romeDate(value) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value))
    return calendarDay(value) === null ? null : value;
  if (value === null || value === undefined || value === "") return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  const parts = Object.fromEntries(
    romeCalendar
      .formatToParts(date)
      .map(({ type, value: part }) => [type, part]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function dateAtDay(day) {
  return new Date(day * dayMilliseconds).toISOString().slice(0, 10);
}

// Uses whole civil days, so a change to daylight saving never shifts an unlock.
// Events must already be restricted to the user's eligible memberships by the caller.
export function buildStampRelease({
  startDate,
  events = [],
  now = Date.now(),
} = {}) {
  const launch = calendarDay(startDate);
  const result = {
    enabled: launch !== null,
    availableIds: [],
    unlocks: [],
    nextDate: null,
    total: releaseStampIds.length,
    availableCount: 0,
    eventName: null,
    giftDate: null,
    startDate: launch === null ? null : startDate,
  };
  const today = romeDate(now);
  if (!result.enabled || !today) return result;
  const candidates = events
    .map((event) => ({
      ...event,
      giftDate: romeDate(event.gift_at),
      createdDate: romeDate(event.created_at),
    }))
    .filter(({ giftDate }) => giftDate !== null && giftDate >= startDate);
  candidates.sort(
    (a, b) =>
      a.giftDate.localeCompare(b.giftDate) ||
      String(a.created_at ?? "").localeCompare(String(b.created_at ?? "")) ||
      String(a.id).localeCompare(String(b.id)),
  );
  const event = candidates[0];
  if (!event) return result;
  const start = Math.max(launch, calendarDay(event.createdDate) ?? launch);
  // Each eligible event contributes its schedule. Taking the earliest unlock
  // for each object keeps a past gift date from relocking an existing release.
  const schedules = candidates.map((candidate) => {
    const eventStart = Math.max(
      launch,
      calendarDay(candidate.createdDate) ?? launch,
    );
    return {
      start: eventStart,
      duration: Math.max(1, calendarDay(candidate.giftDate) - eventStart),
    };
  });
  const unlocks = releaseStampIds.map((id, index) => ({
    id,
    date: dateAtDay(
      Math.min(
        ...schedules.map(
          ({ start: eventStart, duration }) =>
            eventStart +
            Math.floor((index * duration) / releaseStampIds.length),
        ),
      ),
    ),
  }));
  const availableIds = unlocks
    .filter(({ date }) => date <= today)
    .map(({ id }) => id);
  return {
    ...result,
    startDate: dateAtDay(start),
    eventName: event.name,
    giftDate: event.giftDate,
    unlocks,
    availableIds,
    availableCount: availableIds.length,
    nextDate: unlocks.find(({ date }) => date > today)?.date ?? null,
  };
}
