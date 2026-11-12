import { IvrSettings } from '../src/application/ports/ports';
import { AddVirtualNumberUseCase } from '../src/application/use-cases/add-virtual-number.use-case';
import { CreateMaskingSessionUseCase } from '../src/application/use-cases/create-masking-session.use-case';
import { EndMaskingSessionUseCase } from '../src/application/use-cases/end-masking-session.use-case';
import { ResolveIncomingCallUseCase } from '../src/application/use-cases/resolve-incoming-call.use-case';
import { UpdateCallStatusUseCase } from '../src/application/use-cases/update-call-status.use-case';
import { CallLog } from '../src/domain/call-log';
import { MaskingSession } from '../src/domain/masking-session';
import { CallLogRepository, MaskingSessionRepository, VirtualNumberRepository } from '../src/domain/repositories';
import { VirtualNumber } from '../src/domain/virtual-number';

// ---- in-memory fakes: use cases are tested with no database and no Nest ----
class FakeSessions extends MaskingSessionRepository {
  items = new Map<string, MaskingSession>();
  async save(s: MaskingSession) { this.items.set(s.id, s); }
  async findById(id: string) { return this.items.get(id) ?? null; }
  async findActiveForCaller(virtualNumber: string, caller: string, now: Date) {
    return [...this.items.values()].find(
      (s) => s.virtualNumber === virtualNumber && s.isActiveAt(now) && s.counterpartOf(caller) !== null,
    ) ?? null;
  }
}
class FakeVirtualNumbers extends VirtualNumberRepository {
  constructor(private sessions: FakeSessions, private now: () => Date) { super(); }
  items: VirtualNumber[] = [];
  async save(n: VirtualNumber) { this.items.push(n); }
  async exists(n: string) { return this.items.some((i) => i.number === n); }
  async findFreeFor(parties: string[], now: Date) {
    const busy = new Set(
      [...this.sessions.items.values()]
        .filter((s) => s.isActiveAt(now) && (parties.includes(s.partyA) || parties.includes(s.partyB)))
        .map((s) => s.virtualNumber),
    );
    return this.items.find((i) => i.isActive && !busy.has(i.number)) ?? null;
  }
}
class FakeCallLogs extends CallLogRepository {
  items = new Map<string, CallLog>();
  async save(l: CallLog) { this.items.set(l.callSid, l); }
  async findByCallSid(sid: string) { return this.items.get(sid) ?? null; }
}

const settings: IvrSettings = {
  defaultCountryCode: '91',
  defaultSessionTtlMinutes: 60,
  maxCallDurationSeconds: 3600,
  recordCalls: false,
};

function setup() {
  let current = new Date('2026-01-01T10:00:00Z');
  const clock = { now: () => current };
  let n = 0;
  const ids = { newId: () => `id-${++n}` };
  const sessions = new FakeSessions();
  const numbers = new FakeVirtualNumbers(sessions, clock.now);
  const logs = new FakeCallLogs();
  return {
    sessions, numbers, logs,
    advance: (ms: number) => { current = new Date(current.getTime() + ms); },
    addNumber: new AddVirtualNumberUseCase(numbers, clock, ids, settings),
    create: new CreateMaskingSessionUseCase(sessions, numbers, clock, ids, settings),
    end: new EndMaskingSessionUseCase(sessions),
    resolve: new ResolveIncomingCallUseCase(sessions, logs, clock, ids, settings),
    status: new UpdateCallStatusUseCase(logs, clock),
  };
}

describe('call masking', () => {
  it('connects each party to the other, showing only the virtual number', async () => {
    const t = setup();
    await t.addNumber.execute('08044556677');
    const created = await t.create.execute({ partyA: '9876543210', partyB: '9123456780' });
    expect(created.ok).toBe(true);

    // A rings the virtual number (Exotel formats numbers its own way) -> B is dialled
    const a = await t.resolve.execute({ callSid: 'c1', from: '09876543210', to: '08044556677' });
    expect(a).toMatchObject({ ok: true, value: { destination: '919123456780', callerId: '918044556677' } });

    // B rings back -> A is dialled
    const b = await t.resolve.execute({ callSid: 'c2', from: '+919123456780', to: '08044556677' });
    expect(b).toMatchObject({ ok: true, value: { destination: '919876543210' } });
  });

  it('rejects callers who are not part of any session', async () => {
    const t = setup();
    await t.addNumber.execute('08044556677');
    await t.create.execute({ partyA: '9876543210', partyB: '9123456780' });

    const r = await t.resolve.execute({ callSid: 'c1', from: '9000000000', to: '08044556677' });
    expect(r.ok).toBe(false);
  });

  it('stops routing after the session expires or is ended', async () => {
    const t = setup();
    await t.addNumber.execute('08044556677');
    const created = await t.create.execute({ partyA: '9876543210', partyB: '9123456780', ttlMinutes: 5 });
    if (!created.ok) throw new Error('setup failed');

    t.advance(6 * 60_000);
    expect((await t.resolve.execute({ callSid: 'c1', from: '9876543210', to: '08044556677' })).ok).toBe(false);

    const fresh = await t.create.execute({ partyA: '9876543210', partyB: '9123456780' });
    if (!fresh.ok) throw new Error('setup failed');
    await t.end.execute(fresh.value.id);
    expect((await t.resolve.execute({ callSid: 'c2', from: '9876543210', to: '08044556677' })).ok).toBe(false);
  });

  it('gives different pairs sharing a person different virtual numbers', async () => {
    const t = setup();
    await t.addNumber.execute('08044556677');
    await t.addNumber.execute('08044556688');
    const first = await t.create.execute({ partyA: '9876543210', partyB: '9123456780' });
    const second = await t.create.execute({ partyA: '9876543210', partyB: '9555555555' });
    if (!first.ok || !second.ok) throw new Error('setup failed');
    expect(first.value.virtualNumber).not.toBe(second.value.virtualNumber);

    // pool exhausted for anyone involving 9876543210
    const third = await t.create.execute({ partyA: '9876543210', partyB: '9444444444' });
    expect(third.ok).toBe(false);
  });

  it('validates input', async () => {
    const t = setup();
    expect((await t.create.execute({ partyA: '123', partyB: '9123456780' })).ok).toBe(false);
    expect((await t.create.execute({ partyA: '9876543210', partyB: '+919876543210' })).ok).toBe(false);
    expect((await t.addNumber.execute('08044556677')).ok).toBe(true);
    expect((await t.addNumber.execute('+918044556677')).ok).toBe(false); // duplicate
  });

  it('records the call outcome from the status callback', async () => {
    const t = setup();
    await t.addNumber.execute('08044556677');
    await t.create.execute({ partyA: '9876543210', partyB: '9123456780' });
    await t.resolve.execute({ callSid: 'c1', from: '9876543210', to: '08044556677' });

    await t.status.execute({ callSid: 'c1', status: 'completed', durationSeconds: 42 });
    expect(t.logs.items.get('c1')).toMatchObject({ status: 'completed', durationSeconds: 42 });
    expect((await t.status.execute({ callSid: 'unknown', status: 'completed' })).ok).toBe(false);
  });
});
