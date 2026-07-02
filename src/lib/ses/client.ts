import { SendEmailCommand, SESClient } from '@aws-sdk/client-ses';
import { submissionConfirmationTemplate } from './templates/submissionConfirmation';
import { logger } from "@/src/lib/logger";

const sesClient = new SESClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY!,
  },
});

// TODO: Update the Subject email message later.
export const sendSubmissionEmail = async (receiverEmail: string) => {
  try {
    const receiver = receiverEmail ?? process.env.AWS_SES_TO!;
    logger.info('SES', `Sending email to: ${receiver}`);
    await sesClient.send(
      new SendEmailCommand({
        Source: process.env.AWS_SES_FROM!,
        Destination: {
          ToAddresses: [receiver],
        },
        Message: {
          Subject: {
            Data: `We've received your Concorso Roma submission`,
          },
          Body: {
            Html: {
              Data: submissionConfirmationTemplate(),
            },
          },
        },
      }),
    );
    logger.success('SES', `Email sent successfully to: ${receiver}`);
  } catch (error) {
    logger.error('SES', 'Error sending email', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error('Error sending email');
  }
};
