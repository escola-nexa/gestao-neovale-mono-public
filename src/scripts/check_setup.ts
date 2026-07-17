import { supabase } from '@/integrations/supabase/client';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars manually
const envPath = path.resolve(__dirname, '../../.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars: Record<string, string> = {};

envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSetup() {
  console.log('--- Checking Complete Setup ---\n');

  // 1. Check weekly models
  const { data: models, error: modelsError } = await supabase
    .from('weekly_teaching_models')
    .select(`
      *,
      professors:professor_id (full_name),
      subjects:subject_id (nome, semester),
      class_groups:class_group_id (nome)
    `);

  if (modelsError) {
    console.error('Error fetching models:', modelsError);
    return;
  }

  console.log(`Total weekly teaching models: ${models?.length || 0}\n`);

  if (!models || models.length === 0) {
    console.log('❌ No weekly teaching models found. You need to create schedules first.');
    return;
  }

  // Show models
  console.log('Weekly Teaching Models:');
  models.forEach((model, idx) => {
    console.log(`\n  ${idx + 1}. ${model.schedule_type} - ${model.weekday} ${model.start_time}-${model.end_time}`);
    console.log(`     Professor: ${model.professors?.full_name || 'N/A'}`);
    console.log(`     Subject: ${model.subjects?.nome || 'N/A'} (${model.subjects?.semester || 'N/A'})`);
    console.log(`     Class Group: ${model.class_groups?.nome || 'N/A'}`);
    console.log(`     Status: ${model.status}`);
    console.log(`     ID: ${model.id}`);
  });

  // 2. Check active calendar
  const { data: calendar, error: calError } = await supabase
    .from('academic_calendars')
    .select('*')
    .eq('status', 'ACTIVE')
    .single();

  if (calError || !calendar) {
    console.error('\n❌ No active calendar found:', calError);
    return;
  }

  console.log(`\n--- Active Calendar ---`);
  console.log(`Year: ${calendar.academic_year}`);
  console.log(`ID: ${calendar.id}`);

  // 3. Check bimesters
  const { data: bimesters, error: bimError } = await supabase
    .from('academic_bimesters')
    .select('*')
    .eq('calendar_id', calendar.id)
    .order('number');

  if (bimError || !bimesters || bimesters.length === 0) {
    console.error('\n❌ No bimesters found:', bimError);
    return;
  }

  console.log('\nBimesters:');
  bimesters.forEach(b => {
    console.log(`  ${b.number}º: ${b.start_date} to ${b.end_date}`);
  });

  // 4. Check LETIVO events
  const { count: letivoCount } = await supabase
    .from('calendar_events')
    .select('*', { count: 'exact', head: true })
    .eq('calendar_id', calendar.id)
    .eq('event_type', 'LETIVO');

  console.log(`\nTotal LETIVO days: ${letivoCount || 0}`);

  if (!letivoCount || letivoCount === 0) {
    console.log('❌ No LETIVO days found. Cannot generate classes.');
    return;
  }

  // 5. Sample LETIVO days
  const { data: letivoDays } = await supabase
    .from('calendar_events')
    .select('event_date')
    .eq('calendar_id', calendar.id)
    .eq('event_type', 'LETIVO')
    .order('event_date')
    .limit(5);

  console.log('\nFirst 5 LETIVO days:');
  letivoDays?.forEach(day => {
    const date = new Date(day.event_date + 'T12:00:00');
    const weekday = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'][date.getDay()];
    console.log(`  ${day.event_date} (${weekday})`);
  });

  // 6. Check occurrences
  const { count: occCount } = await supabase
    .from('annual_class_occurrences')
    .select('*', { count: 'exact', head: true });

  console.log(`\n--- Occurrences ---`);
  console.log(`Total occurrences: ${occCount || 0}`);

  if (!occCount || occCount === 0) {
    console.log('\n⚠️  No occurrences generated yet.');
    console.log('✅ Setup looks good! You can now click "Gerar Todas as Aulas" to generate classes.');
  } else {
    console.log('✅ Occurrences found!');
  }
}

checkSetup();
