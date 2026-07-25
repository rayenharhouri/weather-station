import { redirect } from 'next/navigation';

/**
 * `/research/docs` lands on the canonical "List readings" article. The docs
 * tree in the sidebar has many entries; only the readings article is built
 * today — everything else is intentionally inert. When more articles ship,
 * this index can become a real landing page (table of contents + recent
 * changes) instead of a redirect.
 */
export default function ResearchDocsIndex(): never {
  redirect('/research/docs/readings');
}
