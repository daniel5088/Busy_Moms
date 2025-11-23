// src/services/errorLog.ts
export type ClientErrorLog = {
  id: string;
  message: string;
  stack?: string;
  correlationId?: string | null;
  url?: string;
  createdAt: string; // ISO
};

const MAX_LOGS = 20;
let logs: ClientErrorLog[] = [];

export function logClientError(err: {
  message: string;
  stack?: string;
  correlationId?: string | null;
  url?: string;
}) {
  const entry: ClientErrorLog = {
    id: crypto.randomUUID(),
    message: err.message,
    stack: err.stack,
    correlationId: err.correlationId,
    url: err.url ?? window.location.href,
    createdAt: new Date().toISOString(),
  };

  logs = [entry, ...logs].slice(0, MAX_LOGS);
}

export function getClientErrorLogs(): ClientErrorLog[] {
  return logs;
}
