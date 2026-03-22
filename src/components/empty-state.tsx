import { Inbox } from "lucide-react";

interface EmptyStateProps {
  message: string;
  title?: string;
}

export function EmptyState({ message, title = "No data yet" }: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/70 p-6 text-center">
      <Inbox className="mx-auto mb-3 h-5 w-5 text-slate-500" />
      <p className="text-sm font-medium text-slate-200">{title}</p>
      <p className="mt-1 text-sm text-slate-400">{message}</p>
    </div>
  );
}
