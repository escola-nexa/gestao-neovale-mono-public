const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

const pg = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres_password',
  database: 'sigeo_db',
});

async function sync() {
  await pg.connect();
  console.log('Connected to local PostgreSQL');

  const { data: states, error: statesErr } = await supabase.from('states').select('*');
  if (statesErr) throw statesErr;
  
  const { data: cities, error: citiesErr } = await supabase.from('cities').select('*');
  if (citiesErr) throw citiesErr;

  console.log(`Fetched ${states.length} states and ${cities.length} cities from Supabase`);

  if (states.length > 0) {
    const statesQuery = `
      INSERT INTO states (id, nome, sigla, organization_id, created_at, updated_at)
      VALUES ${states.map((_, i) => `($${i*6+1}, $${i*6+2}, $${i*6+3}, $${i*6+4}, $${i*6+5}, $${i*6+6})`).join(', ')}
      ON CONFLICT (id) DO NOTHING;
    `;
    const statesValues = states.flatMap(s => [s.id, s.nome, s.sigla, s.organization_id, s.created_at || new Date(), s.updated_at || new Date()]);
    await pg.query(statesQuery, statesValues);
    console.log('Inserted states.');
  }

  if (cities.length > 0) {
    // Insert in chunks of 1000 to avoid query parameter limits
    const chunkSize = 1000;
    for (let i = 0; i < cities.length; i += chunkSize) {
      const chunk = cities.slice(i, i + chunkSize);
      const citiesQuery = `
        INSERT INTO cities (id, state_id, nome, organization_id, created_at, updated_at)
        VALUES ${chunk.map((_, j) => `($${j*6+1}, $${j*6+2}, $${j*6+3}, $${j*6+4}, $${j*6+5}, $${j*6+6})`).join(', ')}
        ON CONFLICT (id) DO NOTHING;
      `;
      const citiesValues = chunk.flatMap(c => [c.id, c.state_id, c.nome, c.organization_id, c.created_at || new Date(), c.updated_at || new Date()]);
      await pg.query(citiesQuery, citiesValues);
    }
    console.log('Inserted cities.');
  }

  await pg.end();
  console.log('Sync complete.');
}

sync().catch(console.error);
