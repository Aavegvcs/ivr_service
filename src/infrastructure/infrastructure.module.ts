import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { DateTimeProvider, IdGenerator, IvrSettings } from '../application/ports/ports';
import { CallLogRepository, MaskingSessionRepository, VirtualNumberRepository } from '../domain/repositories';
import { EnvIvrSettings } from './config/env';
import {
  MongoCallLogRepository,
  MongoMaskingSessionRepository,
  MongoVirtualNumberRepository,
} from './persistence/repositories/mongo-repositories';
import {
  CallLogDoc,
  CallLogSchema,
  MaskingSessionDoc,
  MaskingSessionSchema,
  VirtualNumberDoc,
  VirtualNumberSchema,
} from './persistence/schemas/mongo-schemas';
import { SystemDateTimeProvider, UuidGenerator } from './services';

/** Binds every port (abstract class) to its concrete implementation. */
@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGO_URI'),
        dbName: config.get<string>('MONGO_DB_NAME', 'ivrmicroserivce'),
      }),
    }),
    MongooseModule.forFeature([
      { name: VirtualNumberDoc.name, schema: VirtualNumberSchema },
      { name: MaskingSessionDoc.name, schema: MaskingSessionSchema },
      { name: CallLogDoc.name, schema: CallLogSchema },
    ]),
  ],
  providers: [
    { provide: MaskingSessionRepository, useClass: MongoMaskingSessionRepository },
    { provide: VirtualNumberRepository, useClass: MongoVirtualNumberRepository },
    { provide: CallLogRepository, useClass: MongoCallLogRepository },
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
