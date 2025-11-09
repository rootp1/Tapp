import crypto from 'crypto';

export const generateId = (prefix: string = ''): string => {
  const randomPart = crypto.randomBytes(8).toString('hex');
  return prefix ? `${prefix}_${randomPart}` : randomPart;
};

export const calculateFees = (amount: number, feePercent: number = 5) => {
  const platformFee = (amount * feePercent) / 100;
  const creatorEarnings = amount - platformFee;

  return {
    platformFee,
    creatorEarnings,
  };
};

export const formatTON = (amount: number): string => {
  return `${amount.toFixed(2)} TON`;
};

export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const isValidTelegramId = (id: string): boolean => {
  return /^-?\d+$/.test(id);
};

export const truncateText = (text: string, maxLength: number = 100): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};
