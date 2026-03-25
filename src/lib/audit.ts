import { prisma } from "@/lib/prisma";
import type { Session } from "next-auth";

export async function logAccess(
  request: Request,
  session: Session,
  action: string,
  resourceType: string,
  resourceId: string
) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ipAddress = forwarded?.split(",")[0]?.trim() ?? null;

  await prisma.auditLog.create({
    data: {
      userId: session.user?.email ?? "unknown",
      action,
      resourceType,
      resourceId,
      ipAddress,
    },
  });
}
