export function parseAppointmentWallTime(value: string | Date): Date {
  if (value instanceof Date) return value;
  // ISO strings from the DB are in UTC — let JS convert to local time correctly.
  if (/^\d{4}-\d{2}-\d{2}[T ]/.test(value)) {
    return new Date(value);
  }
  return new Date(value);
}

export function parseSheetDateTime(dateStr: string, timeStr: string): Date {
  const trimmedDate = dateStr.trim();
  const trimmedTime = timeStr.trim() || "10:00 AM";
  const parsedTime = parseTimeParts(trimmedTime);

  const dateMatch = trimmedDate.match(/^(\d{1,4})[\/\-](\d{1,2})[\/\-](\d{1,4})$/);
  if (dateMatch) {
    const [, first, second, third] = dateMatch;
    const year = third.length === 4 ? Number(third) : Number(`20${third.padStart(2, "0")}`);
    const dayFirst = Number(first) > 12;
    const month = dayFirst ? Number(second) : Number(first);
    const day = dayFirst ? Number(first) : Number(second);
    return new Date(year, month - 1, day, parsedTime.hours, parsedTime.minutes, 0, 0);
  }

  const parsedDate = new Date(trimmedDate);
  if (!Number.isNaN(parsedDate.getTime())) {
    return new Date(
      parsedDate.getFullYear(),
      parsedDate.getMonth(),
      parsedDate.getDate(),
      parsedTime.hours,
      parsedTime.minutes,
      0,
      0,
    );
  }

  const now = new Date();
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    parsedTime.hours,
    parsedTime.minutes,
    0,
    0,
  );
}

export function getMinutesBetween(start: Date, end: Date) {
  return Math.round((end.getTime() - start.getTime()) / 60000);
}

function parseTimeParts(timeStr: string): { hours: number; minutes: number } {
  const match = timeStr.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!match) {
    return { hours: 10, minutes: 0 };
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2] || "0");
  const meridiem = match[3]?.toUpperCase();

  if (meridiem === "PM" && hours !== 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;

  return { hours, minutes };
}
