import { ArrowRight, CircleDashed } from "lucide-react";
import { Money } from "./Money";

interface RecordNode {
  id: string;
  amount: number;
}

interface RecordRelationshipChainProps {
  order: RecordNode | null;
  payment: RecordNode | null;
  invoice: RecordNode | null;
}

const nodeLabels = ["Đơn hàng", "Thanh toán", "Hóa đơn"] as const;

export function RecordRelationshipChain({
  order,
  payment,
  invoice,
}: RecordRelationshipChainProps) {
  const records = [order, payment, invoice];

  return (
    <ol aria-label="Liên kết chứng từ" className="grid gap-2 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-center">
      {records.map((record, index) => (
        <li className="contents" key={nodeLabels[index]}>
          <div className="min-w-0 rounded-xl border bg-surface p-3">
            <p className="text-[13px] font-medium text-text-tertiary">
              {nodeLabels[index]}
            </p>
            {record ? (
              <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
                <span className="truncate font-mono text-sm text-secondary">{record.id}</span>
                <Money value={record.amount} className="text-sm" />
              </div>
            ) : (
              <p className="mt-2 flex items-center gap-2 text-sm text-text-secondary">
                <CircleDashed aria-hidden size={16} /> Chưa liên kết
              </p>
            )}
          </div>
          {index < records.length - 1 ? (
            <ArrowRight aria-hidden className="mx-auto rotate-90 text-text-tertiary md:rotate-0" size={18} />
          ) : null}
        </li>
      ))}
    </ol>
  );
}
