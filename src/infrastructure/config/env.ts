import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IvrSettings } from '../../application/ports/ports';

const REQUIRED = ['API_KEY', 'WEBHOOK_TOKEN', 'MONGO_URI'];

/** Fails fast at startup if a required variable is missing. */
export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const missing = REQUIRED.filter((key) => !config[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  return config;
}

@Injectable()
export class EnvIvrSettings extends IvrSettings {
  readonly defaultCountryCode: string;
  readonly defaultSessionTtlMinutes: number;
  readonly maxCallDurationSeconds: number;
  readonly ringTimeoutSeconds: number;
  readonly recordCalls: boolean;

  constructor(config: ConfigService) {
    super();
    this.defaultCountryCode = config.get('DEFAULT_COUNTRY_CODE', '91');
    this.defaultSessionTtlMinutes = Number(config.get('SESSION_TTL_MINUTES', 60));
    this.maxCallDurationSeconds = Number(config.get('MAX_CALL_DURATION_SECONDS', 3600));
    this.ringTimeoutSeconds = Number(config.get('RING_TIMEOUT_SECONDS', 20));
    this.recordCalls = String(config.get('RECORD_CALLS', 'false')) === 'true';
  }
}
