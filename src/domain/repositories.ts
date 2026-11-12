import { CallLog } from './call-log';
import { MaskingSession } from './masking-session';
import { VirtualNumber } from './virtual-number';

/**
 * Repository ports. Abstract classes (not interfaces) so NestJS can use them
 * directly as injection tokens. Implementations live in infrastructure/.
 */
export abstract class MaskingSessionRepository {
  abstract save(session: MaskingSession): Promise<void>;
  abstract findById(id: string): Promise<MaskingSession | null>;
  /** Active, unexpired session on this virtual number where `caller` is one of the parties. */
  abstract findActiveForCaller(virtualNumber: string, caller: string, now: Date): Promise<MaskingSession | null>;
}

export abstract class VirtualNumberRepository {
  abstract save(number: VirtualNumber): Promise<void>;
  abstract exists(number: string): Promise<boolean>;
  /**
   * A pool number not currently used by an active session that involves any of `parties`.
   * This guarantees that a caller never maps to two different counterparts on one number.
   */
  abstract findFreeFor(parties: string[], now: Date): Promise<VirtualNumber | null>;
}

export abstract class CallLogRepository {
  abstract save(log: CallLog): Promise<void>;
  abstract findByCallSid(callSid: string): Promise<CallLog | null>;
}
