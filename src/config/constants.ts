export const PLATFORM_FEE_PERCENT = Number(process.env.PLATFORM_FEE_PERCENT) || 5;

export const TON_DECIMAL = 9; // TON has 9 decimal places

export const MIN_POST_PRICE = 0.1; // Minimum 0.1 TON
export const MAX_POST_PRICE = 1000; // Maximum 1000 TON

export const CONTENT_TYPES = {
  TEXT: 'text',
  PHOTO: 'photo',
  VIDEO: 'video',
  DOCUMENT: 'document',
  AUDIO: 'audio',
} as const;

export const TRANSACTION_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
} as const;

export const BOT_COMMANDS = {
  START: '/start',
  HELP: '/help',
  CREATE_POST: '/createpost',
  MY_CHANNELS: '/mychannels',
  EARNINGS: '/earnings',
  STATS: '/stats',
  CANCEL: '/cancel',
} as const;

export const CALLBACK_ACTIONS = {
  UNLOCK_POST: 'unlock',
  VIEW_STATS: 'stats',
  CONFIRM_POST: 'confirm_post',
  CANCEL_POST: 'cancel_post',
} as const;
