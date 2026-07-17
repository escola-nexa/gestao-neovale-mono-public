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

async function debugOrganization() {
  console.log('--- Debugging Organization Context ---\n');

  // 1. Check if we're authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    console.log('❌ Not authenticated or no user');
    console.log('This script uses the publishable key, which may not have access to RLS-protected data');
    console.log('The frontend uses the authenticated user context\n');
  } else {
    console.log(`✓ Authenticated as: ${user.email}`);
    console.log(`  User ID: ${user.id}\n`);
  }

  // 2. Try to get models without organization filter
  const { data: allModels, error: allError } = await supabase
    .from('weekly_teaching_models')
    .select('id, organization_id, schedule_type, status, weekday');

  console.log('--- Models without organization filter ---');
  if (allError) {
    console.log('Error:', allError.message);
  } else {
    console.log(`Found: ${allModels?.length || 0} models`);
    if (allModels && allModels.length > 0) {
      console.log('\nSample:');
      allModels.slice(0, 5).forEach(m => {
        console.log(`  - Org: ${m.organization_id}, Type: ${m.schedule_type}, Status: ${m.status}`);
      });
    }
  }

  // 3. Check organizations table
  const { data: orgs, error: orgsError } = await supabase
    .from('organizations')
    .select('id, name');

  console.log('\n--- Organizations ---');
  if (orgsError) {
    console.log('Error:', orgsError.message);
  } else {
    console.log(`Found: ${orgs?.length || 0} organizations`);
    orgs?.forEach(org => {
      console.log(`  - ${org.name} (${org.id})`);
    });
  }

  // 4. Check user_organizations
  if (user) {
    const { data: userOrgs, error: userOrgsError } = await supabase
      .from('user_organizations')
      .select('organization_id, role')
      .eq('user_id', user.id);

    console.log('\n--- User Organizations ---');
    if (userOrgsError) {
      console.log('Error:', userOrgsError.message);
    } else {
      console.log(`User belongs to: ${userOrgs?.length || 0} organizations`);
      userOrgs?.forEach(uo => {
        console.log(`  - Org ID: ${uo.organization_id}, Role: ${uo.role}`);
      });
    }
  }

  // 5. Check RLS policies
  console.log('\n--- RLS Information ---');
  console.log('Note: This script may not see data due to Row Level Security (RLS) policies.');
  console.log('The frontend application uses authenticated user context which may have different access.');
  console.log('\nTo see the actual data the user sees, check the browser console or use the frontend.');
}

debugOrganization();
