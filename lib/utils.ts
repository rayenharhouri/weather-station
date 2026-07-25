import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type IntegrityAnchorStatus = 'simulated' | 'pending' | 'verified';

/**
 * A batch's `mirrorNodeVerified` alone can't tell a real-but-unconfirmed
 * Hedera anchor apart from a local stub — the stub sets it deterministically
 * and `simulated` is what actually distinguishes them. Centralised here so
 * every card/table renders the same three states consistently.
 */
export function integrityAnchorStatus(batch: {
  simulated: boolean;
  mirrorNodeVerified: boolean;
}): IntegrityAnchorStatus {
  if (batch.simulated) return 'simulated';
  return batch.mirrorNodeVerified ? 'verified' : 'pending';
}
