import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { User } from './users/entities/user.entity';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL, // use Supabase URL
  ssl: { rejectUnauthorized: false }, // required for Supabase
  synchronize: false,
  logging: true,
  entities: ['./src/**/*.entity.ts'], // or ['./dist/**/*.entity.js'] for compiled
  migrations: ['./src/migrations/*.ts'],
  subscribers: [],
});
