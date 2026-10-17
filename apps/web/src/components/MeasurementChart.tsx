import React, { useId, useMemo, useRef, useState, useEffect } from 'react';

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
  framed?: boolean;
}

export const MeasurementChart: React.FC<MeasurementChartProps> = ({
  title,
  series,
  height = 280,
  maxPoints = 600,
  className = '',
  ariaDescription,
  framed = true,
}) => {
  const chartId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [measuredWidth, setMeasuredWidth] = useState<number>(800);

  // ResizeObserver for reliable width measurement across 360px - 1920px
  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        if (w > 0) setMeasuredWidth(w);
      }
    };
    updateSize();
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => updateSize());
      observer.observe(containerRef.current);
      return () => observer.disconnect();
    }
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Responsive plotting height: bounded to 220px on narrow mobile, height on tablet/desktop
  const responsiveHeight = measuredWidth < 480 ? Math.min(height, 220) : height;

  // 1. Process and downsample series if points exceed maxPoints (R18: cap at 600 points/series)
  const processedSeries = useMemo(() => {
    return series.map((s) => {
      let data = s.data;
      if (data.length > maxPoints) {
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

    minV = minV > 0 ? 0 : minV * 1.05;
    maxV = maxV === 0 ? 10 : maxV * 1.08;

    // A single receipt time still needs a meaningful horizontal scale.
    if (minT === maxT) { minT -= 15000; maxT += 15000; }
    return { minVal: minV, maxVal: maxV, minTime: minT, maxTime: maxT, hasData: true };
  }, [processedSeries]);

  const svgWidth = Math.max(300, measuredWidth);
  const svgHeight = responsiveHeight;
  const padding = {
    top: 20,
    right: 20,
    bottom: 32,
    left: svgWidth < 480 ? 44 : 56,
  };
  const plotWidth = Math.max(10, svgWidth - padding.left - padding.right);
  const plotHeight = Math.max(10, svgHeight - padding.top - padding.bottom);

  const timeRange = Math.max(1, maxTime - minTime);
  const valRange = Math.max(0.001, maxVal - minVal);

  const getX = (tMs: number) => padding.left + ((tMs - minTime) / timeRange) * plotWidth;
  const getY = (v: number) => padding.top + plotHeight - ((v - minVal) / valRange) * plotHeight;

  // 3. Build SVG Path segments with breaks for gaps
  const paths = useMemo(() => {
    return processedSeries.map((s) => {
      const segments: string[] = [];
      let currentSegment: string[] = [];
      let lastTime: number | null = null;

      for (let i = 0; i < s.data.length; i++) {
        const p = s.data[i]!;
        const t = new Date(p.timestamp).getTime();
        const isGap = p.value === null || (lastTime !== null && t - lastTime > 30000);

        if (isGap) {
          if (currentSegment.length > 0) {
            segments.push(currentSegment.join(' '));
            currentSegment = [];
          }
          if (p.value !== null) {
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
        isolatedPoints: s.data.flatMap((point, index) => {
          if (point.value === null || !Number.isFinite(point.value)) return [];
          const time = new Date(point.timestamp).getTime();
          if (!Number.isFinite(time)) return [];
          const previous = s.data[index - 1];
          const next = s.data[index + 1];
          const connectsPrevious = previous?.value != null && time - new Date(previous.timestamp).getTime() <= 30000;
          const connectsNext = next?.value != null && new Date(next.timestamp).getTime() - time <= 30000;
          return connectsPrevious || connectsNext ? [] : [{ x: getX(time), y: getY(point.value) }];
        }),
      };
    });
  }, [processedSeries, minTime, timeRange, minVal, valRange, plotWidth, plotHeight]);

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

  const timeTicks = useMemo(() => {
    const ticks = [];
    const count = svgWidth < 480 ? 3 : 5;
    for (let i = 0; i <= count; i++) {
      const t = minTime + (timeRange * i) / count;
      const x = getX(t);
      const label = new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      ticks.push({ t, x, label });
    }
    return ticks;
  }, [minTime, timeRange, plotWidth, svgWidth]);

  return (
    <div
      className={`relative ${framed ? 'rounded-xl p-4 md:p-6' : ''} ${className}`}
      style={{
        background: 'var(--surface)',
        border: framed ? '1px solid var(--border)' : undefined,
        boxShadow: framed ? 'var(--shadow-card)' : undefined,
      }}
    >
      {/* Header & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h3 className="text-sm font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h3>
        <div className="flex flex-wrap items-center gap-4 text-xs">
          {processedSeries.map((s) => (
            <div key={s.id} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: s.color }} />
              <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>{s.name}</span>
            </div>
          ))}
        </div>
      </div>

      {!hasData ? (
        <div
          className="flex flex-col items-center justify-center text-xs rounded-lg"
          style={{
            height: `${svgHeight}px`,
            border: '1px dashed var(--border)',
            color: 'var(--text-secondary)',
          }}
        >
          <span>Awaiting historical telemetry samples...</span>
          <span className="mt-1" style={{ color: 'var(--text-dim)' }}>
            Gaps and intervals will render when data arrives.
          </span>
        </div>
      ) : (
        <div
          ref={containerRef}
          className="relative w-full overflow-hidden flex items-center justify-center"
          style={{ height: `${svgHeight}px` }}
        >
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            width={svgWidth}
            height={svgHeight}
            className="w-full h-full block select-none"
            style={{ maxHeight: `${svgHeight}px` }}
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
                  stroke="var(--border)"
                  strokeOpacity="0.6"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 8}
                  y={t.y + 4}
                  textAnchor="end"
                  fontSize="11"
                  fill="var(--text-secondary)"
                  fontFamily="monospace"
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
                fill="var(--text-secondary)"
                fontFamily="monospace"
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
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            {paths.flatMap(p => p.isolatedPoints.map((point, index) => (
              <circle key={`${p.id}-${index}`} cx={point.x} cy={point.y} r="3.5" fill={p.color} />
            )))}
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
