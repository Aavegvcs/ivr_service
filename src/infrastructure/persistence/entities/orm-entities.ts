import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

/**
 * Database shapes. Kept separate from the domain classes so the domain
 * stays free of TypeORM; the repositories map between the two.
 */

@Entity('virtual_numbers')
export class VirtualNumberOrm {
  @PrimaryColumn('uuid') id: string;
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 20 }) number: string;
  @Column({ type: 'boolean', default: true }) isActive: boolean;
  @Column({ type: 'timestamptz' }) createdAt: Date;
}

@Entity('masking_sessions')
@Index(['virtualNumber', 'status'])
export class MaskingSessionOrm {
  @PrimaryColumn('uuid') id: string;
  @Column({ type: 'varchar', length: 20 }) partyA: string;
  @Column({ type: 'varchar', length: 20 }) partyB: string;
  @Column({ type: 'varchar', length: 20 }) virtualNumber: string;
  @Column({ type: 'varchar', length: 100, nullable: true }) referenceId: string | null;
  @Column({ type: 'varchar', length: 10 }) status: string;
  @Column({ type: 'timestamptz' }) expiresAt: Date;
  @Column({ type: 'timestamptz' }) createdAt: Date;
}

@Entity('call_logs')
export class CallLogOrm {
  @PrimaryColumn('uuid') id: string;
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 100 }) callSid: string;
  @Column({ type: 'uuid' }) sessionId: string;
  @Column({ type: 'varchar', length: 20 }) virtualNumber: string;
  @Column({ type: 'varchar', length: 20 }) callerNumber: string;
  @Column({ type: 'varchar', length: 20 }) destinationNumber: string;
  @Column({ type: 'varchar', length: 20 }) status: string;
  @Column({ type: 'int', nullable: true }) durationSeconds: number | null;
  @Column({ type: 'timestamptz' }) createdAt: Date;
  @Column({ type: 'timestamptz' }) updatedAt: Date;
}
