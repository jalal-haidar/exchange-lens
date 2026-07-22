const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseDate(value) {
  const match = DATE_PATTERN.exec(value);
  if (!match) {
    throw new TypeError("Date must use YYYY-MM-DD format");
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const check = new Date(Date.UTC(year, month - 1, day));

  if (
    check.getUTCFullYear() !== year
    || check.getUTCMonth() !== month - 1
    || check.getUTCDate() !== day
  ) {
    throw new TypeError("Date is invalid");
  }

  return { year, month, day };
}

function getFormatter(timeZone) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
  } catch {
    throw new TypeError("Timezone must be a valid IANA timezone");
  }
}

function getOffsetMilliseconds(instant, formatter) {
  const parts = Object.fromEntries(
    formatter
      .formatToParts(instant)
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, Number(value)]),
  );

  const formattedAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );

  return formattedAsUtc - instant.getTime();
}

function localMidnightToUtc({ year, month, day }, formatter) {
  const localAsUtc = Date.UTC(year, month - 1, day);
  let result = localAsUtc - getOffsetMilliseconds(new Date(localAsUtc), formatter);
  result = localAsUtc - getOffsetMilliseconds(new Date(result), formatter);
  return new Date(result);
}

function nextDate({ year, month, day }) {
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return {
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate(),
  };
}

export function getUtcDayRange(date, timeZone) {
  const parsedDate = parseDate(date);
  const formatter = getFormatter(timeZone);

  return {
    start: localMidnightToUtc(parsedDate, formatter).toISOString(),
    endExclusive: localMidnightToUtc(nextDate(parsedDate), formatter).toISOString(),
  };
}

export function getUtcDateRange(startDate, endDate, timeZone) {
  if (endDate < startDate) {
    throw new RangeError("End date cannot be before start date");
  }

  return {
    start: getUtcDayRange(startDate, timeZone).start,
    endExclusive: getUtcDayRange(endDate, timeZone).endExclusive,
  };
}
