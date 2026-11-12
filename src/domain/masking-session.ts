export type SessionStatus = 'active' | 'ended';

export interface MaskingSessionProps {
  id: string;
  partyA: string;
  partyB: string;
  virtualNumber: string;
  referenceId: string | null;
  status: SessionStatus;
  expiresAt: Date;
  createdAt: Date;
}

/**
 * A masking session links two real numbers to one virtual number.
 * Neither party ever sees the other's real number: each calls the virtual
 * number and is connected to the counterpart.
 */
export class MaskingSession {
  constructor(private readonly props: MaskingSessionProps) {}

  get id() { return this.props.id; }
  get partyA() { return this.props.partyA; }
  get partyB() { return this.props.partyB; }
  get virtualNumber() { return this.props.virtualNumber; }
  get referenceId() { return this.props.referenceId; }
  get status() { return this.props.status; }
  get expiresAt() { return this.props.expiresAt; }
  get createdAt() { return this.props.createdAt; }

  isActiveAt(now: Date): boolean {
    return this.props.status === 'active' && this.props.expiresAt.getTime() > now.getTime();
  }

  /** Number to dial when `caller` rings the virtual number; null if caller is not a party. */
  counterpartOf(caller: string): string | null {
    if (caller === this.props.partyA) return this.props.partyB;
    if (caller === this.props.partyB) return this.props.partyA;
    return null;
  }

  end(): void {
    this.props.status = 'ended';
  }
}
