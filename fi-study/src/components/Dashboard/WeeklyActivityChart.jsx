const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function buildSmoothSvgPath(points) {
  if (!points.length) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cpx1 = p0.x + (p1.x - p0.x) * 0.45;
    const cpy1 = p0.y;
    const cpx2 = p1.x - (p1.x - p0.x) * 0.45;
    const cpy2 = p1.y;
    d += ` C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${p1.x} ${p1.y}`;
  }
  return d;
}

export default function WeeklyActivityChart({ dailyHours = [0, 0, 0, 0, 0, 0, 0], weekHours = 0 }) {
  const maxVal = Math.max(8, ...dailyHours.map((v) => Math.ceil(v / 2) * 2));
  const yTicks = [maxVal, (maxVal * 3) / 4, maxVal / 2, maxVal / 4, 0];

  const svgWidth = 640;
  const svgHeight = 190;
  const padLeft = 28;
  const padRight = 16;
  const padTop = 14;
  const padBottom = 26;

  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom;

  const points = dailyHours.map((val, idx) => {
    const x = padLeft + (idx / (DAY_LABELS.length - 1)) * plotWidth;
    const clamped = Math.min(maxVal, Math.max(0, val));
    const y = padTop + plotHeight - (clamped / maxVal) * plotHeight;
    return { x, y, val, label: DAY_LABELS[idx] };
  });

  const linePath = buildSmoothSvgPath(points);
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padTop + plotHeight} L ${points[0].x} ${padTop + plotHeight} Z`;

  return (
    <div className="dashboard-chart-panel">
      <div className="dashboard-chart-header">
        <div>
          <span className="section-kicker">WEEKLY ACTIVITY</span>
          <h2 className="dashboard-panel-title">Study Hours</h2>
        </div>

        <span className="dashboard-week-badge">
          <span className="week-dot" aria-hidden="true" />
          {weekHours.toFixed(1)}h this week
        </span>
      </div>

      <div className="dashboard-chart-svg-wrap">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="dashboard-chart-svg"
          role="img"
          aria-label="Weekly study hours chart"
        >
          <defs>
            <linearGradient id="studyAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4a8bdf" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#4a8bdf" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {yTicks.map((tickVal, idx) => {
            const y = padTop + (idx / (yTicks.length - 1)) * plotHeight;
            return (
              <g key={tickVal}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={svgWidth - padRight}
                  y2={y}
                  stroke="rgba(255,255,255,0.05)"
                  strokeDasharray="3 3"
                />
                <text
                  x={padLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="chart-axis-text"
                >
                  {tickVal}
                </text>
              </g>
            );
          })}

          <path d={areaPath} fill="url(#studyAreaGrad)" />
          <path
            d={linePath}
            fill="none"
            stroke="#4a8bdf"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {points.map((pt) => (
            <g key={pt.label}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r="3.2"
                fill="#08090c"
                stroke="#4a8bdf"
                strokeWidth="2"
              >
                <title>{`${pt.label}: ${pt.val.toFixed(1)}h`}</title>
              </circle>
              <text
                x={pt.x}
                y={svgHeight - 6}
                textAnchor="middle"
                className="chart-axis-text"
              >
                {pt.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

