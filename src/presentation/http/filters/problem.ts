import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import { AppError, ErrorType, Result } from '../../../shared/result';

const statusByType: Record<ErrorType, number> = {
  [ErrorType.Validation]: HttpStatus.BAD_REQUEST,
  [ErrorType.NotFound]: HttpStatus.NOT_FOUND,
  [ErrorType.Conflict]: HttpStatus.CONFLICT,
  [ErrorType.Unauthorized]: HttpStatus.UNAUTHORIZED,
  [ErrorType.Forbidden]: HttpStatus.FORBIDDEN,
  [ErrorType.Failure]: HttpStatus.INTERNAL_SERVER_ERROR,
};

/** Controllers call this on a use-case Result: returns the value, or throws the matching HTTP error. */
export function unwrap<T>(result: Result<T>): T {
  if (result.ok) return result.value;
  throw toHttpException(result.errors);
}

function toHttpException(errors: AppError[]): HttpException {
  const status = statusByType[errors[0].type];
  return new HttpException({ status, title: errors[0].description, errors }, status);
}

/** Every error leaves the API in the same shape: { status, title, errors? }. */
@Catch()
export class ProblemFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'object' && 'title' in body) {
        res.status(status).json(body);
        return;
      }
      const message = typeof body === 'string' ? body : (body as { message?: unknown }).message;
      res.status(status).json({ status, title: Array.isArray(message) ? 'Validation failed' : message, errors: message });
      return;
    }

    // Unexpected: log the detail, never leak it to the caller.
    this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    res.status(500).json({ status: 500, title: 'Internal server error' });
  }
}
