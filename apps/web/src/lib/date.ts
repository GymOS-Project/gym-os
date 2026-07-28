import { format, isAfter, isBefore, isValid, parseISO, startOfDay } from 'date-fns';

function parseValue(value?: string | null) {
  if (!value) {
    return null;
  }

  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
}

export function todayDateValue() {
  return format(new Date(), 'yyyy-MM-dd');
}

export function nowDateTimeLocalValue() {
  return format(new Date(), "yyyy-MM-dd'T'HH:mm");
}

export function isDateBefore(left: string, right: string) {
  const leftDate = parseValue(left);
  const rightDate = parseValue(right);

  if (!leftDate || !rightDate) {
    return false;
  }

  return isBefore(startOfDay(leftDate), startOfDay(rightDate));
}

export function isDateAfter(left: string, right: string) {
  const leftDate = parseValue(left);
  const rightDate = parseValue(right);

  if (!leftDate || !rightDate) {
    return false;
  }

  return isAfter(startOfDay(leftDate), startOfDay(rightDate));
}

export function isDateTimeBefore(left: string, right: string) {
  const leftDate = parseValue(left);
  const rightDate = parseValue(right);

  if (!leftDate || !rightDate) {
    return false;
  }

  return isBefore(leftDate, rightDate);
}

export function isDateTimeAfter(left: string, right: string) {
  const leftDate = parseValue(left);
  const rightDate = parseValue(right);

  if (!leftDate || !rightDate) {
    return false;
  }

  return isAfter(leftDate, rightDate);
}

export function isSameCalendarDate(dateValue: string, dateTimeValue: string) {
  const date = parseValue(dateValue);
  const dateTime = parseValue(dateTimeValue);

  if (!date || !dateTime) {
    return false;
  }

  return format(date, 'yyyy-MM-dd') === format(dateTime, 'yyyy-MM-dd');
}
