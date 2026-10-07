import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum UserRole {
  ADMIN = 'ADMIN',
  CANDIDATE = 'CANDIDATE',
  RECRUITER = 'RECRUITER',
  SUPERADMIN = 'SUPERADMIN',
}

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  userId!: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.CANDIDATE,
  })
  role!: UserRole;

  @Column({ type: 'varchar', unique: true, nullable: true })
  email!: string | null;

  @Column({ type: 'varchar', unique: true })
  mobile!: string;

  @Column({ type: 'varchar' })
  password!: string;

  @Column({ type: 'varchar', nullable: true })
  name!: string | null;

  @Column({ type: 'varchar', nullable: true })
  otpHash!: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  otpExpiry!: Date | null;

  @Column({ type: 'varchar', nullable: true })
  companyName!: string | null;

  @Column({ type: 'text', nullable: true })
  aboutCompany!: string | null;

  @Column({ type: 'varchar', nullable: true })
  contactNumber!: string | null;

  @Column({ type: 'text', nullable: true })
  avatar!: string | null;

  @Column({ type: 'varchar', nullable: true })
  resumeFileName!: string | null;

  @Column({ type: 'text', nullable: true })
  resumeData!: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  resumeUploadedAt!: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  resumeCanvas!: Record<string, any> | null;

  @Column({ type: 'bytea', nullable: true })
  resumePdf!: Buffer | null;

  @Column({ type: 'jsonb', nullable: true })
  parsedProfile!: Record<string, unknown> | null;

  @Column({ type: 'boolean', default: false })
  isDeleted!: boolean;

  @CreateDateColumn({ name: 'createdAt', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updatedAt', type: 'timestamp with time zone' })
  updatedAt!: Date;
}
