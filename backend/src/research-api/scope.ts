import { ForbiddenException } from '@nestjs/common';
import { ApiToken } from '../tokens/entities/api-token.entity';

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
