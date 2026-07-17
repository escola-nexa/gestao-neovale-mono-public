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

async function checkAllModels() {
  console.log('--- Checking All Weekly Teaching Models ---\n');

  // Get ALL models without filters
  const { data: models, error: modelsError } = await supabase
    .from('weekly_teaching_models')
    .select(`
      *,
      professors:professor_id (full_name),
      subjects:subject_id (nome, semester),
      class_groups:class_group_id (nome),
      courses:course_id (nome)
    `);

  if (modelsError) {
    console.error('Error fetching models:', modelsError);
    return;
  }

  console.log(`Total models found: ${models?.length || 0}\n`);

  if (!models || models.length === 0) {
    console.log('❌ No models found in database');
    return;
  }

  // Group by schedule_type
  const byType = {
    CLASS: models.filter(m => m.schedule_type === 'CLASS'),
    PLANNING: models.filter(m => m.schedule_type === 'PLANNING'),
    OTHER: models.filter(m => m.schedule_type !== 'CLASS' && m.schedule_type !== 'PLANNING'),
  };

  console.log('Models by type:');
  console.log(`  CLASS: ${byType.CLASS.length}`);
  console.log(`  PLANNING: ${byType.PLANNING.length}`);
  console.log(`  OTHER/NULL: ${byType.OTHER.length}\n`);

  // Show all models
  console.log('--- All Models ---\n');
  models.forEach((model, idx) => {
    console.log(`${idx + 1}. ID: ${model.id}`);
    console.log(`   Type: ${model.schedule_type || 'NULL'}`);
    console.log(`   Status: ${model.status}`);
    console.log(`   Professor: ${model.professors?.full_name || 'N/A'}`);
    console.log(`   Course: ${model.courses?.nome || 'N/A'}`);
    console.log(`   Class Group: ${model.class_groups?.nome || 'N/A'}`);
    console.log(`   Subject: ${model.subjects?.nome || 'N/A'}`);
    console.log(`   Semester: ${model.subjects?.semester || 'N/A'}`);
    console.log(`   Weekday: ${model.weekday}`);
    console.log(`   Time: ${model.start_time} - ${model.end_time}`);
    console.log(`   Organization: ${model.organization_id}`);
    console.log('');
  });

  // Check if any have NULL schedule_type
  const nullType = models.filter(m => !m.schedule_type);
  if (nullType.length > 0) {
    console.log(`⚠️  WARNING: ${nullType.length} models have NULL schedule_type`);
    console.log('These models need to be updated with a valid schedule_type (CLASS or PLANNING)');
  }
}

checkAllModels();
