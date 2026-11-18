export type CallStatus = 'initiated' | 'completed' | 'busy' | 'no-answer' | 'failed' | 'canceled';

/** One raw callback received from the provider (kept so we can see exactly what it sent). */
export interface CallbackRecord {
  route: string;
  receivedAt: string;
  params: Record<string, unknown>;
}

export interface CallLogProps {
  id: string;
  callSid: string;
  sessionId: string;
  tripId: string;
  tenantName: string;
  virtualNumber: string;
  callerNumber: string;
  destinationNumber: string;
  status: CallStatus;
  durationSeconds: number | null;
  recordingUrl: string | null;
  callbacks: CallbackRecord[];
  createdAt: Date;
  updatedAt: Date;
}

/** Audit record for each masked call that was routed. */
export class CallLog {
  constructor(private readonly props: CallLogProps) {}

  get id() { return this.props.id; }
  get callSid() { return this.props.callSid; }
  get sessionId() { return this.props.sessionId; }
  get tripId() { return this.props.tripId; }
  get tenantName() { return this.props.tenantName; }
  get virtualNumber() { return this.props.virtualNumber; }
  get callerNumber() { return this.props.callerNumber; }
  get destinationNumber() { return this.props.destinationNumber; }
  get status() { return this.props.status; }
  get durationSeconds() { return this.props.durationSeconds; }
  get recordingUrl() { return this.props.recordingUrl; }
  get callbacks() { return this.props.callbacks; }
  get createdAt() { return this.props.createdAt; }
  get updatedAt() { return this.props.updatedAt; }

  recordCallback(route: string, params: Record<string, unknown>, now: Date): void {
    this.props.callbacks = [...this.props.callbacks, { route, receivedAt: now.toISOString(), params }];
  }

  updateStatus(status: CallStatus, durationSeconds: number | null, recordingUrl: string | null, now: Date): void {
    this.props.status = status;
    this.props.durationSeconds = durationSeconds;
    this.props.recordingUrl = recordingUrl;
    this.props.updatedAt = now;
  }

  /** Maps Exotel's status strings to our own. Unknown values count as failed. */
  static parseStatus(raw: string | undefined): CallStatus {
    switch ((raw ?? '').toLowerCase()) {
      case 'completed': return 'completed';
      case 'busy': return 'busy';
      case 'no-answer': return 'no-answer';
      case 'canceled': return 'canceled';
      default: return 'failed';
    }
  }
}
