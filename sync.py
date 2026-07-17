import os
import urllib.request
import json

SUPABASE_URL = os.environ.get('VITE_SUPABASE_URL')
SUPABASE_KEY = os.environ.get('VITE_SUPABASE_PUBLISHABLE_KEY')

def fetch_table(table):
    url = f"{SUPABASE_URL}/rest/v1/{table}?select=*"
    req = urllib.request.Request(url)
    req.add_header('apikey', SUPABASE_KEY)
    req.add_header('Authorization', f"Bearer {SUPABASE_KEY}")
    with urllib.request.urlopen(req) as response:
        return json.loads(response.read())

states = fetch_table('states')
cities = fetch_table('cities')

with open('inserts.sql', 'w') as f:
    for s in states:
        f.write(f"INSERT INTO states (id, nome, sigla, organization_id, created_at, updated_at) VALUES ('{s['id']}', '{s['nome'].replace(chr(39), chr(39)+chr(39))}', '{s['sigla']}', '{s['organization_id']}', '{s.get('created_at', 'NOW()')}', '{s.get('updated_at', 'NOW()')}') ON CONFLICT (id) DO NOTHING;\n")
    for c in cities:
        f.write(f"INSERT INTO cities (id, state_id, nome, organization_id, created_at, updated_at) VALUES ('{c['id']}', '{c['state_id']}', '{c['nome'].replace(chr(39), chr(39)+chr(39))}', '{c['organization_id']}', '{c.get('created_at', 'NOW()')}', '{c.get('updated_at', 'NOW()')}') ON CONFLICT (id) DO NOTHING;\n")

