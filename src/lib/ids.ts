export const generateId = (prefix = 'id'): string => {
  const cryptoRef = (globalThis as any).crypto;
  if (cryptoRef?.randomUUID) {
    return `${prefix}_${cryptoRef.randomUUID()}`;
  }

  const randomPart = Math.random().toString(36).slice(2);
  const timePart = Date.now().toString(36);

  return `${prefix}_${randomPart}${timePart}`;
};

