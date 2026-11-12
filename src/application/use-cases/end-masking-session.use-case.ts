import { Injectable } from '@nestjs/common';
import { MaskingErrors } from '../../domain/errors/masking-errors';
import { MaskingSessionRepository } from '../../domain/repositories';
import { Result, fail, ok } from '../../shared/result';

/** Ends a session early (e.g. ride finished). The virtual number is freed immediately. */
@Injectable()
export class EndMaskingSessionUseCase {
  constructor(private readonly sessions: MaskingSessionRepository) {}

  async execute(id: string): Promise<Result<true>> {
    const session = await this.sessions.findById(id);
    if (!session) return fail(MaskingErrors.SessionNotFound);

    session.end();
    await this.sessions.save(session);
    return ok(true);
  }
}
