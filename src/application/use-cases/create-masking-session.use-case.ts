import { Injectable } from '@nestjs/common';
import { MaskingErrors } from '../../domain/errors/masking-errors';
import { MaskingSession } from '../../domain/masking-session';
import { PhoneNumber } from '../../domain/phone-number';
import { MaskingSessionRepository, VirtualNumberRepository } from '../../domain/repositories';
import { Result, fail, ok } from '../../shared/result';
import { DateTimeProvider, IdGenerator, IvrSettings } from '../ports/ports';

export interface CreateMaskingSessionInput {
  partyA: string;
  partyB: string;
  ttlMinutes?: number;
  referenceId?: string;
}

/** Links two real numbers to a free virtual number. */
@Injectable()
export class CreateMaskingSessionUseCase {
  constructor(
    private readonly sessions: MaskingSessionRepository,
    private readonly virtualNumbers: VirtualNumberRepository,
    private readonly clock: DateTimeProvider,
    private readonly ids: IdGenerator,
    private readonly settings: IvrSettings,
  ) {}

  async execute(input: CreateMaskingSessionInput): Promise<Result<MaskingSession>> {
    const partyA = PhoneNumber.create(input.partyA, 'partyA', this.settings.defaultCountryCode);
    if (!partyA.ok) return fail(...partyA.errors);
    const partyB = PhoneNumber.create(input.partyB, 'partyB', this.settings.defaultCountryCode);
    if (!partyB.ok) return fail(...partyB.errors);
    if (partyA.value.value === partyB.value.value) return fail(MaskingErrors.SamePartyNumbers);

    const ttlMinutes = input.ttlMinutes ?? this.settings.defaultSessionTtlMinutes;
    if (ttlMinutes <= 0) return fail(MaskingErrors.InvalidTtl);

    const now = this.clock.now();
    const virtualNumber = await this.virtualNumbers.findFreeFor([partyA.value.value, partyB.value.value], now);
    if (!virtualNumber) return fail(MaskingErrors.NoVirtualNumberAvailable);

    const session = new MaskingSession({
      id: this.ids.newId(),
      partyA: partyA.value.value,
      partyB: partyB.value.value,
      virtualNumber: virtualNumber.number,
      referenceId: input.referenceId ?? null,
      status: 'active',
      expiresAt: new Date(now.getTime() + ttlMinutes * 60_000),
      createdAt: now,
    });
    await this.sessions.save(session);
    return ok(session);
  }
}
