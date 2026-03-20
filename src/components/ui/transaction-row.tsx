"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { CheckCircle, Flag } from "lucide-react";

export type TransactionRowProps = {
  transaction: {
    id: string;
    date: string;
    description: string;
    amountInCents: number;
    category: string;
    isReviewed: boolean;
    isFlagged: boolean;
    flagReason: string | null;
  };
  onToggleReviewed?: (id: string, value: boolean) => void;
  onCategoryChange?: (id: string, category: string) => void;
};

function getCategoryBadgeVariant(category: string) {
  if (["SOCIAL_SECURITY", "SSI", "PENSION", "VETERANS_BENEFITS", "INTEREST_DIVIDENDS"].includes(category)) return "success";
  if (["HEALTH_INSURANCE", "LIFE_INSURANCE", "UTILITIES", "VEHICLE_EXPENSES"].includes(category)) return "info";
  if (["INTERNAL_TRANSFER", "EXTERNAL_TRANSFER", "ATM_WITHDRAWAL", "CHECK", "DEPOSIT"].includes(category)) return "warning";
  if (category === "UNCATEGORIZED") return "secondary";
  return "outline";
}

export function TransactionRow({ transaction, onToggleReviewed }: TransactionRowProps) {
  return (
    <tr
      className={cn(
        "border-b last:border-0 hover:bg-gray-50",
        transaction.isFlagged && "bg-red-50 hover:bg-red-100"
      )}
    >
      <td className="py-3 text-sm text-gray-600">
        {formatDate(transaction.date)}
      </td>
      <td className="py-3">
        <div className="flex items-center gap-2">
          {transaction.isFlagged && (
            <Flag className="h-4 w-4 text-red-500 flex-shrink-0" />
          )}
          <div>
            <p className="text-sm font-medium text-gray-900">
              {transaction.description}
            </p>
            {transaction.flagReason && (
              <p className="text-xs text-red-600">{transaction.flagReason}</p>
            )}
          </div>
        </div>
      </td>
      <td
        className={cn(
          "py-3 text-right text-sm font-medium",
          transaction.amountInCents >= 0 ? "text-green-600" : "text-red-600"
        )}
      >
        {formatCurrency(transaction.amountInCents)}
      </td>
      <td className="py-3">
        <Badge variant={getCategoryBadgeVariant(transaction.category)} className="truncate">
          {transaction.category.replace("_", " ")}
        </Badge>
      </td>
      <td className="py-3 text-center">
        {transaction.isReviewed ? (
          <Badge variant="success" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            Reviewed
          </Badge>
        ) : (
          <Badge variant="secondary">Pending</Badge>
        )}
      </td>
      <td className="py-3 text-center">
        <Button
          variant={transaction.isReviewed ? "ghost" : "outline"}
          size="sm"
          onClick={() =>
            onToggleReviewed?.(transaction.id, !transaction.isReviewed)
          }
        >
          {transaction.isReviewed ? "Unreview" : "Review"}
        </Button>
      </td>
    </tr>
  );
}
