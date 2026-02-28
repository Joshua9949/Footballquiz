import { Fragment } from "react";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

interface DynamicJsonViewProps {
  data: unknown;
  emptyLabel?: string;
}

function PrimitiveValue({ value }: { value: unknown }) {
  if (value === null) {
    return <span className="text-muted-foreground">null</span>;
  }
  if (typeof value === "boolean") {
    return <span className="font-mono">{value ? "true" : "false"}</span>;
  }
  if (typeof value === "number") {
    return <span className="font-mono">{value}</span>;
  }
  if (typeof value === "string") {
    return <span className="break-words whitespace-pre-wrap">{value}</span>;
  }
  return <span className="font-mono">{String(value)}</span>;
}

export default function DynamicJsonView({ data, emptyLabel = "No data" }: DynamicJsonViewProps) {
  if (data === undefined) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return <p className="text-sm text-muted-foreground">[]</p>;
    }

    return (
      <div className="space-y-3">
        {data.map((item, idx) => (
          <div key={idx} className="rounded-lg border border-border bg-card/50 p-3">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">[{idx}]</p>
            <DynamicJsonView data={item} emptyLabel={emptyLabel} />
          </div>
        ))}
      </div>
    );
  }

  if (isObject(data)) {
    const entries = Object.entries(data);
    if (entries.length === 0) {
      return <p className="text-sm text-muted-foreground">{"{}"}</p>;
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="w-40 px-3 py-2 text-left font-semibold text-foreground">Field</th>
              <th className="px-3 py-2 text-left font-semibold text-foreground">Value</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([key, value], index) => (
              <Fragment key={key}>
                <tr className="align-top">
                  <td className="border-b border-border px-3 py-2 font-mono text-xs text-muted-foreground">
                    {key}
                  </td>
                  <td className="border-b border-border px-3 py-2">
                    {isObject(value) || Array.isArray(value) ? (
                      <DynamicJsonView data={value} emptyLabel={emptyLabel} />
                    ) : (
                      <PrimitiveValue value={value} />
                    )}
                  </td>
                </tr>
                {index === entries.length - 1 ? null : null}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card/50 p-3 text-sm">
      <PrimitiveValue value={data} />
    </div>
  );
}
