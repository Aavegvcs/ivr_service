import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { validateEnv } from './infrastructure/config/env';
import { PresentationModule } from './presentation/presentation.module';

const isProd = process.env.NODE_ENV === 'production';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: isProd ? 'info' : 'debug',
        transport: isProd ? undefined : { target: 'pino-pretty' },
        redact: ['req.headers["x-api-key"]', 'req.headers.authorization'],
        // Drop the query string from logs: webhook URLs carry the shared token.
        serializers: {
          req: (req: { id: unknown; method: string; url: string }) => ({
            id: req.id,
            method: req.method,
            url: req.url.split('?')[0],
          }),
        },
      },
    }),
    PresentationModule,
  ],
})
export class AppModule {}
