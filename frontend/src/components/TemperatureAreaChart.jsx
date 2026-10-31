import { useEffect, useRef, useState } from "react";

// area chart
export default function TemperatureAreaChart({ data, height = 200 }) {
    const containerRef = useRef(null);
    const [containerWidth, setContainerWidth] = useState(350);

    // observe size
    useEffect(() => {
        if (!containerRef.current || typeof ResizeObserver === "undefined") return;

        let observer;
        try {
            observer = new ResizeObserver(([entry]) => {
                if (entry?.contentRect.width) setContainerWidth(entry.contentRect.width);
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

    // chart geometry
    const chartWidth = containerWidth;
    const chartHeight = height;
    const padding = { top: 16, right: 8, bottom: 28, left: 36 };
    const plotWidth = chartWidth - padding.left - padding.right;
    const plotHeight = chartHeight - padding.top - padding.bottom;
    const temperatures = data.map(point => point.temp);
    const minTemp = Math.floor(Math.min(...temperatures)) - 1;
    const maxTemp = Math.ceil(Math.max(...temperatures)) + 1;
    // skala x
    const scaleX = index => padding.left + (data.length > 1 ? index / (data.length - 1) : 0.5) * plotWidth;
    // skala y
    const scaleY = value => padding.top + plotHeight - ((value - minTemp) / (maxTemp - minTemp)) * plotHeight;

    // chart paths
    const points = data.map((point, index) => [scaleX(index), scaleY(point.temp)]);
    const linePath = points
        .map((coords, index) => `${index === 0 ? "M" : "L"}${coords[0].toFixed(1)},${coords[1].toFixed(1)}`)
        .join(" ");
    const bottomY = (padding.top + plotHeight).toFixed(1);
    const areaPath = `${linePath} L${points[points.length - 1][0].toFixed(1)},${bottomY} L${points[0][0].toFixed(1)},${bottomY} Z`;
    const yAxisTicks = [Math.round(minTemp + 1), Math.round((minTemp + maxTemp) / 2), Math.round(maxTemp - 1)];
    const labelStep = Math.max(1, Math.floor((data.length - 1) / 5));

    return (
        <div ref={containerRef} className="w-full">
            <svg width={chartWidth} height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
                <defs>
                    <linearGradient id="temperature-area-gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b7cf4" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#3b7cf4" stopOpacity="0" />
                    </linearGradient>
                </defs>

                {/* y axis */}
                {yAxisTicks.map(tick => (
                    <g key={tick}>
                        <line
                            x1={padding.left}
                            x2={chartWidth - padding.right}
                            y1={scaleY(tick)}
                            y2={scaleY(tick)}
                            stroke="#e2e8f0"
                            strokeWidth="1"
                        />
                        <text x={padding.left - 6} y={scaleY(tick) + 4} textAnchor="end" fontSize="10" fill="#94a3b8">
                            {tick}°
                        </text>
                    </g>
                ))}

                {/* x axis */}
                {data.map((point, index) => {
                    if (index % labelStep !== 0 && index !== data.length - 1) return null;
                    return (
                        <text
                            key={index}
                            x={scaleX(index)}
                            y={chartHeight - 6}
                            textAnchor="middle"
                            fontSize="10"
                            fill="#94a3b8"
                        >
                            {point.time}
                        </text>
                    );
                })}

                {/* area line */}
                <path d={areaPath} fill="url(#temperature-area-gradient)" />
                <path
                    d={linePath}
                    fill="none"
                    stroke="#3b7cf4"
                    strokeWidth="2"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                />

                {/* data points */}
                {data.map((point, index) => {
                    if (index % labelStep !== 0 && index !== data.length - 1) return null;
                    return (
                        <circle
                            key={index}
                            cx={scaleX(index)}
                            cy={scaleY(point.temp)}
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
