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
            const response = await fetch(
              `https://api.github.com/repos/${owner}/${repo}/actions/runs?per_page=1`,
              { headers, cache: "no-store" }
            );

            if (response.status === 404) {
              message = "ไม่พบ GitHub repository นี้ ตรวจ GITHUB_OWNER และ GITHUB_REPO หรือสิทธิ์เข้าถึง repository ส่วนตัว";
            } else if (response.status === 401 || response.status === 403) {
              console.error("GitHub Actions API rejected the request:", response.status);
              message = `GitHub ปฏิเสธคำขอ (${response.status}) ตรวจ GITHUB_TOKEN และสิทธิ์อ่าน Actions ของ repository`;
            } else if (!response.ok) {
              console.error("GitHub Actions API request failed:", response.status);
              message = `GitHub API ตอบกลับข้อผิดพลาด (${response.status}) กรุณาลองใหม่`;
            } else {
              const result = await response.json();
              const run = result.workflow_runs?.[0];

              message = run
                ? `Flutter CI: ${run.status === "completed" ? run.conclusion : run.status}\nBranch: ${run.head_branch}\nWorkflow: ${run.name}\nดูรายละเอียด: ${run.html_url}`
                : "ยังไม่พบ Workflow Run";
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
