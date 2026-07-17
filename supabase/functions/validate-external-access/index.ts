import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Content-Type": "application/json",
};

// Simple in-memory rate limiter (per edge function instance)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 60;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const MAX_UPLOAD_SIZE = 20 * 1024 * 1024;
const ALLOWED_MIME_PREFIXES = ["image/"];
const ALLOWED_MIME_TYPES = ["application/pdf"];

const ALLOWED_PROFESSOR_DOCUMENT_FIELDS = new Set([
  "full_name", "social_name", "nationality", "birth_city", "birth_state", "birth_date",
  "marital_status", "education_level", "gender", "height", "weight", "race", "hair_color",
  "eye_color", "blood_type", "shirt_size", "cpf", "rg_number", "rg_issuer", "rg_state",
  "rg_issue_date", "work_card_number", "work_card_series", "work_card_state", "cnh_number",
  "cnh_state", "cnh_category", "cnh_issue_date", "cnh_expiry", "first_license_date", "voter_id",
  "voter_zone", "voter_section", "military_cert", "pis_nit", "email", "phone", "address",
  "address_complement", "neighborhood", "zip_code", "address_city", "address_state", "bank_name",
  "bank_branch", "bank_account", "has_sicredi_account", "pix_type", "pix_key", "father_name",
  "mother_name", "spouse_name", "spouse_nationality", "spouse_birth_city", "spouse_birth_state",
  "spouse_birth_date", "registration_code", "specialization",
]);

const DATE_FIELDS = new Set([
  "birth_date", "rg_issue_date", "cnh_issue_date", "cnh_expiry", "first_license_date", "spouse_birth_date",
]);
const NUMERIC_FIELDS = new Set(["height", "weight"]);
const BOOLEAN_FIELDS = new Set(["has_sicredi_account"]);


function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT_MAX;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const body = await req.json();
    const { token, keyword, action, reportModel } = body;

    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
                      req.headers.get("cf-connecting-ip") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";
    const deviceType = /mobile|android|iphone|ipad/i.test(userAgent) ? "mobile" : "desktop";

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: "Token obrigatório" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const rateLimitKey = `${ipAddress}:${token}`;
    if (!checkRateLimit(rateLimitKey)) {
      return new Response(
        JSON.stringify({ success: false, error: "Muitas tentativas. Tente novamente em alguns minutos." }),
        { status: 429, headers: corsHeaders }
      );
    }

    // 1. Validate the link
    const { data: link, error: linkError } = await supabase
      .from("external_links")
      .select("*, schools(nome, cidade)")
      .eq("token", token)
      .single();

    if (linkError || !link) {
      return new Response(
        JSON.stringify({ success: false, error: "Link não encontrado" }),
        { status: 404, headers: corsHeaders }
      );
    }

    if (!link.is_active) {
      logAccess(supabase, { organization_id: link.organization_id, external_link_id: link.id, school_id: link.school_id, content_type: link.content_type, access_status: "denied", access_type: "link_validation", ip_address: ipAddress, user_agent: userAgent, device_type: deviceType, keyword_valid: false, failure_reason: "link_inactive", action_performed: "acesso_negado_link_inativo" });
      return new Response(JSON.stringify({ success: false, error: "Este link está inativo" }), { status: 403, headers: corsHeaders });
    }

    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      logAccess(supabase, { organization_id: link.organization_id, external_link_id: link.id, school_id: link.school_id, content_type: link.content_type, access_status: "denied", access_type: "link_validation", ip_address: ipAddress, user_agent: userAgent, device_type: deviceType, keyword_valid: false, failure_reason: "link_expired", action_performed: "acesso_negado_link_inativo" });
      return new Response(JSON.stringify({ success: false, error: "Este link expirou" }), { status: 403, headers: corsHeaders });
    }

    // Documentos do Professor e Contratação: acesso direto, sem palavra-chave
    const requiresKeyword = link.content_type !== "documentos_professor"
      && link.content_type !== "professor_contratacao";

    // If action is "info" return link metadata
    if (action === "info") {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            schoolName: link.schools?.nome || "Escola",
            schoolCity: link.schools?.cidade || "",
            contentType: link.content_type,
            requiresKeyword,
          },
        }),
        { headers: corsHeaders }
      );
    }

    // 2. Validate keyword (apenas quando exigido pelo tipo de conteúdo)
    if (requiresKeyword) {
      if (!keyword) {
        return new Response(JSON.stringify({ success: false, error: "Palavra-chave obrigatória" }), { status: 400, headers: corsHeaders });
      }

      const { data: activeKeyword } = await supabase
        .from("quarterly_keywords")
        .select("*")
        .eq("organization_id", link.organization_id)
        .eq("is_active", true)
        .gte("expires_at", new Date().toISOString())
        .lte("starts_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!activeKeyword) {
        logAccess(supabase, { organization_id: link.organization_id, external_link_id: link.id, school_id: link.school_id, content_type: link.content_type, access_status: "denied", access_type: "keyword_validation", ip_address: ipAddress, user_agent: userAgent, device_type: deviceType, keyword_valid: false, failure_reason: "no_active_keyword", action_performed: "acesso_negado_palavra_expirada" });
        return new Response(JSON.stringify({ success: false, error: "Nenhuma palavra-chave ativa no momento. Contate a administração." }), { status: 403, headers: corsHeaders });
      }

      const keywordHash = await hashKeyword(keyword);
      if (keywordHash !== activeKeyword.keyword_hash) {
        logAccess(supabase, { organization_id: link.organization_id, external_link_id: link.id, school_id: link.school_id, content_type: link.content_type, access_status: "denied", access_type: "keyword_validation", ip_address: ipAddress, user_agent: userAgent, device_type: deviceType, keyword_valid: false, failure_reason: "wrong_keyword", action_performed: "acesso_negado_palavra_errada" });
        return new Response(JSON.stringify({ success: false, error: "Palavra-chave incorreta" }), { status: 403, headers: corsHeaders });
      }
    }

    // 3. Keyword valid - fetch official documents or perform secure professor-document mutations
    const scope = link.scope_json || {};

    if (link.content_type === "documentos_professor" && action && action !== "view" && action !== "download") {
      const mutationResult = await handleProfessorDocumentMutation(supabase, link, scope, action, body, ipAddress, userAgent, deviceType);
      return new Response(JSON.stringify(mutationResult.body), { status: mutationResult.status, headers: corsHeaders });
    }

    if (link.content_type === "professor_contratacao" && action && action !== "view" && action !== "download") {
      const mutationResult = await handleHiringMutation(supabase, link, scope, action, body, ipAddress, userAgent, deviceType);
      return new Response(JSON.stringify(mutationResult.body), { status: mutationResult.status, headers: corsHeaders });
    }

    let contentData: any = null;

    if (link.content_type === "planejamentos") {
      contentData = await fetchOfficialPlannings(supabase, link, scope);
    } else if (link.content_type === "notas") {
      contentData = await fetchOfficialGrades(supabase, link, scope);
    } else if (link.content_type === "faltas") {
      contentData = await fetchOfficialAttendance(supabase, link, scope);
    } else if (link.content_type === "documentos_professor") {
      contentData = await fetchProfessorDocuments(supabase, link, scope);
    } else if (link.content_type === "professor_contratacao") {
      contentData = await fetchHiringContent(supabase, link, scope, ipAddress, userAgent, deviceType);
    }

    const listedBoletins =
      link.content_type === "notas" && Array.isArray(contentData?.boletins)
        ? contentData.boletins
        : [];

    listedBoletins.forEach((boletim: any) => {
      logAccess(supabase, {
        organization_id: link.organization_id,
        external_link_id: link.id,
        school_id: link.school_id,
        content_type: link.content_type,
        access_status: "authorized",
        access_type: "list",
        ip_address: ipAddress,
        user_agent: userAgent,
        device_type: deviceType,
        keyword_valid: true,
        failure_reason: null,
        action_performed: `documento_oficial_listado_${boletim?.documentModelUsed || "modelo_boletins"}`,
        document_origin_type: "boletim",
        document_origin_id: boletim?.classGroupId || null,
        document_status_at_access: boletim?.documentStatus || null,
        pdf_viewed: false,
        pdf_downloaded: false,
      });
    });

    const firstListedDocument = listedBoletins[0] || null;
    const isDownloadAction = action === "download";
    const normalizedModel = reportModel === "individual"
      ? "boletim_individual"
      : reportModel === "geral"
        ? "relatorio_geral_turma"
        : null;

    // Log successful access (non-blocking)
    logAccess(supabase, {
      organization_id: link.organization_id,
      external_link_id: link.id,
      school_id: link.school_id,
      content_type: link.content_type,
      access_status: "authorized",
      access_type: isDownloadAction ? "download" : "view",
      ip_address: ipAddress,
      user_agent: userAgent,
      device_type: deviceType,
      keyword_valid: true,
      failure_reason: null,
      action_performed: isDownloadAction
        ? `download_do_pdf_oficial${normalizedModel ? `_${normalizedModel}` : ""}`
        : `visualizacao_do_pdf_oficial${normalizedModel ? `_${normalizedModel}` : ""}`,
      document_origin_type: firstListedDocument ? "boletim" : link.content_type,
      document_origin_id: firstListedDocument?.classGroupId || null,
      document_status_at_access: firstListedDocument?.documentStatus || null,
      pdf_viewed: !isDownloadAction,
      pdf_downloaded: isDownloadAction,
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          schoolName: link.schools?.nome || "Escola",
          schoolCity: link.schools?.cidade || "",
          contentType: link.content_type,
          scope: scope,
          content: contentData,
          accessedAt: new Date().toISOString(),
          linkToken: token,
        },
      }),
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: "Erro interno do servidor" }),
      { status: 500, headers: corsHeaders }
    );
  }
});

async function hashKeyword(keyword: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(keyword.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function logAccess(supabase: any, data: any) {
  try {
    const insertData: any = {
      access_status: data.access_status,
      access_type: data.access_type,
      ip_address: data.ip_address,
      user_agent: data.user_agent,
      device_type: data.device_type,
      keyword_valid: data.keyword_valid,
      failure_reason: data.failure_reason,
      action_performed: data.action_performed,
    };
    if (data.organization_id) insertData.organization_id = data.organization_id;
    if (data.external_link_id) insertData.external_link_id = data.external_link_id;
    if (data.school_id) insertData.school_id = data.school_id;
    if (data.content_type) insertData.content_type = data.content_type;
    if (data.document_origin_type) insertData.document_origin_type = data.document_origin_type;
    if (data.document_origin_id) insertData.document_origin_id = data.document_origin_id;
    if (data.document_status_at_access) insertData.document_status_at_access = data.document_status_at_access;
    if (data.pdf_viewed !== undefined) insertData.pdf_viewed = data.pdf_viewed;
    if (data.pdf_downloaded !== undefined) insertData.pdf_downloaded = data.pdf_downloaded;

    if (insertData.organization_id) {
      await supabase.from("external_access_logs").insert(insertData);

      // Also log denied attempts to audit_events for admin visibility
      if (data.access_status === "denied" && data.failure_reason) {
        await supabase.from("audit_events").insert({
          organization_id: data.organization_id,
          user_id: "00000000-0000-0000-0000-000000000000",
          module: "compartilhamento_externo",
          action: "tentativa_acesso_externo_negado",
          action_result: "denied",
          details: {
            failure_reason: data.failure_reason,
            action_performed: data.action_performed,
            content_type: data.content_type,
            school_id: data.school_id,
            external_link_id: data.external_link_id,
          },
          ip_address: data.ip_address,
          user_agent: data.user_agent,
          device_type: data.device_type,
          school_id: data.school_id || null,
          user_email: null,
          user_name: "Acesso Externo",
          user_role: "externo",
        });
      }
    }
  } catch (e) {
    console.error("Log error:", e);
  }
}

// Fetch official signed plannings with digital signatures
async function fetchOfficialPlannings(supabase: any, link: any, scope: any) {
  let query = supabase
    .from("teacher_plannings")
    .select(`
      id, bimester_number, week_number, status, objective, contents, methodology, resources, evaluation,
      competencies, product, next_steps, professor_signed, coordinator_signed, finalized_at,
      week_start_date, week_end_date,
      professor_id, professors(full_name),
      subject_id, subjects(nome, codigo),
      course_id, courses(nome),
      class_group_id, class_groups(nome),
      school_id, schools(nome)
    `)
    .eq("organization_id", link.organization_id)
    .eq("school_id", link.school_id)
    // Only finalized and signed documents
    .in("status", ["ASSINADO", "CONCLUIDO", "APPROVED"])
    .eq("professor_signed", true)
    .eq("coordinator_signed", true);

  if (scope.course_id) query = query.eq("course_id", scope.course_id);
  if (scope.class_group_id) query = query.eq("class_group_id", scope.class_group_id);
  if (scope.professor_id) query = query.eq("professor_id", scope.professor_id);
  if (scope.subject_id) query = query.eq("subject_id", scope.subject_id);
  if (scope.bimester_number) query = query.eq("bimester_number", scope.bimester_number);

  const { data, error } = await query.order("bimester_number").order("week_number").limit(500);
  if (error || !data?.length) return [];

  // Fetch digital signatures for these plannings
  const planningIds = data.map((p: any) => p.id);
  const { data: signatures } = await supabase
    .from("digital_signatures")
    .select("planning_id, signature_type, signed_at, user_id")
    .in("planning_id", planningIds);

  // Map signatures to plannings
  const sigMap: Record<string, any[]> = {};
  (signatures || []).forEach((sig: any) => {
    if (!sigMap[sig.planning_id]) sigMap[sig.planning_id] = [];
    sigMap[sig.planning_id].push(sig);
  });

  return data.map((p: any) => ({
    ...p,
    signatures: sigMap[p.id] || [],
  }));
}

// Fetch official closed grades structured as boletim (matching internal format)
async function fetchOfficialGrades(supabase: any, link: any, scope: any) {
  // 1. Fetch grade configs (same eligibility base used by internal Boletins)
  let query = supabase
    .from("grade_configurations")
    .select(`
      id, bimester_number, status, average_type,
      subject_id, subjects(nome, codigo),
      course_id, courses(nome),
      class_group_id, class_groups(nome, ano_letivo, course_id),
      school_id, schools(nome, cidade),
      professor_id
    `)
    .eq("organization_id", link.organization_id)
    .eq("school_id", link.school_id);

  if (scope.course_id) query = query.eq("course_id", scope.course_id);
  if (scope.class_group_id) query = query.eq("class_group_id", scope.class_group_id);
  if (scope.professor_id) query = query.eq("professor_id", scope.professor_id);
  if (scope.subject_id) query = query.eq("subject_id", scope.subject_id);
  if (scope.bimester_number) query = query.eq("bimester_number", scope.bimester_number);

  const { data: configs, error } = await query.order("bimester_number").limit(500);
  if (error || !configs?.length) return { boletins: [] };

  // 2. Collect unique class_group_ids
  const classGroupIds = [...new Set(configs.map((c: any) => c.class_group_id))];

  // 3. Fetch enrollments for these class groups
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("student_id, class_group_id, students(id, nome_completo, codigo_matricula)")
    .in("class_group_id", classGroupIds)
    .eq("organization_id", link.organization_id)
    .eq("status", "ativa")
    .limit(1000);

  // 4. Fetch all subjects for the courses involved
  const courseIds = [...new Set(configs.map((c: any) => c.course_id))];
  const { data: allSubjects } = await supabase
    .from("subjects")
    .select("id, nome, nome_boletim, course_id")
    .in("course_id", courseIds)
    .eq("status", "ativo")
    .is("deleted_at", null)
    .order("nome");

  // 5. Fetch grade activities and student grades
  const configIds = configs.map((c: any) => c.id);
  const { data: activities } = await supabase
    .from("grade_activities")
    .select("id, max_score, grade_config_id")
    .in("grade_config_id", configIds);

  const activityIds = (activities || []).map((a: any) => a.id);
  let allGrades: any[] = [];
  for (let i = 0; i < activityIds.length; i += 500) {
    const chunk = activityIds.slice(i, i + 500);
    const { data: grades } = await supabase
      .from("student_grades")
      .select("score, student_id, grade_activity_id")
      .in("grade_activity_id", chunk);
    if (grades) allGrades = allGrades.concat(grades);
  }

  // 6. Fetch academic bimesters for date ranges (for attendance)
  const { data: calendar } = await supabase
    .from("academic_calendars")
    .select("id")
    .eq("organization_id", link.organization_id)
    .eq("status", "ACTIVE")
    .limit(1)
    .maybeSingle();

  let bimesterDates: Record<number, { start: string; end: string }> = {};
  if (calendar) {
    const bimNums = [...new Set(configs.map((c: any) => c.bimester_number))];
    const { data: bimData } = await supabase
      .from("academic_bimesters")
      .select("number, start_date, end_date")
      .eq("calendar_id", calendar.id)
      .in("number", bimNums);
    (bimData || []).forEach((b: any) => {
      bimesterDates[b.number] = { start: b.start_date, end: b.end_date };
    });
  }

  // 7. Fetch attendance records (FALTA) for class groups
  let attendanceRecords: any[] = [];
  for (const cgId of classGroupIds) {
    const { data: att } = await supabase
      .from("attendance_records")
      .select("student_id, subject_id, occurrence_date")
      .eq("organization_id", link.organization_id)
      .eq("class_group_id", cgId)
      .eq("status", "FALTA")
      .limit(1000);
    if (att) attendanceRecords = attendanceRecords.concat(att);
  }

  // 8. Fetch formative tracks for courses
  const { data: coursesWithTracks } = await supabase
    .from("courses")
    .select("id, nome, formative_track_id, formative_tracks(name)")
    .in("id", courseIds);
  const courseTrackMap: Record<string, any> = {};
  (coursesWithTracks || []).forEach((c: any) => { courseTrackMap[c.id] = c; });

  // === BUILD BOLETIM STRUCTURE ===
  // Group by class_group
  const boletins: any[] = [];

  for (const cgId of classGroupIds) {
    const cgConfigs = configs.filter((c: any) => c.class_group_id === cgId);
    if (!cgConfigs.length) continue;

    const cgInfo = cgConfigs[0].class_groups;
    const schoolInfo = cgConfigs[0].schools;
    const courseId = cgConfigs[0].course_id;
    const courseInfo = courseTrackMap[courseId] || cgConfigs[0].courses;
    const bimesterNumbers = [...new Set(cgConfigs.map((c: any) => c.bimester_number as number))].sort() as number[];
    const statusList = [...new Set(cgConfigs.map((c: any) => c.status).filter(Boolean))];
    const documentStatus = statusList.length === 1 ? statusList[0] : statusList.join(", ");

    // Subjects for this course
    const subjects = (allSubjects || []).filter((s: any) => s.course_id === courseId);

    // Students in this class group
    const cgEnrollments = (enrollments || []).filter((e: any) => e.class_group_id === cgId);
    const students = cgEnrollments
      .map((e: any) => ({ id: e.students?.id, nome: e.students?.nome_completo, codigoMatricula: e.students?.codigo_matricula }))
      .filter((s: any) => s.id && s.nome)
      .sort((a: any, b: any) => a.nome.localeCompare(b.nome))
      .map((s: any, idx: number) => ({ ...s, numero: idx + 1 }));

    // Build config lookup: subject_id + bimester_number -> config
    const configLookup: Record<string, any> = {};
    cgConfigs.forEach((c: any) => { configLookup[`${c.subject_id}_${c.bimester_number}`] = c; });

    // Build activity lookup: config_id -> activities
    const actsByConfig: Record<string, any[]> = {};
    (activities || []).forEach((a: any) => {
      if (!actsByConfig[a.grade_config_id]) actsByConfig[a.grade_config_id] = [];
      actsByConfig[a.grade_config_id].push(a);
    });

    // Build grade lookup: activity_id -> student_id -> score
    const gradeLookup: Record<string, Record<string, number>> = {};
    allGrades.forEach((g: any) => {
      if (!gradeLookup[g.grade_activity_id]) gradeLookup[g.grade_activity_id] = {};
      gradeLookup[g.grade_activity_id][g.student_id] = g.score;
    });

    // Build attendance count: student_id -> subject_id -> bimester -> count
    const faltasMap: Record<string, Record<string, Record<number, number>>> = {};
    attendanceRecords.forEach((a: any) => {
      // Find which bimester this date falls in
      for (const bimNum of bimesterNumbers) {
        const dates = bimesterDates[bimNum];
        if (dates && a.occurrence_date >= dates.start && a.occurrence_date <= dates.end) {
          if (!faltasMap[a.student_id]) faltasMap[a.student_id] = {};
          if (!faltasMap[a.student_id][a.subject_id]) faltasMap[a.student_id][a.subject_id] = {};
          faltasMap[a.student_id][a.subject_id][bimNum] = (faltasMap[a.student_id][a.subject_id][bimNum] || 0) + 1;
          break;
        }
      }
    });

    // Compute average for a student in a config
    const computeMedia = (configId: string, studentId: string): number | null => {
      const acts = actsByConfig[configId];
      if (!acts?.length) return null;
      let sum = 0, count = 0;
      acts.forEach((act: any) => {
        const score = gradeLookup[act.id]?.[studentId];
        if (score !== null && score !== undefined) { sum += Number(score); count++; }
      });
      return count > 0 ? Math.round((sum / count) * 10) / 10 : null;
    };

    // Build student data
    const studentsData = students.map((student: any) => {
      const subjectsData = subjects.map((sub: any) => {
        const bimestersData = bimesterNumbers.map((bimNum: number) => {
          const cfg = configLookup[`${sub.id}_${bimNum}`];
          const media = cfg ? computeMedia(cfg.id, student.id) : null;
          const faltas = faltasMap[student.id]?.[sub.id]?.[bimNum] || 0;
          return { number: bimNum, media, faltas };
        });
        const totalFaltas = bimestersData.reduce((s: number, b: any) => s + b.faltas, 0);
        const validMedias = bimestersData.filter((b: any) => b.media !== null).map((b: any) => b.media);
        const mediaFinal = validMedias.length > 0
          ? Math.round((validMedias.reduce((a: number, b: number) => a + b, 0) / validMedias.length) * 10) / 10
          : null;
        return {
          subjectId: sub.id,
          subjectName: sub.nome_boletim || sub.nome,
          bimesters: bimestersData,
          totalFaltas,
          mediaFinal,
        };
      });
      return { id: student.id, nome: student.nome, codigoMatricula: student.codigoMatricula, numero: student.numero, subjects: subjectsData };
    });

    boletins.push({
      classGroupId: cgId,
      school: { nome: schoolInfo?.nome || '', cidade: schoolInfo?.cidade || '' },
      course: { nome: courseInfo?.nome || '', qualificacao: courseInfo?.nome || '' },
      classGroup: { nome: cgInfo?.nome || '', anoLetivo: cgInfo?.ano_letivo || '' },
      formativeTrack: courseInfo?.formative_tracks?.name || '',
      documentStatus,
      documentModelUsed: 'boletim_individual_e_relatorio_geral',
      bimesterNumbers,
      students: studentsData,
      emissionDate: new Date().toLocaleDateString('pt-BR'),
    });
  }

  return { boletins };
}

// Fetch consolidated attendance records
async function fetchOfficialAttendance(supabase: any, link: any, scope: any) {
  const { data: classGroups } = await supabase
    .from("class_groups")
    .select("id, nome, course_id, courses(nome)")
    .eq("school_id", link.school_id)
    .eq("organization_id", link.organization_id);

  if (!classGroups?.length) return [];

  const cgIds = classGroups.map((cg: any) => cg.id);

  let query = supabase
    .from("attendance_records")
    .select(`
      id, occurrence_date, status, start_time,
      professor_id, professors(full_name),
      subject_id, subjects(nome, codigo),
      class_group_id,
      student_id, students(nome_completo, codigo_matricula)
    `)
    .eq("organization_id", link.organization_id)
    .in("class_group_id", cgIds);

  if (scope.class_group_id) query = query.eq("class_group_id", scope.class_group_id);
  if (scope.professor_id) query = query.eq("professor_id", scope.professor_id);
  if (scope.subject_id) query = query.eq("subject_id", scope.subject_id);

  const { data, error } = await query.order("occurrence_date", { ascending: false }).limit(500);
  if (error) return [];

  // Enrich with class group info
  const cgMap: Record<string, any> = {};
  classGroups.forEach((cg: any) => { cgMap[cg.id] = cg; });

  return (data || []).map((r: any) => ({
    ...r,
    class_groups: cgMap[r.class_group_id] || null,
  }));
}

function isValidUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function cleanText(value: unknown, max = 255): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return String(value).slice(0, max);
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function cleanDate(value: unknown): string | null {
  const text = cleanText(value, 20);
  if (!text) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  return text;
}

function cleanProfessorDocumentPatch(input: unknown): Record<string, any> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const patch: Record<string, any> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (!ALLOWED_PROFESSOR_DOCUMENT_FIELDS.has(key)) continue;
    if (BOOLEAN_FIELDS.has(key)) {
      patch[key] = Boolean(value);
    } else if (NUMERIC_FIELDS.has(key)) {
      if (value === null || value === undefined || value === "") patch[key] = null;
      else {
        const n = Number(value);
        patch[key] = Number.isFinite(n) ? n : null;
      }
    } else if (DATE_FIELDS.has(key)) {
      patch[key] = cleanDate(value);
    } else {
      patch[key] = cleanText(value, key === "address" ? 500 : 255);
    }
  }
  return patch;
}

function cleanChildPatch(input: unknown, requireName = false): Record<string, any> | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const source = input as Record<string, unknown>;
  const patch: Record<string, any> = {};
  if ("name" in source || requireName) patch.name = cleanText(source.name, 180);
  if ("birth_date" in source) patch.birth_date = cleanDate(source.birth_date);
  if ("city" in source) patch.city = cleanText(source.city, 120);
  if ("state" in source) patch.state = cleanText(source.state, 2)?.toUpperCase() || null;
  if ("cpf" in source) patch.cpf = cleanText(source.cpf, 20);
  if (requireName && !patch.name) return null;
  return patch;
}

function sanitizeFileName(name: unknown): string {
  const raw = cleanText(name, 180) || "anexo.bin";
  return raw.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function validateFileInput(fileSize: unknown, mimeType: unknown) {
  const size = Number(fileSize);
  const mime = typeof mimeType === "string" ? mimeType : "";
  if (!Number.isFinite(size) || size <= 0 || size > MAX_UPLOAD_SIZE) {
    return { ok: false, error: "Arquivo inválido ou acima do limite de 20MB." };
  }
  const allowed = ALLOWED_MIME_TYPES.includes(mime) || ALLOWED_MIME_PREFIXES.some((p) => mime.startsWith(p));
  if (!allowed) return { ok: false, error: "Apenas PDF ou imagens são permitidos." };
  return { ok: true, error: null };
}

async function handleProfessorDocumentMutation(
  supabase: any,
  link: any,
  scope: any,
  action: string,
  body: any,
  ipAddress: string,
  userAgent: string,
  deviceType: string,
): Promise<{ status: number; body: any }> {
  const professorId = scope.professor_id;
  if (!professorId) return { status: 400, body: { success: false, error: "Link sem professor vinculado" } };

  const { data: professor } = await supabase
    .from("professors")
    .select("id, full_name, cpf, phone, registration_code, specialization, organization_id")
    .eq("id", professorId)
    .eq("organization_id", link.organization_id)
    .maybeSingle();

  if (!professor) return { status: 404, body: { success: false, error: "Professor não encontrado" } };

  const changed = async (actionName: string, extra: Record<string, any> = {}) => {
    logAccess(supabase, {
      organization_id: link.organization_id,
      external_link_id: link.id,
      school_id: link.school_id,
      content_type: link.content_type,
      access_status: "authorized",
      access_type: "edit",
      ip_address: ipAddress,
      user_agent: userAgent,
      device_type: deviceType,
      keyword_valid: true,
      failure_reason: null,
      action_performed: actionName,
      document_origin_type: "documentos_professor",
      document_origin_id: professorId,
      pdf_viewed: false,
      pdf_downloaded: false,
      ...extra,
    });
    const content = await fetchProfessorDocuments(supabase, link, scope);
    return { status: 200, body: { success: true, data: { content } } };
  };

  if (action === "update_professor_document") {
    const patch = cleanProfessorDocumentPatch(body.patch);
    if (Object.keys(patch).length === 0) return { status: 400, body: { success: false, error: "Nenhum campo válido para salvar" } };

    const { data: existing } = await supabase.from("professor_documents").select("id").eq("professor_id", professorId).maybeSingle();
    const payload = { ...patch, professor_id: professorId, organization_id: link.organization_id };
    const result = existing?.id
      ? await supabase.from("professor_documents").update(payload).eq("id", existing.id).eq("professor_id", professorId)
      : await supabase.from("professor_documents").insert(payload);
    if (result.error) return { status: 400, body: { success: false, error: result.error.message } };

    const mirror: Record<string, any> = {};
    if ("cpf" in patch) mirror.cpf = patch.cpf;
    if ("phone" in patch) mirror.phone = patch.phone;
    if ("registration_code" in patch) mirror.registration_code = patch.registration_code;
    if ("specialization" in patch) mirror.specialization = patch.specialization;
    if ("full_name" in patch && patch.full_name) mirror.full_name = patch.full_name;
    if (Object.keys(mirror).length > 0) {
      await supabase.from("professors").update(mirror).eq("id", professorId).eq("organization_id", link.organization_id);
    }

    return changed("edicao_externa_documentos_professor");
  }

  if (action === "add_professor_child") {
    const child = cleanChildPatch(body.child, true);
    if (!child) return { status: 400, body: { success: false, error: "Nome do filho/dependente é obrigatório" } };
    const { error } = await supabase.from("professor_children").insert({ ...child, professor_id: professorId, organization_id: link.organization_id });
    if (error) return { status: 400, body: { success: false, error: error.message } };
    return changed("edicao_externa_adicionou_dependente");
  }

  if (action === "update_professor_child") {
    if (!isValidUuid(body.childId)) return { status: 400, body: { success: false, error: "Dependente inválido" } };
    const patch = cleanChildPatch(body.patch, false);
    if (!patch || Object.keys(patch).length === 0) return { status: 400, body: { success: false, error: "Nenhum campo válido para salvar" } };
    const { error } = await supabase.from("professor_children").update(patch).eq("id", body.childId).eq("professor_id", professorId).eq("organization_id", link.organization_id);
    if (error) return { status: 400, body: { success: false, error: error.message } };
    return changed("edicao_externa_atualizou_dependente");
  }

  if (action === "delete_professor_child") {
    if (!isValidUuid(body.childId)) return { status: 400, body: { success: false, error: "Dependente inválido" } };
    const { error } = await supabase.from("professor_children").delete().eq("id", body.childId).eq("professor_id", professorId).eq("organization_id", link.organization_id);
    if (error) return { status: 400, body: { success: false, error: error.message } };
    return changed("edicao_externa_removeu_dependente");
  }

  if (action === "create_professor_file_upload") {
    const validation = validateFileInput(body.fileSize, body.mimeType);
    if (!validation.ok) return { status: 400, body: { success: false, error: validation.error } };
    const category = sanitizeFileName(body.category || "outros").slice(0, 80);
    const safeName = `${Date.now()}_${crypto.randomUUID()}_${sanitizeFileName(body.fileName)}`;
    const filePath = `${link.organization_id}/${professorId}/${category}/${safeName}`;
    const { data, error } = await supabase.storage.from("professor-documents").createSignedUploadUrl(filePath);
    if (error) return { status: 400, body: { success: false, error: error.message } };
    return { status: 200, body: { success: true, data: { filePath, uploadToken: data?.token } } };
  }

  if (action === "register_professor_file") {
    const validation = validateFileInput(body.fileSize, body.mimeType);
    if (!validation.ok) return { status: 400, body: { success: false, error: validation.error } };
    const filePath = cleanText(body.filePath, 700);
    const prefix = `${link.organization_id}/${professorId}/`;
    if (!filePath || !filePath.startsWith(prefix)) return { status: 400, body: { success: false, error: "Caminho de arquivo inválido" } };
    const { error } = await supabase.from("professor_document_files").insert({
      professor_id: professorId,
      organization_id: link.organization_id,
      category: sanitizeFileName(body.category || "outros").slice(0, 80),
      file_name: sanitizeFileName(body.fileName),
      file_path: filePath,
      file_size: Number(body.fileSize),
      mime_type: cleanText(body.mimeType, 120),
      uploaded_by: null,
    });
    if (error) return { status: 400, body: { success: false, error: error.message } };
    return changed("edicao_externa_enviou_anexo");
  }

  if (action === "delete_professor_file") {
    if (!isValidUuid(body.fileId)) return { status: 400, body: { success: false, error: "Anexo inválido" } };
    const { data: file } = await supabase.from("professor_document_files").select("id, file_path").eq("id", body.fileId).eq("professor_id", professorId).eq("organization_id", link.organization_id).maybeSingle();
    if (!file) return { status: 404, body: { success: false, error: "Anexo não encontrado" } };
    await supabase.storage.from("professor-documents").remove([file.file_path]);
    const { error } = await supabase.from("professor_document_files").delete().eq("id", file.id).eq("professor_id", professorId);
    if (error) return { status: 400, body: { success: false, error: error.message } };
    return changed("edicao_externa_removeu_anexo");
  }

  if (action === "get_professor_file_url") {
    const filePath = cleanText(body.filePath, 700);
    const prefix = `${link.organization_id}/${professorId}/`;
    if (!filePath || !filePath.startsWith(prefix)) return { status: 400, body: { success: false, error: "Caminho de arquivo inválido" } };
    const { data: file } = await supabase.from("professor_document_files").select("id").eq("file_path", filePath).eq("professor_id", professorId).eq("organization_id", link.organization_id).maybeSingle();
    if (!file) return { status: 404, body: { success: false, error: "Anexo não encontrado" } };
    const { data, error } = await supabase.storage.from("professor-documents").createSignedUrl(filePath, 86400);
    if (error) return { status: 400, body: { success: false, error: error.message } };
    return { status: 200, body: { success: true, data: { signedUrl: data?.signedUrl || null } } };
  }

  return { status: 400, body: { success: false, error: "Ação inválida" } };
}

async function fetchProfessorDocuments(supabase: any, link: any, scope: any) {
  const professorId = scope.professor_id;
  if (!professorId) return { professor: null, doc: null, children: [], files: [], medicalReports: [] };

  const [profRes, docRes, childrenRes, filesRes, medicalRes] = await Promise.all([
    supabase.from("professors")
      .select("id, full_name, cpf, registration_code, phone, specialization, status, organization_id, created_at")
      .eq("id", professorId)
      .eq("organization_id", link.organization_id)
      .maybeSingle(),
    supabase.from("professor_documents").select("*").eq("professor_id", professorId).maybeSingle(),
    supabase.from("professor_children").select("*").eq("professor_id", professorId).order("created_at"),
    supabase.from("professor_document_files").select("*").eq("professor_id", professorId).order("uploaded_at", { ascending: false }),
    supabase.from("professor_medical_reports").select("*").eq("professor_id", professorId).order("created_at", { ascending: false }),
  ]);

  // Generate signed URLs (24h) for attachments and medical reports
  const filesWithUrls = await Promise.all(
    (filesRes.data || []).map(async (f: any) => {
      try {
        const { data } = await supabase.storage.from("professor-documents").createSignedUrl(f.file_path, 86400);
        return { ...f, signedUrl: data?.signedUrl || null };
      } catch {
        return { ...f, signedUrl: null };
      }
    })
  );

  const medicalWithUrls = await Promise.all(
    (medicalRes.data || []).map(async (m: any) => {
      try {
        const { data } = await supabase.storage.from("professor-documents").createSignedUrl(m.file_path, 86400);
        return { ...m, signedUrl: data?.signedUrl || null };
      } catch {
        return { ...m, signedUrl: null };
      }
    })
  );

  return {
    professor: profRes.data || null,
    doc: docRes.data || null,
    children: childrenRes.data || [],
    files: filesWithUrls,
    medicalReports: medicalWithUrls,
  };
}

// =============================================================
// HIRING (Aptos para Contratação) — professor_contratacao
// =============================================================

async function fetchHiringContent(
  supabase: any,
  link: any,
  scope: any,
  ipAddress: string,
  userAgent: string,
  deviceType: string,
) {
  const professorId = scope.professor_id;
  const candidateId = scope.candidate_id;
  if (!professorId || !candidateId) {
    return { professor: null, candidate: null, documents: [] };
  }

  const [profRes, candRes, docsRes] = await Promise.all([
    supabase.from("professors")
      .select("id, full_name, cpf, registration_code, phone, organization_id")
      .eq("id", professorId).maybeSingle(),
    supabase.from("hr_hiring_candidates")
      .select("id, status, sent_at, notes")
      .eq("id", candidateId).maybeSingle(),
    supabase.from("hr_hiring_documents")
      .select("*")
      .eq("candidate_id", candidateId)
      .is("deleted_at", null)
      .order("uploaded_at", { ascending: true }),
  ]);

  const all = docsRes.data || [];
  const originals = all.filter((d: any) => d.kind === "ORIGINAL");
  const signedByParent = new Map<string, any>();
  all.filter((d: any) => d.kind === "ASSINADO").forEach((d: any) => {
    if (d.parent_document_id) signedByParent.set(d.parent_document_id, d);
  });

  const documents = await Promise.all(originals.map(async (orig: any) => {
    const { data: signed } = await supabase.storage
      .from("hiring-documents")
      .createSignedUrl(orig.file_path, 300);
    const signedDoc = signedByParent.get(orig.id) || null;
    let signedUrl = null;
    if (signedDoc) {
      const { data } = await supabase.storage
        .from("hiring-documents")
        .createSignedUrl(signedDoc.file_path, 300);
      signedUrl = data?.signedUrl || null;
    }
    return {
      id: orig.id,
      doc_kind: orig.doc_kind,
      title: orig.title,
      file_name: orig.file_name,
      file_size: orig.file_size,
      uploaded_at: orig.uploaded_at,
      original_url: signed?.signedUrl || null,
      signed: signedDoc ? {
        id: signedDoc.id,
        file_name: signedDoc.file_name,
        uploaded_at: signedDoc.uploaded_at,
        url: signedUrl,
      } : null,
    };
  }));

  return {
    professor: profRes.data || null,
    candidate: candRes.data || null,
    documents,
  };
}

async function handleHiringMutation(
  supabase: any,
  link: any,
  scope: any,
  action: string,
  body: any,
  ipAddress: string,
  userAgent: string,
  deviceType: string,
): Promise<{ status: number; body: any }> {
  const professorId = scope.professor_id;
  const candidateId = scope.candidate_id;
  if (!professorId || !candidateId) {
    return { status: 400, body: { success: false, error: "Link sem candidato vinculado" } };
  }

  // Verifica candidato pertence ao link/org
  const { data: candidate } = await supabase
    .from("hr_hiring_candidates")
    .select("id, organization_id, professor_id, status")
    .eq("id", candidateId)
    .eq("organization_id", link.organization_id)
    .eq("professor_id", professorId)
    .maybeSingle();
  if (!candidate) {
    return { status: 404, body: { success: false, error: "Candidato não encontrado" } };
  }

  const refreshAndLog = async (actionName: string, payload: Record<string, any> = {}, event = "SIGNED_DOC_RECEIVED") => {
    await supabase.from("hr_hiring_audit_logs").insert({
      organization_id: link.organization_id,
      candidate_id: candidateId,
      professor_id: professorId,
      actor_user_id: null,
      actor_label: "Professor via link externo",
      event,
      payload: { ...payload, ip: ipAddress, user_agent: userAgent, device: deviceType },
    });
    logAccess(supabase, {
      organization_id: link.organization_id,
      external_link_id: link.id,
      school_id: link.school_id,
      content_type: link.content_type,
      access_status: "authorized",
      access_type: "edit",
      ip_address: ipAddress,
      user_agent: userAgent,
      device_type: deviceType,
      keyword_valid: true,
      failure_reason: null,
      action_performed: actionName,
      document_origin_type: "professor_contratacao",
      document_origin_id: candidateId,
      pdf_viewed: false,
      pdf_downloaded: false,
    });
    const content = await fetchHiringContent(supabase, link, scope, ipAddress, userAgent, deviceType);
    return { status: 200, body: { success: true, data: { content } } };
  };

  if (action === "log_download") {
    const docId = body.documentId;
    logAccess(supabase, {
      organization_id: link.organization_id,
      external_link_id: link.id,
      school_id: link.school_id,
      content_type: link.content_type,
      access_status: "authorized",
      access_type: "download",
      ip_address: ipAddress,
      user_agent: userAgent,
      device_type: deviceType,
      keyword_valid: true,
      failure_reason: null,
      action_performed: "download_documento_contratacao_original",
      document_origin_type: "professor_contratacao",
      document_origin_id: docId,
      pdf_viewed: false,
      pdf_downloaded: true,
    });
    await supabase.from("hr_hiring_audit_logs").insert({
      organization_id: link.organization_id,
      candidate_id: candidateId,
      professor_id: professorId,
      actor_label: "Professor via link externo",
      event: "EXTERNAL_DOWNLOAD",
      payload: { document_id: docId, ip: ipAddress, user_agent: userAgent },
    });
    return { status: 200, body: { success: true } };
  }

  if (action === "upload_signed") {
    const parentId = body.parentDocumentId;
    const fileBase64: string | undefined = body.fileBase64;
    const fileName: string = body.fileName || "assinado.pdf";
    const fileSize: number = Number(body.fileSize || 0);
    const mimeType: string = body.mimeType || "application/pdf";

    if (!isValidUuid(parentId)) return { status: 400, body: { success: false, error: "Documento original inválido" } };
    if (!fileBase64) return { status: 400, body: { success: false, error: "Arquivo ausente" } };
    if (mimeType !== "application/pdf") return { status: 400, body: { success: false, error: "Apenas PDF é permitido" } };
    if (fileSize > MAX_UPLOAD_SIZE) return { status: 400, body: { success: false, error: "Arquivo excede o tamanho máximo" } };

    const { data: parent } = await supabase
      .from("hr_hiring_documents")
      .select("id, candidate_id, professor_id, organization_id, doc_kind, title, version, file_path")
      .eq("id", parentId).maybeSingle();
    if (!parent || parent.candidate_id !== candidateId || parent.organization_id !== link.organization_id) {
      return { status: 404, body: { success: false, error: "Documento original não encontrado" } };
    }

    // decode base64
    const bin = Uint8Array.from(atob(fileBase64.replace(/^data:[^;]+;base64,/, "")), c => c.charCodeAt(0));
    if (bin.byteLength > MAX_UPLOAD_SIZE) return { status: 400, body: { success: false, error: "Arquivo excede o tamanho máximo" } };

    const newId = crypto.randomUUID();
    const safeName = sanitizeFileName(fileName).slice(0, 120);
    const filePath = `${link.organization_id}/${professorId}/${candidateId}/${newId}_ASSINADO.pdf`;
    const { error: upErr } = await supabase.storage
      .from("hiring-documents")
      .upload(filePath, bin, { contentType: "application/pdf", upsert: false });
    if (upErr) return { status: 400, body: { success: false, error: upErr.message } };

    const { error: insErr } = await supabase.from("hr_hiring_documents").insert({
      id: newId,
      candidate_id: candidateId,
      organization_id: link.organization_id,
      professor_id: professorId,
      doc_kind: parent.doc_kind,
      title: parent.title,
      version: (parent.version || 1) + 1,
      kind: "ASSINADO",
      parent_document_id: parent.id,
      file_path: filePath,
      file_name: safeName,
      file_size: bin.byteLength,
      mime_type: "application/pdf",
      uploaded_by: null,
      external_link_id: link.id,
      external_ip: ipAddress,
    });
    if (insErr) {
      await supabase.storage.from("hiring-documents").remove([filePath]);
      return { status: 400, body: { success: false, error: insErr.message } };
    }

    // Status do candidato é recalculado automaticamente pelo trigger
    // trg_hr_hiring_docs_recompute (compute_hiring_status), que também
    // grava o evento STATUS_CHANGED em hr_hiring_audit_logs.


    return refreshAndLog("upload_externo_documento_assinado", { document_id: newId, parent_document_id: parent.id });
  }

  return { status: 400, body: { success: false, error: "Ação inválida" } };
}
