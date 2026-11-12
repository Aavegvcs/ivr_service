import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { DateTimeProvider, IdGenerator } from '../application/ports/ports';

@Injectable()
export class SystemDateTimeProvider extends DateTimeProvider {
  now(): Date {
    return new Date();
  }
}

@Injectable()
export class UuidGenerator extends IdGenerator {
  newId(): string {
    return randomUUID();
  }
}
