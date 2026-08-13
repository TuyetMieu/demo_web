import { ConsoleLogger, Injectable, LogLevel } from '@nestjs/common';
import { requestContext } from 'src/common/context/request-context';

@Injectable()
export class AppLogger extends ConsoleLogger {
  protected getJsonLogObject(
    message: unknown,
    options: {
      context: string;
      logLevel: LogLevel;
      writeStreamType?: 'stdout' | 'stderr';
      errorStack?: unknown;
    },
  ) {
    return {
      ...super.getJsonLogObject(message, options),
      request_id: requestContext.getStore()?.requestId ?? null,
    };
  }
}
