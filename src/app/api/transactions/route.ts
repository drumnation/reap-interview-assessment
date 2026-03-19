import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
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

    return NextResponse.json({
      data: results,
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.error("Failed to fetch transactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}
