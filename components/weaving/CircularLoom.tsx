'use client';

import React from 'react';
import { cn } from "@/lib/utils";

// 1. Экспортируем ТИП
export type LoomSector = { 
  id: number; 
  t: number; 
  b: number; 
};

interface CircularLoomProps {
  pattern: LoomSector[];
}

// 2. Экспортируем ФУНКЦИЮ (именованный экспорт)
export function CircularLoom({ pattern }: CircularLoomProps) {
  
  // Защита от пустых данных
  if (!pattern || pattern.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 w-64 bg-zinc-100 rounded-full mx-auto border-4 border-dashed border-zinc-300">
         <span className="text-zinc-400 text-xs">Нет данных</span>
      </div>
    );
  }

  const totalSectors = 36;
  
  const fullRing = Array.from({ length: totalSectors }, (_, i) => {
    const patternIndex = i % pattern.length; 
    const sectorData = pattern[patternIndex] || { t: 0, b: 0 };

    return {
      realIndex: i + 1,
      t: sectorData.t,
      b: sectorData.b
    };
  });

  const radius = 260; 
  const center = 320; 

  return (
    <div className="relative bg-white rounded-full shadow-2xl border-8 border-zinc-100 mx-auto scale-75 md:scale-100 transition-transform origin-top" 
         style={{ width: center * 2, height: center * 2 }}>
      
      {/* ЦЕНТР */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center z-20 pointer-events-none">
         <div className="text-8xl font-black text-zinc-100 tracking-tighter">36</div>
         <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-2">Секторов</div>
      </div>

      {/* ОСИ */}
      <div className="absolute top-0 left-1/2 w-px h-full bg-red-100 -translate-x-1/2 z-0"></div>
      <div className="absolute left-0 top-1/2 w-full h-px bg-red-100 -translate-y-1/2 z-0"></div>

      {/* СЕКТОРА */}
      {fullRing.map((sector, i) => {
        const angleDeg = (i * (360 / totalSectors)) - 90; 
        const angleRad = (angleDeg * Math.PI) / 180;

        const x = center + radius * Math.cos(angleRad);
        const y = center + radius * Math.sin(angleRad);
        const rotateCard = angleDeg + 90; 

        const isRaportEnd = (i + 1) % 9 === 0;

        return (
          <div
            key={sector.realIndex}
            className="absolute w-12 h-20 -ml-6 -mt-10 group"
            style={{
              left: x,
              top: y,
              transform: `rotate(${rotateCard}deg)`,
            }}
          >
            <div className="absolute -top-4 w-full text-center text-[10px] font-bold text-zinc-300 group-hover:text-red-500">
               {sector.realIndex}
            </div>

            <div className={cn(
               "w-full h-full flex flex-col border rounded shadow-sm overflow-hidden text-xs font-bold bg-white transition-all hover:scale-110 hover:shadow-md cursor-pointer",
               isRaportEnd ? "border-red-300 border-b-4" : "border-zinc-300"
            )}>
              <div className="flex-1 flex items-center justify-center bg-blue-50 text-blue-700 border-b border-zinc-100">
                 {sector.t}
              </div>
              <div className="flex-1 flex items-center justify-center bg-emerald-50 text-emerald-700">
                 {sector.b}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}