import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Check, X } from "lucide-react";
import { Link } from "wouter";

interface Integration {
  id: string;
  name: string;
  category: string;
  envVars: string[];
  note: string;
  codeStatus: "ready" | "needs-refactor" | "demo" | "broken";
  configured: boolean;
  missingVars: string[];
}

interface IntegrationStatusResponse {
  integrations: Integration[];
}

const STORAGE_KEY = "podlogix-integration-checklist";

function loadChecklist(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function StatusBadge({ integration }: { integration: Integration }) {
  const base = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap";
  if (integration.codeStatus === "broken") {
    return <span className={`${base} bg-red-100 text-red-700`}>Broken</span>;
  }
  if (integration.codeStatus === "demo") {
    return <span className={`${base} bg-amber-100 text-amber-700`}>Demo data</span>;
  }
  if (integration.codeStatus === "needs-refactor") {
    return integration.configured ? (
      <span className={`${base} bg-amber-100 text-amber-700`}>Key OK — code fix needed</span>
    ) : (
      <span className={`${base} bg-amber-100 text-amber-700`}>Missing key + code fix</span>
    );
  }
  return integration.configured ? (
    <span className={`${base} bg-green-100 text-green-700`}>Configured ✓</span>
  ) : (
    <span className={`${base} bg-gray-100 text-gray-600`}>Missing key</span>
  );
}

export default function IntegrationStatus() {
  const [checklist, setChecklist] = useState<Record<string, boolean>>(loadChecklist);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(checklist));
    } catch {
      // ignore storage errors
    }
  }, [checklist]);

  const { data, isLoading, error } = useQuery<IntegrationStatusResponse>({
    queryKey: ["/api/admin/integration-status"],
  });

  const toggle = (id: string) => {
    setChecklist((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="w-full max-w-6xl px-6 py-8">
      <div className="mb-6">
        <Link href="/admin" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Admin Dashboard
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Integration Status</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Live check of configured keys — updates on every deploy
        </p>
      </div>

      {isLoading && (
        <div className="rounded-2xl border p-8 text-sm text-muted-foreground">Loading integration status…</div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-sm text-red-700">
          Failed to load integration status. Admin access is required.
        </div>
      )}

      {data && (
        <div className="rounded-2xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-4 py-3 font-medium text-muted-foreground w-12">Done</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Integration</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Category</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Keys</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Notes</th>
                </tr>
              </thead>
              <tbody>
                {data.integrations.map((integration) => {
                  const done = !!checklist[integration.id];
                  return (
                    <tr
                      key={integration.id}
                      className={`border-b last:border-b-0 transition-opacity ${done ? "opacity-50" : ""}`}
                    >
                      <td className="px-4 py-3 align-top">
                        <input
                          type="checkbox"
                          checked={done}
                          onChange={() => toggle(integration.id)}
                          className="h-4 w-4 rounded border-gray-300 cursor-pointer"
                          aria-label={`Mark ${integration.name} as done`}
                        />
                      </td>
                      <td className={`px-4 py-3 align-top font-medium ${done ? "line-through" : ""}`}>
                        {integration.name}
                      </td>
                      <td className="px-4 py-3 align-top text-muted-foreground">{integration.category}</td>
                      <td className="px-4 py-3 align-top">
                        {integration.envVars.length === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <div className="flex flex-col gap-1">
                            {integration.envVars.map((v) => {
                              const missing = integration.missingVars.includes(v);
                              return (
                                <span key={v} className="inline-flex items-center gap-1.5 font-mono text-xs">
                                  {missing ? (
                                    <X className="h-3.5 w-3.5 text-red-500 shrink-0" />
                                  ) : (
                                    <Check className="h-3.5 w-3.5 text-green-600 shrink-0" />
                                  )}
                                  {v}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <StatusBadge integration={integration} />
                      </td>
                      <td className="px-4 py-3 align-top text-muted-foreground max-w-xs">{integration.note}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
