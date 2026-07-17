import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";
import jsPDF from "npm:jspdf@2.5.2";
import autoTable from "npm:jspdf-autotable@3.8.4";

interface BimesterGrade {
  number: number;
  media: number | null;
  faltas: number;
}

interface StudentSubjectData {
  subjectId: string;
  subjectName: string;
  bimesters: BimesterGrade[];
  totalFaltas: number;
  mediaFinal: number | null;
}

interface StudentBoletimData {
  id: string;
  nome: string;
  codigoMatricula: string;
  numero: number;
  subjects: StudentSubjectData[];
}

interface BoletimData {
  school: { nome: string; endereco: string; cidade: string };
  course: { nome: string; qualificacao: string };
  classGroup: { nome: string; anoLetivo: string };
  formativeTrack: string;
  students: StudentBoletimData[];
  emissionDate: string;
}

function addStudentPage(doc: any, student: StudentBoletimData, data: BoletimData, isFirst: boolean) {
  if (!isFirst) doc.addPage("a4", "landscape");

  const pageW = doc.internal.pageSize.getWidth();
  const margin = 12;
  let y = margin;

  doc.setFillColor(124, 58, 237);
  doc.rect(0, 0, pageW, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Neovale - Gestão Acadêmica", margin, 10);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("BOLETIM ESCOLAR (PARCIAL)", margin, 17);
  doc.text(`Emitido em: ${data.emissionDate}`, pageW - margin, 10, { align: "right" });
  y = 28;

  doc.setTextColor(60, 60, 60);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");

  const info: [string, string][] = [
    ["Id", student.codigoMatricula],
    ["Nome", student.nome],
    ["Nº", String(student.numero)],
    ["Curso", data.course.nome],
    ["Turma", data.classGroup.nome],
    ["Qualificação", data.course.qualificacao],
    ["Ano Letivo", data.classGroup.anoLetivo],
  ];
  if (data.formativeTrack) info.push(["Itinerário", data.formativeTrack]);

  const colW = (pageW - 2 * margin) / 3;
  info.forEach((item, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = margin + col * colW;
    const iy = y + row * 6;
    doc.setFont("helvetica", "bold");
    doc.text(`${item[0]}: `, x, iy);
    const labelW = doc.getTextWidth(`${item[0]}: `);
    doc.setFont("helvetica", "normal");
    doc.text(item[1], x + labelW, iy);
  });
  y += Math.ceil(info.length / 3) * 6 + 4;

  const bimNums = student.subjects[0]?.bimesters.map((b) => b.number) || [];
  const headerRow1: string[] = ["Unidade Curricular"];
  bimNums.forEach((n) => { headerRow1.push(`${n}º Bim`, ""); });
  headerRow1.push("Total Faltas", "Média Final");

  const headerRow2: string[] = [""];
  bimNums.forEach(() => { headerRow2.push("Méd.", "Falta"); });
  headerRow2.push("", "");

  const body: string[][] = student.subjects.map((sub) => {
    const row: string[] = [sub.subjectName];
    sub.bimesters.forEach((bim) => {
      row.push(bim.media !== null ? bim.media.toFixed(1) : "-");
      row.push(String(bim.faltas || 0));
    });
    row.push(String(sub.totalFaltas));
    row.push(sub.mediaFinal !== null ? sub.mediaFinal.toFixed(1) : "-");
    return row;
  });

  const totalCols = 1 + bimNums.length * 2 + 2;
  const subjectColW = 55;
  const dataCellW = (pageW - 2 * margin - subjectColW) / (totalCols - 1);
  const colStyles: Record<number, { cellWidth: number; halign: string }> = {
    0: { cellWidth: subjectColW, halign: "left" },
  };
  for (let i = 1; i < totalCols; i++) {
    colStyles[i] = { cellWidth: dataCellW, halign: "center" };
  }

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [headerRow1, headerRow2],
    body,
    styles: { fontSize: 7, cellPadding: 1.5, lineColor: [200, 200, 200], lineWidth: 0.2 },
    headStyles: { fillColor: [240, 240, 245], textColor: [60, 60, 60], fontStyle: "bold", halign: "center" },
    columnStyles: colStyles,
    didParseCell(hookData: any) {
      if (hookData.section === "body" && hookData.column.index > 0) {
        const val = parseFloat(hookData.cell.raw as string);
        if (!isNaN(val) && val < 6) {
          hookData.cell.styles.textColor = [220, 38, 38];
          hookData.cell.styles.fontStyle = "bold";
        }
      }
    },
  });

  const pageH = doc.internal.pageSize.getHeight();
  doc.setFontSize(7);
  doc.setTextColor(140, 140, 140);
  doc.text(`${data.school.nome} — ${data.school.cidade}`, pageW / 2, pageH - 6, { align: "center" });
}

function generateRelatorioGeralDoc(doc: any, data: BoletimData) {
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 12;

  doc.setFillColor(124, 58, 237);
  doc.rect(0, 0, pageW, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Neovale - Gestão Acadêmica", margin, 10);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("RELATÓRIO GERAL DA TURMA", margin, 17);
  doc.text(`Emitido em: ${data.emissionDate}`, pageW - margin, 10, { align: "right" });

  doc.setTextColor(60, 60, 60);
  doc.setFontSize(9);
  let y = 28;
  doc.setFont("helvetica", "bold");
  doc.text("Escola: ", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.school.nome, margin + doc.getTextWidth("Escola: "), y);
  doc.setFont("helvetica", "bold");
  doc.text("Curso: ", margin + 100, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.course.nome, margin + 100 + doc.getTextWidth("Curso: "), y);
  doc.setFont("helvetica", "bold");
  doc.text("Turma: ", margin + 200, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.classGroup.nome, margin + 200 + doc.getTextWidth("Turma: "), y);
  y += 8;

  const subjectMap = new Map<string, string>();
  data.students.forEach((st) => st.subjects.forEach((sub) => subjectMap.set(sub.subjectId, sub.subjectName)));
  const subjects = Array.from(subjectMap.entries());

  const head: string[] = ["Nº", "Nome"];
  subjects.forEach(([, name]) => {
    head.push(name.length > 12 ? name.substring(0, 12) + "…" : name);
    head.push("Flt");
  });
  head.push("Média Geral");

  const body: string[][] = data.students.map((st) => {
    const row: string[] = [String(st.numero), st.nome];
    subjects.forEach(([subId]) => {
      const sub = st.subjects.find((s) => s.subjectId === subId);
      row.push(sub?.mediaFinal !== null && sub?.mediaFinal !== undefined ? sub.mediaFinal.toFixed(1) : "-");
      row.push(String(sub?.totalFaltas ?? 0));
    });
    const finals = st.subjects.map((s) => s.mediaFinal).filter((v): v is number => v !== null);
    const avg = finals.length > 0 ? finals.reduce((a, b) => a + b, 0) / finals.length : null;
    row.push(avg !== null ? avg.toFixed(1) : "-");
    return row;
  });

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [head],
    body,
    styles: { fontSize: 6, cellPadding: 1.2, lineColor: [200, 200, 200], lineWidth: 0.2, overflow: "ellipsize" },
    headStyles: { fillColor: [240, 240, 245], textColor: [60, 60, 60], fontStyle: "bold", halign: "center", fontSize: 5.5 },
    columnStyles: { 0: { cellWidth: 8, halign: "center" }, 1: { cellWidth: 35, halign: "left" } },
    didParseCell(hookData: any) {
      if (hookData.section === "body" && hookData.column.index >= 2) {
        const val = parseFloat(hookData.cell.raw as string);
        if (!isNaN(val) && val < 6) {
          hookData.cell.styles.textColor = [220, 38, 38];
          hookData.cell.styles.fontStyle = "bold";
        }
      }
    },
  });

  const pageH = doc.internal.pageSize.getHeight();
  doc.setFontSize(7);
  doc.setTextColor(140, 140, 140);
  doc.text(`${data.school.nome} — ${data.school.cidade}`, pageW / 2, pageH - 6, { align: "center" });
}

async function fetchBoletimData(
  supabaseAdmin: ReturnType<typeof createClient>,
  organizationId: string,
  schoolId: string,
  courseId: string,
  classGroupId: string,
  bimesters: number[],
  studentId?: string,
): Promise<BoletimData> {
  const [schoolRes, courseRes, classGroupRes, enrollmentsRes, subjectsRes, calendarRes] = await Promise.all([
    supabaseAdmin.from("schools").select("nome, endereco, cidade").eq("id", schoolId).single(),
    supabaseAdmin.from("courses").select("nome, formative_track_id, formative_tracks:formative_track_id(name)").eq("id", courseId).single(),
    supabaseAdmin.from("class_groups").select("nome, ano_letivo").eq("id", classGroupId).single(),
    supabaseAdmin.from("enrollments").select("student_id, students:student_id(id, nome_completo, codigo_matricula)").eq("class_group_id", classGroupId).eq("status", "ativa"),
    supabaseAdmin.from("subjects").select("id, nome, nome_boletim, semester").eq("course_id", courseId).eq("status", "ativo").is("deleted_at", null).order("nome"),
    supabaseAdmin.from("academic_calendars").select("id").eq("organization_id", organizationId).eq("status", "ACTIVE").limit(1).single(),
  ]);

  const school = schoolRes.data;
  const course = courseRes.data as any;
  const classGroup = classGroupRes.data;
  const subjects = subjectsRes.data || [];

  // ANP marker: subject is ANP if any class_subject_modality row has ch_anp > 0
  const subjectIds = subjects.map((s: any) => s.id);
  const anpSubjectIds = new Set<string>();
  if (subjectIds.length > 0) {
    const { data: anpRows } = await supabaseAdmin
      .from("class_subject_modality").select("subject_id")
      .in("subject_id", subjectIds).gt("ch_anp", 0);
    (anpRows || []).forEach((r: any) => anpSubjectIds.add(r.subject_id));
  }

  let allStudents = (enrollmentsRes.data || [])
    .map((e: any) => ({ id: e.students?.id, nome: e.students?.nome_completo, codigoMatricula: e.students?.codigo_matricula }))
    .filter((s: any) => s.id && s.nome)
    .sort((a: any, b: any) => a.nome.localeCompare(b.nome))
    .map((s: any, idx: number) => ({ ...s, numero: idx + 1 }));

  if (studentId) allStudents = allStudents.filter((s: any) => s.id === studentId);

  let bimesterDates: Record<number, { start: string; end: string }> = {};
  if (calendarRes.data) {
    const { data: bimData } = await supabaseAdmin
      .from("academic_bimesters").select("number, start_date, end_date")
      .eq("calendar_id", calendarRes.data.id).in("number", bimesters).order("number");
    (bimData || []).forEach((b: any) => { bimesterDates[b.number] = { start: b.start_date, end: b.end_date }; });
  }

  const { data: gradeConfigs } = await supabaseAdmin
    .from("grade_configurations").select("id, subject_id, bimester_number")
    .eq("class_group_id", classGroupId).in("bimester_number", bimesters);

  const configIds = (gradeConfigs || []).map((gc: any) => gc.id);
  const activitiesByConfig: Record<string, any[]> = {};
  if (configIds.length > 0) {
    const { data: activities } = await supabaseAdmin
      .from("grade_activities").select("id, grade_config_id, max_score")
      .in("grade_config_id", configIds);
    (activities || []).forEach((a: any) => {
      if (!activitiesByConfig[a.grade_config_id]) activitiesByConfig[a.grade_config_id] = [];
      activitiesByConfig[a.grade_config_id].push(a);
    });
  }

  const allActivityIds = Object.values(activitiesByConfig).flat().map((a: any) => a.id);
  const gradesByActivityStudent: Record<string, Record<string, number | null>> = {};
  if (allActivityIds.length > 0) {
    for (let i = 0; i < allActivityIds.length; i += 500) {
      const chunk = allActivityIds.slice(i, i + 500);
      const { data: gradesData } = await supabaseAdmin
        .from("student_grades").select("grade_activity_id, student_id, score")
        .in("grade_activity_id", chunk);
      (gradesData || []).forEach((g: any) => {
        if (!gradesByActivityStudent[g.grade_activity_id]) gradesByActivityStudent[g.grade_activity_id] = {};
        gradesByActivityStudent[g.grade_activity_id][g.student_id] = g.score;
      });
    }
  }

  const studentIds = allStudents.map((s: any) => s.id);
  const faltasMap: Record<string, Record<string, Record<number, number>>> = {};
  if (studentIds.length > 0) {
    for (const bim of bimesters) {
      const dates = bimesterDates[bim];
      if (!dates) continue;
      const { data: attendanceData } = await supabaseAdmin
        .from("attendance_records").select("student_id, subject_id")
        .eq("class_group_id", classGroupId).eq("status", "FALTA")
        .gte("occurrence_date", dates.start).lte("occurrence_date", dates.end);
      (attendanceData || []).forEach((a: any) => {
        if (!faltasMap[a.student_id]) faltasMap[a.student_id] = {};
        if (!faltasMap[a.student_id][a.subject_id]) faltasMap[a.student_id][a.subject_id] = {};
        faltasMap[a.student_id][a.subject_id][bim] = (faltasMap[a.student_id][a.subject_id][bim] || 0) + 1;
      });
    }
  }

  const configMap: Record<string, any> = {};
  (gradeConfigs || []).forEach((gc: any) => { configMap[`${gc.subject_id}_${gc.bimester_number}`] = gc; });

  const computeMedia = (configId: string, sid: string): number | null => {
    const acts = activitiesByConfig[configId];
    if (!acts || acts.length === 0) return null;
    let sum = 0, count = 0;
    acts.forEach((act: any) => {
      const score = gradesByActivityStudent[act.id]?.[sid];
      if (score !== null && score !== undefined) { sum += Number(score); count++; }
    });
    return count === 0 ? null : Math.round((sum / count) * 10) / 10;
  };

  const subjectsByDisplayName: Record<string, { displayName: string; subjectsBySemester: Record<string, any> }> = {};
  subjects.forEach((sub: any) => {
    const displayName = sub.nome_boletim || sub.nome;
    if (!subjectsByDisplayName[displayName]) subjectsByDisplayName[displayName] = { displayName, subjectsBySemester: {} };
    subjectsByDisplayName[displayName].subjectsBySemester[sub.semester || "FIRST"] = sub;
  });
  const mergedSubjects = Object.values(subjectsByDisplayName);

  const studentsData: StudentBoletimData[] = allStudents.map((student: any) => {
    const subjectsData: StudentSubjectData[] = mergedSubjects.map((merged) => {
      const bimestersData: BimesterGrade[] = bimesters.map((bimNum) => {
        const semester = bimNum <= 2 ? "FIRST" : "SECOND";
        const sub = merged.subjectsBySemester[semester] || merged.subjectsBySemester["FIRST"] || merged.subjectsBySemester["SECOND"];
        if (!sub) return { number: bimNum, media: null, faltas: 0 };
        const cfg = configMap[`${sub.id}_${bimNum}`];
        const media = cfg ? computeMedia(cfg.id, student.id) : null;
        const faltas = faltasMap[student.id]?.[sub.id]?.[bimNum] || 0;
        return { number: bimNum, media, faltas };
      });
      const totalFaltas = bimestersData.reduce((s, b) => s + b.faltas, 0);
      const validMedias = bimestersData.filter((b) => b.media !== null).map((b) => b.media!);
      const mediaFinal = validMedias.length > 0 ? Math.round((validMedias.reduce((a, b) => a + b, 0) / validMedias.length) * 10) / 10 : null;
      const anySubject = merged.subjectsBySemester["FIRST"] || merged.subjectsBySemester["SECOND"];
      const isAnp = Object.values(merged.subjectsBySemester).some((s: any) => s?.id && anpSubjectIds.has(s.id));
      const subjectName = isAnp ? `${merged.displayName} (ANP)` : merged.displayName;
      return { subjectId: anySubject?.id || "", subjectName, bimesters: bimestersData, totalFaltas, mediaFinal };
    });
    return { id: student.id, nome: student.nome, codigoMatricula: student.codigoMatricula, numero: student.numero, subjects: subjectsData };
  });

  return {
    school: { nome: school?.nome || "", endereco: school?.endereco || "", cidade: school?.cidade || "" },
    course: { nome: course?.nome || "", qualificacao: course?.nome || "" },
    classGroup: { nome: classGroup?.nome || "", anoLetivo: classGroup?.ano_letivo || "" },
    formativeTrack: (course?.formative_tracks as any)?.name || "",
    students: studentsData,
    emissionDate: new Date().toLocaleDateString("pt-BR"),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Validate token
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claimsData.claims.sub;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get user's organization
    const { data: userRole } = await supabaseAdmin
      .from("user_roles").select("organization_id, role")
      .eq("user_id", userId).limit(1).single();

    if (!userRole) {
      return new Response(JSON.stringify({ error: "No organization found" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { schoolId, courseId, classGroupId, bimesters, reportType, studentId } = body;

    if (!schoolId || !courseId || !classGroupId || !bimesters?.length) {
      return new Response(JSON.stringify({ error: "Missing required fields: schoolId, courseId, classGroupId, bimesters" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const organizationId = userRole.organization_id;

    // Fetch data and generate PDF
    const data = await fetchBoletimData(supabaseAdmin, organizationId, schoolId, courseId, classGroupId, bimesters, studentId);

    if (data.students.length === 0) {
      return new Response(JSON.stringify({ error: "No students found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

    if (reportType === "relatorio_geral") {
      generateRelatorioGeralDoc(doc, data);
    } else {
      data.students.forEach((student, idx) => {
        addStudentPage(doc, student, data, idx === 0);
      });
    }

    // Get PDF as buffer
    const pdfBuffer = doc.output("arraybuffer");

    // Upload to storage
    const timestamp = Date.now();
    const safeName = (data.classGroup.nome || "turma").replace(/\s+/g, "_");
    const fileName = reportType === "relatorio_geral"
      ? `${organizationId}/relatorio_geral_${safeName}_${timestamp}.pdf`
      : studentId
        ? `${organizationId}/boletim_${(data.students[0]?.nome || "aluno").replace(/\s+/g, "_")}_${timestamp}.pdf`
        : `${organizationId}/boletim_turma_${safeName}_${timestamp}.pdf`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("boletins-pdf")
      .upload(fileName, pdfBuffer, { contentType: "application/pdf", upsert: true });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(JSON.stringify({ error: "Failed to upload PDF" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Create signed URL (valid for 1 hour)
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from("boletins-pdf")
      .createSignedUrl(fileName, 3600);

    if (signedUrlError) {
      return new Response(JSON.stringify({ error: "Failed to create download URL" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({
      success: true,
      downloadUrl: signedUrlData.signedUrl,
      fileName: fileName.split("/").pop(),
      studentCount: data.students.length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });

  } catch (err: any) {
    console.error("Error generating PDF:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
