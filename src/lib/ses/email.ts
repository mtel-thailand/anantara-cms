import { readFile } from "fs/promises";
import path from "path";
import { logger } from "@/src/lib/logger";
import { sendSesEmail } from "@/src/lib/ses/client";
import Handlebars from "handlebars";

export enum EmailTemplate {
  SubmissionConfirm = "submission-confirm",
}

export type EmailTemplateParams = {
  [EmailTemplate.SubmissionConfirm]: {
    recipientName: string;
    accessToken: string;
    vehicles: Array<{
      name: string;
      year: string;
      bodyStyle: string;
      imageUrl: string;
    }>;
  };
};

export type EmailTemplateName = keyof EmailTemplateParams;

type EmailTemplateOptions<Template extends EmailTemplateName> = {
  template: Template;
  params: EmailTemplateParams[Template];
};

type EmailTemplateDefinition<Params> = {
  file: string;
  subject: string;
  resolveParams: (params: Params) => Record<string, unknown>;
};

type EmailTemplateRegistry = {
  [Template in EmailTemplateName]: EmailTemplateDefinition<
    EmailTemplateParams[Template]
  >;
};

function createClientUrl(
  pathname: string,
  searchParams?: Record<string, string>,
) {
  const baseUrl = process.env.NEXT_PUBLIC_ANANTARA_CLIENT_BASE_URL;
  if (!baseUrl) {
    throw new Error("Client path is not configured");
  }

  const url = new URL(pathname, `${baseUrl.replace(/\/$/, "")}/`);
  Object.entries(searchParams ?? {}).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return url.toString();
}

const EMAIL_TEMPLATES = {
  [EmailTemplate.SubmissionConfirm]: {
    file: "submission-confirm.html",
    subject: "We've received your Concorso Roma submission",
    resolveParams: ({ recipientName, accessToken, vehicles }) => ({
      recipientName,
      vehicles,
      submissionUrl: createClientUrl("/en/my-submission", {
        token: accessToken,
      }),
    }),
  },
} satisfies EmailTemplateRegistry;

export async function renderEmailTemplate<Template extends EmailTemplateName>(
  options: EmailTemplateOptions<Template>,
) {
  const definition = EMAIL_TEMPLATES[
    options.template
  ] as EmailTemplateDefinition<EmailTemplateParams[Template]>;
  const templatePath = path.join(
    process.cwd(),
    "src",
    "templates",
    definition.file,
  );
  const source = await readFile(templatePath, "utf-8");
  const templateParams = definition.resolveParams(options.params);
  const render = Handlebars.compile(source, { strict: true });

  return render(templateParams);
}

export async function sendEmail<Template extends EmailTemplateName>(
  receiver: string,
  options: EmailTemplateOptions<Template>,
) {
  try {
    const html = await renderEmailTemplate(options);
    const subject = EMAIL_TEMPLATES[options.template].subject;
    logger.info("SES", `Sending email to: ${receiver}`);
    await sendSesEmail({ receiver, subject, html });
    logger.success("SES", `Email sent successfully to: ${receiver}`);
  } catch (error) {
    logger.error("SES", "Error sending email", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error("Error sending email");
  }
}
