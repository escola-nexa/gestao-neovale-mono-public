export type RouteStatus = 'planejada' | 'em_andamento' | 'finalizada' | 'cancelada';

export interface VisitRoute {
  id: string;
  organization_id: string;
  code: string | null;
  name: string;
  supervisor_id: string;
  departure_point: string | null;
  start_date: string;
  end_date: string;
  status: RouteStatus;
  shift_start: string;
  shift_end: string;
  break_start: string | null;
  break_end: string | null;
  default_visit_minutes: number;
  fuel_cost_per_km: number;
  toll_estimated: number;
  kml_per_liter: number;
  fuel_price_per_liter: number;
  total_km: number;
  total_travel_minutes: number;
  total_visit_minutes: number;
  total_estimated_cost: number;
  efficiency_score: string | null;
  notes: string | null;
  legacy_visit_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface VisitRouteSchool {
  id: string;
  route_id: string;
  school_id: string;
  city: string | null;
  lat: number | null;
  lng: number | null;
  route_order: number;
  day_order: number | null;
  planned_date: string | null;
  planned_arrival: string | null;
  planned_departure: string | null;
  travel_from_previous_minutes: number;
  distance_from_previous_km: number;
  visit_minutes: number | null;
  status: string;
  check_in_at: string | null;
  check_out_at: string | null;
  check_in_lat: number | null;
  check_in_lng: number | null;
  check_in_accuracy_m: number | null;
  check_in_photo_path: string | null;
  check_out_lat: number | null;
  check_out_lng: number | null;
  check_out_accuracy_m: number | null;
  check_out_photo_path: string | null;
  occurrence_type: string | null;
  occurrence_description: string | null;
  executed_by: string | null;
}

export const statusLabel: Record<RouteStatus, string> = {
  planejada: 'Planejada',
  em_andamento: 'Em Andamento',
  finalizada: 'Finalizada',
  cancelada: 'Cancelada',
};

export const statusBadge: Record<RouteStatus, string> = {
  planejada: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  em_andamento: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  finalizada: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  cancelada: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};
