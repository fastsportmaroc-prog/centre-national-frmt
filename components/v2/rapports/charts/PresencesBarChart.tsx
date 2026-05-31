"use client";

export function PresencesBarChart({
  data,
}: {
  data: { jour: string; presents: number }[];
}) {
  const max = Math.max(...data.map((d) => d.presents), 1);
  return (
    <div className="flex h-32 items-end gap-1">
      {data.map((d) => (
        <div key={d.jour} className="flex flex-1 flex-col items-center gap-1">
          <div
            className="w-full min-w-[12px] rounded-t bg-frmt-green/80"
            style={{ height: `${(d.presents / max) * 100}%` }}
            title={`${d.presents} présents`}
          />
          <span className="text-[9px] text-muted">{d.jour}</span>
        </div>
      ))}
    </div>
  );
}
