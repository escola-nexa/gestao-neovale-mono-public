import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateRequest {
  organization_id: string;
  course_id: string;
  bimester_number: number;
  reference_year: number;
  // Optional filters (legacy support)
  school_id?: string;
  class_group_ids?: string[];
  class_group_id?: string;
  selected_items?: Array<{ professor_id: string; subject_id: string }>;
}

const WEEKDAY_MAP: Record<string, number> = {
  'SEGUNDA': 1, 'TERCA': 2, 'QUARTA': 3, 'QUINTA': 4, 'SEXTA': 5,
};

function getWeekNumber(date: Date, bimesterStart: Date): number {
  const diffMs = date.getTime() - bimesterStart.getTime();
  return Math.floor(Math.floor(diffMs / (1000 * 60 * 60 * 24)) / 7) + 1;
}

function getWeekBounds(date: Date): { start: string; end: string } {
  const d = new Date(date);
  const day = d.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMon);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  return { start: monday.toISOString().split('T')[0], end: friday.toISOString().split('T')[0] };
}

const WEEKDAY_LABELS: Record<string, string> = {
  'SEGUNDA': 'Seg', 'TERCA': 'Ter', 'QUARTA': 'Qua', 'QUINTA': 'Qui', 'SEXTA': 'Sex',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '').trim();
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    const userId = claimsData?.claims?.sub;
    if (claimsError || !userId) {
      console.error('[generate-pre-plannings] auth failed:', claimsError?.message);
      return new Response(JSON.stringify({ error: 'Usuário não autenticado', details: claimsError?.message }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body: GenerateRequest = await req.json();
    const { organization_id, course_id, bimester_number, reference_year, selected_items } = body;

    if (!organization_id || !course_id || !bimester_number || !reference_year) {
      return new Response(JSON.stringify({ error: 'Campos obrigatórios: organization_id, course_id, bimester_number, reference_year' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: isCoord } = await supabase.rpc('is_coordinator', { user_uuid: userId, org_uuid: organization_id });
    if (!isCoord) {
      return new Response(JSON.stringify({ error: 'Apenas coordenadores podem gerar pré-planejamentos' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Get active calendar
    const { data: calData } = await supabase.from('academic_calendars').select('id').eq('organization_id', organization_id).eq('status', 'ACTIVE').limit(1).single();
    if (!calData) {
      return new Response(JSON.stringify({ error: 'Calendário acadêmico ativo não encontrado' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Load templates for this org+bimester
    const { data: templates } = await supabase
      .from('planning_templates')
      .select('*')
      .eq('organization_id', organization_id)
      .eq('bimester_number', bimester_number);

    const templateMap = new Map<string, any>();
    templates?.forEach(t => templateMap.set(`${t.subject_id}_${t.week_number}`, t));

    // Determine which school+class_group combos to process
    let schoolClassGroups: Array<{ school_id: string; class_group_id: string }> = [];

    if (body.school_id && (body.class_group_ids?.length || body.class_group_id)) {
      // Legacy: specific school + specific class groups
      const cgIds = body.class_group_ids?.length ? body.class_group_ids : (body.class_group_id ? [body.class_group_id] : []);
      schoolClassGroups = cgIds.map(cgId => ({ school_id: body.school_id!, class_group_id: cgId }));
    } else if (body.school_id) {
      // School provided but no specific class groups: find all class_groups for this course in THIS school only
      const { data: classGroups, error: cgError } = await supabase
        .from('class_groups')
        .select('id, school_id')
        .eq('organization_id', organization_id)
        .eq('course_id', course_id)
        .eq('school_id', body.school_id)
        .eq('status', 'ativo');

      if (cgError || !classGroups || classGroups.length === 0) {
        return new Response(JSON.stringify({ error: 'Nenhuma turma ativa encontrada para este curso nesta escola' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      schoolClassGroups = classGroups.map(cg => ({ school_id: cg.school_id, class_group_id: cg.id }));
    } else {
      // No school: find ALL class_groups for this course across all schools
      const { data: classGroups, error: cgError } = await supabase
        .from('class_groups')
        .select('id, school_id')
        .eq('organization_id', organization_id)
        .eq('course_id', course_id)
        .eq('status', 'ativo');

      if (cgError || !classGroups || classGroups.length === 0) {
        return new Response(JSON.stringify({ error: 'Nenhuma turma ativa encontrada para este curso' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      schoolClassGroups = classGroups.map(cg => ({ school_id: cg.school_id, class_group_id: cg.id }));
    }

    let totalCreated = 0;
    let totalSkipped = 0;
    let totalMaterialsLinked = 0;

    const syncMaterials = async (prePlanningId: string, subjectId: string, weekNum: number) => {
      const { data: materials } = await supabase
        .from('lesson_materials')
        .select('id, display_order')
        .eq('organization_id', organization_id)
        .eq('subject_id', subjectId)
        .eq('bimester_number', bimester_number)
        .eq('week_number', weekNum)
        .order('display_order');
      if (!materials || materials.length === 0) return;
      const links = materials.map((m: any) => ({
        pre_planning_id: prePlanningId,
        lesson_material_id: m.id,
        display_order: m.display_order ?? 0,
      }));
      const { error: linkErr } = await supabase
        .from('pre_planning_materials')
        .upsert(links, { onConflict: 'pre_planning_id,lesson_material_id' });
      if (!linkErr) totalMaterialsLinked += links.length;
    };
    const allErrors: { item: string; error: string }[] = [];
    const generatedDetails: Array<{ professor_name: string; subject_name: string; week_number: number }> = [];

    for (const { school_id, class_group_id } of schoolClassGroups) {
      const { data: eligibleItems, error: eligibleError } = await supabase.rpc(
        'get_eligible_professors_subjects_for_pre_planning',
        { p_org_id: organization_id, p_school_id: school_id, p_course_id: course_id, p_class_group_id: class_group_id, p_bimester_number: bimester_number }
      );

      if (eligibleError || !eligibleItems || eligibleItems.length === 0) continue;

      let itemsToProcess = eligibleItems;
      if (selected_items && selected_items.length > 0) {
        itemsToProcess = eligibleItems.filter((item: any) =>
          selected_items.some(si => si.professor_id === item.professor_id && si.subject_id === item.subject_id)
        );
      }

      if (itemsToProcess.length === 0) continue;

      // Get bimester dates
      const { data: bimesterData } = await supabase.rpc('calculate_bimester_classes', { p_subject_id: itemsToProcess[0].subject_id, p_bimester_number: bimester_number });
      if (!bimesterData?.[0]?.bimester_start) continue;

      const bimesterStart = new Date(bimesterData[0].bimester_start + 'T00:00:00');

      const { data: letivoDays } = await supabase
        .from('calendar_events').select('event_date').eq('calendar_id', calData.id).eq('event_type', 'LETIVO')
        .gte('event_date', bimesterData[0].bimester_start).lte('event_date', bimesterData[0].bimester_end).order('event_date');

      if (!letivoDays || letivoDays.length === 0) continue;

      for (const item of itemsToProcess) {
        if (item.already_exists) { totalSkipped++; continue; }

        const { data: schedule } = await supabase.rpc('get_professor_weekly_schedule_for_subject', {
          p_org_id: organization_id, p_school_id: school_id, p_course_id: course_id,
          p_class_group_id: class_group_id, p_professor_id: item.professor_id, p_subject_id: item.subject_id,
        });

        if (!schedule || schedule.length === 0) continue;

        const scheduleDays = schedule.map((s: any) => ({
          jsDay: WEEKDAY_MAP[s.weekday] || 0, startTime: s.start_time, endTime: s.end_time, weekday: s.weekday,
        }));

        const { data: classesData } = await supabase.rpc('calculate_bimester_classes', { p_subject_id: item.subject_id, p_bimester_number: bimester_number });
        const classInfo = classesData?.[0];

        const weekMap = new Map<number, { weekNum: number; weekBounds: { start: string; end: string }; classDays: any[] }>();

        for (const letivoDay of letivoDays) {
          const dateStr = letivoDay.event_date;
          const date = new Date(dateStr + 'T00:00:00');
          const jsDay = date.getDay();
          const matchingSchedule = scheduleDays.find((s: any) => s.jsDay === jsDay);
          if (!matchingSchedule) continue;

          const weekNum = getWeekNumber(date, bimesterStart);
          const weekBounds = getWeekBounds(date);

          if (!weekMap.has(weekNum)) weekMap.set(weekNum, { weekNum, weekBounds, classDays: [] });
          weekMap.get(weekNum)!.classDays.push({
            date: dateStr, start_time: matchingSchedule.startTime, end_time: matchingSchedule.endTime,
            weekday: matchingSchedule.weekday, weekday_label: WEEKDAY_LABELS[matchingSchedule.weekday] || matchingSchedule.weekday,
          });
        }

        for (const [weekNum, weekData] of weekMap) {
          const { data: existing } = await supabase
            .from('pre_plannings').select('id')
            .eq('organization_id', organization_id).eq('professor_id', item.professor_id)
            .eq('school_id', school_id).eq('course_id', course_id).eq('class_group_id', class_group_id)
            .eq('subject_id', item.subject_id).eq('bimester_number', bimester_number).eq('week_number', weekNum)
            .is('deleted_at', null).maybeSingle();

          if (existing) {
            totalSkipped++;
            // Mesmo pulando o pré-planejamento, sincroniza materiais novos do Calendário Semanal
            await syncMaterials(existing.id, item.subject_id, weekNum);
            continue;
          }

          const tmpl = templateMap.get(`${item.subject_id}_${weekNum}`);
          const firstDay = weekData.classDays[0];

          const { data: prePlanning, error: insertError } = await supabase
            .from('pre_plannings')
            .insert({
              organization_id, professor_id: item.professor_id, school_id, course_id,
              class_group_id, subject_id: item.subject_id, planning_type: 'BIMESTRAL',
              bimester_number, reference_year, status: 'GERADO',
              class_date: firstDay.date, start_time: firstDay.start_time, end_time: firstDay.end_time,
              week_number: weekNum, week_start_date: weekData.weekBounds.start, week_end_date: weekData.weekBounds.end,
              class_days_count: weekData.classDays.length, class_days_detail: weekData.classDays,
              calculated_total_classes: classInfo?.total_classes || 0, calculated_total_hours: classInfo?.total_hours || 0,
              created_by: userId,
              // Apenas "Conteúdos" é copiado do Calendário Semanal; demais campos ficam vazios para o professor preencher
              objective: '', competencies: '',
              contents: tmpl?.contents || '',
              methodology: '', resources: '', evaluation: '',
              product: '', next_steps: '',
            })
            .select('id').single();

          if (insertError) {
            allErrors.push({ item: `${item.professor_name} - ${item.subject_name} (Semana ${weekNum})`, error: insertError.message });
          } else if (prePlanning) {
            totalCreated++;
            generatedDetails.push({
              professor_name: item.professor_name,
              subject_name: item.subject_name,
              week_number: weekNum,
            });

            // Vincula materiais (PDF/vídeo/áudio/texto) da mesma semana cadastrados no Calendário Semanal
            await syncMaterials(prePlanning.id, item.subject_id, weekNum);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `${totalCreated} pré-planejamento(s) semanal(is) gerado(s) com sucesso`,
        created: totalCreated, skipped: totalSkipped, materials_linked: totalMaterialsLinked,
        errors: allErrors.length > 0 ? allErrors : undefined,
        class_groups_processed: schoolClassGroups.length,
        details: generatedDetails,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
