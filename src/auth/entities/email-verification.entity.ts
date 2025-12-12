import { 
  Entity, 
  Column, 
  ObjectIdColumn, 
  ObjectId, 
  CreateDateColumn, 
  UpdateDateColumn 
} from 'typeorm';

@Entity('email_verifications')
export class EmailVerification {
  @ObjectIdColumn()
  _id: ObjectId; // MongoDB primary key, auto-generated

  @Column()
  email: string;

  @Column()
  code: string;

  @Column({ default: false })
  verified: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
