import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { User } from './users/entities/user.entity';

config(); // Load .env file

export const AppDataSource = new DataSource({
  type: 'mongodb',                // <- change from 'mysql' to 'mongodb'
  url: process.env.MONGO_URI,     // <- use your MongoDB connection string
  synchronize: false,             // fine for dev if you want manual index management
  logging: true,                  // optional: logs queries
  entities: ['src/**/*.entity{.ts,.js}'],
  migrations: ['src/migrations/*{.ts,.js}'], // optional for MongoDB
});
