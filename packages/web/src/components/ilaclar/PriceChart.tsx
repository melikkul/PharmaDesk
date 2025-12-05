// src/components/ilaclar/PriceChart.tsx
import React, { useState, useMemo, useCallback } from 'react';
import styles from './PriceChart.module.css';

interface PriceData {
  day: string;
  price: number;
}

interface PriceChartProps {
  data: PriceData[];
}

interface TooltipData {
  x: number;
  y: number;
  day: string;
  price: number;
  index: number;
}

const PriceChart: React.FC<PriceChartProps> = ({ data }) => {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  const viewBoxWidth = 500;
  const viewBoxHeight = 180;
  const margin = { top: 20, right: 20, bottom: 35, left: 50 };

  const chartGeometry = useMemo(() => {
    if (!data || data.length < 2) return null;

    const width = viewBoxWidth - margin.left - margin.right;
    const height = viewBoxHeight - margin.top - margin.bottom;

    const prices = data.map(d => d.price);
    const maxPriceRaw = Math.max(...prices);
    const minPriceRaw = Math.min(...prices);
    const rawPriceRange = maxPriceRaw - minPriceRaw;

    const padding = rawPriceRange * 0.15 || maxPriceRaw * 0.05;
    const minPrice = minPriceRaw - padding;
    const maxPrice = maxPriceRaw + padding;
    const priceRange = maxPrice - minPrice <= 0.01 ? 1 : maxPrice - minPrice;

    const getYPosition = (price: number) => {
      return height - ((price - minPrice) / priceRange) * height;
    };

    const getPoint = (d: PriceData, i: number) => {
      const x = (i / (data.length - 1)) * width;
      const y = getYPosition(d.price);
      return { x, y };
    };

    return { width, height, minPrice, maxPrice, priceRange, minPriceRaw, maxPriceRaw, getYPosition, getPoint };
  }, [data, margin.left, margin.right, margin.top, margin.bottom]);

  const linePath = useMemo(() => {
    if (!chartGeometry || !data) return '';
    const { getPoint } = chartGeometry;
    return data.map((d, i) => {
      const { x, y } = getPoint(d, i);
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    }).join(' ');
  }, [data, chartGeometry]);

  const areaPath = useMemo(() => {
    if (!chartGeometry || !data) return '';
    const { getPoint, height } = chartGeometry;
    const points = data.map((d, i) => {
      const { x, y } = getPoint(d, i);
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    }).join(' ');
    const lastPoint = getPoint(data[data.length - 1], data.length - 1);
    const firstPoint = getPoint(data[0], 0);
    return `${points} L${lastPoint.x},${height} L${firstPoint.x},${height} Z`;
  }, [data, chartGeometry]);

  const handleMouseMove = useCallback((event: React.MouseEvent<SVGRectElement>) => {
    if (!chartGeometry || !data) return;
    const { width, getPoint } = chartGeometry;

    const svgRect = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
    if (!svgRect) return;

    const pt = event.currentTarget.ownerSVGElement!.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    const svgPoint = pt.matrixTransform(event.currentTarget.ownerSVGElement!.getScreenCTM()!.inverse());
    const xInViewBox = svgPoint.x - margin.left;

    const segmentWidth = width / (data.length - 1);
    const index = Math.min(data.length - 1, Math.max(0, Math.round(xInViewBox / segmentWidth)));

    const pointData = data[index];
    const { x: pointX, y: pointY } = getPoint(pointData, index);
    setTooltip({
      x: pointX + margin.left,
      y: pointY + margin.top,
      index,
      ...pointData,
    });
  }, [chartGeometry, data, margin.left, margin.top]);

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  const tooltipXOffset = useMemo(() => {
    if (tooltip && data && tooltip.index > data.length / 2) return -100;
    return 15;
  }, [tooltip, data]);

  // Fiyat değişimi hesapla
  const priceChange = useMemo(() => {
    if (!data || data.length < 2) return { value: 0, percent: 0, direction: 'stable' };
    const first = data[0].price;
    const last = data[data.length - 1].price;
    const diff = last - first;
    const percent = ((diff / first) * 100).toFixed(1);
    return {
      value: diff,
      percent,
      direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'stable'
    };
  }, [data]);

  if (!chartGeometry || !data) {
    return <div className={styles.chartContainer}>Yeterli veri yok.</div>;
  }

  const { width, height, getPoint, maxPriceRaw, minPriceRaw } = chartGeometry;

  return (
    <div className={styles.chartContainer}>
      {/* Chart Header */}
      <div className={styles.chartHeader}>
        <div className={styles.chartTitle}>
          📈 Fiyat Grafiği
          <span className={styles.chartBadge}>Son 7 Gün</span>
        </div>
        <div className={styles.currentPriceBadge}>
          {data[data.length - 1].price.toFixed(2)} ₺
          <span className={`${styles.priceChange} ${
            priceChange.direction === 'up' ? styles.priceUp : 
            priceChange.direction === 'down' ? styles.priceDown : 
            styles.priceStable
          }`}>
            {priceChange.direction === 'up' ? '↑' : priceChange.direction === 'down' ? '↓' : '→'}
            {Math.abs(Number(priceChange.percent))}%
          </span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        preserveAspectRatio="xMidYMid meet"
        width="100%"
        style={{ overflow: 'visible' }}
      >
        {/* Gradient Definitions */}
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        <g transform={`translate(${margin.left}, ${margin.top})`}>
          {/* Grid Lines - Dashed */}
          <line className={styles.gridLine} x1="0" y1={chartGeometry.getYPosition(maxPriceRaw)} x2={width} y2={chartGeometry.getYPosition(maxPriceRaw)} />
          <line className={styles.gridLine} x1="0" y1={chartGeometry.getYPosition(minPriceRaw)} x2={width} y2={chartGeometry.getYPosition(minPriceRaw)} />
          <line className={styles.gridLine} x1="0" y1={height / 2} x2={width} y2={height / 2} />

          {/* Y Axis Labels */}
          <text className={styles.axisLabel} x="-8" y={chartGeometry.getYPosition(maxPriceRaw)} dy="0.35em">
            {maxPriceRaw.toFixed(2)} ₺
          </text>
          <text className={styles.axisLabel} x="-8" y={chartGeometry.getYPosition(minPriceRaw)} dy="0.35em">
            {minPriceRaw.toFixed(2)} ₺
          </text>

          {/* X Axis Labels */}
          {data.map((d, i) => (
            <text
              key={i}
              className={styles.axisLabelX}
              x={getPoint(d, i).x}
              y={height + 20}
            >
              {d.day}
            </text>
          ))}

          {/* Area Fill */}
          <path className={styles.area} d={areaPath} />

          {/* Line */}
          <path className={styles.line} d={linePath} />

          {/* Data Points */}
          {data.map((d, i) => {
            const { x, y } = getPoint(d, i);
            return (
              <circle
                key={i}
                className={styles.dataPoint}
                cx={x}
                cy={y}
                r={4}
              />
            );
          })}

          {/* Hover Area */}
          <rect
            fill="transparent"
            width={width}
            height={height}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ cursor: 'crosshair' }}
          />
        </g>

        {/* Tooltip */}
        {tooltip && (
          <g transform={`translate(${tooltip.x}, ${tooltip.y})`}>
            <circle className={styles.tooltipCircle} r="7" />
            <g transform={`translate(${tooltipXOffset}, -20)`}>
              <rect className={styles.tooltipBox} x="-5" y="-22" width="90" height="32" rx="8" />
              <text className={styles.tooltipText} y="-2">
                {`${tooltip.day}: ${tooltip.price.toFixed(2)} ₺`}
              </text>
            </g>
          </g>
        )}
      </svg>
    </div>
  );
};

export default PriceChart;