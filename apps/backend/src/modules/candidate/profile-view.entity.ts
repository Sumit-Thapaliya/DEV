import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** Ritik's unique recruiter/candidate view history; a repeat open is not a new viewer. */
@Entity({ name: 'profile_views' })
@Index('UQ_profile_views_recruiter_candidate', ['recruiterId', 'candidateId'], {
  unique: true,
})
@Index('IDX_profile_views_recruiter_created', ['recruiterId', 'createdAt'])
export class ProfileView {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  recruiterId!: string;

  @Column({ type: 'uuid' })
  candidateId!: string;

  @CreateDateColumn({ name: 'createdAt', type: 'timestamp with time zone' })
  createdAt!: Date;
}
