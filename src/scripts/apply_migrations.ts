import { supabase } from '@/integrations/supabase/client';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL = 'https://sczpzqxedmzkddumncbh.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_KEY não encontrada nas variáveis de ambiente');
  console.log('Por favor, execute: export SUPABASE_SERVICE_KEY="sua-chave-service-role"');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function runMigration(filePath: string) {
  console.log(`\n📄 Executando migration: ${filePath}`);
  
  try {
    const sql = readFileSync(filePath, 'utf-8');
    
    // Execute SQL via RPC
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error('❌ Erro ao executar migration:', error);
      return false;
    }
    
    console.log('✅ Migration executada com sucesso!');
    return true;
  } catch (error) {
    console.error('❌ Erro ao ler arquivo:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 Iniciando aplicação de migrations...\n');
  
  const migrations = [
    'supabase/migrations/20260207120000_add_annual_to_semester_enum.sql',
    'supabase/migrations/20260207123000_fix_pre_planning_eligibility.sql',
    'supabase/migrations/20260207130000_create_orientations_table.sql',
  ];
  
  for (const migration of migrations) {
    const fullPath = join(process.cwd(), migration);
    const success = await runMigration(fullPath);
    
    if (!success) {
      console.error(`\n❌ Falha ao executar ${migration}`);
      console.log('Parando execução de migrations.');
      process.exit(1);
    }
  }
  
  console.log('\n✅ Todas as migrations foram aplicadas com sucesso!');
}

main().catch(console.error);
