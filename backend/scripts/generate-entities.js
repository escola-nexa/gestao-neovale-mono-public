const fs = require('fs');
const path = require('path');

const typesFile = path.resolve(__dirname, '../../src/integrations/supabase/types.ts');
const outDir = path.resolve(__dirname, '../src/modules');

const content = fs.readFileSync(typesFile, 'utf8');
const tableRegex = /^\s{6}([a-zA-Z0-9_]+):\s*\{\n\s{8}Row:\s*\{([\s\S]*?)\n\s{8}\}/gm;

let match;
let count = 0;

console.log('Lendo esquema do Supabase (types.ts)...');

while ((match = tableRegex.exec(content)) !== null) {
  const tableName = match[1];
  const rowContent = match[2];
  count++;
  
  // Ignora tabelas muito extensas e genéricas do Supabase, focando no app
  if(tableName.startsWith('pg_') || tableName.startsWith('supabase_')) continue;

  const moduleDir = path.join(outDir, tableName);
  const entityDir = path.join(moduleDir, 'entities');
  if (!fs.existsSync(entityDir)) fs.mkdirSync(entityDir, { recursive: true });

  const className = tableName.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');

  let entityCode = `import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';\n\n`;
  entityCode += `@Entity('${tableName}')\nexport class ${className} {\n`;
  
  const colRegex = /^\s{10}([a-zA-Z0-9_]+):\s*(.*)$/gm;
  let colMatch;
  while ((colMatch = colRegex.exec(rowContent)) !== null) {
    const colName = colMatch[1];
    let type = colMatch[2].replace(/\| null/g, '').trim();
    const isNullable = colMatch[2].includes('null');

    // Mapeamento simples de tipos do TypeScript para TypeORM
    let tsType = 'string';
    let typeOrmType = 'varchar';
    
    if (type.includes('number')) { tsType = 'number'; typeOrmType = 'numeric'; }
    else if (type.includes('boolean')) { tsType = 'boolean'; typeOrmType = 'boolean'; }
    else if (type.includes('Json') || type.includes('[]')) { tsType = 'any'; typeOrmType = 'jsonb'; }
    
    // Tratamento de Enums e relacionamentos
    if(type.includes('Database')) { tsType = 'string'; typeOrmType = 'varchar'; }

    // CamelCase property name
    const propName = colName.replace(/_([a-z])/g, (g) => g[1].toUpperCase());

    if (colName === 'id') {
      entityCode += `  @PrimaryGeneratedColumn('uuid')\n  id: string;\n\n`;
    } else if (colName === 'created_at') {
      entityCode += `  @CreateDateColumn({ name: 'created_at' })\n  createdAt: Date;\n\n`;
    } else if (colName === 'updated_at') {
      entityCode += `  @UpdateDateColumn({ name: 'updated_at' })\n  updatedAt: Date;\n\n`;
    } else {
      entityCode += `  @Column({ name: '${colName}', type: '${typeOrmType}'${isNullable ? ', nullable: true' : ''} })\n  ${propName}: ${tsType};\n\n`;
    }
  }
  entityCode += `}\n`;
  
  fs.writeFileSync(path.join(entityDir, `${tableName}.entity.ts`), entityCode);
}

console.log(`Sucesso! ${count} entidades TypeORM foram geradas em backend/src/modules/`);
