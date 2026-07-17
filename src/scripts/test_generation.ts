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

async function testGeneration() {
  console.log('--- Testing Class Generation ---\n');

  // 1. Get all weekly models
  const { data: models, error: modelsError } = await supabase
    .from('weekly_teaching_models')
    .select(`
      *,
      subjects:subject_id (nome, semester)
    `)
    .eq('schedule_type', 'CLASS')
    .eq('status', 'ACTIVE');

  if (modelsError) {
    console.error('Error fetching models:', modelsError);
    return;
  }

  console.log(`Found ${models?.length || 0} CLASS models\n`);

  if (!models || models.length === 0) {
    console.log('No CLASS models to test');
    return;
  }

  // 2. Get active calendar
  const { data: calendar, error: calError } = await supabase
    .from('academic_calendars')
    .select('*')
    .eq('status', 'ACTIVE')
    .single();

  if (calError || !calendar) {
    console.error('❌ No active calendar:', calError);
    return;
  }

  console.log(`✓ Active calendar: ${calendar.academic_year} (${calendar.id})\n`);

  // 3. Test each model
  for (const model of models) {
    console.log(`\n--- Testing Model: ${model.subjects?.nome || 'Unknown'} ---`);
    console.log(`Weekday: ${model.weekday}`);
    console.log(`Time: ${model.start_time} - ${model.end_time}`);
    console.log(`Subject Semester: ${model.subjects?.semester || 'N/A'}`);

    if (!model.subject_id) {
      console.log('❌ ERROR: No subject_id');
      continue;
    }

    // Determine bimesters based on semester
    let bimesterNumbers: number[] = [];
    const semester = model.subjects?.semester;
    
    if (semester === 'FIRST') {
      bimesterNumbers = [1, 2];
    } else if (semester === 'SECOND') {
      bimesterNumbers = [3, 4];
    } else if (semester === 'ANNUAL') {
      bimesterNumbers = [1, 2, 3, 4];
    } else {
      console.log(`❌ ERROR: Invalid semester value: ${semester}`);
      continue;
    }

    console.log(`Bimesters to use: ${bimesterNumbers.join(', ')}`);

    // Get bimesters
    const { data: bimesters, error: bimError } = await supabase
      .from('academic_bimesters')
      .select('*')
      .eq('calendar_id', calendar.id)
      .in('number', bimesterNumbers)
      .order('number');

    if (bimError || !bimesters || bimesters.length === 0) {
      console.log(`❌ ERROR: No bimesters found for numbers ${bimesterNumbers.join(', ')}`);
      console.log('Error:', bimError);
      continue;
    }

    console.log(`✓ Found ${bimesters.length} bimesters:`);
    bimesters.forEach(b => {
      console.log(`  ${b.number}º: ${b.start_date} to ${b.end_date}`);
    });

    // Calculate date range
    const startDate = bimesters.reduce((min, b) => b.start_date < min ? b.start_date : min, bimesters[0].start_date);
    const endDate = bimesters.reduce((max, b) => b.end_date > max ? b.end_date : max, bimesters[0].end_date);

    console.log(`Date range: ${startDate} to ${endDate}`);

    // Get LETIVO days
    const { data: letivoDays, error: letivoError } = await supabase
      .from('calendar_events')
      .select('event_date')
      .eq('calendar_id', calendar.id)
      .eq('event_type', 'LETIVO')
      .gte('event_date', startDate)
      .lte('event_date', endDate);

    if (letivoError || !letivoDays || letivoDays.length === 0) {
      console.log(`❌ ERROR: No LETIVO days found in range ${startDate} to ${endDate}`);
      console.log('Error:', letivoError);
      continue;
    }

    console.log(`✓ Found ${letivoDays.length} LETIVO days in range`);

    // Map weekday to JS day
    const weekdayMap: Record<string, number> = {
      SEGUNDA: 1,
      TERCA: 2,
      QUARTA: 3,
      QUINTA: 4,
      SEXTA: 5,
    };

    const targetDayOfWeek = weekdayMap[model.weekday];
    console.log(`Target day of week: ${model.weekday} (${targetDayOfWeek})`);

    // Filter dates that match the weekday
    const validDates = letivoDays
      .filter(ld => {
        const date = new Date(ld.event_date + 'T12:00:00');
        return date.getDay() === targetDayOfWeek;
      })
      .map(ld => ld.event_date);

    console.log(`✓ Found ${validDates.length} matching ${model.weekday} days`);
    
    if (validDates.length > 0) {
      console.log(`First 3 dates: ${validDates.slice(0, 3).join(', ')}`);
      console.log(`✅ Would generate ${validDates.length} classes for this model`);
    } else {
      console.log(`❌ ERROR: No matching weekday dates found`);
    }
  }
}

testGeneration();
