import { Result, fail, ok } from '../shared/result';
import { MaskingErrors } from './errors/masking-errors';

/**
 * Value object. Always stored as digits only, with country code (e.g. "919876543210").
 * Exotel sends numbers as "09876543210", "+919876543210" or "9876543210",
 * so everything is normalised to one form before being compared.
 */
export class PhoneNumber {
  private constructor(readonly value: string) {}

  static create(raw: string | undefined | null, field: string, defaultCountryCode: string): Result<PhoneNumber> {
    let digits = (raw ?? '').replace(/\D/g, '');

    if (digits.length === 11 && digits.startsWith('0')) {
      digits = digits.slice(1); // national format with trunk prefix
    }
    if (digits.length === 10) {
      digits = defaultCountryCode + digits;
    }
    if (digits.length < 11 || digits.length > 15) {
      return fail(MaskingErrors.InvalidPhoneNumber(field));
    }
    return ok(new PhoneNumber(digits));
  }

  /** Outbound format Exotel expects. */
  toE164(): string {
    return `+${this.value}`;
  }
}
