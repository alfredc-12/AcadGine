"use client";

import { Info, Minus, Plus } from "lucide-react";
import { useId, useState } from "react";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/primitives";
import type { Period } from "@/data/academic";
import { forecastAssumptions } from "@/data/forecasts";
import { formatPercent, integer, percent, signed } from "@/lib/analytics";

function futureLabel(period: Period, step: number) {
  const semesterIndex = period.semester - 1 + step;
  const startYear = Number(period.snapshot.slice(0, 4)) - (period.semester - 1);
  const academicYear = startYear + Math.floor(semesterIndex / 2);
  return `AY ${academicYear}–${String(academicYear + 1).slice(-2)} · Sem ${semesterIndex % 2 + 1}`;
}

export function EnrollmentForecast({ period, enrolled, capacity }: { period: Period; enrolled: number; capacity: number }) {
  const id = useId();
  const [horizon, setHorizon] = useState(forecastAssumptions.defaultHorizon);
  const [growth, setGrowth] = useState(forecastAssumptions.defaultGrowth);
  const demand = Math.round(enrolled * (1 + growth / 100) ** horizon);
  const gap = capacity - demand;
  const currentSpare = capacity - enrolled;
  const capacityLabel = capacity <= 0 ? "Capacity unavailable" : gap < 0 ? `${integer(-gap)} seats over capacity`
    : gap === 0 ? "At capacity" : `${integer(gap)} seats available`;

  return <Card className="forecast-card" aria-labelledby={id}>
    <CardHeader>
      <CardTitle as="h3" id={id}>Enrollment Forecast</CardTitle>
      <details className="context-disclosure forecast-note">
        <summary aria-label="Illustrative forecast details"><Info aria-hidden="true" /> Illustrative Forecast</summary>
        <p>This scenario compounds assumed growth from the latest period and holds capacity fixed. It uses no trained model.
          {capacity > 0 && ` ${integer(capacity)} approved seats · ${formatPercent(percent(demand, capacity))} projected utilization.`}</p>
      </details>
    </CardHeader>
    <CardContent>
      <div className="forecast-layout">
        <div className="forecast-estimate">
          <p>{futureLabel(period, horizon)}</p>
          <output className="forecast-value" aria-label="Estimated enrollment">{integer(demand)} <small>course seats</small></output>
          <p className="forecast-gap" data-tone={capacity > 0 && gap < 0 ? "warning" : "neutral"}>{capacityLabel}</p>
          {capacity > 0 && <p className="forecast-current">Current capacity · {integer(Math.abs(currentSpare))} seats {currentSpare < 0 ? "over" : "open"}</p>}
        </div>
        <div className="forecast-controls">
          <div className="forecast-horizon" role="group" aria-label="Projection horizon">
            <span>Periods ahead</span>
            <div className="horizon-control">
              <Button variant="ghost" size="icon" disabled={horizon <= 1}
                aria-label="Shorten projection by one period" onClick={() => setHorizon((value) => Math.max(1, value - 1))}><Minus /></Button>
              <output aria-label="Periods ahead">{horizon}</output>
              <Button variant="ghost" size="icon" disabled={horizon >= forecastAssumptions.maxHorizon}
                aria-label="Extend projection by one period"
                onClick={() => setHorizon((value) => Math.min(forecastAssumptions.maxHorizon, value + 1))}><Plus /></Button>
            </div>
          </div>
          <label className="growth-control">
            <span>Growth per semester <strong>{signed(growth, 0)}%</strong></span>
            <input type="range" min={forecastAssumptions.minGrowth} max={forecastAssumptions.maxGrowth}
              value={growth} onChange={(event) => setGrowth(Number(event.target.value))}
              aria-label="Growth per semester" aria-valuetext={`${growth} percent`} />
          </label>
        </div>
      </div>
    </CardContent>
  </Card>;
}
