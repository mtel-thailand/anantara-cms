import { readFile } from "fs/promises";
import path from "path";
import { logger } from "../logger";
import { SendEmailCommand } from "@aws-sdk/client-ses";
import { sesClient } from "./client";

export type EmailTemplateParams = {
  "submission-confirm": {
    recipientName: string;
    accessToken: string;
    submissionUrl: string;
  };
};

export type EmailTemplateName = keyof EmailTemplateParams;

type EmailTemplateOptions = {
  [Template in EmailTemplateName]: {
    template: Template;
    params: EmailTemplateParams[Template];
  };
}[EmailTemplateName];

const EMAIL_TEMPLATE_FILES = {
  "submission-confirm": "submission-confirm.html",
} as const satisfies Record<EmailTemplateName, string>;

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };

    return entities[character];
  });
}

export async function renderEmailTemplate(options: EmailTemplateOptions) {
  const templatePath = path.join(
    process.cwd(),
    "src",
    "templates",
    EMAIL_TEMPLATE_FILES[options.template],
  );
  let html = await readFile(templatePath, "utf-8");

  Object.entries(options.params).forEach(([key, value]) => {
    html = html.replaceAll(`{{${key}}}`, escapeHtml(String(value)));
  });

  const unresolvedPlaceholders = html.match(/{{[^{}]+}}/g);
  if (unresolvedPlaceholders) {
    throw new Error(
      `Missing parameters for template "${options.template}": ${unresolvedPlaceholders.join(", ")}`,
    );
  }

  return html;
}

export async function sendEmail(
  receiver: string,
  subject: string,
  options: EmailTemplateOptions,
) {
  try {
    const html = await renderEmailTemplate(options);
    logger.info("SES", `Sending email to: ${receiver}`);
    await sesClient.send(
      new SendEmailCommand({
        Source: process.env.AWS_SES_FROM!,
        Destination: {
          ToAddresses: [...receiver.split(",").map((email) => email.trim())],
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
    logger.success("SES", `Email sent successfully to: ${receiver}`);
  } catch (error) {
    logger.error("SES", "Error sending email", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error("Error sending email");
  }
}
