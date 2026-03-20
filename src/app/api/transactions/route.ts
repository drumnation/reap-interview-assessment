import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAccess } from "@/lib/audit";

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

    const limit = Math.min(
      parseInt(searchParams.get("limit") || "100", 10),
      500
    );
    const cursor = searchParams.get("cursor");

    const transactions = await prisma.financialTransaction.findMany({
      where: {
        caseId,
        case: { ownerId: session.user?.email ?? "system" },
      },
      orderBy: {
        date: "desc",
      },
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    const hasMore = transactions.length > limit;
    const results = hasMore ? transactions.slice(0, limit) : transactions;
    const nextCursor = hasMore ? results[results.length - 1].id : null;

    await logAccess(request, session, "LIST", "FinancialTransaction", caseId);

    return NextResponse.json({
      data: results,
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.error("[Internal] Failed to fetch transactions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
