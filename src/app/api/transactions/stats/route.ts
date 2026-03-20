import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get("caseId");

    if (!caseId) {
      return NextResponse.json(
        { error: "caseId is required" },
        { status: 400 }
      );
    }

    const where = { caseId, case: { ownerId: session.user?.email ?? "system" } };

    const [total, reviewed, flagged, uncategorized, incomeAgg, expenseAgg, categoryGroups] =
      await Promise.all([
        prisma.financialTransaction.count({ where }),
        prisma.financialTransaction.count({ where: { ...where, isReviewed: true } }),
        prisma.financialTransaction.count({ where: { ...where, isFlagged: true } }),
        prisma.financialTransaction.count({ where: { ...where, category: "UNCATEGORIZED" } }),
        prisma.financialTransaction.aggregate({
          where: { ...where, amountInCents: { gt: 0 } },
          _sum: { amountInCents: true },
        }),
        prisma.financialTransaction.aggregate({
          where: { ...where, amountInCents: { lt: 0 } },
          _sum: { amountInCents: true },
        }),
        prisma.financialTransaction.groupBy({
          by: ["category"],
          where,
          _count: true,
          _sum: { amountInCents: true },
        }),
      ]);

    const byCategory = Object.fromEntries(
      categoryGroups.map((g) => [g.category, { count: g._count, total: g._sum.amountInCents ?? 0 }])
    );

    return NextResponse.json({
      total,
      reviewed,
      flagged,
      uncategorized,
      income: incomeAgg._sum.amountInCents ?? 0,
      expenses: Math.abs(expenseAgg._sum.amountInCents ?? 0),
      byCategory,
    });
  } catch (error) {
    console.error("[Internal] Failed to fetch transaction stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
