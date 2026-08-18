import 'dotenv/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import { entities } from './entities';
import { migrations } from './migrations';

const baseOptions = {
  type: 'postgres' as const,
  entities,
  migrations,
};

const options: DataSourceOptions = process.env.DATABASE_URL
  ? {
      ...baseOptions,
      url: process.env.DATABASE_URL,
    }
  : {
      ...baseOptions,
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'fullstack_db',
    };

export default new DataSource(options);
