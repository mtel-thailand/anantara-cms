import { readFile } from "fs/promises";
import path from "path";
import { logger } from "@/src/lib/logger";
import { sendSesEmail } from "@/src/lib/ses/client";
import Handlebars from "handlebars";

export enum EmailTemplate {
  SubmissionConfirm = "submission-confirm",
  SubmissionStatus = "submission-status",
}

export type SubmissionEmailStatus =
  | "approved"
  | "not_selected"
  | "requested_info"
  | "under_review"
  | "waitlist";

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
  [EmailTemplate.SubmissionStatus]: {
    recipientName: string;
    accessToken: string;
    status: SubmissionEmailStatus;
    note: string;
    vehicle: {
      reference: string;
      name: string;
      year: number;
      bodyStyle: string;
      imageUrl: string;
    };
  };
};

export type EmailTemplateName = keyof EmailTemplateParams;

type EmailTemplateOptions<Template extends EmailTemplateName> = {
  template: Template;
  params: EmailTemplateParams[Template];
};

type EmailTemplateDefinition<Params> = {
  file: string;
  subject: string | ((params: Params) => string);
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

const STATUS_CONTENT: Record<
  SubmissionEmailStatus,
  {
    badgeLabel: string;
    buttonLabel: string;
    calloutText: string;
    icon: string;
    showIcon: boolean;
    showNote: boolean;
    showUniqueLink: boolean;
    subject: string;
    subtitle: string;
    themeBackground: string;
    themeColor: string;
    title: string;
  }
> = {
  approved: {
    badgeLabel: "Approved",
    buttonLabel: "View My Submission",
    calloutText:
      "What happens next? Our team will contact you when it is time to complete: The Car Entry Form & The Owner Registration Form. Your participation will be confirmed once both forms have been submitted.",
    icon: "✓",
    showIcon: true,
    showNote: false,
    showUniqueLink: true,
    subject: "Congratulations — your car submission was approved",
    subtitle:
      "Your Car Submission has been approved. We’ll contact you when the next step is ready.",
    themeBackground: "#edfbf3",
    themeColor: "#00a651",
    title: "Congratulations!",
  },
  requested_info: {
    badgeLabel: "More Info Required",
    buttonLabel: "Update Car Submission",
    calloutText: "",
    icon: "×",
    showIcon: true,
    showNote: true,
    showUniqueLink: true,
    subject: "More information is required for your car submission",
    subtitle:
      "Our Selection Committee requires additional information to complete your review.",
    themeBackground: "#fff7e8",
    themeColor: "#f39200",
    title: "More Information Required",
  },
  not_selected: {
    badgeLabel: "Not Selected",
    buttonLabel: "Contact Us",
    calloutText:
      "We encourage you to apply again in the future. If you have questions about the selection process, please don’t hesitate to reach out.",
    icon: "",
    showIcon: false,
    showNote: false,
    showUniqueLink: false,
    subject: "An update on your Concorso Roma submission",
    subtitle:
      "After careful consideration, your vehicle was not selected for this edition of Concorso Roma.",
    themeBackground: "#efefef",
    themeColor: "#555555",
    title: "Thanks for your interest",
  },
  under_review: {
    badgeLabel: "Under Review",
    buttonLabel: "View My Submission",
    calloutText:
      "You will be notified by email once the Selection Committee has made their decision. Track your submission at any time:",
    icon: "◷",
    showIcon: true,
    showNote: false,
    showUniqueLink: true,
    subject: "Your car submission is under review",
    subtitle:
      "Your vehicle is currently being reviewed by our Selection Committee.",
    themeBackground: "#fbf8e9",
    themeColor: "#ad963d",
    title: "Under Review",
  },
  waitlist: {
    badgeLabel: "Waitlisted",
    buttonLabel: "View My Submission",
    calloutText:
      "Your vehicle meets our quality standards and has been placed on the waitlist. You will be notified if a spot becomes available. Track your submission at any time:",
    icon: "⌛",
    showIcon: true,
    showNote: false,
    showUniqueLink: true,
    subject: "You've been waitlisted for Anantara Concorso Roma",
    subtitle:
      "Your application has been placed on our waitlist for the Anantara Concorso Roma.",
    themeBackground: "#eef3f8",
    themeColor: "#637995",
    title: "You've Been Waitlisted",
  },
};

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
  [EmailTemplate.SubmissionStatus]: {
    file: "submission-status.html",
    subject: ({ status }) => STATUS_CONTENT[status].subject,
    resolveParams: ({ accessToken, note, recipientName, status, vehicle }) => {
      const content = STATUS_CONTENT[status];
      const submissionUrl =
        status === "not_selected"
          ? createClientUrl("/en/contact/")
          : createClientUrl("/en/my-submission", {
              token: accessToken,
            });

      return {
        ...content,
        recipientName,
        note,
        vehicle,
        buttonUrl: submissionUrl,
        submissionUrl,
      };
    },
  },
} satisfies EmailTemplateRegistry;

async function renderEmailTemplate<Template extends EmailTemplateName>(
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
    const subjectDefinition = EMAIL_TEMPLATES[options.template].subject;
    const subject =
      typeof subjectDefinition === "function"
        ? (
            subjectDefinition as (
              params: EmailTemplateParams[Template],
            ) => string
          )(options.params)
        : subjectDefinition;
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
