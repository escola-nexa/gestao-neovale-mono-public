import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';

// Carrega as variáveis de ambiente locais ou do docker
config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres_password',
  database: process.env.DB_NAME || 'sigeo_db',
  synchronize: false, // OBRIGATÓRIO SER FALSE EM PROD/MIGRATIONS
  logging: true,
  entities: [join(__dirname, '../../**/*.entity{.ts,.js}')],
  migrations: [join(__dirname, '../../database/migrations/*{.ts,.js}')],
  subscribers: [],
});
