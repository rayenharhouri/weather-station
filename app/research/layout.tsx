import type { ReactNode } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

/**
 * Layout that wraps every `/research/*` route. Auth gate is the same one used
 * by the operations dashboard (per-tenant JWT). The visual shell — sidebar,
 * topbar, breadcrumbs — is composed per-page so the breadcrumb can vary,
 * which is why this layout is intentionally thin.
 */
export default function ResearchLayout({ children }: { children: ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
