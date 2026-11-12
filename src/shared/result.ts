/**
 * Result pattern (same idea as Sbdms.SharedLibrary.ResultPattern in the Identity API).
 * Use cases return a Result instead of throwing for expected failures.
 */
export enum ErrorType {
  Validation = 'validation',
  NotFound = 'not_found',
  Conflict = 'conflict',
  Unauthorized = 'unauthorized',
  Forbidden = 'forbidden',
  Failure = 'failure',
}

export interface AppError {
  code: string;
  description: string;
  type: ErrorType;
}

export const AppError = {
  validation: (code: string, description: string): AppError => ({ code, description, type: ErrorType.Validation }),
  notFound: (code: string, description: string): AppError => ({ code, description, type: ErrorType.NotFound }),
  conflict: (code: string, description: string): AppError => ({ code, description, type: ErrorType.Conflict }),
  unauthorized: (code: string, description: string): AppError => ({ code, description, type: ErrorType.Unauthorized }),
  forbidden: (code: string, description: string): AppError => ({ code, description, type: ErrorType.Forbidden }),
  failure: (code: string, description: string): AppError => ({ code, description, type: ErrorType.Failure }),
};

export type Result<T> = { ok: true; value: T } | { ok: false; errors: AppError[] };

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const fail = <T = never>(...errors: AppError[]): Result<T> => ({ ok: false, errors });
