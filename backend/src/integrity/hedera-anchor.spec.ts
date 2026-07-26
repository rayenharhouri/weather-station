const topicCreateExecute = jest.fn();
const topicSubmitExecute = jest.fn();
const setOperatorMock = jest.fn();
const closeMock = jest.fn();
const forNameMock = jest.fn();

jest.mock('@hashgraph/sdk', () => ({
  Client: { forName: (...args: unknown[]) => forNameMock(...args) },
  TopicCreateTransaction: jest.fn().mockImplementation(() => ({
    setTopicMemo: jest.fn().mockReturnThis(),
    execute: topicCreateExecute,
  })),
  TopicMessageSubmitTransaction: jest.fn().mockImplementation((props: unknown) => ({
    props,
    execute: topicSubmitExecute,
  })),
}));

import { TopicCreateTransaction, TopicMessageSubmitTransaction } from '@hashgraph/sdk';
import { HederaAnchorService } from './hedera-anchor.service';

class FakeConfigService {
  constructor(private readonly values: Record<string, unknown>) {}
  get<T>(key: string): T | undefined {
    return this.values[key] as T | undefined;
  }
}

const ROOT = 'deadbeef'.repeat(8);

describe('HederaAnchorService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const clientMock = { close: closeMock };
    setOperatorMock.mockReturnValue(clientMock);
    forNameMock.mockReturnValue({ setOperator: setOperatorMock });
    global.fetch = jest.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;
  });

  describe('stub path', () => {
    it('is deterministic and honestly labelled when hedera.enabled is false', async () => {
      const cfg = { 'hedera.enabled': false, 'hedera.network': 'testnet' };
      const svc = new HederaAnchorService(new FakeConfigService(cfg) as any);
      const a = await svc.submitRoot('acme', ROOT);
      const b = await svc.submitRoot('acme', ROOT);

      expect(a.simulated).toBe(true);
      expect(a.mirrorNodeVerified).toBe(false);
      expect(a).toEqual(b);
      expect(forNameMock).not.toHaveBeenCalled();
    });

    it('falls back to the stub when enabled but operator creds are missing', async () => {
      const cfg = { 'hedera.enabled': true, 'hedera.network': 'testnet' };
      const svc = new HederaAnchorService(new FakeConfigService(cfg) as any);
      const result = await svc.submitRoot('acme', ROOT);

      expect(result.simulated).toBe(true);
      expect(result.mirrorNodeVerified).toBe(false);
      expect(forNameMock).not.toHaveBeenCalled();
    });

    it('produces different-looking stubs for different tenants/roots', async () => {
      const cfg = { 'hedera.enabled': false };
      const svc = new HederaAnchorService(new FakeConfigService(cfg) as any);
      const a = await svc.submitRoot('acme', ROOT);
      const b = await svc.submitRoot('other-tenant', ROOT);
      expect(a.transactionId).not.toBe(b.transactionId);
    });
  });

  describe('live path', () => {
    const liveConfig = {
      'hedera.enabled': true,
      'hedera.network': 'testnet',
      'hedera.operatorAccountId': '0.0.1234',
      'hedera.operatorPrivateKey': '302e020100300506032b657004220420aa',
      'hedera.topicId': '0.0.9999',
    };

    function mockSubmitRecord(overrides: Partial<{ sequenceNumber: number; txId: string }> = {}) {
      topicSubmitExecute.mockResolvedValue({
        getRecord: jest.fn().mockResolvedValue({
          receipt: { topicSequenceNumber: { toNumber: () => overrides.sequenceNumber ?? 7 } },
          consensusTimestamp: { toDate: () => new Date('2026-01-01T00:00:00Z') },
          transactionId: { toString: () => overrides.txId ?? '0.0.1234@1700000000.000000007' },
        }),
      });
    }

    it('submits to the configured topic and reports simulated:false', async () => {
      mockSubmitRecord({ sequenceNumber: 7 });
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

      const svc = new HederaAnchorService(new FakeConfigService(liveConfig) as any);
      const result = await svc.submitRoot('acme', ROOT);

      expect(result.simulated).toBe(false);
      expect(result.topicId).toBe('0.0.9999');
      expect(result.sequenceNumber).toBe(7);
      expect(result.mirrorNodeVerified).toBe(true);
      expect(setOperatorMock).toHaveBeenCalledWith('0.0.1234', '302e020100300506032b657004220420aa');
      expect(closeMock).toHaveBeenCalled();
      expect(TopicCreateTransaction).not.toHaveBeenCalled();
    });

    it('treats an unconfirmed mirror lookup as not-yet-verified, not a failure', async () => {
      mockSubmitRecord();
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false });

      const svc = new HederaAnchorService(new FakeConfigService(liveConfig) as any);
      const result = await svc.submitRoot('acme', ROOT);

      expect(result.simulated).toBe(false);
      expect(result.mirrorNodeVerified).toBe(false);
    });

    it('creates a topic first when HEDERA_TOPIC_ID is unset', async () => {
      topicCreateExecute.mockResolvedValue({
        getReceipt: jest.fn().mockResolvedValue({ topicId: { toString: () => '0.0.5005' } }),
      });
      mockSubmitRecord();

      const { 'hedera.topicId': _drop, ...withoutTopic } = liveConfig;
      const svc = new HederaAnchorService(new FakeConfigService(withoutTopic) as any);
      const result = await svc.submitRoot('acme', ROOT);

      expect(TopicCreateTransaction).toHaveBeenCalledTimes(1);
      expect(TopicMessageSubmitTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ topicId: '0.0.5005', message: ROOT }),
      );
      expect(result.topicId).toBe('0.0.5005');
      expect(result.simulated).toBe(false);
    });

    it('falls back to the stub if the live submit throws, and still closes the client', async () => {
      topicSubmitExecute.mockRejectedValue(new Error('INSUFFICIENT_TX_FEE'));

      const svc = new HederaAnchorService(new FakeConfigService(liveConfig) as any);
      const result = await svc.submitRoot('acme', ROOT);

      expect(result.simulated).toBe(true);
      expect(result.mirrorNodeVerified).toBe(false);
      expect(closeMock).toHaveBeenCalled();
    });

    it('falls back to the stub if the mirror-node fetch itself throws', async () => {
      mockSubmitRecord();
      (global.fetch as jest.Mock).mockRejectedValue(new Error('network down'));

      const svc = new HederaAnchorService(new FakeConfigService(liveConfig) as any);
      const result = await svc.submitRoot('acme', ROOT);

      expect(result.simulated).toBe(false);
      expect(result.mirrorNodeVerified).toBe(false);
    });
  });
});
