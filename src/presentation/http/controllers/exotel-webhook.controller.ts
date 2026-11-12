import { All, Body, Controller, HttpCode, Query, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { ResolveIncomingCallUseCase } from '../../../application/use-cases/resolve-incoming-call.use-case';
import { UpdateCallStatusUseCase } from '../../../application/use-cases/update-call-status.use-case';
import { unwrap } from '../filters/problem';
import { WebhookTokenGuard } from '../guards/auth.guards';

type Params = Record<string, unknown>;

/** Exotel sends the same fields in the query string (GET) or form body (POST); read either. */
function pick(query: Params, body: Params, ...names: string[]): string | undefined {
  for (const name of names) {
    const value = query?.[name] ?? body?.[name];
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return undefined;
}

/**
 * Webhooks called by Exotel. Not documented in Swagger: they are configured in the Exotel dashboard.
 *
 * Exotel flow setup: ExoPhone -> "Connect" applet with a dynamic URL pointing to
 *   /api/v1/exotel/incoming?token=<WEBHOOK_TOKEN>
 * and the call "StatusCallback" URL pointing to
 *   /api/v1/exotel/status?token=<WEBHOOK_TOKEN>
 */
@ApiExcludeController()
@UseGuards(WebhookTokenGuard)
@Controller({ path: 'exotel', version: '1' })
export class ExotelWebhookController {
  constructor(
    private readonly resolveCall: ResolveIncomingCallUseCase,
    private readonly updateStatus: UpdateCallStatusUseCase,
  ) {}

  /** Exotel asks where to route a call made to a virtual number. */
  @All('incoming')
  @HttpCode(200)
  async incoming(@Query() query: Params, @Body() body: Params) {
    const routing = unwrap(
      await this.resolveCall.execute({
        callSid: pick(query, body, 'CallSid'),
        from: pick(query, body, 'CallFrom', 'From'),
        to: pick(query, body, 'CallTo', 'To'),
      }),
    );

    // Exotel "Connect" applet dynamic-URL response format.
    return {
      fetch_after_attempt: false,
      destination: { numbers: [`+${routing.destination}`] },
      outgoing_phone_number: `+${routing.callerId}`,
      record: routing.record,
      max_conversation_duration: routing.maxDurationSeconds,
    };
  }

  /** Exotel reports how the call ended. */
  @All('status')
  @HttpCode(200)
  async status(@Query() query: Params, @Body() body: Params) {
    const duration = Number(pick(query, body, 'ConversationDuration', 'Duration'));
    unwrap(
      await this.updateStatus.execute({
        callSid: pick(query, body, 'CallSid'),
        status: pick(query, body, 'Status', 'CallStatus'),
        durationSeconds: Number.isFinite(duration) ? duration : undefined,
      }),
    );
    return { received: true };
  }
}
