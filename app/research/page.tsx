import { redirect } from 'next/navigation';

/**
 * `/research` lands on the docs entry article. We don't have a separate
 * portal landing today — the docs are the front door.
 */
export default function ResearchIndex(): never {
  redirect('/research/docs/readings');
}
