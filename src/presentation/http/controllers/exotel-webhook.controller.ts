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
      max_ringing_duration: routing.ringTimeoutSeconds,
    };
  }

  /** Exotel StatusCallback: how the call ended. Unknown CallSid -> 404. */
  @All('status')
  @HttpCode(200)
  async status(@Query() query: Params, @Body() body: Params) {
    unwrap(await this.record('status', query, body));
    return { received: true };
  }

  /**
   * Passthru applet placed on the "call connected / answered" branch of the Connect applet.
   * Records the call as completed (unless Exotel sends its own status).
   * Always answers 200 so the Exotel flow is never derailed by us.
   */
  @All('passthru/pass')
  @HttpCode(200)
  async passthruPass(@Query() query: Params, @Body() body: Params) {
    return this.recordLeniently('passthru/pass', query, body, 'completed');
  }

  /**
   * Passthru applet placed on the "failed / not answered / busy" branch of the Connect applet.
   * Records the call as failed (unless Exotel sends a more specific status such as no-answer or busy).
   */
  @All('passthru/fail')
  @HttpCode(200)
  async passthruFail(@Query() query: Params, @Body() body: Params) {
    return this.recordLeniently('passthru/fail', query, body, 'failed');
  }

  /** Generic Passthru: record whatever status Exotel sends. */
  @All('passthru')
  @HttpCode(200)
  async passthru(@Query() query: Params, @Body() body: Params) {
    return this.recordLeniently('passthru', query, body);
  }

  private async recordLeniently(route: string, query: Params, body: Params, fallbackStatus?: string) {
    const result = await this.updateStatus.execute(this.parseCallResult(route, query, body, fallbackStatus));
    return { received: result.ok };
  }

  private record(route: string, query: Params, body: Params) {
    return this.updateStatus.execute(this.parseCallResult(route, query, body));
  }

  private parseCallResult(route: string, query: Params, body: Params, fallbackStatus?: string) {
    // Keep the raw callback (without the shared token) so we can see exactly what Exotel sent.
    const { token: _token, ...rawQuery } = query ?? {};
    const params = { ...rawQuery, ...body };

    const duration = Number(pick(query, body, 'ConversationDuration', 'DialCallDuration', 'Duration'));
    return {
      callSid: pick(query, body, 'CallSid'),
      status: this.resolveStatus(
        pick(query, body, 'Status', 'CallStatus', 'DialCallStatus') ?? fallbackStatus,
        pick(query, body, 'Legs[0][Cause]'),
        pick(query, body, 'Legs[0][DisconnectedBy]'),
      ),
      durationSeconds: Number.isFinite(duration) ? duration : undefined,
      recordingUrl: pick(query, body, 'RecordingUrl'),
      callback: { route, params },
    };
  }

  /**
   * Exotel reports a rider hang-up during ringing as "no-answer", same as a real no-answer.
   * In real test calls the two differed only in the leg details:
   *   real no-answer (3 calls): Cause 1001, DisconnectedBy Exotel (ring timeout)
   *   rider cancel   (4 calls): Cause 16, or DisconnectedBy Operator
   * So a "no-answer" with either of those signals is stored as "canceled".
   * Based on a small sample: re-check against callbacks in call_logs from time to time.
   */
  private resolveStatus(
    status: string | undefined,
    cause: string | undefined,
    disconnectedBy: string | undefined,
  ): string | undefined {
    const looksCancelled = cause === '16' || disconnectedBy === 'Operator';
    return status === 'no-answer' && looksCancelled ? 'canceled' : status;
  }
}
