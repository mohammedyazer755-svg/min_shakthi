import React, { useId, useMemo, useRef, useState, useEffect } from 'react';

export interface ChartDataPoint {
  timestamp: string;
  value: number | null;
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
  timeWindowSeconds?: number;
  gapThresholdMs?: number;
}

export const MeasurementChart: React.FC<MeasurementChartProps> = ({
  title,
  series,
  height = 300,
  maxPoints = 600,
  className = '',
  ariaDescription,
  framed = true,
  timeWindowSeconds,
  gapThresholdMs = 15000,
}) => {
  const chartId = useId().replace(/:/g, '');
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [cursor, setCursor] = useState<number | null>(null);
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const update = () => {
      if (element.clientWidth) setWidth(element.clientWidth);
    };
    update();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const processed = useMemo(
    () =>
      series.map((s) => ({
        ...s,
        data: s.data
          .filter((p) => Number.isFinite(Date.parse(p.timestamp)))
          .map((p) => ({
            ...p,
            value: p.value !== null && Number.isFinite(p.value) ? p.value : null,
          }))
          .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))
          .slice(-maxPoints),
      })),
    [series, maxPoints]
  );
  const timestamps = [
    ...new Set(processed.flatMap((s) => s.data.map((p) => Date.parse(p.timestamp)))),
  ].sort((a, b) => a - b);
  const last = timestamps.at(-1) ?? Date.now();
  let first = timeWindowSeconds ? last - timeWindowSeconds * 1000 : (timestamps[0] ?? last - 30000);
  let end = last;
  if (first === end) {
    first -= 15000;
    end += 15000;
  }
  const visible = processed.filter((s) => !hidden.has(s.id));
  const values = visible.flatMap((s) =>
    s.data.filter((p) => Date.parse(p.timestamp) >= first && p.value !== null).map((p) => p.value!)
  );
  const hasData = processed.some((s) => s.data.some((p) => p.value !== null));
  const minimum = Math.min(0, ...values) * 1.08;
  const maximum = Math.max(0.01, ...values) * 1.12;
  const svgWidth = Math.max(300, width),
    svgHeight = width < 480 ? Math.min(height, 240) : height;
  const left = svgWidth < 480 ? 44 : 56,
    right = 20,
    top = 22,
    bottom = svgHeight - 32;
  const x = (t: number) =>
    left + ((t - first) / Math.max(1, end - first)) * (svgWidth - left - right);
  const y = (v: number) => bottom - ((v - minimum) / (maximum - minimum)) * (bottom - top);
  const timeLabel = (t: number) =>
    new Date(t).toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      ...(end - first <= 300000 ? { second: '2-digit' } : {}),
    });
  const format = (v: number) =>
    Math.abs(v) >= 1000
      ? `${(v / 1000).toFixed(1)}k`
      : Math.abs(v) < 1
        ? v.toFixed(2)
        : v.toFixed(1);
  const paths = visible.map((s) => {
    const segments: ChartDataPoint[][] = [];
    let segment: ChartDataPoint[] = [];
    let previous: number | null = null;
    for (const p of s.data) {
      const t = Date.parse(p.timestamp);
      if (t < first || t > end) continue;
      if (p.value === null || (previous !== null && t - previous > gapThresholdMs)) {
        if (segment.length) segments.push(segment);
        segment = [];
      }
      if (p.value !== null) segment.push(p);
      previous = t;
    }
    if (segment.length) segments.push(segment);
    return { ...s, segments };
  });
  const pointAt = (s: ChartSeries, t: number) => {
    const point = s.data.reduce<ChartDataPoint | undefined>(
      (best, p) =>
        !best || Math.abs(Date.parse(p.timestamp) - t) < Math.abs(Date.parse(best.timestamp) - t)
          ? p
          : best,
      undefined
    );
    return point && Math.abs(Date.parse(point.timestamp) - t) <= gapThresholdMs / 2
      ? point
      : undefined;
  };
  const cursorTime = cursor === null ? null : Math.max(first, Math.min(end, cursor));
  const tableTimes = timestamps.filter((t) => t >= first).slice(-10);

  return (
    <div
      ref={containerRef}
      className={`measurement-chart ${framed ? 'measurement-chart-framed' : ''} ${className}`}
    >
      <div className="measurement-chart-heading">
        <h3>{title}</h3>
        <span>Recorded samples · IST</span>
      </div>
      <div className="chart-series-controls" aria-label="Chart channels">
        {processed.map((s) => {
          const point = cursorTime === null ? s.data.at(-1) : pointAt(s, cursorTime);
          return (
            <button
              type="button"
              key={s.id}
              aria-pressed={!hidden.has(s.id)}
              style={{ '--series-color': s.color } as React.CSSProperties}
              onClick={() =>
                setHidden((old) => {
                  const next = new Set(old);
                  if (next.has(s.id)) next.delete(s.id);
                  else next.add(s.id);
                  return next;
                })
              }
            >
              <span className="chart-series-dot" />
              <span>{s.name}</span>
              <strong>{point?.value != null ? `${format(point.value)} ${s.unit}` : '—'}</strong>
            </button>
          );
        })}
      </div>
      {!hasData ? (
        <div className="chart-empty" style={{ height: svgHeight }}>
          <strong>Awaiting historical telemetry samples...</strong>
          <span>Gaps and intervals will render when data arrives.</span>
        </div>
      ) : (
        <div
          className="chart-plot"
          tabIndex={0}
          role="group"
          aria-label={`${title}. Use arrow keys to inspect readings.`}
          onKeyDown={(e) => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Escape'].includes(e.key)) return;
            e.preventDefault();
            if (e.key === 'Escape') {
              setCursor(null);
              return;
            }
            const times = timestamps.filter((t) => t >= first);
            const index = times.findIndex((t) => t >= (cursorTime ?? end));
            setCursor(
              times[
                e.key === 'Home'
                  ? 0
                  : e.key === 'End'
                    ? times.length - 1
                    : Math.max(
                        0,
                        Math.min(times.length - 1, index + (e.key === 'ArrowRight' ? 1 : -1))
                      )
              ] ?? null
            );
          }}
          onBlur={() => setCursor(null)}
          onPointerLeave={() => setCursor(null)}
        >
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            width={svgWidth}
            height={svgHeight}
            role="img"
            aria-labelledby={`${chartId}-title ${chartId}-desc`}
            onPointerMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const position = ((e.clientX - rect.left) * svgWidth) / rect.width;
              setCursor(
                position < left || position > svgWidth - right
                  ? null
                  : first + ((position - left) / (svgWidth - left - right)) * (end - first)
              );
            }}
          >
            <title id={`${chartId}-title`}>{title}</title>
            <desc id={`${chartId}-desc`}>
              {ariaDescription || 'Recorded readings with visible breaks for missing data.'}
            </desc>
            <defs>
              {visible.map((s) => (
                <linearGradient key={s.id} id={`${chartId}-${s.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity=".16" />
                  <stop offset="100%" stopColor={s.color} stopOpacity=".01" />
                </linearGradient>
              ))}
            </defs>
            {[0, 1, 2, 3, 4].map((i) => {
              const value = minimum + ((maximum - minimum) * i) / 4,
                position = y(value);
              return (
                <g key={i}>
                  <line
                    x1={left}
                    x2={svgWidth - right}
                    y1={position}
                    y2={position}
                    stroke="var(--border)"
                    strokeDasharray={i === 0 ? undefined : '3 5'}
                  />
                  <text
                    x={left - 10}
                    y={position + 4}
                    textAnchor="end"
                    fill="var(--text-secondary)"
                    fontSize="11"
                  >
                    {format(value)}
                  </text>
                </g>
              );
            })}
            {Array.from({ length: svgWidth < 480 ? 3 : 5 }).map((_, i, array) => {
              const t = first + ((end - first) * i) / (array.length - 1);
              return (
                <text
                  key={i}
                  x={x(t)}
                  y={svgHeight - 9}
                  textAnchor={i === 0 ? 'start' : i === array.length - 1 ? 'end' : 'middle'}
                  fill="var(--text-secondary)"
                  fontSize="10"
                >
                  {timeLabel(t)}
                </text>
              );
            })}
            {paths.map((s) => (
              <g key={s.id}>
                {s.segments.map((points, index) => {
                  const d = points
                    .map(
                      (p, i) =>
                        `${i === 0 ? 'M' : 'L'} ${x(Date.parse(p.timestamp)).toFixed(1)} ${y(p.value!).toFixed(1)}`
                    )
                    .join(' ');
                  const a = points[0]!,
                    b = points.at(-1)!;
                  return (
                    <g key={index}>
                      {points.length > 1 && (
                        <>
                          <path
                            d={`${d} L ${x(Date.parse(b.timestamp))} ${bottom} L ${x(Date.parse(a.timestamp))} ${bottom} Z`}
                            fill={`url(#${chartId}-${s.id})`}
                          />
                          <path
                            d={d}
                            fill="none"
                            stroke={s.color}
                            strokeWidth="2.5"
                            strokeLinejoin="round"
                            strokeLinecap="round"
                          />
                        </>
                      )}
                      {points.length === 1 && (
                        <circle
                          cx={x(Date.parse(a.timestamp))}
                          cy={y(a.value!)}
                          r="3.5"
                          fill={s.color}
                        />
                      )}
                      {index === s.segments.length - 1 && points.length > 1 && (
                        <circle
                          cx={x(Date.parse(b.timestamp))}
                          cy={y(b.value!)}
                          r="4"
                          fill={s.color}
                          stroke="var(--surface)"
                          strokeWidth="2"
                        />
                      )}
                    </g>
                  );
                })}
              </g>
            ))}
            {cursorTime !== null && (
              <g>
                <line
                  x1={x(cursorTime)}
                  x2={x(cursorTime)}
                  y1={top}
                  y2={bottom}
                  stroke="var(--text-dim)"
                  strokeDasharray="4 4"
                />
                {visible.map((s) => {
                  const p = pointAt(s, cursorTime);
                  return p?.value != null ? (
                    <circle
                      key={s.id}
                      cx={x(Date.parse(p.timestamp))}
                      cy={y(p.value)}
                      r="4.5"
                      fill={s.color}
                      stroke="var(--surface)"
                      strokeWidth="2"
                    />
                  ) : null;
                })}
              </g>
            )}
          </svg>
          {cursorTime !== null && (
            <div
              className="chart-time-tooltip"
              style={{ left: `${Math.max(15, Math.min(85, (x(cursorTime) / svgWidth) * 100))}%` }}
            >
              {timeLabel(cursorTime)}
            </div>
          )}
        </div>
      )}
      <div className="sr-only">
        <table>
          <caption>{`${title} data table`}</caption>
          <thead>
            <tr>
              <th scope="col">Timestamp</th>
              {processed.map((s) => (
                <th scope="col" key={s.id}>
                  {s.name} ({s.unit})
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableTimes.map((t) => (
              <tr key={t}>
                <td>{new Date(t).toISOString()}</td>
                {processed.map((s) => {
                  const p = s.data.find((p) => Date.parse(p.timestamp) === t);
                  return (
                    <td key={s.id}>
                      {p?.value != null ? `${p.value} ${s.unit}` : 'Missing (Gap)'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
export default MeasurementChart;
