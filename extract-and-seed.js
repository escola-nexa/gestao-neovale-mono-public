require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');
const fs = require('fs');
const bcrypt = require('bcryptjs'); // For generating default passwords if needed

async function main() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env');
    process.exit(1);
  }

  console.log('Connecting to Supabase...');
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('Authenticating with admin user...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'coordenacao@neovale.org',
    password: 'Coordenacao22'
  });

  if (authError) {
    console.error('Failed to login:', authError.message);
    process.exit(1);
  }
  console.log('Successfully logged in as', authData.user.email);

  console.log('Connecting to local PostgreSQL...');
  const pgClient = new Client({
    host: process.env.DB_HOST || 'database',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres_password',
    database: process.env.DB_NAME || 'sigeo_db',
  });
  await pgClient.connect();

  const tables = ['organizations', 'states', 'cities', 'schools', 'profiles', 'user_roles'];

  let sqlScript = '-- Data Migration Script\n\n';

  for (const table of tables) {
    console.log(`Fetching data from Supabase table: ${table}...`);
    // Note: this assumes < 1000 rows. If more, we'd need pagination.
    const { data, error } = await supabase.from(table).select('*');
    
    if (error) {
      console.error(`Error fetching ${table}:`, error.message);
      continue;
    }

    console.log(`Found ${data.length} records in ${table}.`);

    if (data.length === 0) continue;

    const columns = Object.keys(data[0]).filter(c => {
      // Exclude PostgREST specific hidden columns if any
      return true;
    });

    sqlScript += `-- Insert into ${table}\n`;
    
    for (const row of data) {
      const cols = [];
      const vals = [];
      const rawVals = [];
      
      for (const col of columns) {
        cols.push(`"${col}"`);
        let val = row[col];
        rawVals.push(typeof val === 'object' && val !== null ? JSON.stringify(val) : val);

        if (val === null) {
          vals.push('NULL');
        } else if (typeof val === 'string') {
          vals.push(`'${val.replace(/'/g, "''")}'`);
        } else if (typeof val === 'object') {
          vals.push(`'${JSON.stringify(val).replace(/'/g, "''")}'`);
        } else {
          vals.push(val);
        }
      }

      if (table === 'profiles' && !columns.includes('password')) {
        cols.push('"password"');
        const hash = bcrypt.hashSync('123456', 10);
        vals.push(`'${hash}'`);
        rawVals.push(hash);
      }

      const insertStmt = `INSERT INTO "${table}" (${cols.join(', ')}) VALUES (${vals.join(', ')});`;
      sqlScript += insertStmt + '\n';
      
      try {
        await pgClient.query(`INSERT INTO "${table}" (${cols.join(', ')}) VALUES (${rawVals.map((_, i) => `$${i + 1}`).join(', ')}) ON CONFLICT DO NOTHING`, rawVals);
      } catch (err) {
        console.error(`Error inserting into ${table}:`, err.message);
      }
    }
    sqlScript += '\n';
  }

  fs.writeFileSync('migration_seed.sql', sqlScript);
  console.log('Migration completed! Generated migration_seed.sql with all INSERT statements.');
  
  await pgClient.end();
}

main().catch(console.error);
