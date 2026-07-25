'use client';

import React from 'react';
import { Cloud, CloudRain, Sun, CloudSun, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Forecast } from '@/types';
import { cn } from '@/lib/utils';

interface ForecastPanelProps {
  forecast: Forecast | null;
  isLoading?: boolean;
  onViewDetails?: () => void;
}

export const ForecastPanel: React.FC<ForecastPanelProps> = ({
  forecast,
  isLoading = false,
  onViewDetails,
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-sunrise/15 text-sunrise flex items-center justify-center">
              <CloudSun className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-base">Short-term Forecast</CardTitle>
              <CardDescription>3-hour horizon</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
        </CardContent>
      </Card>
    );
  }

  if (!forecast) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Short-term Forecast</CardTitle>
          <CardDescription>3-hour horizon</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground text-sm">No forecast available</div>
        </CardContent>
      </Card>
    );
  }

  const temperatureItems = forecast.items.filter((i) => i.metric === 'temperature').slice(0, 4);
  const rainfallItems = forecast.items.filter((i) => i.metric === 'rainfall').slice(0, 4);

  const minTemp = temperatureItems.length ? Math.min(...temperatureItems.map((i) => i.predictedValue)) : 0;
  const maxTemp = temperatureItems.length ? Math.max(...temperatureItems.map((i) => i.predictedValue)) : 0;
  const tempRange = maxTemp - minTemp || 1;
  const avgConfidence = Math.round(
    forecast.items.reduce((a, b) => a + b.confidence, 0) / Math.max(forecast.items.length, 1)
  );

  return (
    <Card
      onClick={onViewDetails}
      className={cn('relative overflow-hidden', onViewDetails && 'cursor-pointer hover:-translate-y-0.5 transition-transform')}
    >
      <div aria-hidden className="absolute -top-20 -right-12 w-48 h-48 rounded-full bg-sunrise/20 blur-3xl pointer-events-none" />
      <div aria-hidden className="absolute -bottom-20 -left-12 w-48 h-48 rounded-full bg-sky/20 blur-3xl pointer-events-none" />

      <CardHeader className="pb-3 relative">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-sunrise/15 text-sunrise flex items-center justify-center">
              <CloudSun className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-base">Short-term Forecast</CardTitle>
              <CardDescription className="text-xs">
                {new Date(forecast.validFrom).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                <span className="mx-1">→</span>
                {new Date(forecast.validTo).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full glass-subtle">
            <Sparkles className="w-3 h-3 text-aurora" />
            <span className="text-[11px] font-medium tabular-nums">{avgConfidence}%</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative space-y-5">
        {temperatureItems.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Temperature</span>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {minTemp.toFixed(1)}°C – {maxTemp.toFixed(1)}°C
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {temperatureItems.map((item, idx) => {
                const heightPct = ((item.predictedValue - minTemp) / tempRange) * 100;
                return (
                  <div key={idx} className="flex flex-col items-center gap-1.5">
                    <div className="relative w-full h-20 rounded-lg glass-subtle flex items-end justify-center overflow-hidden">
                      <div
                        className="w-full bg-gradient-to-t from-sunset/60 via-sunrise/50 to-sky/40 rounded-md transition-all"
                        style={{ height: `${Math.max(heightPct, 8)}%` }}
                      />
                      <span className="absolute top-1.5 left-0 right-0 text-center text-xs font-semibold tabular-nums">
                        {item.predictedValue.toFixed(1)}°
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {rainfallItems.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Rain Probability</span>
              <CloudRain className="w-3.5 h-3.5 text-sky" />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {rainfallItems.map((item, idx) => {
                const pct = item.predictedValue * 100;
                return (
                  <div key={idx} className="flex flex-col items-center gap-1.5">
                    <div className="relative w-full h-20 rounded-lg glass-subtle flex items-end justify-center overflow-hidden">
                      <div
                        className="w-full bg-gradient-to-t from-sky-deep via-sky to-sky/30 rounded-md transition-all"
                        style={{ height: `${Math.max(pct, 6)}%` }}
                      />
                      <span className="absolute top-1.5 left-0 right-0 text-center text-xs font-semibold tabular-nums text-foreground">
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {forecast.explanation && (
          <div className="rounded-lg glass-subtle p-3 text-xs text-muted-foreground italic">
            {forecast.explanation}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
