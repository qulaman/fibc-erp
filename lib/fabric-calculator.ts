// src/lib/fabric-calculator.ts

export const CONSTANTS = {
  // Коэффициенты для перевода единиц
  DENSITY_DIVISOR: 900,        // (9000 м / 10 коэффициент перевода см в м)
  CONSUMPTION_DIVISOR: 90000000 // 9000 * 10 * 1000 (г в кг)
};

export interface FabricParams {
  weftDenier?: number;       // Денье утка
  weftThreads10cm: number;   // Нитей утка на 10 см
  warpDenier?: number;       // Денье основы
  warpThreads10cm: number;   // Нитей основы на 10 см
  fabricWidthCm?: number;    // Ширина ткани в см
  targetDensity?: number;    // Целевая плотность г/м2 (для обратного расчета)
}

export interface CalculationResult {
  density: number;        // г/м2
  weftContribution: number;
  warpContribution: number;
  consumptionKgPerM: number; // Общий расход кг на пог.м
  weftConsumption: number;
  warpConsumption: number;
}

/**
 * 1. ПРЯМОЙ РАСЧЕТ: Плотность (г/м²) по Денье
 * Формула: (Денье * Кол-во нитей на 10см) / 900
 */
export function calculateDensity(params: FabricParams): CalculationResult {
  const { weftDenier = 0, warpDenier = 0, weftThreads10cm, warpThreads10cm, fabricWidthCm = 0 } = params;

  // Вклад утка и основы в граммах на м2
  const weftGsm = (weftDenier * weftThreads10cm) / CONSTANTS.DENSITY_DIVISOR;
  const warpGsm = (warpDenier * warpThreads10cm) / CONSTANTS.DENSITY_DIVISOR;
  
  const density = weftGsm + warpGsm;

  // Расход нити (кг/пог.м)
  // Формула: (Денье * НитейНа10см * ШиринаСм) / 90,000,000
  const weftCons = (weftDenier * weftThreads10cm * fabricWidthCm) / CONSTANTS.CONSUMPTION_DIVISOR;
  const warpCons = (warpDenier * warpThreads10cm * fabricWidthCm) / CONSTANTS.CONSUMPTION_DIVISOR;

  return {
    density: Number(density.toFixed(2)),
    weftContribution: Number(weftGsm.toFixed(2)),
    warpContribution: Number(warpGsm.toFixed(2)),
    consumptionKgPerM: Number((weftCons + warpCons).toFixed(4)),
    weftConsumption: Number(weftCons.toFixed(4)),
    warpConsumption: Number(warpCons.toFixed(4)),
  };
}

/**
 * 2. ОБРАТНЫЙ РАСЧЕТ: Какое нужно Денье для заданной Плотности?
 * Формула: Denier = (Целевой_GSM * 900) / Threads
 */
export function calculateRequiredDenier(
  targetDensity: number, 
  weftThreads10cm: number, 
  warpThreads10cm: number
) {
  // Делим целевую плотность пополам (50% веса уток, 50% основа)
  const targetHalf = targetDensity / 2;

  const reqWeft = (targetHalf * CONSTANTS.DENSITY_DIVISOR) / weftThreads10cm;
  const reqWarp = (targetHalf * CONSTANTS.DENSITY_DIVISOR) / warpThreads10cm;

  return {
    weftDenier: Math.round(reqWeft),
    warpDenier: Math.round(reqWarp),
    closestStandardWeft: findClosest(reqWeft),
    closestStandardWarp: findClosest(reqWarp)
  };
}

// Стандартные значения денье (для подсказок)
const STANDARD_DENIERS = [950, 1000, 1100, 1200, 1300, 1350, 1400, 1500, 1570, 1600, 1800, 2000];

function findClosest(target: number): number {
  return STANDARD_DENIERS.reduce((prev, curr) => 
    (Math.abs(curr - target) < Math.abs(prev - target) ? curr : prev)
  );
}