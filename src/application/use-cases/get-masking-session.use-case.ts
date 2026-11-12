import { Injectable } from '@nestjs/common';
import { MaskingErrors } from '../../domain/errors/masking-errors';
import { MaskingSession } from '../../domain/masking-session';
import { MaskingSessionRepository } from '../../domain/repositories';
import { Result, fail, ok } from '../../shared/result';

@Injectable()
export class GetMaskingSessionUseCase {
  constructor(private readonly sessions: MaskingSessionRepository) {}

  async execute(id: string): Promise<Result<MaskingSession>> {
    const session = await this.sessions.findById(id);
    return session ? ok(session) : fail(MaskingErrors.SessionNotFound);
  }
}
