import { IsEmail } from 'class-validator';
import { 
  Entity, 
  Column, 
  ObjectIdColumn, 
  ObjectId, 
  CreateDateColumn, 
  UpdateDateColumn 
} from 'typeorm';

@Entity('password_resets')
export class PasswordReset {
  @ObjectIdColumn()
  _id: ObjectId; // MongoDB primary key, auto-generated

  @Column()
  @IsEmail()
  email: string;

  @Column()
  code: string;

  @Column()
  token: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
