import React, { useId, useMemo } from 'react';

export interface ChartDataPoint {
  timestamp: string; // ISO string
  value: number | null; // null represents missing / gap
}

export interface ChartSeries {
  id: string;
  name: string;
  color: string;
  unit: string;
  data: ChartDataPoint[];
}

export interface MeasurementChartProps {
  title: string;
  series: ChartSeries[];
  height?: number;
  maxPoints?: number;
  className?: string;
  ariaDescription?: string;
}

export const MeasurementChart: React.FC<MeasurementChartProps> = ({
  title,
  series,
  height = 280,
  maxPoints = 600,
  className = '',
  ariaDescription,
}) => {
  const chartId = useId();

  // 1. Process and downsample series if points exceed maxPoints (R18: cap at 600 points/series)
  const processedSeries = useMemo(() => {
    return series.map((s) => {
      let data = s.data;
      if (data.length > maxPoints) {
        // Min/max preserving step downsampling
        const step = Math.ceil(data.length / maxPoints);
        data = data.filter((_, idx) => idx % step === 0);
      }
      return {
        ...s,
        data,
      };
    });
  }, [series, maxPoints]);

  // 2. Compute global bounds
  const { minVal, maxVal, minTime, maxTime, hasData } = useMemo(() => {
    let minV = Number.POSITIVE_INFINITY;
    let maxV = Number.NEGATIVE_INFINITY;
    let minT = Number.POSITIVE_INFINITY;
    let maxT = Number.NEGATIVE_INFINITY;
    let count = 0;

    for (const s of processedSeries) {
      for (const p of s.data) {
        const t = new Date(p.timestamp).getTime();
        if (!Number.isNaN(t)) {
          if (t < minT) minT = t;
          if (t > maxT) maxT = t;
        }
        if (p.value !== null && !Number.isNaN(p.value)) {
          if (p.value < minV) minV = p.value;
          if (p.value > maxV) maxV = p.value;
          count += 1;
        }
      }
    }

    if (count === 0 || minT === Number.POSITIVE_INFINITY) {
      return { minVal: 0, maxVal: 100, minTime: Date.now() - 3600000, maxTime: Date.now(), hasData: false };
    }

    // Always include zero baseline if positive, or buffer by 5%
    minV = minV > 0 ? 0 : minV * 1.05;
    maxV = maxV === 0 ? 10 : maxV * 1.08;

    return { minVal: minV, maxVal: maxV, minTime: minT, maxTime: maxT, hasData: true };
  }, [processedSeries]);

  // ViewBox dimensions
  const svgWidth = 800;
  const svgHeight = height;
  const padding = { top: 20, right: 24, bottom: 36, left: 56 };
  const plotWidth = svgWidth - padding.left - padding.right;
  const plotHeight = svgHeight - padding.top - padding.bottom;

  const timeRange = Math.max(1, maxTime - minTime);
  const valRange = Math.max(0.001, maxVal - minVal);

  const getX = (tMs: number) => padding.left + ((tMs - minTime) / timeRange) * plotWidth;
  const getY = (v: number) => padding.top + plotHeight - ((v - minVal) / valRange) * plotHeight;

  // 3. Build SVG Path segments with breaks for gaps (R18, PRD: real trends with breaks for gaps)
  const paths = useMemo(() => {
    return processedSeries.map((s) => {
      const segments: string[] = [];
      let currentSegment: string[] = [];
      let lastTime: number | null = null;

      for (let i = 0; i < s.data.length; i++) {
        const p = s.data[i]!;
        const t = new Date(p.timestamp).getTime();

        // Gap detection: missing value OR timestamp jump > 30s (6x default interval)
        const isGap = p.value === null || (lastTime !== null && t - lastTime > 30000);

        if (isGap) {
          if (currentSegment.length > 0) {
            segments.push(currentSegment.join(' '));
            currentSegment = [];
          }
          if (p.value !== null) {
            // Start new segment after gap
            const x = getX(t);
            const y = getY(p.value);
            currentSegment.push(`M ${x.toFixed(1)} ${y.toFixed(1)}`);
          }
        } else {
          const x = getX(t);
          const y = getY(p.value!);
          if (currentSegment.length === 0) {
            currentSegment.push(`M ${x.toFixed(1)} ${y.toFixed(1)}`);
          } else {
            currentSegment.push(`L ${x.toFixed(1)} ${y.toFixed(1)}`);
          }
        }

        lastTime = t;
      }

      if (currentSegment.length > 0) {
        segments.push(currentSegment.join(' '));
      }

      return {
        id: s.id,
        color: s.color,
        name: s.name,
        d: segments.join(' '),
      };
    });
  }, [processedSeries, minTime, timeRange, minVal, valRange, plotWidth, plotHeight]);

  // Horizontal grid lines
  const gridTicks = useMemo(() => {
    const ticks = [];
    const count = 4;
    for (let i = 0; i <= count; i++) {
      const val = minVal + (valRange * i) / count;
      const y = getY(val);
      ticks.push({ val, y });
    }
    return ticks;
  }, [minVal, valRange, plotHeight]);

  // Time ticks
  const timeTicks = useMemo(() => {
    const ticks = [];
    const count = 5;
    for (let i = 0; i <= count; i++) {
      const t = minTime + (timeRange * i) / count;
      const x = getX(t);
      const label = new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      ticks.push({ t, x, label });
    }
    return ticks;
  }, [minTime, timeRange, plotWidth]);

  return (
    <div className={`relative bg-surface rounded-card border border-border p-4 md:p-6 ${className}`}>
      {/* Header & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h3 className="text-sm font-semibold text-text-primary tracking-tight">{title}</h3>
        <div className="flex flex-wrap items-center gap-4 text-xs">
          {processedSeries.map((s) => (
            <div key={s.id} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
              <span className="text-text-secondary font-medium">{s.name}</span>
            </div>
          ))}
        </div>
      </div>

      {!hasData ? (
        <div
          className="flex flex-col items-center justify-center text-xs text-text-secondary border border-dashed border-border rounded-control"
          style={{ height: `${height}px` }}
        >
          <span>Awaiting historical telemetry samples...</span>
          <span className="text-text-secondary/70 mt-1">Gaps and intervals will render when data arrives.</span>
        </div>
      ) : (
        <div className="relative w-full overflow-hidden">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto block select-none"
            role="img"
            aria-labelledby={`${chartId}-title ${chartId}-desc`}
          >
            <title id={`${chartId}-title`}>{title}</title>
            <desc id={`${chartId}-desc`}>
              {ariaDescription || `Line chart showing ${series.map((s) => s.name).join(', ')} with gap discontinuities`}
            </desc>

            {/* Grid lines */}
            {gridTicks.map((t, idx) => (
              <g key={idx}>
                <line
                  x1={padding.left}
                  y1={t.y}
                  x2={svgWidth - padding.right}
                  y2={t.y}
                  stroke="#DDDCD5"
                  strokeDasharray="2 3"
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 8}
                  y={t.y + 4}
                  textAnchor="end"
                  fontSize="11"
                  fill="#5D625D"
                  fontFamily="system-ui, -apple-system, sans-serif"
                >
                  {t.val >= 1000 ? `${(t.val / 1000).toFixed(1)}k` : t.val.toFixed(1)}
                </text>
              </g>
            ))}

            {/* Time Axis */}
            {timeTicks.map((t, idx) => (
              <text
                key={idx}
                x={t.x}
                y={svgHeight - 10}
                textAnchor="middle"
                fontSize="11"
                fill="#5D625D"
                fontFamily="system-ui, -apple-system, sans-serif"
              >
                {t.label}
              </text>
            ))}

            {/* Series Paths */}
            {paths.map((p) => (
              <path
                key={p.id}
                d={p.d}
                fill="none"
                stroke={p.color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          </svg>
        </div>
      )}

      {/* Screen reader table summary */}
      <div className="sr-only">
        <table>
          <caption>{`${title} data table`}</caption>
          <thead>
            <tr>
              <th scope="col">Timestamp</th>
              {series.map((s) => (
                <th key={s.id} scope="col">
                  {`${s.name} (${s.unit})`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {processedSeries[0]?.data.slice(-10).map((p, idx) => (
              <tr key={idx}>
                <td>{new Date(p.timestamp).toLocaleString()}</td>
                {processedSeries.map((s) => (
                  <td key={s.id}>
                    {s.data[idx]?.value !== null ? `${s.data[idx]?.value} ${s.unit}` : 'Missing (Gap)'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
