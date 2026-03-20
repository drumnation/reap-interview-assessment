import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAccess } from "@/lib/audit";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const cases = await prisma.case.findMany({
      where: { ownerId: session.user?.email ?? "system" },
      select: {
        id: true,
        residentName: true,
        facilityName: true,
        status: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    await logAccess(request, session, "LIST", "Case", "*");

    return NextResponse.json(cases);
  } catch (error) {
    console.error("[Internal] Failed to fetch cases:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
