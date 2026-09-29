import { useEffect, useRef, useState } from "react";

export default function AreaChart({ data, height = 200 }) {
    const containerRef = useRef(null);
    const [width, setWidth] = useState(350);

    useEffect(() => {
        if (!containerRef.current || typeof ResizeObserver === "undefined") return;

        let observer;
        try {
            observer = new ResizeObserver(([entry]) => {
                if (entry?.contentRect.width) setWidth(entry.contentRect.width);
            });
            observer.observe(containerRef.current);
        } catch (error) {
            observer?.disconnect();
            console.warn("Unable to observe chart size changes.", error);
            return;
        }

        return () => observer.disconnect();
    }, []);

    if (!data || data.length === 0)
        return (
            <div
                ref={containerRef}
                className="w-full flex items-center justify-center text-sm text-slate-400"
                style={{ height }}
            >
                No Data
            </div>
        );

    const w = width;
    const h = height;
    const pad = { top: 16, right: 8, bottom: 28, left: 36 };
    const iw = w - pad.left - pad.right;
    const ih = h - pad.top - pad.bottom;
    const temps = data.map(d => d.temp);
    const minT = Math.floor(Math.min(...temps)) - 1;
    const maxT = Math.ceil(Math.max(...temps)) + 1;
    const xScale = i => pad.left + (i / (data.length - 1)) * iw;
    const yScale = v => pad.top + ih - ((v - minT) / (maxT - minT)) * ih;
    const points = data.map((d, i) => [xScale(i), yScale(d.temp)]);
    const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
    const area = `${line} L${points[points.length - 1][0].toFixed(1)},${(pad.top + ih).toFixed(1)} L${points[0][0].toFixed(1)},${(pad.top + ih).toFixed(1)} Z`;
    const yTicks = [Math.round(minT + 1), Math.round((minT + maxT) / 2), Math.round(maxT - 1)];
    const step = Math.max(1, Math.floor((data.length - 1) / 5));

    return (
        <div ref={containerRef} className="w-full">
            <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
                <defs>
                    <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b7cf4" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#3b7cf4" stopOpacity="0" />
                    </linearGradient>
                </defs>

                {/* Grid + y-axis labels */}
                {yTicks.map(t => (
                    <g key={t}>
                        <line
                            x1={pad.left}
                            x2={w - pad.right}
                            y1={yScale(t)}
                            y2={yScale(t)}
                            stroke="#e2e8f0"
                            strokeWidth="1"
                        />
                        <text x={pad.left - 6} y={yScale(t) + 4} textAnchor="end" fontSize="10" fill="#94a3b8">
                            {t}°
                        </text>
                    </g>
                ))}

                {/* X-axis labels */}
                {data.map((d, i) => {
                    if (i % step !== 0 && i !== data.length - 1) return null;
                    return (
                        <text key={i} x={xScale(i)} y={h - 6} textAnchor="middle" fontSize="10" fill="#94a3b8">
                            {d.time}
                        </text>
                    );
                })}

                {/* Chart fill + line */}
                <path d={area} fill="url(#ag)" />
                <path
                    d={line}
                    fill="none"
                    stroke="#3b7cf4"
                    strokeWidth="2"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                />

                {/* Dots at labelled points */}
                {data.map((d, i) => {
                    if (i % step !== 0 && i !== data.length - 1) return null;
                    return (
                        <circle
                            key={i}
                            cx={xScale(i)}
                            cy={yScale(d.temp)}
                            r="3"
                            fill="white"
                            stroke="#3b7cf4"
                            strokeWidth="1.5"
                        />
                    );
                })}
            </svg>
        </div>
    );
}
