import { supabase } from '@/integrations/supabase/client';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
  const { data: calendar } = await supabase
    .from('academic_calendars')
    .select('*')
    .eq('status', 'ACTIVE')
    .single();

  if (!calendar) {
    console.log('Nenhum calendário ativo encontrado.');
    return;
  }

  console.log(`Calendário Ativo: ${calendar.academic_year}`);
  console.log(`Início: ${calendar.start_date}`);
  console.log(`Fim: ${calendar.end_date}`);

  const { data: events } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('calendar_id', calendar.id)
    .eq('event_type', 'LETIVO')
    .order('event_date', { ascending: true });

  if (!events || events.length === 0) {
    console.log('Nenhum evento LETIVO encontrado.');
  } else {
    console.log(`Total de dias letivos: ${events.length}`);
    console.log(`Primeiro dia letivo gerado: ${events[0].event_date}`);
    console.log(`Último dia letivo gerado: ${events[events.length - 1].event_date}`);
    
    // Check first few
    console.log('Primeiras 5 datas:');
    events.slice(0, 5).forEach(e => console.log(` - ${e.event_date}`));
  }
}

diagnose();
