// src/components/ilaclar/PriceChart.tsx
import React, { useState } from 'react';
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

  if (!data || data.length < 2) {
    return <div className={styles.chartContainer}>Yeterli veri yok.</div>;
  }

  const svgWidth = 550;
  const svgHeight = 200;
  const margin = { top: 20, right: 20, bottom: 30, left: 50 };
  const width = svgWidth - margin.left - margin.right;
  const height = svgHeight - margin.top - margin.bottom;

  const prices = data.map(d => d.price);
  const maxPriceRaw = Math.max(...prices);
  const minPriceRaw = Math.min(...prices);
  const rawPriceRange = maxPriceRaw - minPriceRaw;

  // --- İSTEĞİNİZ İÇİN KESİN ÇÖZÜM ---
  // Y ekseninin en alt noktasını, en düşük fiyattan %25 daha aşağıda olacak şekilde ayarla.
  // Bu, çizginin eksene asla yapışmamasını garanti eder.
  const minPrice = minPriceRaw - (rawPriceRange * 0.25);
  // Üstte de %15'lik bir boşluk bırakalım.
  const maxPrice = maxPriceRaw + (rawPriceRange * 0.15);
  // --- -------------------------- ---

  const priceRange = maxPrice - minPrice === 0 ? 1 : maxPrice - minPrice;

  const getPoint = (d: PriceData, i: number) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((d.price - minPrice) / priceRange) * height;
    return { x, y };
  };

  const points = data.map((d, i) => {
    const { x, y } = getPoint(d, i);
    return `${x},${y}`;
  }).join(' ');

  const handleMouseMove = (event: React.MouseEvent<SVGRectElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const segmentWidth = width / (data.length - 1);
    const index = Math.min(data.length - 1, Math.max(0, Math.round(x / segmentWidth)));
    
    const pointData = data[index];
    const { x: pointX, y: pointY } = getPoint(pointData, index);
    setTooltip({
      x: pointX + margin.left,
      y: pointY + margin.top,
      index: index,
      ...pointData,
    });
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };

  let tooltipXOffset = 15;
  if (tooltip && tooltip.index > data.length / 2) {
      tooltipXOffset = -95;
  }

  return (
    <div className={styles.chartContainer}>
      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} preserveAspectRatio="xMidYMid meet">
        <g transform={`translate(${margin.left}, ${margin.top})`}>
          <line className={styles.gridLine} x1="0" y1="0" x2={width} y2="0" />
          <line className={styles.axis} x1="0" y1={height} x2={width} y2={height} />
          
          <text className={styles.axisLabel} x="-10" y="5" dy=".32em">{maxPriceRaw.toFixed(2)}</text>
          <text className={styles.axisLabel} x="-10" y={height} dy=".32em">{minPriceRaw.toFixed(2)}</text>
          
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

          <polyline className={styles.line} points={points} />
          
          <rect
            fill="transparent"
            width={width}
            height={height}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          />
        </g>
        
        {tooltip && (
          <g transform={`translate(${tooltip.x}, ${tooltip.y})`}>
            <circle className={styles.tooltipCircle} r="5" />
            <g transform={`translate(${tooltipXOffset}, -15)`}>
              <rect className={styles.tooltipBox} y="-18" width="80" height="25" rx="5"/>
              <text className={styles.tooltipText} y="0">
                {`${tooltip.day}: ${tooltip.price.toFixed(2)}₺`}
              </text>
            </g>
          </g>
        )}
      </svg>
    </div>
  );
};

export default PriceChart;