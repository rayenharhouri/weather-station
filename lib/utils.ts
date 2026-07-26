import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type IntegrityAnchorStatus = 'simulated' | 'pending' | 'verified';

export function integrityAnchorStatus(batch: {
  simulated: boolean;
  mirrorNodeVerified: boolean;
}): IntegrityAnchorStatus {
  if (batch.simulated) return 'simulated';
  return batch.mirrorNodeVerified ? 'verified' : 'pending';
}
