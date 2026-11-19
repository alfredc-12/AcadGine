"use client";

import { ChevronRight, Minus, Plus } from "lucide-react";
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
  const capacityLabel = capacity <= 0 ? "No approved seat count" : gap < 0 ? `${integer(-gap)} seats over capacity`
    : gap === 0 ? "At approved capacity" : `${integer(gap)} seats available`;

  return <Card className="forecast-card" aria-labelledby={id}>
    <CardHeader>
      <div><CardTitle as="h3" id={id}>Enrollment Forecast</CardTitle>
        <p className="forecast-label">Illustrative Forecast — Not Model Generated</p></div>
    </CardHeader>
    <CardContent>
      <div className="forecast-layout">
        <div className="forecast-estimate">
          <p>Estimated enrollment · {futureLabel(period, horizon)}</p>
          <output className="forecast-value" aria-label="Estimated enrollment">{integer(demand)} <small>course seats</small></output>
          <p className="forecast-gap" data-tone={capacity > 0 && gap < 0 ? "warning" : "neutral"}>{capacityLabel}</p>
          <p className="forecast-capacity">{integer(capacity)} approved · {formatPercent(percent(demand, capacity))} utilization</p>
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
      <details className="disclosure forecast-method">
        <summary>Forecast method <ChevronRight aria-hidden="true" /></summary>
        <div className="disclosure-body">
          <p>The forecast compounds growth from the latest reporting period and holds approved capacity fixed. A future model could learn from seasonal enrollment and admissions.</p>
        </div>
      </details>
    </CardContent>
  </Card>;
}
