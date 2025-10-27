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

  // ViewBox için koordinat sistemi boyutları
  const viewBoxWidth = 550;
  const viewBoxHeight = 200;
  
  // --- DEĞİŞİKLİK BURADA: Sol ve Sağ margin değerleri azaltıldı ---
  const margin = { top: 20, right: 10, bottom: 30, left: 30 }; 
  // --- ---

  // İç çizim alanı boyutları (koordinat sistemi içinde) - Otomatik olarak güncellenecek
  const width = viewBoxWidth - margin.left - margin.right;
  const height = viewBoxHeight - margin.top - margin.bottom;

  const prices = data.map(d => d.price);
  const maxPriceRaw = Math.max(...prices);
  const minPriceRaw = Math.min(...prices);
  const rawPriceRange = maxPriceRaw - minPriceRaw;

  const minPrice = minPriceRaw - (rawPriceRange * 0.15 || minPriceRaw * 0.05);
  const maxPrice = maxPriceRaw + (rawPriceRange * 0.10 || maxPriceRaw * 0.05);
  const priceRange = maxPrice - minPrice <= 0.01 ? 1 : maxPrice - minPrice;

  const getPoint = (d: PriceData, i: number) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((d.price - minPrice) / priceRange) * height;
    return { x, y };
  };

  const getYPosition = (price: number) => {
    return height - ((price - minPrice) / priceRange) * height;
  }

  const maxPriceRawY = getYPosition(maxPriceRaw);
  const minPriceRawY = getYPosition(minPriceRaw);

  const points = data.map((d, i) => {
    const { x, y } = getPoint(d, i);
    return `${x},${y}`;
  }).join(' ');

  const handleMouseMove = (event: React.MouseEvent<SVGRectElement>) => {
    const svgRect = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
    if (!svgRect) return;

    // SVG içindeki fare koordinatlarını hesapla
    const pt = event.currentTarget.ownerSVGElement!.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    const svgPoint = pt.matrixTransform(event.currentTarget.ownerSVGElement!.getScreenCTM()!.inverse());

    // Koordinatları viewBox koordinat sistemine dönüştür
    const xInViewBox = svgPoint.x - margin.left;

    // En yakın veri noktasını bul
    const segmentWidth = width / (data.length - 1);
    const index = Math.min(data.length - 1, Math.max(0, Math.round(xInViewBox / segmentWidth)));

    const pointData = data[index];
    const { x: pointX, y: pointY } = getPoint(pointData, index);
    setTooltip({
      // Tooltip pozisyonunu viewBox koordinatlarına göre ayarla
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
      {/* SVG ELEMENTİ */}
      <svg
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        preserveAspectRatio="xMidYMid meet"
        width="100%" /* SVG'nin konteyneri doldurmasını sağlar */
        height={viewBoxHeight} /* Yüksekliği sabit tutabilir veya "auto" yapabilirsiniz */
      >
        {/* Çizim alanı grubu, margin kadar içeri kaydırılır */}
        <g transform={`translate(${margin.left}, ${margin.top})`}>
          {/* Izgara Çizgileri */}
          <line className={styles.gridLine} x1="0" y1={maxPriceRawY} x2={width} y2={maxPriceRawY} />
          <line className={styles.gridLine} x1="0" y1={minPriceRawY} x2={width} y2={minPriceRawY} />
          
          {/* Eksen Çizgileri */}
          <line className={styles.axis} x1="0" y1={height} x2={width} y2={height} /> 
          {/* Dikey eksen çizgisi (isteğe bağlı) */}
          {/* <line className={styles.axis} x1="0" y1="0" x2="0" y2={height} /> */}
          
          {/* Y Ekseni Etiketleri (margin.left kadar solda) */}
          <text className={styles.axisLabel} x="-10" y={maxPriceRawY} dy="-0.32em">{maxPriceRaw.toFixed(2)}</text>
          <text className={styles.axisLabel} x="-10" y={minPriceRawY} dy="0.32em">{minPriceRaw.toFixed(2)}</text>
          <text className={styles.axisLabel} x="-10" y={height} dy="0.32em">0.00</text> 

          {/* X Ekseni Etiketleri (çizim alanının altında) */}
          {data.map((d, i) => (
            <text
              key={i}
              className={styles.axisLabelX}
              x={getPoint(d, i).x}
              y={height + 20} /* margin.bottom'a göre ayarlanır */
            >
              {d.day}
            </text>
          ))}

          {/* Fiyat Çizgisi */}
          <polyline className={styles.line} points={points} />

          {/* Mouse olaylarını yakalamak için görünmez dikdörtgen */}
          <rect
            fill="transparent"
            width={width} /* Sadece çizim alanı genişliğinde */
            height={height} /* Sadece çizim alanı yüksekliğinde */
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          />
        </g>

        {/* Tooltip */}
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