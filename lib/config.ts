// Frontend environment configuration.
//
// The single knob is `mode`, set via `NEXT_PUBLIC_WH_MODE`:
//
//   production : real backend required. `services/api.ts` throws on failure
//                — no silent fallback to mock data. Use for live deployments.
//                The backend must agree (WH_MODE=production).
//
//   demo       : real backend preferred, mocks as fallback when a call fails
//                or returns nothing. Realistic-but-seeded data for demos,
//                screenshots, and offline development. Default.
//
//   test       : mocks only. No network calls, no artificial latency,
//                deterministic seeds. Used by unit + E2E tests.

export type RunMode = 'production' | 'demo' | 'test';

const VALID_MODES: ReadonlySet<RunMode> = new Set(['production', 'demo', 'test']);

function readMode(): RunMode {
  const raw = (process.env.NEXT_PUBLIC_WH_MODE ?? '').toLowerCase();
  if (VALID_MODES.has(raw as RunMode)) {
    return raw as RunMode;
  }
  if (raw === '') {
    return 'demo';
  }
  // Loud about typos so we don't silently boot the wrong mode.
  if (typeof window === 'undefined') {
    // eslint-disable-next-line no-console
    console.warn(
      `[config] Unknown NEXT_PUBLIC_WH_MODE='${raw}', falling back to 'demo'. Valid values: production | demo | test.`,
    );
  }
  return 'demo';
}

export const getConfig = () => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const mode = readMode();
  const mockDataDelay = parseInt(process.env.NEXT_PUBLIC_MOCK_DATA_DELAY || '500', 10);

  return {
    apiUrl,
    mode,
    mockDataDelay: mode === 'test' ? 0 : mockDataDelay,
    environment: process.env.NODE_ENV || 'development',
    isProduction: mode === 'production',
  };
};

export const config = getConfig();

export const isProductionMode = (): boolean => config.mode === 'production';
export const isDemoMode = (): boolean => config.mode === 'demo';
export const isTestMode = (): boolean => config.mode === 'test';
