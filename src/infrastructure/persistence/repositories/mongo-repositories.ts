import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CallLog, CallStatus, CallbackRecord } from '../../../domain/call-log';
import { MaskingSession, SessionStatus } from '../../../domain/masking-session';
import { CallLogRepository, MaskingSessionRepository, VirtualNumberRepository } from '../../../domain/repositories';
import { VirtualNumber } from '../../../domain/virtual-number';
import { CallLogDoc, MaskingSessionDoc, VirtualNumberDoc } from '../schemas/mongo-schemas';

@Injectable()
export class MongoMaskingSessionRepository extends MaskingSessionRepository {
  constructor(@InjectModel(MaskingSessionDoc.name) private readonly model: Model<MaskingSessionDoc>) {
    super();
  }

  async save(session: MaskingSession): Promise<void> {
    await this.model.replaceOne(
      { _id: session.id },
      {
        _id: session.id,
        partyA: session.partyA,
        partyB: session.partyB,
        virtualNumber: session.virtualNumber,
        referenceId: session.referenceId,
        tripId: session.tripId,
        tenantName: session.tenantName,
        status: session.status,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt,
      },
      { upsert: true },
    );
  }

  async findById(id: string): Promise<MaskingSession | null> {
    const doc = await this.model.findById(id).lean<MaskingSessionDoc>();
    return doc ? this.toDomain(doc) : null;
  }

  async findActiveForCaller(virtualNumber: string, caller: string, now: Date): Promise<MaskingSession | null> {
    const doc = await this.model
      .findOne({
        virtualNumber,
        status: 'active',
        expiresAt: { $gt: now },
        $or: [{ partyA: caller }, { partyB: caller }],
      })
      .sort({ createdAt: -1 }) // latest session wins
      .lean<MaskingSessionDoc>();
    return doc ? this.toDomain(doc) : null;
  }

  private toDomain(doc: MaskingSessionDoc): MaskingSession {
    return new MaskingSession({
      id: doc._id,
      partyA: doc.partyA,
      partyB: doc.partyB,
      virtualNumber: doc.virtualNumber,
      referenceId: doc.referenceId ?? null,
      tripId: doc.tripId,
      tenantName: doc.tenantName,
      status: doc.status as SessionStatus,
      expiresAt: doc.expiresAt,
      createdAt: doc.createdAt,
    });
  }
}

@Injectable()
export class MongoVirtualNumberRepository extends VirtualNumberRepository {
  constructor(
    @InjectModel(VirtualNumberDoc.name) private readonly model: Model<VirtualNumberDoc>,
    @InjectModel(MaskingSessionDoc.name) private readonly sessions: Model<MaskingSessionDoc>,
  ) {
    super();
  }

  async save(number: VirtualNumber): Promise<void> {
    await this.model.replaceOne(
      { _id: number.id },
      { _id: number.id, number: number.number, isActive: number.isActive, createdAt: number.createdAt },
      { upsert: true },
    );
  }

  async exists(number: string): Promise<boolean> {
    return (await this.model.exists({ number })) !== null;
  }

  /** Prefers a number none of `parties` is using right now; otherwise reuses the oldest active one. */
  async allocateFor(parties: string[], now: Date): Promise<VirtualNumber | null> {
    const busy: string[] = await this.sessions.distinct('virtualNumber', {
      status: 'active',
      expiresAt: { $gt: now },
      $or: [{ partyA: { $in: parties } }, { partyB: { $in: parties } }],
    });

    const doc =
      (await this.model.findOne({ isActive: true, number: { $nin: busy } }).sort({ createdAt: 1 }).lean<VirtualNumberDoc>()) ??
      (await this.model.findOne({ isActive: true }).sort({ createdAt: 1 }).lean<VirtualNumberDoc>());

    return doc ? new VirtualNumber(doc._id, doc.number, doc.isActive, doc.createdAt) : null;
  }
}

@Injectable()
export class MongoCallLogRepository extends CallLogRepository {
  constructor(@InjectModel(CallLogDoc.name) private readonly model: Model<CallLogDoc>) {
    super();
  }

  async save(log: CallLog): Promise<void> {
    await this.model.replaceOne(
      { _id: log.id },
      {
        _id: log.id,
        callSid: log.callSid,
        sessionId: log.sessionId,
        tripId: log.tripId,
        tenantName: log.tenantName,
        virtualNumber: log.virtualNumber,
        callerNumber: log.callerNumber,
        destinationNumber: log.destinationNumber,
        status: log.status,
        durationSeconds: log.durationSeconds,
        recordingUrl: log.recordingUrl,
        callbacks: log.callbacks,
        createdAt: log.createdAt,
        updatedAt: log.updatedAt,
      },
      { upsert: true },
    );
  }

  async findByCallSid(callSid: string): Promise<CallLog | null> {
    const doc = await this.model.findOne({ callSid }).lean<CallLogDoc>();
    if (!doc) return null;
    return new CallLog({
      id: doc._id,
      callSid: doc.callSid,
      sessionId: doc.sessionId,
      tripId: doc.tripId,
      tenantName: doc.tenantName,
      virtualNumber: doc.virtualNumber,
      callerNumber: doc.callerNumber,
      destinationNumber: doc.destinationNumber,
      status: doc.status as CallStatus,
      durationSeconds: doc.durationSeconds ?? null,
      recordingUrl: doc.recordingUrl ?? null,
      callbacks: (doc.callbacks ?? []) as unknown as CallbackRecord[],
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }
}
