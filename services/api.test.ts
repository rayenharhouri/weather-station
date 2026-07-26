
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  v1ApiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(message: string, public statusCode?: number) {
      super(message);
    }
  },
}));

const configState = { mode: 'demo', mockDataDelay: 0 } as {
  mode: 'production' | 'demo' | 'test';
  mockDataDelay: number;
  apiUrl: string;
  environment: string;
  isProduction: boolean;
};
configState.apiUrl = 'http://localhost:3001';
configState.environment = 'test';
configState.isProduction = false;

vi.mock('@/lib/config', () => ({
  get config() {
    return configState;
  },
  isProductionMode: () => configState.mode === 'production',
  isDemoMode: () => configState.mode === 'demo',
  isTestMode: () => configState.mode === 'test',
}));

import { apiClient } from '@/lib/api-client';
import { stationService } from './api';

const getMock = vi.mocked(apiClient.get);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('withMockFallback', () => {
  describe('production mode', () => {
    beforeEach(() => {
      configState.mode = 'production';
      configState.isProduction = true;
    });

    it('returns the real api response on success', async () => {
      getMock.mockResolvedValueOnce({
        items: [
          {
            id: '11111111-2222-3333-4444-555555555555',
            name: 'Real Station',
            location: 'real',
            latitude: 0,
            longitude: 0,
            status: 'online',
            lastSyncedAt: new Date().toISOString(),
            enabledSensors: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        total: 1,
        page: 1,
        pageSize: 10,
        hasMore: false,
      });

      const res = await stationService.getAll();

      expect(getMock).toHaveBeenCalledOnce();
      expect(res.items[0].name).toBe('Real Station');
    });

    it('throws when the real api call fails — no mock fallback', async () => {
      const failure = new Error('upstream 500');
      getMock.mockRejectedValueOnce(failure);

      await expect(stationService.getAll()).rejects.toThrow('upstream 500');
      expect(getMock).toHaveBeenCalledOnce();
    });
  });

  describe('demo mode', () => {
    beforeEach(() => {
      configState.mode = 'demo';
      configState.isProduction = false;
    });

    it('prefers the real api when it succeeds', async () => {
      getMock.mockResolvedValueOnce({
        items: [
          {
            id: '11111111-2222-3333-4444-555555555555',
            name: 'Live Station',
            location: 'tunis',
            latitude: 0,
            longitude: 0,
            status: 'online',
            lastSyncedAt: new Date().toISOString(),
            enabledSensors: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        total: 1,
        page: 1,
        pageSize: 10,
        hasMore: false,
      });

      const res = await stationService.getAll();
      expect(getMock).toHaveBeenCalledOnce();
      expect(res.items[0].name).toBe('Live Station');
    });

    it('falls back to mock data when the real api fails', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

      getMock.mockRejectedValueOnce(new Error('connection refused'));

      const res = await stationService.getAll();
      expect(getMock).toHaveBeenCalledOnce();
      expect(res.items.length).toBeGreaterThan(0);
      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockRestore();
    });
  });

  describe('test mode', () => {
    beforeEach(() => {
      configState.mode = 'test';
      configState.isProduction = false;
    });

    it('never calls the api — returns mock data directly', async () => {
      const res = await stationService.getAll();
      expect(getMock).not.toHaveBeenCalled();
      expect(res.items.length).toBeGreaterThan(0);
    });

    it('does not delay the response (mockDataDelay clamped to 0)', async () => {
      configState.mockDataDelay = 500;
      const startedAt = Date.now();
      await stationService.getAll();
      const elapsed = Date.now() - startedAt;
      expect(elapsed).toBeLessThan(50);
      configState.mockDataDelay = 0;
    });
  });
});
