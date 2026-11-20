import { Injectable, Logger } from '@nestjs/common';
import { CallLog } from '../../domain/call-log';
import { MaskingErrors } from '../../domain/errors/masking-errors';
import { PhoneNumber } from '../../domain/phone-number';
import { CallLogRepository, MaskingSessionRepository } from '../../domain/repositories';
import { Result, fail, ok } from '../../shared/result';
import { DateTimeProvider, IdGenerator, IvrSettings } from '../ports/ports';

export interface ResolveIncomingCallInput {
  callSid?: string;
  /** Number of whoever is calling (a real party). */
  from?: string;
  /** The virtual number that was dialled. */
  to?: string;
}

export interface CallRouting {
  /** Real number to ring. Never exposed to the caller. */
  destination: string;
  /** Caller ID the callee will see: the virtual number, hiding the caller's real one. */
  callerId: string;
  record: boolean;
  maxDurationSeconds: number;
  ringTimeoutSeconds: number;
}

/**
 * Core of call masking. Exotel asks "someone dialled this virtual number, where do I send it?"
 * We find the active session and answer with the counterpart's real number.
 */
@Injectable()
export class ResolveIncomingCallUseCase {
  private readonly logger = new Logger(ResolveIncomingCallUseCase.name);

  constructor(
    private readonly sessions: MaskingSessionRepository,
    private readonly callLogs: CallLogRepository,
    private readonly clock: DateTimeProvider,
    private readonly ids: IdGenerator,
    private readonly settings: IvrSettings,
  ) {}

  async execute(input: ResolveIncomingCallInput): Promise<Result<CallRouting>> {
    if (!input.callSid || !input.from || !input.to) return fail(MaskingErrors.MissingCallParams);

    const caller = PhoneNumber.create(input.from, 'from', this.settings.defaultCountryCode);
    if (!caller.ok) return fail(...caller.errors);
    // Exactly what Exotel sent as CallTo; it must equal the virtual number stored in the pool.
    const virtual = input.to.trim();

    const now = this.clock.now();
    const session = await this.sessions.findActiveForCaller(virtual, caller.value.value, now);
    const destination = session?.isActiveAt(now) ? session.counterpartOf(caller.value.value) : null;

    if (!session || !destination) {
      this.logger.warn(`No active session for call ${input.callSid} on virtual number ${virtual}`);
      return fail(MaskingErrors.NoActiveSessionForCall);
    }

    await this.callLogs.save(
      new CallLog({
        id: this.ids.newId(),
        callSid: input.callSid,
        sessionId: session.id,
        tripId: session.tripId,
        tenantName: session.tenantName,
        virtualNumber: virtual,
        callerNumber: caller.value.value,
        destinationNumber: destination,
        status: 'initiated',
        durationSeconds: null,
        callbacks: [],
        recordingUrl: null,
        createdAt: now,
        updatedAt: now,
      }),
    );

    return ok({
      destination,
      callerId: callerIdFor(virtual, this.settings.defaultCountryCode),
      record: this.settings.recordCalls,
      maxDurationSeconds: this.settings.maxCallDurationSeconds,
      ringTimeoutSeconds: this.settings.ringTimeoutSeconds,
    });
  }
}

/**
 * Caller ID sent back to Exotel (shown to the callee): the virtual number with country code,
 * as in the calls that worked (+918047285000). Only this reply is reformatted; nothing stored is changed.
 */
function callerIdFor(virtual: string, defaultCountryCode: string): string {
  const phone = PhoneNumber.create(virtual, 'to', defaultCountryCode);
  return phone.ok ? phone.value.value : virtual.replace(/D/g, '');
}
