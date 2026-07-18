import type { Key, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type DataTableColumn<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  align?: "left" | "right";
  primary?: boolean;
  hideOnMobile?: boolean;
};

type DataTableProps<T> = {
  caption: string;
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => Key;
  empty?: ReactNode;
  className?: string;
};

export function DataTable<T>({ caption, columns, rows, getRowKey, empty, className }: DataTableProps<T>) {
  if (rows.length === 0) return <div className={cn("rounded-2xl border bg-surface p-8 shadow-[0_4px_24px_rgba(25,36,78,0.04)]", className)}>{empty}</div>;

  return (
    <div className={cn("overflow-hidden rounded-2xl border bg-surface shadow-[0_4px_24px_rgba(25,36,78,0.04)]", className)}>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-border/50 text-text-tertiary">
              {columns.map((column) => <th key={column.key} scope="col" className={cn("px-6 pb-4 text-[13px] font-medium", column.align === "right" && "text-right")}>{column.header}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {rows.map((row) => (
              <tr key={getRowKey(row)} className="cursor-pointer transition-colors hover:bg-gray-50/50">
                {columns.map((column) => <td key={column.key} className={cn("py-6 px-6 text-text-secondary", column.primary && "text-sm font-medium text-ink", column.align === "right" && "text-right")}>{column.cell(row)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul aria-label={caption} className="divide-y divide-border/30 md:hidden">
        {rows.map((row) => (
          <li key={getRowKey(row)} className="space-y-3 p-6">
            {columns.filter((column) => !column.hideOnMobile).map((column) => (
              <div key={column.key} className={cn("flex items-start justify-between gap-5 text-sm", column.primary && "border-b border-border/30 pb-3")}>
                <span className="text-[13px] font-medium text-text-tertiary">{column.header}</span>
                <span className={cn("text-right text-text-secondary", column.primary && "text-sm font-medium text-ink")}>{column.cell(row)}</span>
              </div>
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
}
