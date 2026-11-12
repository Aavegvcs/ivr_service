/** Things the application needs from the outside world, implemented in infrastructure/. */
export abstract class DateTimeProvider {
  abstract now(): Date;
}

export abstract class IdGenerator {
  abstract newId(): string;
}

export abstract class IvrSettings {
  abstract readonly defaultCountryCode: string;
  abstract readonly defaultSessionTtlMinutes: number;
  abstract readonly maxCallDurationSeconds: number;
  abstract readonly recordCalls: boolean;
}
