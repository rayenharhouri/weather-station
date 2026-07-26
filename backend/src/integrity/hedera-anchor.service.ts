import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { Client, TopicCreateTransaction, TopicMessageSubmitTransaction } from '@hashgraph/sdk';

export interface HederaAnchor {
  topicId: string;
  sequenceNumber: number;
  transactionId: string;
  consensusTimestamp: Date;
  mirrorNodeVerified: boolean;
  simulated: boolean;
}

@Injectable()
export class HederaAnchorService {
  private readonly logger = new Logger(HederaAnchorService.name);

  constructor(private readonly config: ConfigService) {}

  async submitRoot(tenantSlug: string, merkleRootHex: string): Promise<HederaAnchor> {
    const network = this.config.get<string>('hedera.network') ?? 'testnet';
    if (this.shouldUseLive()) {
      try {
        return await this.submitLive(tenantSlug, merkleRootHex, network);
      } catch (err) {
        this.logger.error(
          `[${tenantSlug}] live Hedera submit failed, falling back to stub: ${err instanceof Error ? err.message : err}`,
        );
      }
    }
    return stubAnchor(tenantSlug, merkleRootHex, network);
  }

  private shouldUseLive(): boolean {
    const enabled = this.config.get<boolean>('hedera.enabled') ?? false;
    if (!enabled) return false;
    const accountId = this.config.get<string>('hedera.operatorAccountId');
    const privateKey = this.config.get<string>('hedera.operatorPrivateKey');
    return Boolean(accountId && privateKey);
  }

  private async submitLive(
    tenantSlug: string,
    merkleRootHex: string,
    network: string,
  ): Promise<HederaAnchor> {
    const accountId = this.config.get<string>('hedera.operatorAccountId')!;
    const privateKey = this.config.get<string>('hedera.operatorPrivateKey')!;
    const client = Client.forName(network).setOperator(accountId, privateKey);

    try {
      let topicId = this.config.get<string>('hedera.topicId');
      if (!topicId) {
        const createResponse = await new TopicCreateTransaction()
          .setTopicMemo(`weatherhub-${tenantSlug}`)
          .execute(client);
        const createReceipt = await createResponse.getReceipt(client);
        if (!createReceipt.topicId) throw new Error('topic_create_missing_id');
        topicId = createReceipt.topicId.toString();
        this.logger.warn(
          `[${tenantSlug}] created new Hedera topic ${topicId} — set HEDERA_TOPIC_ID=${topicId} so restarts reuse it instead of minting a new one.`,
        );
      }

      const submitResponse = await new TopicMessageSubmitTransaction({
        topicId,
        message: merkleRootHex,
      }).execute(client);
      const record = await submitResponse.getRecord(client);
      const sequenceNumber = record.receipt.topicSequenceNumber?.toNumber() ?? 0;
      const consensusTimestamp = record.consensusTimestamp.toDate();
      const transactionId = record.transactionId.toString();

      const mirrorNodeVerified = await checkMirrorNode(network, topicId, sequenceNumber);

      return {
        topicId,
        sequenceNumber,
        transactionId,
        consensusTimestamp,
        mirrorNodeVerified,
        simulated: false,
      };
    } finally {
      client.close();
    }
  }
}

async function checkMirrorNode(
  network: string,
  topicId: string,
  sequenceNumber: number,
): Promise<boolean> {
  const base =
    network === 'mainnet'
      ? 'https://mainnet-public.mirrornode.hedera.com'
      : network === 'previewnet'
        ? 'https://previewnet.mirrornode.hedera.com'
        : 'https://testnet.mirrornode.hedera.com';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(`${base}/api/v1/topics/${topicId}/messages/${sequenceNumber}`, {
      signal: controller.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

function stubAnchor(tenantSlug: string, merkleRootHex: string, network: string): HederaAnchor {
  const seed = createHash('sha256')
    .update(`${tenantSlug}|${network}|${merkleRootHex}`)
    .digest('hex');

  const topicShard = parseInt(seed.slice(0, 8), 16) % 1_000_000;
  const seqNumber = (parseInt(seed.slice(8, 16), 16) % 9_999_999) + 1;
  const consensusEpoch = parseInt(seed.slice(16, 24), 16) + 1_700_000_000;
  const consensusNanos = parseInt(seed.slice(24, 32), 16) % 1_000_000_000;

  return {
    topicId: `0.0.${1_000_000 + topicShard}`,
    sequenceNumber: seqNumber,
    transactionId: `0.0.${500_000 + (topicShard % 100_000)}@${consensusEpoch}.${String(consensusNanos).padStart(9, '0')}`,
    consensusTimestamp: new Date(consensusEpoch * 1000 + Math.floor(consensusNanos / 1_000_000)),
    mirrorNodeVerified: false,
    simulated: true,
  };
}
