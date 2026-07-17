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

async function checkOccurrences() {
  console.log('--- Checking Annual Class Occurrences ---\n');

  // 1. Count total occurrences
  const { count: totalCount, error: countError } = await supabase
    .from('annual_class_occurrences')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('Error counting occurrences:', countError);
    return;
  }

  console.log(`Total occurrences in database: ${totalCount}\n`);

  if (totalCount === 0) {
    console.log('❌ No occurrences found. You need to generate classes first.');
    return;
  }

  // 2. Get sample occurrences
  const { data: occurrences, error: occError } = await supabase
    .from('annual_class_occurrences')
    .select('*')
    .order('occurrence_date')
    .limit(10);

  if (occError) {
    console.error('Error fetching occurrences:', occError);
    return;
  }

  console.log('Sample occurrences (first 10):');
  occurrences?.forEach((occ, idx) => {
    console.log(`  ${idx + 1}. Date: ${occ.occurrence_date}, Time: ${occ.start_time}-${occ.end_time}, Status: ${occ.status}`);
  });

  // 3. Check weekly models
  const { count: modelsCount, error: modelsError } = await supabase
    .from('weekly_teaching_models')
    .select('*', { count: 'exact', head: true });

  if (modelsError) {
    console.error('Error counting models:', modelsError);
    return;
  }

  console.log(`\nTotal weekly teaching models: ${modelsCount}`);

  // 4. Get sample models
  const { data: models, error: modelsDataError } = await supabase
    .from('weekly_teaching_models')
    .select(`
      *,
      professors:professor_id (full_name),
      subjects:subject_id (nome)
    `)
    .limit(5);

  if (modelsDataError) {
    console.error('Error fetching models:', modelsDataError);
    return;
  }

  console.log('\nSample weekly models:');
  models?.forEach((model, idx) => {
    console.log(`  ${idx + 1}. ${model.schedule_type} - ${model.weekday} ${model.start_time}-${model.end_time}`);
    console.log(`     Professor: ${model.professors?.full_name || 'N/A'}`);
    console.log(`     Subject: ${model.subjects?.nome || 'N/A'}`);
  });

  // 5. Check if occurrences match models
  if (occurrences && occurrences.length > 0) {
    const firstOcc = occurrences[0];
    const { data: relatedModel } = await supabase
      .from('weekly_teaching_models')
      .select(`
        *,
        professors:professor_id (full_name),
        subjects:subject_id (nome)
      `)
      .eq('id', firstOcc.weekly_model_id)
      .single();

    console.log('\n--- First Occurrence Details ---');
    console.log('Occurrence:', firstOcc);
    console.log('Related Model:', relatedModel);
  }

  // 6. Check organization_id
  const { data: orgs } = await supabase
    .from('annual_class_occurrences')
    .select('organization_id')
    .limit(1);

  if (orgs && orgs.length > 0) {
    console.log(`\n--- Organization Check ---`);
    console.log(`Occurrences organization_id: ${orgs[0].organization_id}`);
  }
}

checkOccurrences();
