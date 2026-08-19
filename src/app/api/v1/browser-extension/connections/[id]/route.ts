import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, createClient } from "@/config/supabase/server";
import { revokeManagedBrowserExtensionConnection } from "@/services/browserExtensionConnectionService";
import { getEmployeeFromAuth } from "@/services/timeEntryService";
import type { ApiResponse } from "@/types/api";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(_request: Request, context: RouteContext) {
  const parsedId = z.string().uuid().safeParse((await context.params).id);
  if (!parsedId.success) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "Ungültige Verbindungs-ID" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const authResult = await getEmployeeFromAuth(supabase);
  if (!authResult.data) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "Nicht authentifiziert" },
      { status: 401 },
    );
  }

  const result = await revokeManagedBrowserExtensionConnection(
    createAdminClient(),
    authResult.data,
    parsedId.data,
  );
  return NextResponse.json<ApiResponse<boolean>>(result, {
    status: result.data ? 200 : 404,
  });
}
