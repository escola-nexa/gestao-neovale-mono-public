import { useQuery } from '@tanstack/react-query';
import { substitutionApi } from '../api';

export interface EligibleTalent {
  id: string;
  full_name: string;
  cpf: string | null;
  email: string | null;
  phone: string | null;
  city_name: string | null;
  state_sigla: string | null;
  formation_area: string | null;
  classifications: string[];
  inCity: boolean;
  priorCount: number;
}

const norm = (s: string | null | undefined) =>
  (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const onlyDigits = (s: string | null | undefined) => (s || '').replace(/\D/g, '');

export function useEligibleSubstituteTalents(params: {
  organizationId: string | null | undefined;
  cidades: string[];
  enabled?: boolean;
}) {
  const { organizationId, cidades, enabled = true } = params;
  const cidadesKey = [...cidades].map(norm).sort().join('|');
  return useQuery({
    enabled: enabled && !!organizationId,
    queryKey: ['eligible_sub_talents', organizationId, cidadesKey],
    queryFn: async (): Promise<EligibleTalent[]> => {
      const data = await substitutionApi.getEligibleSubstituteTalents(cidadesKey, organizationId!);

      // Histórico
      const hist = await substitutionApi.getTalentHistory(organizationId!);
      const cpfCounts = new Map<string, number>();
      const nameCounts = new Map<string, number>();
      (hist || []).forEach((r: any) => {
        const c = onlyDigits(r.substitute_cpf);
        if (c) cpfCounts.set(c, (cpfCounts.get(c) || 0) + 1);
        const n = norm(r.substitute_name);
        if (n) nameCounts.set(n, (nameCounts.get(n) || 0) + 1);
      });

      const targetCidadesNorm = new Set(cidades.map(norm).filter(Boolean));
      const list: EligibleTalent[] = (data || []).map((r: any) => {
        const cityNameNorm = norm(r.cities?.nome);
        const inCity = targetCidadesNorm.size === 0
          ? true
          : (cityNameNorm ? targetCidadesNorm.has(cityNameNorm) : false);
        const priorCount = nameCounts.get(norm(r.full_name)) || 0;
        return {
          id: r.id,
          full_name: r.full_name,
          cpf: null,
          email: r.email || null,
          phone: r.phone,
          city_name: r.cities?.nome || null,
          state_sigla: r.states?.sigla || null,
          formation_area: r.formation_area,
          classifications: Array.isArray(r.classifications) ? r.classifications : [],
          inCity,
          priorCount,
        };
      });

      // Ordena: na cidade primeiro, depois quem já substituiu mais vezes, depois nome
      return list.sort((a, b) => {
        if (a.inCity !== b.inCity) return a.inCity ? -1 : 1;
        if (a.priorCount !== b.priorCount) return b.priorCount - a.priorCount;
        return a.full_name.localeCompare(b.full_name);
      });
    },
  });
}
