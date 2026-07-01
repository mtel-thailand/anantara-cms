import { ApiContext } from '@/src/lib/api/types';
import { withApiLogger } from '@/src/lib/api/with-api-logger';
import { withAuth } from '@/src/lib/api/with-auth';
import { withValidate } from '@/src/lib/api/with-validate';
import { logger } from '@/src/lib/logger';
import { sendSubmissionEmail } from '@/src/lib/ses/client';
import { InferSchemas, SchemaMap } from '@/src/types/common';
import { NextRequest, NextResponse } from 'next/server';
import * as z from 'zod';

const sendEmailSchema = {
  body: z
    .object({
      receiver: z.email(),
    })
    .strict(),
} satisfies SchemaMap;

type PostContextReturnType = ApiContext & InferSchemas<typeof sendEmailSchema>;

async function postRouteHandler(
  request: NextRequest,
  ctx: PostContextReturnType,
) {
  const receiverEmail = ctx?.body?.receiver;
  if (!receiverEmail) {
    logger.error('SEND-EMAIL', 'Receiver email is required');
    return NextResponse.json(
      { error: 'Receiver email is required' },
      { status: 400 },
    );
  }

  try {
    logger.info('SEND-EMAIL', `Sending email to: ${receiverEmail}`);
    await sendSubmissionEmail(receiverEmail);
  } catch (error) {
    logger.error('SEND-EMAIL', 'Error sending email', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Error sending email' }, { status: 500 });
  }

  logger.success('SEND-EMAIL', `Email sent successfully to: ${receiverEmail}`);

  return NextResponse.json({ message: 'Email sent' });
}

const postAuthWithValidateSchemaHandler = withValidate<
  typeof sendEmailSchema,
  ApiContext
>(sendEmailSchema, postRouteHandler);

export const POST = withApiLogger(postAuthWithValidateSchemaHandler);
