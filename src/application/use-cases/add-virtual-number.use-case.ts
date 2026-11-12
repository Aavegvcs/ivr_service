import { Injectable } from '@nestjs/common';
import { MaskingErrors } from '../../domain/errors/masking-errors';
import { PhoneNumber } from '../../domain/phone-number';
import { VirtualNumberRepository } from '../../domain/repositories';
import { VirtualNumber } from '../../domain/virtual-number';
import { Result, fail, ok } from '../../shared/result';
import { DateTimeProvider, IdGenerator, IvrSettings } from '../ports/ports';

/** Adds an Exotel number (ExoPhone) to the pool used for masking. */
@Injectable()
export class AddVirtualNumberUseCase {
  constructor(
    private readonly virtualNumbers: VirtualNumberRepository,
    private readonly clock: DateTimeProvider,
    private readonly ids: IdGenerator,
    private readonly settings: IvrSettings,
  ) {}

  async execute(rawNumber: string): Promise<Result<VirtualNumber>> {
    const phone = PhoneNumber.create(rawNumber, 'number', this.settings.defaultCountryCode);
    if (!phone.ok) return fail(...phone.errors);

    if (await this.virtualNumbers.exists(phone.value.value)) return fail(MaskingErrors.VirtualNumberExists);

    const virtualNumber = new VirtualNumber(this.ids.newId(), phone.value.value, true, this.clock.now());
    await this.virtualNumbers.save(virtualNumber);
    return ok(virtualNumber);
  }
}
