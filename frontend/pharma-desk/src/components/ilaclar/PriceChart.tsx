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
  
  // X eksenine yapışmaması için %15 boşluk bırakılan minPrice ayarı korunuyor.
  const minPrice = minPriceRaw - (rawPriceRange * 0.15 || minPriceRaw * 0.05);
  // Üstte %10'luk boşluk bırakalım.
  const maxPrice = maxPriceRaw + (rawPriceRange * 0.10 || maxPriceRaw * 0.05);
  // Fiyat aralığı hesaplanır
  const priceRange = maxPrice - minPrice <= 0.01 ? 1 : maxPrice - minPrice;

  const getPoint = (d: PriceData, i: number) => {
    const x = (i / (data.length - 1)) * width;
    // minPrice başlangıcına göre Y konumu hesaplanır.
    const y = height - ((d.price - minPrice) / priceRange) * height;
    return { x, y };
  };
  
  // Fiyat etiketlerinin Y pozisyonunu hesaplamak için yardımcı fonksiyon
  const getYPosition = (price: number) => {
    // price'ın minPrice'a göre konumu
    return height - ((price - minPrice) / priceRange) * height;
  }
  
  // Etiket pozisyonları
  const maxPriceRawY = getYPosition(maxPriceRaw);
  const minPriceRawY = getYPosition(minPriceRaw);
  
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
          {/* En yüksek fiyatı temsil eden ızgara çizgisi (en üstteki) */}
          <line className={styles.gridLine} x1="0" y1={maxPriceRawY} x2={width} y2={maxPriceRawY} />
          
          {/* En düşük fiyatı temsil eden ızgara çizgisi (çizginin altındaki) */}
          <line className={styles.gridLine} x1="0" y1={minPriceRawY} x2={width} y2={minPriceRawY} />
          
          {/* X ekseni (yatay çizgi) */}
          <line className={styles.axis} x1="0" y1={height} x2={width} y2={height} />
          
          {/* En Yüksek Fiyat Etiketi - Kendi Çizgisinin Üstüne Hizalı */}
          <text className={styles.axisLabel} x="-10" y={maxPriceRawY} dy="-0.32em">{maxPriceRaw.toFixed(2)}</text>
          
          {/* KRİTİK DÜZELTME: En Düşük Fiyat Etiketi - Kendi Çizgisine Hizalı */}
          <text className={styles.axisLabel} x="-10" y={minPriceRawY} dy="0.32em">{minPriceRaw.toFixed(2)}</text>
          
          {/* KRİTİK DÜZELTME: 0.00 Etiketi - X Ekseni Çizgisine Hizalı */}
          <text className={styles.axisLabel} x="-10" y={height} dy="0.32em">0.00</text>
          
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