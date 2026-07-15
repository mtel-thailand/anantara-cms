import { EmailTemplate, sendEmail } from "@/src/lib/ses/email";
import { logger } from "@/src/lib/logger";
import { NextResponse } from "next/server";

const MOCK_RECIPIENT = "suphasan.sae@mtel.co.th";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await sendEmail(MOCK_RECIPIENT, {
      template: EmailTemplate.SubmissionConfirm,
      params: {
        recipientName: "Suphasan Sae",
        accessToken: "mock-submission-token",
        vehicles: [
          {
            name: "Ferrari Roma Spider",
            year: '1963',
            bodyStyle: "Coupe",
            imageUrl:
              "https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=240&h=160&fit=crop&auto=format",
          },
          {
            name: "Ferrari 250 GTO",
            year: '1962',
            bodyStyle: "Coupe",
            imageUrl:
              "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=240&h=160&fit=crop&auto=format",
          },
          {
            name: "Ferrari 250 GTO",
            year: '1962',
            bodyStyle: "Coupe",
            imageUrl:
              "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=240&h=160&fit=crop&auto=format",
          },
        ],
      },
    });
  } catch (error) {
    logger.error("MOCK-SUBMISSION-EMAIL", "Failed to send mock email", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to send mock submission email" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    message: `Mock submission email sent to ${MOCK_RECIPIENT}`,
  });
}
