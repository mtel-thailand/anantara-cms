import { ApiContext } from "@/src/lib/api/types";
import { withApiLogger } from "@/src/lib/api/with-api-logger";
import { withValidate } from "@/src/lib/api/with-validate";
import { logger } from "@/src/lib/logger";
import { StorageFile } from "@/src/lib/s3/client";
import { EmailTemplate, sendEmail } from "@/src/lib/ses/email";
import { createClient } from "@/src/lib/supabase/client";
import { InferSchemas, SchemaMap } from "@/src/types/api-schema";
import { NextRequest, NextResponse } from "next/server";
import * as z from "zod";

const submissionCreatedSchema = {
  body: z
    .object({
      submissionId: z.string(),
    })
    .strict(),
} satisfies SchemaMap;

type PostContextReturnType = ApiContext &
  InferSchemas<typeof submissionCreatedSchema>;

async function postRouteHandler(
  request: NextRequest,
  ctx: PostContextReturnType,
) {
  const submissionId = ctx?.body?.submissionId;
  if (!submissionId) {
    logger.error("SUBMISSION-CREATED", "Submission ID is required");
    return NextResponse.json(
      { error: "Submission ID is required" },
      { status: 400 },
    );
  }

  try {
    const supabase = createClient();

    const { data: submissionForm, error } = await supabase
      .from("car_submissions_form")
      .select(
        `
        *,
        car_submission_vehicles (*)
        `,
      )
      .eq("id", submissionId)
      .single();

    if (error) {
      logger.error("SUBMISSION-CREATED", "Error fetching submission form", {
        error,
      });
      throw new Error("Error fetching submission form");
    }

    logger.info(
      "SUBMISSION-CREATED",
      `Sending email for submissionId: ${submissionId}`,
    );

    const vehicles =
      submissionForm?.car_submission_vehicles?.map((vehicle) => {
        const imageUrl = vehicle.images as StorageFile[];
        return {
          name: `${vehicle.make_of_vehicle} ${vehicle.model}`,
          year: vehicle.year_of_manufacture,
          bodyStyle: vehicle.body_style ?? "",
          imageUrl: imageUrl?.[0]?.publicUrl ?? "",
        };
      }) ?? [];

    await sendEmail<EmailTemplate.SubmissionConfirm>(submissionForm.email, {
      template: EmailTemplate.SubmissionConfirm,
      params: {
        recipientName: `${submissionForm.first_name} ${submissionForm.name}`,
        accessToken: submissionForm.access_token ?? "",
        vehicles: vehicles,
      },
    });
  } catch (error) {
    logger.error("SUBMISSION-CREATED", "Error sending email", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Error sending email submission" },
      { status: 500 },
    );
  }

  logger.success(
    "SUBMISSION-CREATED",
    `Email sent successfully for submissionId: ${submissionId}`,
  );

  return NextResponse.json({ message: "Email sent" });
}

const postAuthWithValidateSchemaHandler = withValidate<
  typeof submissionCreatedSchema,
  ApiContext
>(submissionCreatedSchema, postRouteHandler);

export const POST = withApiLogger(postAuthWithValidateSchemaHandler);
