import { timingSafeEqual } from 'node:crypto';
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Internal callers (your other microservices) send `X-Api-Key`. Same idea as ApiKeyAuthFilter in the Identity API. */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const provided = req.header('x-api-key');
    if (!provided) throw new UnauthorizedException('API Key missing.');
    if (!safeEqual(provided, this.config.getOrThrow<string>('API_KEY'))) {
      throw new UnauthorizedException('Invalid API Key.');
    }
    return true;
  }
}

/**
 * Exotel cannot send custom headers on webhooks, so it carries a shared secret
 * in the URL: https://host/api/v1/exotel/incoming?token=<WEBHOOK_TOKEN>
 */
@Injectable()
export class WebhookTokenGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const provided = typeof req.query.token === 'string' ? req.query.token : req.header('x-webhook-token');
    if (!provided || !safeEqual(provided, this.config.getOrThrow<string>('WEBHOOK_TOKEN'))) {
      throw new UnauthorizedException('Invalid webhook token.');
    }
    return true;
  }
}
