'use client';

import { WEEKLY } from './mock-data';

const W = 600;
const H = 200;
const PAD = 28;

function toPoints(values: number[]) {
  const max = Math.max(...WEEKLY.map((d) => d.applications)) * 1.15;
  return values.map((value, index) => {
    const x = PAD + (index * (W - PAD * 2)) / (values.length - 1);
    const y = H - PAD - (value / max) * (H - PAD * 2);
    return [x, y] as const;
  });
}

function toPath(points: ReadonlyArray<readonly [number, number]>) {
  return points
    .map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x},${y}`)
    .join(' ');
}


function ChartEmpty({ label }: { label: string }) {
  return (
    <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-6 text-center">
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

/** Animated two-series line chart (applications vs interviews). */
export function ApplicationsChart() {
  if (WEEKLY.length === 0) {
    return (
      <ChartEmpty label="Application trends appear here once your job posts start receiving applications." />
    );
  }
  const apps = toPoints(WEEKLY.map((d) => d.applications));
  const interviews = toPoints(WEEKLY.map((d) => d.interviews));
  const areaPath = `${toPath(apps)} L${apps[apps.length - 1][0]},${H - PAD} L${apps[0][0]},${H - PAD} Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-52 w-full"
      role="img"
      aria-label="Applications and interviews per week"
    >
      <defs>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.22" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* horizontal grid lines */}
      {[0.25, 0.5, 0.75, 1].map((t) => (
        <line
          key={t}
          x1={PAD}
          x2={W - PAD}
          y1={H - PAD - t * (H - PAD * 2)}
          y2={H - PAD - t * (H - PAD * 2)}
          stroke="hsl(var(--border))"
          strokeDasharray="4 6"
        />
      ))}

      <path d={areaPath} fill="url(#areaFill)" className="animate-fade-in" />

      <path
        d={toPath(apps)}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="chart-line animate-draw"
      />
      <path
        d={toPath(interviews)}
        fill="none"
        stroke="hsl(var(--info))"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="chart-line animate-draw"
        style={{ animationDelay: '250ms' }}
      />

      {apps.map(([x, y], index) => (
        <circle
          key={`a-${index}`}
          cx={x}
          cy={y}
          r="3.5"
          fill="hsl(var(--card))"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          className="animate-pop-in"
          style={{ animationDelay: `${400 + index * 90}ms` }}
        />
      ))}
      {interviews.map(([x, y], index) => (
        <circle
          key={`i-${index}`}
          cx={x}
          cy={y}
          r="3"
          fill="hsl(var(--card))"
          stroke="hsl(var(--info))"
          strokeWidth="2"
          className="animate-pop-in"
          style={{ animationDelay: `${500 + index * 90}ms` }}
        />
      ))}

      {WEEKLY.map((d, index) => (
        <text
          key={d.week}
          x={PAD + (index * (W - PAD * 2)) / (WEEKLY.length - 1)}
          y={H - 8}
          textAnchor="middle"
          className="fill-[hsl(var(--muted-foreground))] text-[10px] font-medium"
        >
          {d.week}
        </text>
      ))}
    </svg>
  );
}

/** Weekly bar chart that grows from the baseline. */
export function WeeklyBars() {
  if (WEEKLY.length === 0) {
    return (
      <ChartEmpty label="Weekly application volumes appear here once applicants start coming in." />
    );
  }
  const max = Math.max(...WEEKLY.map((d) => d.applications)) * 1.15;
  const slot = (W - PAD * 2) / WEEKLY.length;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-48 w-full"
      role="img"
      aria-label="Applications per week bar chart"
    >
      {WEEKLY.map((d, index) => {
        const barHeight = (d.applications / max) * (H - PAD * 2);
        const x = PAD + index * slot + slot * 0.25;
        return (
          <g key={d.week}>
            <rect
              x={x}
              y={H - PAD - barHeight}
              width={slot * 0.5}
              height={barHeight}
              rx="6"
              fill="hsl(var(--primary))"
              className="bar-grow animate-grow-bar"
              style={{ animationDelay: `${index * 70}ms` }}
            />
            <text
              x={x + slot * 0.25}
              y={H - 8}
              textAnchor="middle"
              className="fill-[hsl(var(--muted-foreground))] text-[10px] font-medium"
            >
              {d.week}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Pure-CSS donut via conic-gradient — zero layout cost after paint. */
export function SourcesDonut({
  slices,
}: {
  slices: Array<{ label: string; value: number; colorClass: string }>;
}) {
  if (slices.length === 0) {
    return (
      <ChartEmpty label="Source tracking starts once your first applicants arrive." />
    );
  }

  const colorOf: Record<string, string> = {
    'bg-primary': 'hsl(var(--primary))',
    'bg-info': 'hsl(var(--info))',
    'bg-warning': 'hsl(var(--warning))',
    'bg-success': 'hsl(var(--success))',
  };

  let cursor = 0;
  const gradient = slices
    .map(({ value, colorClass }) => {
      const from = cursor;
      cursor += value;
      return `${colorOf[colorClass] ?? 'gray'} ${from}% ${cursor}%`;
    })
    .join(', ');

  return (
    <div className="flex items-center gap-6">
      <div
        className="animate-pop-in relative h-36 w-36 shrink-0 rounded-full"
        style={{ background: `conic-gradient(${gradient})` }}
        role="img"
        aria-label="Applicant sources breakdown"
      >
        <div className="absolute inset-4 flex flex-col items-center justify-center rounded-full bg-card">
          <span className="text-xl font-bold">{slices.reduce((sum, slice) => sum + slice.value, 0)}%</span>
          <span className="text-[10px] font-medium text-muted-foreground">
            tracked
          </span>
        </div>
      </div>
      <ul className="space-y-2">
        {slices.map(({ label, value, colorClass }) => (
          <li key={label} className="flex items-center gap-2 text-sm">
            <span className={`h-2.5 w-2.5 rounded-full ${colorClass}`} />
            <span className="text-muted-foreground">{label}</span>
            <span className="ml-auto font-semibold">{value}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}