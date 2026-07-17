const fs = require('fs');
const path = require('path');

const modulesDir = path.resolve(__dirname, '../src/modules');
const modules = fs.readdirSync(modulesDir);

let fixed = 0;
for (const mod of modules) {
  const entityDir = path.join(modulesDir, mod, 'entities');
  if (!fs.existsSync(entityDir)) continue;
  
  const files = fs.readdirSync(entityDir);
  for (const file of files) {
    if (!file.endsWith('.entity.ts')) continue;
    
    const filePath = path.join(entityDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    if (!content.includes('@PrimaryGeneratedColumn')) {
      // Inject primary column right after class definition
      const classRegex = /export class ([a-zA-Z0-9_]+) \{/;
      content = content.replace(classRegex, (match, className) => {
        return `export class ${className} {\n  @PrimaryGeneratedColumn('uuid')\n  id: string;\n`;
      });
      fs.writeFileSync(filePath, content);
      fixed++;
    }
  }
}
console.log(`Corrigido: Adicionada chave primária (id) em ${fixed} tabelas de junção.`);
