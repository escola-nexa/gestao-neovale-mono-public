const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');
const fs = require('fs');
const bcrypt = require('bcryptjs');

async function main() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY');
    process.exit(1);
  }

  console.log('Connecting to Supabase...');
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('Connecting to local PostgreSQL...');
  const pgClient = new Client({
    host: process.env.DB_HOST || 'database',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres_password',
    database: process.env.DB_NAME || 'sigeo_db',
  });
  await pgClient.connect();

  const tables = ['organizations', 'states', 'cities', 'schools', 'profiles'];

  let sqlScript = '-- Data Migration Script\\n\\n';

  for (const table of tables) {
    console.log(`Fetching data from Supabase table: ${table}...`);
    let allData = [];
    let count = 1000;
    let start = 0;
    let hasMore = true;
    
    while(hasMore) {
        const { data, error } = await supabase.from(table).select('*').range(start, start + count - 1);
        if (error) {
            console.error(`Error fetching ${table}:`, error.message);
            hasMore = false;
            break;
        }
        allData = allData.concat(data);
        if(data.length < count) {
            hasMore = false;
        } else {
            start += count;
        }
    }

    console.log(`Found ${allData.length} records in ${table}.`);

    if (allData.length === 0) continue;

    const columns = Object.keys(allData[0]).filter(c => true);

    sqlScript += `-- Insert into ${table}\\n`;
    
    for (const row of allData) {
      const cols = [];
      const vals = [];
      const pgVals = [];
      
      for (const col of columns) {
        cols.push(`"${col}"`);
        let val = row[col];
        pgVals.push(val);
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
        pgVals.push(hash);
      }

      const insertStmt = `INSERT INTO "${table}" (${cols.join(', ')}) VALUES (${vals.join(', ')});`;
      sqlScript += insertStmt + '\\n';
      
      try {
        await pgClient.query(`INSERT INTO "${table}" (${cols.join(', ')}) VALUES (${pgVals.map((_, i) => '$' + (i + 1)).join(', ')}) ON CONFLICT ("id") DO UPDATE SET ${cols.map((c, i) => `${c} = EXCLUDED.${c}`).join(', ')}`, pgVals.map(v => typeof v === 'object' && v !== null ? JSON.stringify(v) : v));
      } catch (err) {
        if (!err.message.includes('duplicate key') && !err.message.includes('ON CONFLICT')) {
           console.error(`Error inserting into ${table}:`, err.message);
        } else if (err.message.includes('syntax error at or near "DO"')) {
           // Might not have unique constraint on ID? Try without conflict
           try {
               await pgClient.query(`INSERT INTO "${table}" (${cols.join(', ')}) VALUES (${pgVals.map((_, i) => '$' + (i + 1)).join(', ')})`, pgVals.map(v => typeof v === 'object' && v !== null ? JSON.stringify(v) : v));
           } catch(e) {}
        }
      }
    }
    sqlScript += '\\n';
  }

  fs.writeFileSync('migration_seed.sql', sqlScript);
  console.log('Migration completed! Generated migration_seed.sql with all INSERT statements.');
  
  await pgClient.end();
}

main().catch(console.error);
