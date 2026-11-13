import { timingSafeEqual } from "node:crypto";
import { sendMulticast } from "@/services/line-multicast.service";

export async function POST(request) {
  // ตรวจสอบ Secret ก่อนรับข้อมูล
  const secret = process.env.CI_NOTIFY_SECRET;
  const authorization = request.headers.get("authorization") ?? "";

  if (!secret) {
    console.error("Missing CI_NOTIFY_SECRET");
    return Response.json(
      { success: false, error: "Server configuration error" },
      { status: 500 }
    );
  }

  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(authorization);

  if (
    received.length !== expected.length ||
    !timingSafeEqual(received, expected)
  ) {
    return Response.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  // อ่านข้อมูลจาก GitHub Actions
  let data;

  try {
    data = await request.json();
  } catch {
    return Response.json(
      { success: false, error: "Invalid JSON" },
      { status: 400 }
    );
  }

  const {
    status,
    workflow,
    event,
    branch,
    actor,
    failedSteps,
    runUrl,
  } = data;

  const statusLabels = {
    started: "🚀 STARTED",
    success: "✅ SUCCESS",
    failure: "❌ FAILED",
    cancelled: "⚠️ CANCELLED",
    skipped: "⏭️ SKIPPED",
  };

  if (!statusLabels[status]) {
    return Response.json(
      { success: false, error: "Invalid status" },
      { status: 400 }
    );
  }

  const message = [
    `Flutter CI: ${statusLabels[status]}`,
    `Workflow: ${workflow ?? "Unknown"}`,
    `Event: ${event ?? "Unknown"}`,
    `Branch: ${branch ?? "Unknown"}`,
    `Actor: ${actor ?? "Unknown"}`,
    `Failed steps: ${failedSteps ?? "Not available"}`,
    `Details: ${runUrl ?? "Not available"}`,
  ].join("\n");

  // ส่งให้สมาชิก LINE ทุกคนผ่าน Redis
  try {
    const result = await sendMulticast([
      {
        type: "text",
        text: message,
      },
    ]);

    return Response.json({
      success: true,
      sent: result.sent,
    });
  } catch (error) {
    console.error("CI notification failed:", error);

    return Response.json(
      { success: false, error: "Notification failed" },
      { status: 502 }
    );
  }
}