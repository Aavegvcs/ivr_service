import { Module } from '@nestjs/common';
import { ApplicationModule } from '../application/application.module';
import { ExotelWebhookController } from './http/controllers/exotel-webhook.controller';
import { MaskingSessionsController } from './http/controllers/masking-sessions.controller';
import { ApiKeyGuard, WebhookTokenGuard } from './http/guards/auth.guards';

@Module({
  imports: [ApplicationModule],
  controllers: [MaskingSessionsController, ExotelWebhookController],
  providers: [ApiKeyGuard, WebhookTokenGuard],
})
export class PresentationModule {}
