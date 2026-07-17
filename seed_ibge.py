import subprocess
import json
import uuid

def fetch(url):
    result = subprocess.run(['curl', '-s', url], capture_output=True, text=True)
    return json.loads(result.stdout)

states = fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados')

with open('ibge.sql', 'w') as f:
    f.write("DO $$ \n")
    f.write("DECLARE local_org UUID; \n")
    f.write("BEGIN \n")
    f.write("SELECT id INTO local_org FROM organizations LIMIT 1; \n")
    
    state_id_map = {}
    for s in states:
        sid = str(uuid.uuid4())
        state_id_map[s['sigla']] = sid
        nome = s['nome'].replace("'", "''")
        sigla = s['sigla']
        f.write(f"INSERT INTO states (id, nome, sigla, organization_id, created_at, updated_at) VALUES ('{sid}', '{nome}', '{sigla}', local_org, NOW(), NOW());\n")
    
    for s in states:
        sigla = s['sigla']
        sid = state_id_map[sigla]
        cities = fetch(f"https://servicodados.ibge.gov.br/api/v1/localidades/estados/{s['id']}/municipios")
        for c in cities:
            cid = str(uuid.uuid4())
            nome = c['nome'].replace("'", "''")
            f.write(f"INSERT INTO cities (id, state_id, nome, organization_id, created_at, updated_at) VALUES ('{cid}', '{sid}', '{nome}', local_org, NOW(), NOW());\n")
            
    f.write("END $$;\n")

