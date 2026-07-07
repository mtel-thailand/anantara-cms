import { SendEmailCommand, SESClient } from '@aws-sdk/client-ses';
import { submissionConfirmationTemplate } from './templates/submissionConfirmation';
import { logger } from '@/src/lib/logger';
import { Database } from '@/src/types/database.types';

const DEFAULT_EMAIL = process.env.AWS_SES_TO ?? '';

export const sesClient = new SESClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY!,
  },
});

type CarSubmissionForm =
  Database['public']['Tables']['car_submissions_form']['Row'];

const sendEmail = async (
  receiver: string,
  subject: string,
  htmlBody: string,
) => {
  try {
    logger.info('SES', `Sending email to: ${receiver}`);
    await sesClient.send(
      new SendEmailCommand({
        Source: process.env.AWS_SES_FROM!,
        Destination: {
          ToAddresses: [receiver],
        },
        Message: {
          Subject: {
            Data: subject,
          },
          Body: {
            Html: {
              Data: htmlBody,
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

// TODO: Update the Subject email message later.
export const sendSubmissionEmail = async (
  submissionForm: CarSubmissionForm,
) => {
  try {
    const { name, first_name, email, access_token } = submissionForm;
    const receiver = email ?? DEFAULT_EMAIL;
    const recipientName = `${first_name} ${name}`;
    logger.info(
      'SES-sendSubmissionEmail',
      `Sending submission email to: ${receiver}`,
    );
    await sendEmail(
      receiver,
      `We've received your Concorso Roma submission`,
      submissionConfirmationTemplate({
        recipientName,
        accessToken: access_token ?? '',
      }),
    );
    logger.success(
      'SES-sendSubmissionEmail',
      `Submission email sent successfully to: ${receiver}`,
    );
  } catch (error) {
    logger.error('SES-sendSubmissionEmail', 'Error sending email', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error('Error sending email');
  }
};
