const fs = require('fs');
const path = require('path');

const modulesDir = path.join(__dirname, 'src', 'modules');
const directories = fs.readdirSync(modulesDir, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name);

// Skip modules that are already manually migrated or configured
const skipModules = ['aluno', 'auth', 'schools'];

// Helper to convert snake_case/kebab-case to PascalCase (e.g. student_grades -> StudentGrades)
function toPascalCase(str) {
  return str
    .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (_, c) => c.toUpperCase());
}

// Helper to convert snake_case/kebab-case to camelCase (e.g. student_grades -> studentGrades)
function toCamelCase(str) {
  return str
    .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (_, c) => c.toLowerCase());
}

let generatedCount = 0;

for (const moduleName of directories) {
  if (skipModules.includes(moduleName)) continue;

  const modulePath = path.join(modulesDir, moduleName);
  const entitiesPath = path.join(modulePath, 'entities');

  // Check if entities folder exists
  if (!fs.existsSync(entitiesPath)) continue;

  const files = fs.readdirSync(entitiesPath);
  const entityFile = files.find(f => f.endsWith('.entity.ts'));
  if (!entityFile) continue;

  // Read entity file to get the exact class name
  const entityContent = fs.readFileSync(path.join(entitiesPath, entityFile), 'utf8');
  const classMatch = entityContent.match(/export class\s+([A-Za-z0-9_]+)/);
  if (!classMatch) continue;

  const entityClassName = classMatch[1];
  const pascalName = toPascalCase(moduleName);
  const camelName = toCamelCase(moduleName);

  // Create directories
  ['dto', 'controllers', 'services'].forEach(dir => {
    const dirPath = path.join(modulePath, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  });

  // --- DTOs ---
  const createDtoContent = `export class Create${pascalName}Dto {
  // TODO: Add properties mapped from entity
}
`;
  fs.writeFileSync(path.join(modulePath, 'dto', `create-${moduleName}.dto.ts`), createDtoContent);

  const updateDtoContent = `import { PartialType } from '@nestjs/mapped-types';
import { Create${pascalName}Dto } from './create-${moduleName}.dto';

export class Update${pascalName}Dto extends PartialType(Create${pascalName}Dto) {}
`;
  fs.writeFileSync(path.join(modulePath, 'dto', `update-${moduleName}.dto.ts`), updateDtoContent);

  // --- Services ---
  const findServiceContent = `import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ${entityClassName} } from '../entities/${entityFile.replace('.ts', '')}';

@Injectable()
export class Find${pascalName}Service {
  constructor(
    @InjectRepository(${entityClassName})
    private readonly repository: Repository<${entityClassName}>,
  ) {}

  async findAll(organizationId: string): Promise<${entityClassName}[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<${entityClassName} | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
`;
  fs.writeFileSync(path.join(modulePath, 'services', `find-${moduleName}.service.ts`), findServiceContent);

  const createServiceContent = `import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ${entityClassName} } from '../entities/${entityFile.replace('.ts', '')}';
import { Create${pascalName}Dto } from '../dto/create-${moduleName}.dto';

@Injectable()
export class Create${pascalName}Service {
  constructor(
    @InjectRepository(${entityClassName})
    private readonly repository: Repository<${entityClassName}>,
  ) {}

  async execute(dto: Create${pascalName}Dto, organizationId: string): Promise<${entityClassName}> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
`;
  fs.writeFileSync(path.join(modulePath, 'services', `create-${moduleName}.service.ts`), createServiceContent);

  const updateServiceContent = `import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ${entityClassName} } from '../entities/${entityFile.replace('.ts', '')}';
import { Update${pascalName}Dto } from '../dto/update-${moduleName}.dto';

@Injectable()
export class Update${pascalName}Service {
  constructor(
    @InjectRepository(${entityClassName})
    private readonly repository: Repository<${entityClassName}>,
  ) {}

  async execute(id: string, dto: Update${pascalName}Dto, organizationId: string): Promise<${entityClassName}> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
`;
  fs.writeFileSync(path.join(modulePath, 'services', `update-${moduleName}.service.ts`), updateServiceContent);

  const deleteServiceContent = `import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ${entityClassName} } from '../entities/${entityFile.replace('.ts', '')}';

@Injectable()
export class Delete${pascalName}Service {
  constructor(
    @InjectRepository(${entityClassName})
    private readonly repository: Repository<${entityClassName}>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
`;
  fs.writeFileSync(path.join(modulePath, 'services', `delete-${moduleName}.service.ts`), deleteServiceContent);

  // --- Controller ---
  const controllerContent = `import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { Create${pascalName}Dto } from '../dto/create-${moduleName}.dto';
import { Update${pascalName}Dto } from '../dto/update-${moduleName}.dto';
import { Find${pascalName}Service } from '../services/find-${moduleName}.service';
import { Create${pascalName}Service } from '../services/create-${moduleName}.service';
import { Update${pascalName}Service } from '../services/update-${moduleName}.service';
import { Delete${pascalName}Service } from '../services/delete-${moduleName}.service';

@Controller('${moduleName}')
@UseGuards(JwtAuthGuard)
export class ${pascalName}Controller {
  constructor(
    private readonly findService: Find${pascalName}Service,
    private readonly createService: Create${pascalName}Service,
    private readonly updateService: Update${pascalName}Service,
    private readonly deleteService: Delete${pascalName}Service,
  ) {}

  @Get()
  async findAll(@CurrentUser() user: any) {
    return this.findService.findAll(user.organizationId || user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.findService.findOne(id, user.organizationId || user.id);
  }

  @Post()
  async create(@Body() dto: Create${pascalName}Dto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: Update${pascalName}Dto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
`;
  fs.writeFileSync(path.join(modulePath, 'controllers', `${moduleName}.controller.ts`), controllerContent);

  // --- Module ---
  const moduleContent = `import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ${entityClassName} } from './entities/${entityFile.replace('.ts', '')}';
import { ${pascalName}Controller } from './controllers/${moduleName}.controller';
import { Find${pascalName}Service } from './services/find-${moduleName}.service';
import { Create${pascalName}Service } from './services/create-${moduleName}.service';
import { Update${pascalName}Service } from './services/update-${moduleName}.service';
import { Delete${pascalName}Service } from './services/delete-${moduleName}.service';

@Module({
  imports: [TypeOrmModule.forFeature([${entityClassName}])],
  controllers: [${pascalName}Controller],
  providers: [
    Find${pascalName}Service,
    Create${pascalName}Service,
    Update${pascalName}Service,
    Delete${pascalName}Service,
  ],
  exports: [Find${pascalName}Service],
})
export class ${pascalName}Module {}
`;
  fs.writeFileSync(path.join(modulePath, `${moduleName}.module.ts`), moduleContent);

  generatedCount++;
}

console.log('Successfully generated boilerplate for ' + generatedCount + ' modules.');
