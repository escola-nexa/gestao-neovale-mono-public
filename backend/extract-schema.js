const fs = require('fs');
const path = require('path');

const typesPath = path.resolve(__dirname, '../src/integrations/supabase/types.ts');
const content = fs.readFileSync(typesPath, 'utf8');

// Regex para encontrar as tabelas dentro de public: { Tables: { ... } }
// Procuramos pelo padrão: nome_da_tabela: { Row: { ... } }
const tableRegex = /^\s{6}([a-zA-Z0-9_]+):\s*\{\n\s{8}Row:\s*\{([\s\S]*?)\n\s{8}\}/gm;

let match;
const tables = {};

while ((match = tableRegex.exec(content)) !== null) {
  const tableName = match[1];
  const rowContent = match[2];
  
  const columns = [];
  const colRegex = /^\s{10}([a-zA-Z0-9_]+):\s*(.*)$/gm;
  let colMatch;
  while ((colMatch = colRegex.exec(rowContent)) !== null) {
    columns.push({
      name: colMatch[1],
      type: colMatch[2].replace(/\| null/g, '').trim(),
      isNullable: colMatch[2].includes('null')
    });
  }
  
  tables[tableName] = columns;
}

const tableNames = Object.keys(tables);
console.log(`Total de tabelas encontradas: ${tableNames.length}`);

fs.writeFileSync(path.resolve(__dirname, 'schema-parsed.json'), JSON.stringify(tables, null, 2));
console.log('Schema salvo em backend/schema-parsed.json');
