import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CallLog, CallStatus } from '../../../domain/call-log';
import { MaskingSession, SessionStatus } from '../../../domain/masking-session';
import { CallLogRepository, MaskingSessionRepository, VirtualNumberRepository } from '../../../domain/repositories';
import { VirtualNumber } from '../../../domain/virtual-number';
import { CallLogOrm, MaskingSessionOrm, VirtualNumberOrm } from '../entities/orm-entities';

@Injectable()
export class TypeOrmMaskingSessionRepository extends MaskingSessionRepository {
  constructor(@InjectRepository(MaskingSessionOrm) private readonly repo: Repository<MaskingSessionOrm>) {
    super();
  }

  async save(session: MaskingSession): Promise<void> {
    await this.repo.save({
      id: session.id,
      partyA: session.partyA,
      partyB: session.partyB,
      virtualNumber: session.virtualNumber,
      referenceId: session.referenceId,
      status: session.status,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
    });
  }

  async findById(id: string): Promise<MaskingSession | null> {
    const row = await this.repo.findOneBy({ id });
    return row ? this.toDomain(row) : null;
  }

  async findActiveForCaller(virtualNumber: string, caller: string, now: Date): Promise<MaskingSession | null> {
    const row = await this.repo
      .createQueryBuilder('s')
      .where('s.virtualNumber = :virtualNumber', { virtualNumber })
      .andWhere("s.status = 'active'")
      .andWhere('s.expiresAt > :now', { now })
      .andWhere('(s.partyA = :caller OR s.partyB = :caller)', { caller })
      .orderBy('s.createdAt', 'DESC')
      .getOne();
    return row ? this.toDomain(row) : null;
  }

  private toDomain(row: MaskingSessionOrm): MaskingSession {
    return new MaskingSession({ ...row, status: row.status as SessionStatus });
  }
}

@Injectable()
export class TypeOrmVirtualNumberRepository extends VirtualNumberRepository {
  constructor(@InjectRepository(VirtualNumberOrm) private readonly repo: Repository<VirtualNumberOrm>) {
    super();
  }

  async save(number: VirtualNumber): Promise<void> {
    await this.repo.save({ id: number.id, number: number.number, isActive: number.isActive, createdAt: number.createdAt });
  }

  exists(number: string): Promise<boolean> {
    return this.repo.existsBy({ number });
  }

  async findFreeFor(parties: string[], now: Date): Promise<VirtualNumber | null> {
    const row = await this.repo
      .createQueryBuilder('v')
      .where('v.isActive = true')
      .andWhere(
        `NOT EXISTS (
          SELECT 1 FROM masking_sessions s
          WHERE s."virtualNumber" = v.number
            AND s.status = 'active'
            AND s."expiresAt" > :now
            AND (s."partyA" IN (:...parties) OR s."partyB" IN (:...parties))
        )`,
        { now, parties },
      )
      .orderBy('v.createdAt', 'ASC')
      .getOne();
    return row ? new VirtualNumber(row.id, row.number, row.isActive, row.createdAt) : null;
  }
}

@Injectable()
export class TypeOrmCallLogRepository extends CallLogRepository {
  constructor(@InjectRepository(CallLogOrm) private readonly repo: Repository<CallLogOrm>) {
    super();
  }

  async save(log: CallLog): Promise<void> {
    await this.repo.save({
      id: log.id,
      callSid: log.callSid,
      sessionId: log.sessionId,
      virtualNumber: log.virtualNumber,
      callerNumber: log.callerNumber,
      destinationNumber: log.destinationNumber,
      status: log.status,
      durationSeconds: log.durationSeconds,
      createdAt: log.createdAt,
      updatedAt: log.updatedAt,
    });
  }

  async findByCallSid(callSid: string): Promise<CallLog | null> {
    const row = await this.repo.findOneBy({ callSid });
    return row ? new CallLog({ ...row, status: row.status as CallStatus }) : null;
  }
}
