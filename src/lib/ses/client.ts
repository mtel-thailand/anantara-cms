import { SendEmailCommand, SESClient } from "@aws-sdk/client-ses";
import { logger } from "../logger";

const accessKeyId = process.env.SES_ACCESS_KEY_ID?.trim();
const secretAccessKey = process.env.SES_SECRET_ACCESS_KEY?.trim();
const isTestMode = process.env.SES_TEST_MODE === "false" ? false : true;
const testReceiver = process.env.SES_TEST_RECEIVER?.trim() || '';
const emailName = process.env.SES_FROM_NAME || "Anantara Concorsoroma";

const sesClient = new SESClient({
  region: process.env.SES_REGION,
  credentials:
    accessKeyId && secretAccessKey
      ? { accessKeyId, secretAccessKey }
      : undefined,
});

type SendSesEmailOptions = {
  receiver: string;
  subject: string;
  html: string;
};

export async function sendSesEmail({
  receiver,
  subject,
  html,
}: SendSesEmailOptions) {
  const finalReceiver = isTestMode ? [testReceiver] : receiver.split(",").map((email) => email.trim());
  logger.info('SES EMAIL',`Sending email with test mode: ${isTestMode}, receiver: ${finalReceiver}`);
  await sesClient.send(
    new SendEmailCommand({
      Source: `${emailName} <${process.env.SES_FROM}>`,
      Destination: {
        ToAddresses: finalReceiver,
      },
      Message: {
        Subject: {
          Data: subject,
        },
        Body: {
          Html: {
            Data: html,
          },
        },
      },
    }),
  );
}
