export type CallStatus = 'initiated' | 'completed' | 'busy' | 'no-answer' | 'failed' | 'canceled';

export interface CallLogProps {
  id: string;
  callSid: string;
  sessionId: string;
  virtualNumber: string;
  callerNumber: string;
  destinationNumber: string;
  status: CallStatus;
  durationSeconds: number | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Audit record for each masked call that was routed. */
export class CallLog {
  constructor(private readonly props: CallLogProps) {}

  get id() { return this.props.id; }
  get callSid() { return this.props.callSid; }
  get sessionId() { return this.props.sessionId; }
  get virtualNumber() { return this.props.virtualNumber; }
  get callerNumber() { return this.props.callerNumber; }
  get destinationNumber() { return this.props.destinationNumber; }
  get status() { return this.props.status; }
  get durationSeconds() { return this.props.durationSeconds; }
  get createdAt() { return this.props.createdAt; }
  get updatedAt() { return this.props.updatedAt; }

  updateStatus(status: CallStatus, durationSeconds: number | null, now: Date): void {
    this.props.status = status;
    this.props.durationSeconds = durationSeconds;
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
