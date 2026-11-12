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
   * Picks a pool number for a new session. Prefers one that no active session of `parties` uses;
   * if every number is taken, reuses any active one. When a person has several sessions on the
   * same number, calls go to their latest session.
   */
  abstract allocateFor(parties: string[], now: Date): Promise<VirtualNumber | null>;
}

export abstract class CallLogRepository {
  abstract save(log: CallLog): Promise<void>;
  abstract findByCallSid(callSid: string): Promise<CallLog | null>;
}
