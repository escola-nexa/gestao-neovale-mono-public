import urllib.request
import json
import os
import ssl

SUPABASE_URL = "https://sczpzqxedmzkddumncbh.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjenB6cXhlZG16a2RkdW1uY2JoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4NTIwMDIsImV4cCI6MjA4NDQyODAwMn0.n___G3xfIK3cNkcfM7PPfMuoizwvWJDVLZn9wo--qbs"

import subprocess

def get_tables():
    try:
        cmd = ["docker", "exec", "-i", "sigeo_postgres", "psql", "-U", "postgres", "-d", "sigeo_db", "-t", "-c", "SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public';"]
        output = subprocess.check_output(cmd, stderr=subprocess.DEVNULL)
        tables = [line.strip() for line in output.decode('utf-8').split('\n') if line.strip()]
        return tables
    except Exception as e:
        print(f"Error fetching schema: {e}")
        return []

def fetch_table_data(table_name):
    all_data = []
    limit = 1000
    offset = 0
    
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    while True:
        url = f"{SUPABASE_URL}/rest/v1/{table_name}?select=*"
        req = urllib.request.Request(url, headers={
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'Range': f"{offset}-{offset + limit - 1}"
        })
        
        try:
            with urllib.request.urlopen(req, context=ctx) as response:
                chunk = json.loads(response.read().decode('utf-8'))
                if not chunk:
                    break
                all_data.extend(chunk)
                if len(chunk) < limit:
                    break
                offset += limit
        except urllib.error.HTTPError as e:
            # Some tables or views might not be accessible
            print(f"Skipping {table_name}: HTTP {e.code}")
            break
        except Exception as e:
            print(f"Error fetching {table_name}: {e}")
            break
            
    return all_data

def format_value(v):
    if v is None:
        return "NULL"
    elif isinstance(v, bool):
        return "TRUE" if v else "FALSE"
    elif isinstance(v, (int, float)):
        return str(v)
    elif isinstance(v, dict) or isinstance(v, list):
        # JSON fields
        s = json.dumps(v).replace("'", "''")
        return f"'{s}'"
    else:
        # strings
        s = str(v).replace("'", "''")
        return f"'{s}'"

def main():
    print("Fetching list of tables from Supabase...")
    tables = get_tables()
    
    if not tables:
        print("No tables found. Check credentials or RLS policies.")
        return
        
    print(f"Found {len(tables)} tables/views in the OpenAPI spec.")
    
    os.makedirs('database/scripts', exist_ok=True)
    sql_file_path = 'database/scripts/supabase_dump.sql'
    
    with open(sql_file_path, 'w') as f:
        f.write("-- Supabase Data Dump\n")
        f.write("BEGIN;\n\n")
        
        for table in tables:
            # Skip some internal things if necessary
            if table.endswith('_response') or table.endswith('_body'):
                continue
                
            print(f"Fetching data for {table}...")
            data = fetch_table_data(table)
            
            if not data:
                print(f"  -> 0 rows")
                continue
                
            print(f"  -> {len(data)} rows")
            f.write(f"-- Data for {table} ({len(data)} rows)\n")
            
            for row in data:
                columns = list(row.keys())
                values = [format_value(row[col]) for col in columns]
                
                cols_str = ", ".join([f'"{c}"' for c in columns])
                vals_str = ", ".join(values)
                
                f.write(f'INSERT INTO public."{table}" ({cols_str}) VALUES ({vals_str}) ON CONFLICT DO NOTHING;\n')
            
            f.write("\n")
            
        f.write("COMMIT;\n")
        
    print(f"\nDone! SQL script generated at {sql_file_path}")

if __name__ == '__main__':
    main()
