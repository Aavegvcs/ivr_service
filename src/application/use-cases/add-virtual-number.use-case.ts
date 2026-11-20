import { Injectable } from '@nestjs/common';
import { MaskingErrors } from '../../domain/errors/masking-errors';
import { VirtualNumberRepository } from '../../domain/repositories';
import { VirtualNumber } from '../../domain/virtual-number';
import { Result, fail, ok } from '../../shared/result';
import { DateTimeProvider, IdGenerator } from '../ports/ports';

/**
 * Adds an Exotel number (ExoPhone) to the pool used for masking.
 * The number is stored exactly as given (only surrounding spaces are removed), and every session
 * copies that same value. It must match what Exotel sends as CallTo (e.g. "08047285000").
 */
@Injectable()
export class AddVirtualNumberUseCase {
  constructor(
    private readonly virtualNumbers: VirtualNumberRepository,
    private readonly clock: DateTimeProvider,
    private readonly ids: IdGenerator,
  ) {}

  async execute(rawNumber: string): Promise<Result<VirtualNumber>> {
    const number = (rawNumber ?? '').trim();
    if (!number) return fail(MaskingErrors.InvalidPhoneNumber('number'));

    if (await this.virtualNumbers.exists(number)) return fail(MaskingErrors.VirtualNumberExists);

    const virtualNumber = new VirtualNumber(this.ids.newId(), number, true, this.clock.now());
    await this.virtualNumbers.save(virtualNumber);
    return ok(virtualNumber);
  }
}
