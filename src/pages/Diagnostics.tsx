import React, { useEffect, useState } from 'react';
import { getClientErrorLogs, ClientErrorLog } from '../services/errorLog';
import { http } from '../utils/networkClient';

type PingResult = {
  name: string;
  url: string;
  status: 'idle' | 'ok' | 'fail';
  message?: string;
  correlationId?: string | null;
};

const ENDPOINTS_TO_PING = [
  {
    name: 'Instacart Edge Function',
    url: '/functions/v1/instacart-shopping-list',
  },
  {
    name: 'Google Calendar Sync',
    url: '/functions/v1/google-calendar',
  },
];

export const Diagnostics: React.FC = () => {
  const [envInfo, setEnvInfo] = useState<Record<string, string>>({});
  const [pings, setPings] = useState<PingResult[]>(
    ENDPOINTS_TO_PING.map((e) => ({ ...e, status: 'idle' }))
  );
  const [errorLogs, setErrorLogs] = useState<ClientErrorLog[]>([]);

  useEffect(() => {
    const info = {
      'App Version': import.meta.env.VITE_APP_VERSION ?? 'unknown',
      Environment: import.meta.env.MODE,
      'User Agent': navigator.userAgent,
      'Time Zone': Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    setEnvInfo(info);
    setErrorLogs(getClientErrorLogs());
  }, []);

  const runPings = async () => {
    const updated: PingResult[] = [];

    for (const endpoint of ENDPOINTS_TO_PING) {
      try {
        const res = (await http(endpoint.url, {
          method: 'POST',
          body: JSON.stringify({ action: 'ping' }),
          headers: { 'Content-Type': 'application/json' },
        })) as Response;

        const correlationId = res.headers.get('x-correlation-id');

        updated.push({
          ...endpoint,
          status: 'ok',
          message: `OK (${res.status})`,
          correlationId,
        });
      } catch (err: unknown) {
        let message = 'Unknown error';
        let correlationId: string | null = null;

        if (err instanceof Error) {
          message = err.message;
        } else if (typeof err === 'string') {
          message = err;
        }

        if (typeof err === 'object' && err !== null && 'correlationId' in err) {
          const cid = (err as any).correlationId;
          if (typeof cid === 'string') correlationId = cid;
        }

        updated.push({
          ...endpoint,
          status: 'fail',
          message,
          correlationId,
        });
      }
    }

    setPings(updated);
  };

  return (
    <div className="p-4 space-y-8">
      {/* Alvaro-landmarks: Header section for Diagnostics page */}
      <header>
        {/* Alvaro-landmarks: Primary h1 heading for Diagnostics page */}
        <h1 className="text-2xl font-bold">Diagnostics</h1>
      </header>

      {/* Alvaro-landmarks: Main content area wrapper */}
      <main className="space-y-8">
        <section>
          <h2 className="text-xl font-semibold mb-2">Environment</h2>
          <div className="bg-gray-50 rounded-lg p-3 border">
            {Object.entries(envInfo).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 text-sm">
                <span className="font-medium">{k}</span>
                <span className="font-mono break-all">{v}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-semibold">Endpoint Health</h2>
            <button
              onClick={runPings}
              className="px-3 py-1 rounded-lg border text-sm hover:bg-gray-100"
            >
              Run Pings
            </button>
          </div>

          <div className="space-y-2">
            {pings.map((p) => (
              <div key={p.name} className="border rounded-lg p-3 text-sm flex flex-col gap-1">
                <div className="flex justify-between">
                  <span className="font-medium">{p.name}</span>
                  <span
                    className={
                      p.status === 'ok'
                        ? 'text-green-600'
                        : p.status === 'fail'
                          ? 'text-red-600'
                          : 'text-gray-500'
                    }
                  >
                    {p.status.toUpperCase()}
                  </span>
                </div>

                <div className="text-xs text-gray-600">URL: {p.url}</div>

                {p.message && <div className="text-xs text-gray-700">Message: {p.message}</div>}

                {p.correlationId && (
                  <div className="text-xs text-gray-700">
                    Correlation ID: <span className="font-mono">{p.correlationId}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Recent Errors</h2>

          {errorLogs.length === 0 ? (
            <p className="text-sm text-gray-500">No errors captured yet.</p>
          ) : (
            <div className="space-y-2">
              {errorLogs.map((log) => (
                <div key={log.id} className="border rounded-lg p-3 text-sm flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span className="font-medium">{new Date(log.createdAt).toLocaleString()}</span>
                    {log.correlationId && (
                      <span className="text-xs font-mono text-gray-700">{log.correlationId}</span>
                    )}
                  </div>

                  <div className="text-red-700">{log.message}</div>

                  {log.url && <div className="text-xs text-gray-600 break-all">URL: {log.url}</div>}

                  {log.stack && (
                    <details className="text-xs text-gray-600">
                      <summary>Stack trace</summary>
                      <pre className="whitespace-pre-wrap">{log.stack}</pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
