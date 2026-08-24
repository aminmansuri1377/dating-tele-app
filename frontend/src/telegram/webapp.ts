import WebApp from '@twa-dev/sdk';

/** Thin wrapper around the Telegram Mini App SDK so the rest of the app never touches `window.Telegram` directly. */
export const tg = WebApp;

export function initTelegramApp() {
  tg.ready();
  tg.expand(); // full-height mini app, not the collapsed sheet
  tg.enableClosingConfirmation();
  // Dark mode follows Telegram's client theme by default; app also exposes a manual toggle in Settings
  document.documentElement.classList.toggle('dark', tg.colorScheme === 'dark');
}

/** Raw initData string — the ONLY thing sent to the backend for authentication. */
export function getInitData(): string {
  return tg.initData;
}

export function hapticSelection() {
  tg.HapticFeedback?.selectionChanged();
}

export function hapticImpact(style: 'light' | 'medium' | 'heavy' = 'light') {
  tg.HapticFeedback?.impactOccurred(style);
}
