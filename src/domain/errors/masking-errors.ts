import { AppError } from '../../shared/result';

export const MaskingErrors = {
  InvalidPhoneNumber: (field: string) =>
    AppError.validation('Phone.Invalid', `'${field}' is not a valid phone number.`),
  SamePartyNumbers: AppError.validation('Session.SameParties', 'partyA and partyB must be different numbers.'),
  InvalidTtl: AppError.validation('Session.InvalidTtl', 'ttlMinutes must be greater than zero.'),
  SessionNotFound: AppError.notFound('Session.NotFound', 'The masking session was not found.'),
  NoVirtualNumberAvailable: AppError.conflict(
    'VirtualNumber.NoneAvailable',
    'No virtual number is free for these parties. Add more numbers to the pool.',
  ),
  VirtualNumberExists: AppError.conflict('VirtualNumber.Exists', 'This virtual number is already in the pool.'),
  NoActiveSessionForCall: AppError.notFound(
    'Call.NoActiveSession',
    'No active masking session matches this caller and virtual number.',
  ),
  CallNotFound: AppError.notFound('Call.NotFound', 'No call with this CallSid was found.'),
  MissingCallParams: AppError.validation('Call.MissingParams', 'CallSid, caller and called number are required.'),
};
