import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { AppDataSource } from '../../core/config/data-source';
import * as bcrypt from 'bcryptjs';

async function runSeed() {
  await AppDataSource.initialize();
  console.log('📦 Conectado ao banco de dados para o Seed!');

  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const orgId = randomUUID();
    await queryRunner.query(
      "INSERT INTO organizations (id, name, created_at, updated_at) VALUES ($1, $2, NOW(), NOW())",
      [orgId, 'Sigeo Escolas Padrão']
    );
    console.log('🏢 Organização criada:', orgId);

    const userId = randomUUID(); 
    const profileId = randomUUID();
    const adminEmail = 'admin@sigeo.com';
    const adminPassword = await bcrypt.hash('admin', 10); 
    
    await queryRunner.query(
      "INSERT INTO profiles (id, user_id, email, full_name, is_active, organization_id, password, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())",
      [profileId, userId, adminEmail, 'Administrador do Sistema', true, orgId, adminPassword]
    );
    console.log('👤 Usuário Admin criado:', adminEmail, ' / Senha:', adminPassword);

    const roleId = randomUUID();
    await queryRunner.query(
      "INSERT INTO user_roles (id, user_id, role, organization_id, created_at) VALUES ($1, $2, $3, $4, NOW())",
      [roleId, userId, 'admin', orgId] 
    );
    console.log('🔑 Role (Permissão) de superadmin associada ao usuário!');

    const profUserId = randomUUID();
    const profProfileId = randomUUID();
    const profEmail = 'professor@sigeo.com';
    await queryRunner.query(
      "INSERT INTO profiles (id, user_id, email, full_name, is_active, organization_id, password, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())",
      [profProfileId, profUserId, profEmail, 'Professor de Teste', true, orgId, adminPassword]
    );
    
    const profRoleId = randomUUID();
    await queryRunner.query(
      "INSERT INTO user_roles (id, user_id, role, organization_id, created_at) VALUES ($1, $2, $3, $4, NOW())",
      [profRoleId, profUserId, 'professor', orgId]
    );
    console.log('👨‍🏫 Professor criado:', profEmail, ' / Senha:', adminPassword);

    await queryRunner.commitTransaction();
    console.log('✅ Seed executado com sucesso!');

  } catch (err) {
    console.error('❌ Erro no seed:', err);
    await queryRunner.rollbackTransaction();
  } finally {
    await queryRunner.release();
    await AppDataSource.destroy();
  }
}

runSeed();
