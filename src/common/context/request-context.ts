import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContextStore {
  requestId: string;
}

export const requestContext = new AsyncLocalStorage<RequestContextStore>();
