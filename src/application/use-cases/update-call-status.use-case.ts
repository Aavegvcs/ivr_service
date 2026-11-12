import { Injectable } from '@nestjs/common';
import { CallLog } from '../../domain/call-log';
import { MaskingErrors } from '../../domain/errors/masking-errors';
import { CallLogRepository } from '../../domain/repositories';
import { Result, fail, ok } from '../../shared/result';
import { DateTimeProvider } from '../ports/ports';

export interface UpdateCallStatusInput {
  callSid?: string;
  status?: string;
  durationSeconds?: number;
  recordingUrl?: string;
}

/** Handles Exotel's end-of-call callback and stores the outcome. */
@Injectable()
export class UpdateCallStatusUseCase {
  constructor(
    private readonly callLogs: CallLogRepository,
    private readonly clock: DateTimeProvider,
  ) {}

  async execute(input: UpdateCallStatusInput): Promise<Result<true>> {
    if (!input.callSid) return fail(MaskingErrors.MissingCallParams);

    const log = await this.callLogs.findByCallSid(input.callSid);
    if (!log) return fail(MaskingErrors.CallNotFound);

    log.updateStatus(CallLog.parseStatus(input.status), input.durationSeconds ?? null, input.recordingUrl ?? null, this.clock.now());
    await this.callLogs.save(log);
    return ok(true);
  }
}
