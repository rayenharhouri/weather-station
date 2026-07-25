import { ForbiddenException } from '@nestjs/common';
import { ApiToken } from '../tokens/entities/api-token.entity';

/**
 * Scope-enforcement helpers shared across every `/v1/*` controller.
 *
 * The token scope shape:
 *   - `scope.stations = []`         → home tenant, all stations
 *   - `scope.stations = ['<uuid>']` → restricted to listed stations
 *   - `scope.stations = ['*']`      → any station; requires `crossTenant: true`
 *   - `scope.metrics  = []`         → all metrics
 *   - `scope.metrics  = ['temperature', 'humidity']` → restricted
 *
 * Helpers throw `ForbiddenException` with a stable, machine-readable code
 * (`station_out_of_scope`, `metric_out_of_scope`, `cross_tenant_denied`)
 * so clients can branch on the failure mode without parsing prose.
 */

export function assertStationInScope(token: ApiToken, stationId: string): void {
  const { scope } = token;
  if (scope.stations.length === 0) return;
  if (scope.stations.includes('*')) {
    if (!scope.crossTenant) throw new ForbiddenException('cross_tenant_denied');
    return;
  }
  if (!scope.stations.includes(stationId)) {
    throw new ForbiddenException('station_out_of_scope');
  }
}

export function assertMetricInScope(token: ApiToken, metric: string): void {
  const { scope } = token;
  if (scope.metrics.length === 0) return;
  if (!scope.metrics.includes(metric)) {
    throw new ForbiddenException('metric_out_of_scope');
  }
}

/**
 * Filter a list of station ids down to those the token can see. For a
 * scope of `[]` returns the input unchanged. For `['*']` requires
 * `crossTenant: true` (throws otherwise). For a specific list, intersects.
 */
export function intersectStations(token: ApiToken, candidates: string[]): string[] {
  const { scope } = token;
  if (scope.stations.length === 0) return candidates;
  if (scope.stations.includes('*')) {
    if (!scope.crossTenant) throw new ForbiddenException('cross_tenant_denied');
    return candidates;
  }
  const allow = new Set(scope.stations);
  return candidates.filter((id) => allow.has(id));
}

export function metricAllowed(token: ApiToken, metric: string): boolean {
  const { scope } = token;
  if (scope.metrics.length === 0) return true;
  return scope.metrics.includes(metric);
}
