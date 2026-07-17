import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateRequest {
  organization_id: string;
  school_id: string;
  course_id: string;
  class_group_id: string;
  start_date?: string;
  end_date?: string;
  // Base pedagogical content
  objective: string;
  competencies: string;
  contents: string;
  methodology: string;
  resources: string;
  evaluation: string;
  product: string;
  next_steps: string;
}

interface EligibleOccurrence {
  occurrence_id: string;
  occurrence_date: string;
  weekday: string;
  start_time: string;
  end_time: string;
  subject_id: string;
  subject_name: string;
  professor_id: string;
  professor_name: string;
  already_has_pre_planning: boolean;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user is coordinator
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: GenerateRequest = await req.json();
    const {
      organization_id,
      school_id,
      course_id,
      class_group_id,
      start_date,
      end_date,
      objective,
      competencies,
      contents,
      methodology,
      resources,
      evaluation,
      product,
      next_steps,
    } = body;

    // Validate required fields
    if (!organization_id || !school_id || !course_id || !class_group_id) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios: organization_id, school_id, course_id, class_group_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate pedagogical content
    if (!objective || !competencies || !contents || !methodology || !resources || !evaluation || !product || !next_steps) {
      return new Response(
        JSON.stringify({ error: 'Todos os campos da Orientação Pedagógica Base são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check user is coordinator
    const { data: isCoord } = await supabase.rpc('is_coordinator', {
      user_uuid: user.id,
      org_uuid: organization_id,
    });

    if (!isCoord) {
      return new Response(
        JSON.stringify({ error: 'Apenas coordenadores podem gerar pré-planejamentos' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get eligible occurrences (classes on LETIVO days within subject semester)
    const { data: eligibleOccurrences, error: eligibleError } = await supabase.rpc(
      'get_eligible_occurrences_for_pre_planning',
      {
        p_org_id: organization_id,
        p_school_id: school_id,
        p_course_id: course_id,
        p_class_group_id: class_group_id,
        p_start_date: start_date || null,
        p_end_date: end_date || null,
      }
    ) as { data: EligibleOccurrence[] | null; error: unknown };

    if (eligibleError) {
      console.error('Error getting eligible occurrences:', eligibleError);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar aulas elegíveis' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!eligibleOccurrences || eligibleOccurrences.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Nenhuma aula elegível encontrada. Verifique se há aulas cadastradas para o período selecionado.',
          details: {
            school_id,
            course_id,
            class_group_id,
            start_date,
            end_date,
          }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filter out already existing
    const newOccurrences = eligibleOccurrences.filter(o => !o.already_has_pre_planning);

    if (newOccurrences.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Todos os pré-planejamentos já existem para este período',
          created: 0,
          skipped: eligibleOccurrences.length,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get reference year from active calendar
    const { data: calendar } = await supabase
      .from('academic_calendars')
      .select('academic_year')
      .eq('organization_id', organization_id)
      .eq('status', 'ACTIVE')
      .single();

    const referenceYear = calendar?.academic_year || new Date().getFullYear();

    // Generate pre-plannings for each eligible occurrence
    const createdPlannings: string[] = [];
    const errors: { occurrence: string; error: string }[] = [];

    for (const occurrence of newOccurrences) {
      // Get bimester number for this date
      const { data: bimesterData } = await supabase
        .from('academic_bimesters')
        .select('number, calendar_id')
        .gte('end_date', occurrence.occurrence_date)
        .lte('start_date', occurrence.occurrence_date)
        .single();

      const bimesterNumber = bimesterData?.number || null;

      // Create pre-planning for this specific class
      const { data: prePlanning, error: insertError } = await supabase
        .from('pre_plannings')
        .insert({
          organization_id,
          school_id,
          course_id,
          class_group_id,
          subject_id: occurrence.subject_id,
          occurrence_id: occurrence.occurrence_id,
          class_date: occurrence.occurrence_date,
          planning_type: 'BIMESTRAL', // Keep for backwards compatibility
          bimester_number: bimesterNumber,
          reference_year: referenceYear,
          status: 'DISPONIVEL',
          calculated_total_classes: 1, // One class per pre-planning
          calculated_total_hours: 50, // 50 minutes per class
          created_by: user.id,
          // Use coordinator's base pedagogical content
          objective,
          competencies,
          contents,
          methodology,
          resources,
          evaluation,
          product,
          next_steps,
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('Error inserting pre-planning:', insertError);
        errors.push({
          occurrence: `${occurrence.occurrence_date} - ${occurrence.subject_name}`,
          error: insertError.message || 'Erro ao criar pré-planejamento',
        });
      } else if (prePlanning) {
        // Log the generation for audit
        await supabase.rpc('log_planning_action', {
          p_org_id: organization_id,
          p_pre_planning_id: prePlanning.id,
          p_teacher_planning_id: null,
          p_action: 'GENERATED',
          p_details: {
            occurrence_id: occurrence.occurrence_id,
            occurrence_date: occurrence.occurrence_date,
            subject_id: occurrence.subject_id,
            professor_id: occurrence.professor_id,
          },
        });

        createdPlannings.push(prePlanning.id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `${createdPlannings.length} pré-planejamento(s) gerado(s) com sucesso`,
        created: createdPlannings.length,
        skipped: eligibleOccurrences.length - newOccurrences.length,
        errors: errors.length > 0 ? errors : undefined,
        planning_ids: createdPlannings,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
