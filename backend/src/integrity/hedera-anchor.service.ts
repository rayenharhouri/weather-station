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
  /**
   * False only when this anchor came from a genuine Hedera HCS submit.
   * `mirrorNodeVerified` alone used to double as "is this real" — it
   * didn't, since the stub always set it to `true` to look nice for
   * demos. Callers must not treat a batch as chain-verified unless both
   * `simulated === false` and `mirrorNodeVerified === true`.
   */
  simulated: boolean;
}

/**
 * Writes a Merkle root to a Hedera Consensus Service topic.
 *
 * - In `demo` mode (or with `HEDERA_ENABLED=false`) this returns a
 *   deterministic stub derived from the root, tagged `simulated: true`
 *   with `mirrorNodeVerified: false` — nothing here ever touched a real
 *   network. Stable across restarts so the verification flow renders the
 *   same values every time for screenshots / demos.
 * - With `HEDERA_ENABLED=true` and operator credentials configured, it
 *   submits the root to a real HCS topic (creating one on first use if
 *   `HEDERA_TOPIC_ID` isn't set) and does a best-effort mirror-node lookup
 *   right after. Mirror-node ingestion usually lags consensus by a few
 *   seconds, so `mirrorNodeVerified: false` right after submit doesn't
 *   mean the anchor failed — `simulated: false` is what tells you it's
 *   real; `verifyBatch` can be re-run later once the mirror catches up.
 *
 * Any failure in the live path (bad credentials, network, insufficient
 * balance, mirror timeout) falls back to the stub so a misconfigured
 * deploy still anchors locally instead of blocking ingest.
 */
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
        // Fail-safe: if the live submit blows up (auth, network, balance,
        // etc.) we still want the local batch to land. Fall through to the
        // stub and log loudly — operators monitor for this.
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

  /**
   * Submits `merkleRootHex` to a real HCS topic and returns the genuine
   * anchor. Creates a topic on first use if `HEDERA_TOPIC_ID` is unset —
   * logs the new id so it can be pinned in env for subsequent restarts;
   * otherwise every restart without a configured topic mints a fresh one.
   */
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

/**
 * Best-effort mirror-node confirmation, single attempt with a short
 * timeout. A `false` here doesn't mean the anchor failed — mirror
 * ingestion lags consensus by a few seconds, and this call isn't worth
 * blocking the anchor pipeline on. `verifyBatch` re-checks the Merkle root
 * independently of this flag.
 */
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

/**
 * Build a deterministic anchor for a given (tenant, root). Same inputs
 * always produce the same outputs — safe to call N times for the same
 * batch without polluting the demo with a different transaction id.
 * Always `simulated: true` / `mirrorNodeVerified: false`: nothing here
 * ever touched a real network, and callers rely on that to avoid
 * mislabeling a local stub as a verified on-chain anchor.
 */
function stubAnchor(tenantSlug: string, merkleRootHex: string, network: string): HederaAnchor {
  const seed = createHash('sha256')
    .update(`${tenantSlug}|${network}|${merkleRootHex}`)
    .digest('hex');

  // Carve deterministic fields out of the seed. Hedera entity IDs look
  // like `0.0.<num>` so we synthesize that shape.
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
