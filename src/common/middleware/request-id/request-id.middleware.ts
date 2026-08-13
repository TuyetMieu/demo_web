import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4, validate as isUuid } from 'uuid';
import { requestContext } from 'src/common/context/request-context';

const REQUEST_ID_HEADER = 'x-request-id';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const incoming = req.headers[REQUEST_ID_HEADER];
    const incomingId = Array.isArray(incoming) ? incoming[0] : incoming;
    const requestId = incomingId && isUuid(incomingId) ? incomingId : uuidv4();
    (req as any).requestId = requestId;

    res.setHeader('X-Request-Id', requestId);

    requestContext.run({ requestId }, () => next());
  }
}
