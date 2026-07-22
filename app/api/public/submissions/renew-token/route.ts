import { NextRequest, NextResponse } from "next/server";
import * as z from "zod";
import { generateAccessToken } from "@/src/lib/access-token";
import type { ApiContext } from "@/src/lib/api/types";
import { withApiLogger } from "@/src/lib/api/with-api-logger";
import { withValidate } from "@/src/lib/api/with-validate";
import { logger } from "@/src/lib/logger";
import { StorageFile } from "@/src/lib/s3/client";
import { EmailTemplate, sendEmail } from "@/src/lib/ses/email";
import { createServiceRoleClient } from "@/src/lib/supabase/service-role";
import { InferSchemas, SchemaMap } from "@/src/types/api-schema";

const schemas = {
  body: z.object({ email: z.string().trim().min(1).email() }).strict(),
} satisfies SchemaMap;

type Context = ApiContext & InferSchemas<typeof schemas>;

type SubmissionMatch = { id: string; email: string };

const FAILURE_CATEGORIES = new Set([
  "selection_failed",
  "token_update_failed",
  "token_collision_exhausted",
  "email_payload_failed",
  "email_failed",
]);

function noContent() {
  return new NextResponse(null, { status: 204 });
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

function failureCategory(error: unknown) {
  return error instanceof Error && FAILURE_CATEGORIES.has(error.message)
    ? error.message
    : "unexpected_failure";
}

async function findNewestMatch(
  email: string,
  deleted: boolean,
): Promise<SubmissionMatch | null> {
  const supabase = createServiceRoleClient();
  // ponytail: scans rows because PostgREST cannot express lower(btrim(email)); replace only with an approved server-side lookup before production scale.
  const { data, error } = await supabase
    .from("car_submissions_form")
    .select("id, email")
    .filter("deleted_at", "is", deleted ? "not.null" : "null")
    .order("created_at", { ascending: false, nullsFirst: false });

  if (error) {
    throw new Error("selection_failed");
  }

  return (
    data.find((submission) => normalizeEmail(submission.email) === email) ??
    null
  );
}

async function findSubmission(email: string) {
  return (
    (await findNewestMatch(email, false)) ??
    (await findNewestMatch(email, true))
  );
}

async function rotateAccessToken(submissionId: string) {
  const supabase = createServiceRoleClient();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const accessToken = generateAccessToken();
    const { data, error } = await supabase
      .from("car_submissions_form")
      .update({ access_token: accessToken })
      .eq("id", submissionId)
      .select("id");

    if (error) {
      if (isUniqueViolation(error)) {
        continue;
      }
      throw new Error("token_update_failed");
    }

    if (
      data.length !== 1 ||
      !data[0]?.id ||
      data[0].id !== submissionId
    ) {
      throw new Error("token_update_failed");
    }

    return accessToken;
  }

  throw new Error("token_collision_exhausted");
}

async function sendRecoveryEmail(submissionId: string, accessToken: string) {
  const supabase = createServiceRoleClient();
  const { data: submission, error } = await supabase
    .from("car_submissions_form")
    .select("email, first_name, name, car_submission_vehicles (*)")
    .eq("id", submissionId)
    .single();

  if (error || !submission) {
    throw new Error("email_payload_failed");
  }

  const vehicles = submission.car_submission_vehicles.map((vehicle) => {
    const images = vehicle.images as StorageFile[];
    return {
      name: `${vehicle.make_of_vehicle} ${vehicle.model}`,
      year: vehicle.year_of_manufacture,
      bodyStyle: vehicle.body_style ?? "",
      imageUrl: images[0]?.publicUrl ?? "",
    };
  });

  try {
    await sendEmail<EmailTemplate.SubmissionRecovery>(submission.email, {
      template: EmailTemplate.SubmissionRecovery,
      params: {
        recipientName: `${submission.first_name} ${submission.name}`,
        accessToken,
        vehicles,
      },
    });
  } catch {
    throw new Error("email_failed");
  }
}

async function handler(_request: NextRequest, context: Context) {
  const correlationId = crypto.randomUUID();

  try {
    const submission = await findSubmission(normalizeEmail(context.body.email));
    if (!submission) {
      return noContent();
    }

    const accessToken = await rotateAccessToken(submission.id);
    await sendRecoveryEmail(submission.id, accessToken);
  } catch (error) {
    logger.error("RENEW-TOKEN", "Lost tracking-link recovery failed", {
      category: failureCategory(error),
      correlationId,
    });
  }

  return noContent();
}

const validated = withValidate<typeof schemas, ApiContext>(schemas, handler);

export const POST = withApiLogger(validated);
