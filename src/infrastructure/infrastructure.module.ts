import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DateTimeProvider, IdGenerator, IvrSettings } from '../application/ports/ports';
import { CallLogRepository, MaskingSessionRepository, VirtualNumberRepository } from '../domain/repositories';
import { EnvIvrSettings } from './config/env';
import { CallLogOrm, MaskingSessionOrm, VirtualNumberOrm } from './persistence/entities/orm-entities';
import {
  TypeOrmCallLogRepository,
  TypeOrmMaskingSessionRepository,
  TypeOrmVirtualNumberRepository,
} from './persistence/repositories/typeorm-repositories';
import { SystemDateTimeProvider, UuidGenerator } from './services';

const entities = [VirtualNumberOrm, MaskingSessionOrm, CallLogOrm];

/** Binds every port (abstract class) to its concrete implementation. */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.get<string>('DB_HOST'),
        port: Number(config.get('DB_PORT', 5432)),
        username: config.get<string>('DB_USER'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        entities,
        // Dev convenience only. Use migrations in production.
        synchronize: String(config.get('DB_SYNCHRONIZE', 'false')) === 'true',
      }),
    }),
    TypeOrmModule.forFeature(entities),
  ],
  providers: [
    { provide: MaskingSessionRepository, useClass: TypeOrmMaskingSessionRepository },
    { provide: VirtualNumberRepository, useClass: TypeOrmVirtualNumberRepository },
    { provide: CallLogRepository, useClass: TypeOrmCallLogRepository },
    { provide: DateTimeProvider, useClass: SystemDateTimeProvider },
    { provide: IdGenerator, useClass: UuidGenerator },
    { provide: IvrSettings, useClass: EnvIvrSettings },
  ],
  exports: [
    MaskingSessionRepository,
    VirtualNumberRepository,
    CallLogRepository,
    DateTimeProvider,
    IdGenerator,
    IvrSettings,
  ],
})
export class InfrastructureModule {}
