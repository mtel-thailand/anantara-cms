import { SendEmailCommand, SESClient } from "@aws-sdk/client-ses";

const accessKeyId = process.env.SES_ACCESS_KEY_ID?.trim();
const secretAccessKey = process.env.SES_SECRET_ACCESS_KEY?.trim();

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
  await sesClient.send(
    new SendEmailCommand({
      Source: process.env.SES_FROM!,
      Destination: {
        ToAddresses: receiver.split(",").map((email) => email.trim()),
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
