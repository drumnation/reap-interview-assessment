import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAccess } from "@/lib/audit";
import { TransactionCategory, getEnumValues } from "@/lib/types";
import { z } from "zod";

const updateSchema = z.object({
  category: z.enum(getEnumValues(TransactionCategory) as [string, ...string[]]).optional(),
  isReviewed: z.boolean().optional(),
  isFlagged: z.boolean().optional(),
  flagReason: z.string().max(500).nullable().optional(),
  reviewNote: z.string().max(2000).nullable().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const transaction = await prisma.financialTransaction.findFirst({
      where: {
        id,
        case: { ownerId: session.user?.email ?? "system" },
      },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    await logAccess(request, session, "READ", "FinancialTransaction", id);

    return NextResponse.json(transaction);
  } catch (error) {
    console.error("[Internal] Failed to fetch transaction:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();

    const validatedData = updateSchema.parse(body);

    // Verify ownership before updating
    const existing = await prisma.financialTransaction.findFirst({
      where: {
        id,
        case: { ownerId: session.user?.email ?? "system" },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    const transaction = await prisma.financialTransaction.update({
      where: { id },
      data: validatedData,
    });

    await logAccess(request, session, "UPDATE", "FinancialTransaction", id);

    return NextResponse.json(transaction);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.errors },
        { status: 400 }
      );
    }

    console.error("[Internal] Failed to update transaction:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
