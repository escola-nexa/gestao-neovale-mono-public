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
const supabaseKey = envVars.VITE_SUPABASE_PUBLISHABLE_KEY; // Corrected key name

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  console.error('URL:', supabaseUrl ? 'Found' : 'Missing');
  console.error('Key:', supabaseKey ? 'Found' : 'Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectData() {
  console.log('--- Inspecting Calendar Data ---');

  // 1. Get Active Calendar
  const { data: calendar, error: calError } = await supabase
    .from('academic_calendars')
    .select('*')
    .eq('status', 'ACTIVE')
    .single();

  if (calError || !calendar) {
    console.error('Error fetching calendar:', calError);
    return;
  }
  console.log('Active Calendar:', calendar.academic_year, `(${calendar.id})`);

  // 2. Get Bimesters
  const { data: bimesters, error: bimError } = await supabase
    .from('academic_bimesters')
    .select('*')
    .eq('calendar_id', calendar.id)
    .order('number');

  if (bimError) {
    console.error('Error fetching bimesters:', bimError);
  } else {
    console.log('Bimesters:');
    bimesters.forEach(b => {
        console.log(`  ${b.number}º: ${b.start_date} to ${b.end_date}`);
    });
  }

  // 3. Count LETIVO events
  const { count, error: eventError } = await supabase
    .from('calendar_events')
    .select('*', { count: 'exact', head: true })
    .eq('calendar_id', calendar.id)
    .eq('event_type', 'LETIVO');

  if (eventError) {
    console.error('Error counting events:', eventError);
  } else {
    console.log('Total LETIVO events:', count);
  }
  
  // 4. Check first and last LETIVO event
  const { data: events } = await supabase
    .from('calendar_events')
    .select('event_date')
    .eq('calendar_id', calendar.id)
    .eq('event_type', 'LETIVO')
    .order('event_date', { ascending: true });
    
  if (events && events.length > 0) {
      console.log('First LETIVO:', events[0].event_date);
      console.log('Last LETIVO:', events[events.length - 1].event_date);
  }

  // 5. Sample Subject
  const { data: subjects, error: subError } = await supabase
    .from('subjects')
    .select('*')
    .limit(5);

  if (subError) {
    console.error('Error fetching subjects:', subError);
  } else {
    console.log('Sample Subjects Semesters:');
    subjects.forEach(s => {
        console.log(`  ${s.nome}: ${s.semester}`);
    });
  }
}

inspectData();
