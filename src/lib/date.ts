export const getLocalDate = (
  date: Date = new Date(),
): string => {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, '0');

  const day = String(
    date.getDate(),
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

export const getLocalDayStart = (
  date: Date = new Date(),
): Date => {
  const start = new Date(date);

  start.setHours(
    0,
    0,
    0,
    0,
  );

  return start;
};

export const getLocalDayEnd = (
  date: Date = new Date(),
): Date => {
  const end = new Date(date);

  end.setHours(
    23,
    59,
    59,
    999,
  );

  return end;
};