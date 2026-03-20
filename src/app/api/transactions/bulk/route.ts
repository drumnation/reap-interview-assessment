import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAccess } from "@/lib/audit";
import { TransactionCategory, getEnumValues } from "@/lib/types";
import { z } from "zod";

const bulkUpdateSchema = z.object({
  ids: z.array(z.string()).min(1),
  updates: z.object({
    category: z.enum(getEnumValues(TransactionCategory) as [string, ...string[]]).optional(),
    isReviewed: z.boolean().optional(),
    isFlagged: z.boolean().optional(),
  }),
});

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { ids, updates } = bulkUpdateSchema.parse(body);

    const result = await prisma.financialTransaction.updateMany({
      where: {
        id: { in: ids },
        case: { ownerId: session.user?.email ?? "system" },
      },
      data: updates,
    });

    await logAccess(request, session, "BULK_UPDATE", "FinancialTransaction", ids.join(","));

    return NextResponse.json({
      message: `Updated ${result.count} transactions`,
      count: result.count,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.errors },
        { status: 400 }
      );
    }

    console.error("[Internal] Failed to bulk update transactions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
