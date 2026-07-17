const fs = require('fs');
const path = require('path');

const modulesDir = path.join(__dirname, 'src', 'modules');
const appModulePath = path.join(__dirname, 'src', 'app.module.ts');

const directories = fs.readdirSync(modulesDir).filter(name => fs.statSync(path.join(modulesDir, name)).isDirectory());

let importsCode = '';
const moduleNames = [];

directories.forEach(dir => {
  const files = fs.readdirSync(path.join(modulesDir, dir));
  const moduleFile = files.find(f => f.endsWith('.module.ts'));
  if (moduleFile) {
    const classNameMatch = fs.readFileSync(path.join(modulesDir, dir, moduleFile), 'utf8').match(/export class (\w+Module)/);
    if (classNameMatch) {
      const className = classNameMatch[1];
      if (className !== 'AlunoModule' && className !== 'AuthModule' && className !== 'SchoolsModule') {
         importsCode += `import { ${className} } from './modules/${dir}/${moduleFile.replace('.ts', '')}';\n`;
         moduleNames.push(className);
      }
    }
  }
});

let appModuleContent = fs.readFileSync(appModulePath, 'utf8');

// Insert imports right before @Module
appModuleContent = appModuleContent.replace(
  /@Module\({/,
  `${importsCode}\n@Module({`
);

// Insert module names into imports array
const importsMatch = appModuleContent.match(/imports: \[([\s\S]*?)\]/);
if (importsMatch) {
  const newImports = `imports: [\n${importsMatch[1].trim()},\n    ${moduleNames.join(',\n    ')}\n  ]`;
  appModuleContent = appModuleContent.replace(importsMatch[0], newImports);
}

fs.writeFileSync(appModulePath, appModuleContent);
console.log(`Registered ${moduleNames.length} modules successfully!`);
