import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/config/supabase/server";
import {
  dismissBrowserExtensionPromotion,
  getBrowserExtensionPromotionStatus,
} from "@/services/browserExtensionConnectionService";
import { getEmployeeFromAuth } from "@/services/timeEntryService";
import type { ApiResponse } from "@/types/api";
import type { BrowserExtensionPromotionStatus } from "@/types/browser-extension";

async function promotionContext() {
  const supabase = await createClient();
  return getEmployeeFromAuth(supabase);
}

export async function GET() {
  const authResult = await promotionContext();
  if (!authResult.data) {
    return NextResponse.json<ApiResponse<BrowserExtensionPromotionStatus>>(
      { data: null, error: "Nicht authentifiziert" },
      { status: 401 },
    );
  }

  const result = await getBrowserExtensionPromotionStatus(
    createAdminClient(),
    authResult.data,
  );
  return NextResponse.json<ApiResponse<BrowserExtensionPromotionStatus>>(result, {
    status: result.data ? 200 : 500,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST() {
  const authResult = await promotionContext();
  if (!authResult.data) {
    return NextResponse.json<ApiResponse<boolean>>(
      { data: null, error: "Nicht authentifiziert" },
      { status: 401 },
    );
  }

  const result = await dismissBrowserExtensionPromotion(
    createAdminClient(),
    authResult.data,
  );
  return NextResponse.json<ApiResponse<boolean>>(result, {
    status: result.data ? 200 : 500,
    headers: { "Cache-Control": "no-store" },
  });
}
