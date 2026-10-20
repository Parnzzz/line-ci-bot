import crypto from "node:crypto";

/*
 * Quick Reply implementation kept for later use.
 * The active menu is the Flex Message returned by createMenuMessage().
function createQuickReplyMessage() {
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;

  return {
    type: "text",
    text: "🤖 Arayatime Flutter CI\nเลือกเมนูด้านล่างเพื่อดูสถานะ Build",
    quickReply: {
      items: [
        {
          type: "action",
          action: {
            type: "postback",
            label: "ดูสถานะ CI",
            data: "action=status",
          },
        },
        {
          type: "action",
          action: {
            type: "postback",
            label: "ผล Build ล่าสุด",
            data: "action=latest",
          },
        },
        {
          type: "action",
          action: {
            type: "uri",
            label: "เปิด GitHub",
            uri: `https://github.com/${owner}/${repo}/actions`,
          },
        },
      ],
    },
  };
}
*/

function createMenuMessage() {
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const githubUrl =
    owner && repo ? `https://github.com/${owner}/${repo}/actions` : "https://github.com/";

  return {
    type: "flex",
    altText: "เมนู Arayatime Flutter CI",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          {
            type: "text",
            text: "Arayatime Flutter CI",
            weight: "bold",
            size: "lg",
            wrap: true,
          },
          {
            type: "text",
            text: "เลือกเมนูที่ต้องการ",
            size: "sm",
            color: "#666666",
            wrap: true,
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          {
            type: "button",
            style: "primary",
            action: {
              type: "postback",
              label: "ดูสถานะ CI",
              data: "action=status",
            },
          },
          {
            type: "button",
            style: "secondary",
            action: {
              type: "postback",
              label: "ผล Build ล่าสุด",
              data: "action=latest",
            },
          },
          {
            type: "button",
            style: "link",
            action: {
              type: "uri",
              label: "เปิด GitHub",
              uri: githubUrl,
            },
          },
        ],
      },
    },
  };
}

function formatWorkflowRunStatus(run) {
  if (!run) return "ยังไม่เคยรัน";

  if (run.status !== "completed") {
    const statusLabels = {
      queued: "รอคิว",
      in_progress: "กำลังทำงาน",
      waiting: "กำลังรอ",
      requested: "รอเริ่ม",
      pending: "กำลังรอ",
    };

    return statusLabels[run.status] ?? run.status;
  }

  const conclusionLabels = {
    success: "สำเร็จ",
    failure: "ล้มเหลว",
    cancelled: "ยกเลิก",
    skipped: "ข้าม",
    timed_out: "หมดเวลา",
    action_required: "ต้องดำเนินการ",
    neutral: "ไม่มีผลสรุป",
    stale: "สถานะไม่อัปเดต",
  };

  return conclusionLabels[run.conclusion] ?? run.conclusion ?? "เสร็จแล้ว";
}

function getGitHubActionsErrorMessage(status) {
  if (status === 404) {
    return "ไม่พบ GitHub repository นี้ ตรวจ GITHUB_OWNER และ GITHUB_REPO หรือสิทธิ์เข้าถึง repository ส่วนตัว";
  }

  if (status === 401 || status === 403) {
    return `GitHub ปฏิเสธคำขอ (${status}) ตรวจ GITHUB_TOKEN และสิทธิ์อ่าน Actions ของ repository`;
  }

  return `GitHub API ตอบกลับข้อผิดพลาด (${status}) กรุณาลองใหม่`;
}

export async function POST(request) {
  const body = await request.text();
  const signature = request.headers.get("x-line-signature");
  const secret = process.env.LINE_CHANNEL_SECRET;
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!secret || !token || !signature) {
    return new Response("Missing LINE configuration", {
      status: 500,
    });
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("base64");

  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (
    receivedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
  ) {
    return new Response("Invalid signature", { status: 401 });
  }

  const data = JSON.parse(body);

  console.log("LINE WEBHOOK RECEIVED");
console.log(
  "Events:",
  data.events?.map((event) => ({
    type: event.type,
    messageType: event.message?.type,
  }))
);

  for (const event of data.events ?? []) {
    if (!event.replyToken || event.replyToken === "00000000000000000000000000000000") {
      continue;
    }

    const isTextMessage =
      event.type === "message" && event.message?.type === "text";
    const isMenuCommand =
      isTextMessage && event.message.text.trim().toLowerCase() === "menu";
    let message = isTextMessage
      ? "พิมพ์ menu เพื่อแสดงเมนู"
      : "สวัสดีครับ Arayatime Flutter CI Bot";

    if (event.type === "postback") {
      const action = new URLSearchParams(event.postback?.data ?? "").get("action");

      if (action === "status" || action === "latest") {
        const owner = process.env.GITHUB_OWNER;
        const repo = process.env.GITHUB_REPO;
        const githubToken = process.env.GITHUB_TOKEN;

        if (!owner || !repo) {
          message = "ยังไม่ได้ตั้งค่า GITHUB_OWNER หรือ GITHUB_REPO ใน Vercel";
        } else {
          const headers = {
            Accept: "application/vnd.github+json",
            ...(githubToken ? { Authorization: `Bearer ${githubToken}` } : {}),
          };

          try {
            const endpoint = action === "status"
              ? `https://api.github.com/repos/${owner}/${repo}/actions/workflows?per_page=100`
              : `https://api.github.com/repos/${owner}/${repo}/actions/runs?per_page=1`;
            const response = await fetch(endpoint, { headers, cache: "no-store" });

            if (!response.ok) {
              if (response.status === 401 || response.status === 403) {
                console.error("GitHub Actions API rejected the request:", response.status);
              } else {
                console.error("GitHub Actions API request failed:", response.status);
              }
              message = getGitHubActionsErrorMessage(response.status);
            } else {
              const result = await response.json();

              if (action === "status") {
                const workflows = result.workflows ?? [];

                if (workflows.length === 0) {
                  message = "ไม่พบ GitHub Actions Workflow ใน repository นี้";
                } else {
                  const workflowStatuses = await Promise.all(
                    workflows.map(async (workflow) => {
                      if (workflow.state !== "active") {
                        return { workflow, run: null, disabled: true };
                      }

                      const runsResponse = await fetch(
                        `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflow.id}/runs?per_page=1`,
                        { headers, cache: "no-store" }
                      );

                      if (!runsResponse.ok) {
                        return { workflow, errorStatus: runsResponse.status };
                      }

                      const runsResult = await runsResponse.json();
                      return {
                        workflow,
                        run: runsResult.workflow_runs?.[0] ?? null,
                      };
                    })
                  );

                  const failedRequest = workflowStatuses.find(
                    (item) => item.errorStatus
                  );

                  if (failedRequest) {
                    if (failedRequest.errorStatus === 401 || failedRequest.errorStatus === 403) {
                      console.error(
                        "GitHub Actions API rejected the request:",
                        failedRequest.errorStatus
                      );
                    } else {
                      console.error(
                        "GitHub Actions API request failed:",
                        failedRequest.errorStatus
                      );
                    }
                    message = getGitHubActionsErrorMessage(failedRequest.errorStatus);
                  } else {
                    workflowStatuses.sort((a, b) =>
                      (a.workflow.name ?? a.workflow.path).localeCompare(
                        b.workflow.name ?? b.workflow.path
                      )
                    );

                    const lines = workflowStatuses.map(({ workflow, run, disabled }) => {
                      const name = workflow.name ?? workflow.path.split("/").pop();
                      const status = disabled
                        ? "ปิดใช้งาน"
                        : formatWorkflowRunStatus(run);
                      const branch = run?.head_branch ? ` · ${run.head_branch}` : "";
                      const detailsUrl = run?.html_url ?? workflow.html_url;

                      return `• ${name}: ${status}${branch}\n${detailsUrl}`;
                    });

                    message = "สถานะล่าสุดของ GitHub Actions\n\n";
                    for (const line of lines) {
                      const nextMessage = `${message}\n${line}`;
                      if (nextMessage.length > 4500) {
                        message += "\n… แสดงรายการบางส่วน";
                        break;
                      }
                      message = nextMessage;
                    }
                  }
                }
              } else {
                const run = result.workflow_runs?.[0];
                message = run
                  ? `Flutter CI: ${formatWorkflowRunStatus(run)}\nBranch: ${run.head_branch}\nWorkflow: ${run.name}\nดูรายละเอียด: ${run.html_url}`
                  : "ยังไม่พบ Workflow Run";
              }
            }
          } catch (error) {
            console.error(
              "GitHub Actions API connection failed:",
              error?.cause?.code ?? "unknown"
            );
            message = "เชื่อมต่อ GitHub API ไม่สำเร็จ กรุณาลองใหม่";
          }
        }
      }
    }

    const messages = isMenuCommand
      ? [createMenuMessage()]
      : [{ type: "text", text: message }];

    console.log("Menu shown:", isMenuCommand);

    let replyResponse;
    try {
      replyResponse = await fetch("https://api.line.me/v2/bot/message/reply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          replyToken: event.replyToken,
          messages,
        }),
      });
    } catch (error) {
      console.error(
        "LINE Reply API connection failed:",
        error?.cause?.code ?? "unknown"
      );
      return new Response("LINE reply failed", { status: 502 });
    }

    console.log("LINE Reply Status:", replyResponse.status);
    if (!replyResponse.ok) {
      return new Response("LINE reply failed", { status: 502 });
    }
  }

  return new Response("OK", { status: 200 });
}
