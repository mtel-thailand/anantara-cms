import { SendEmailCommand, SESClient } from "@aws-sdk/client-ses";

const sesClient = new SESClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY!,
  },
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
      Source: process.env.AWS_SES_FROM!,
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
