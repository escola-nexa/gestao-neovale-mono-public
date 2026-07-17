export interface CostParams {
  totalKm: number;
  fuelPricePerLiter: number;
  kmlPerLiter: number;
  tollEstimated: number;
  fuelCostPerKmFallback?: number;
}

export function estimateRouteCost(p: CostParams) {
  const liters = p.kmlPerLiter > 0 ? p.totalKm / p.kmlPerLiter : 0;
  const fuel = liters * p.fuelPricePerLiter;
  return {
    liters: +liters.toFixed(2),
    fuel: +fuel.toFixed(2),
    tolls: +p.tollEstimated.toFixed(2),
    total: +(fuel + p.tollEstimated).toFixed(2),
  };
}
