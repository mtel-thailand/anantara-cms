import { readFile } from "fs/promises";
import path from "path";
import { logger } from "@/src/lib/logger";
import { sendSesEmail } from "@/src/lib/ses/client";
import Handlebars from "handlebars";

export enum EmailTemplate {
  CarEntryFormComplete = "car-entry-form-complete",
  CarEntryFormRequired = "car-entry-form-required",
  OwnerRegistrationComplete = "owner-registration-complete",
  OwnerRegistrationRequired = "owner-registration-required",
  SubmissionConfirm = "submission-confirm",
  SubmissionStatus = "submission-status",
  SubmissionRecovery = "submission-recovery",
}

export type SubmissionEmailStatus =
  | "approved"
  | "not_selected"
  | "requested_info"
  | "under_review"
  | "waitlist";

export type CarEntryFormRequestAction = "car-entry-create" | "car-entry-edit";

export type EmailTemplateParams = {
  [EmailTemplate.CarEntryFormComplete]: {
    accessToken: string;
    vehicle: {
      bodyStyle: string;
      imageUrl: string;
      name: string;
      reference: string;
      year: string;
    };
  };
  [EmailTemplate.CarEntryFormRequired]: {
    accessToken: string;
    action: CarEntryFormRequestAction;
    message: string;
    submissionVehicleId: string;
    vehicle: {
      bodyStyle: string;
      imageUrl: string;
      name: string;
      reference: string;
      year: string;
    };
  };
  [EmailTemplate.OwnerRegistrationComplete]: {
    accessToken: string;
  };
  [EmailTemplate.OwnerRegistrationRequired]: {
    accessToken: string;
    action: "owner-registration-create" | "owner-registration-edit";
    message: string;
  };
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
    carId: string;
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
  [EmailTemplate.SubmissionRecovery]: {
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
  const baseUrl = process.env.NEXT_PUBLIC_IMAGE_PUBLIC_BASE_URL;
  if (!baseUrl) {
    throw new Error("Client path is not configured");
  }

  const url = new URL(pathname, `${baseUrl.replace(/\/$/, "")}/`);
  Object.entries(searchParams ?? {}).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return url.toString();
}

const EMAIL_LOGO_PATH = "logo/anantara-logo.png";

function createEmailImageUrl(imagePath: string) {
  const baseUrl = process.env.NEXT_PUBLIC_IMAGE_PUBLIC_BASE_URL?.trim();
  if (!baseUrl) {
    throw new Error("Public image path is not configured");
  }

  return `${baseUrl.replace(/\/$/, "")}/${imagePath.replace(/^\//, "")}`;
}

const STATUS_CONTENT: Record<
  SubmissionEmailStatus,
  {
    badgeColor: string;
    badgeLabel: string;
    buttonLabel: string;
    calloutText: string;
    iconPath: string;
    showIcon: boolean;
    showNote: boolean;
    showUniqueLink: boolean;
    subject: string;
    subtitle: string;
    subtitleColor: string;
    themeBackground: string;
    title: string;
  }
> = {
  approved: {
    badgeColor: "#00a651",
    badgeLabel: "Approved",
    buttonLabel: "View My Application",
    calloutText:
      "What happens next? Our team will contact you when it is time to complete: The Car Entry Form & The Owner Application Form. Your participation will be confirmed once both forms have been submitted.",
    iconPath: "/icons/status-approved.svg",
    showIcon: true,
    showNote: false,
    showUniqueLink: true,
    subject: "Congratulations — your car submission was approved",
    subtitle:
      "Your Car has been approved. We’ll contact you when the next step is ready.",
    subtitleColor: "#d2144f",
    themeBackground: "#edfbf3",
    title: "Congratulations!",
  },
  requested_info: {
    badgeColor: "#ff692f",
    badgeLabel: "More Info Required",
    buttonLabel: "Update Car Application",
    calloutText: "",
    iconPath: "/icons/status-requested-info.svg",
    showIcon: true,
    showNote: true,
    showUniqueLink: true,
    subject: "More information is required for your car submission",
    subtitle:
      "The Selection Committee requires additional information to complete your review.",
    subtitleColor: "#d2144f",
    themeBackground: "#ffeae2",
    title: "More Information Required",
  },
  not_selected: {
    badgeColor: "#555555",
    badgeLabel: "Not Selected",
    buttonLabel: "Contact Us",
    calloutText:
      "We encourage you to apply again in the future. If you have questions about the selection process, please don’t hesitate to reach out.",
    iconPath: "",
    showIcon: false,
    showNote: false,
    showUniqueLink: false,
    subject: "An update on your Concorso Roma submission",
    subtitle:
      "After careful consideration, your car was not selected for this edition of Concorso Roma.",
    subtitleColor: "#525252",
    themeBackground: "#efefef",
    title: "Thanks for your interest",
  },
  under_review: {
    badgeColor: "#ad963d",
    badgeLabel: "Under Review",
    buttonLabel: "View My Application",
    calloutText:
      "You will be notified by email once the Selection Committee has made their decision. Track your application at any time:",
    iconPath: "/icons/status-under-review.svg",
    showIcon: true,
    showNote: false,
    showUniqueLink: true,
    subject: "Your car submission is under review",
    subtitle:
      "Your car is currently being reviewed by the Selection Committee.",
    subtitleColor: "#d2144f",
    themeBackground: "#fbf8e9",
    title: "Under Review",
  },
  waitlist: {
    badgeColor: "#637995",
    badgeLabel: "Waitlisted",
    buttonLabel: "View My Application",
    calloutText:
      "Your car meets our quality standards and has been placed on the waitlist. You will be notified if a spot becomes available. Track your application at any time:",
    iconPath: "/icons/status-waitlisted.svg",
    showIcon: true,
    showNote: false,
    showUniqueLink: true,
    subject: "You've been waitlisted for Anantara Concorso Roma",
    subtitle:
      "Your application has been placed on our waitlist for the Anantara Concorso Roma.",
    subtitleColor: "#d2144f",
    themeBackground: "#eef3f8",
    title: "You've Been Waitlisted",
  },
};

const EMAIL_TEMPLATES = {
  [EmailTemplate.CarEntryFormComplete]: {
    file: "car-entry-form.html",
    subject: "Your Car Entry Form is complete",
    resolveParams: ({ accessToken, vehicle }) => ({
      buttonLabel: "View My Application",
      buttonUrl: createClientUrl("/en/my-submission", {
        token: accessToken,
      }),
      complete: true,
      iconUrl: createClientUrl("/icons/status-approved.svg"),
      logoUrl: createEmailImageUrl(EMAIL_LOGO_PATH),
      message: "",
      required: false,
      vehicle,
    }),
  },
  [EmailTemplate.CarEntryFormRequired]: {
    file: "car-entry-form.html",
    subject: "Action required: complete your Car Entry Form",
    resolveParams: ({
      accessToken,
      action,
      message,
      submissionVehicleId,
      vehicle,
    }) => ({
      buttonLabel: "Review Car Entry Form",
      buttonUrl: createClientUrl("/en/my-submission/", {
        token: accessToken,
        action,
        car: submissionVehicleId,
      }),
      complete: false,
      logoUrl: createEmailImageUrl(EMAIL_LOGO_PATH),
      message,
      required: true,
      vehicle,
    }),
  },
  [EmailTemplate.OwnerRegistrationComplete]: {
    file: "owner-registration-complete.html",
    subject: "Your Owner Application is complete",
    resolveParams: ({ accessToken }) => ({
      logoUrl: createEmailImageUrl(EMAIL_LOGO_PATH),
      submissionUrl: createClientUrl("/en/my-submission", {
        token: accessToken,
      }),
    }),
  },
  [EmailTemplate.OwnerRegistrationRequired]: {
    file: "owner-registration-required.html",
    subject: "Action required: complete your Owner Application",
    resolveParams: ({ accessToken, action, message }) => ({
      buttonLabel: "Review Owner Application",
      formDescription:
        "Please review your Owner Application and complete any required information to continue your application.",
      formTitle: "Owner Application",
      logoUrl: createEmailImageUrl(EMAIL_LOGO_PATH),
      message,
      formUrl: createClientUrl("/en/my-submission/", {
        token: accessToken,
        action,
      }),
    }),
  },
  [EmailTemplate.SubmissionConfirm]: {
    file: "submission-confirm.html",
    subject: "We've received your Concorso Roma submission",
    resolveParams: ({ recipientName, accessToken, vehicles }) => ({
      title: "Application Confirmed",
      body: "Your application for the Anantara Concorso Roma has been received.",
      footerText:
        "You received this email because you submitted a car application for the Anantara Concorso Roma.",
      logoUrl: createEmailImageUrl(EMAIL_LOGO_PATH),
      showRecipientName: true,
      recipientName,
      vehicles,
      submissionUrl: createClientUrl("/en/my-submission", {
        token: accessToken,
      }),
    }),
  },
  [EmailTemplate.SubmissionRecovery]: {
    file: "submission-confirm.html",
    subject: "Your Submission Link",
    resolveParams: ({ recipientName, accessToken, vehicles }) => ({
      title: "Your Application Link",
      body: "As requested, here’s your personal link to access and track your Anantara Concorso Roma application.",
      footerText:
        "You received this email because you submitted a car registration for the Anantara Concorso Roma.",
      logoUrl: createEmailImageUrl(EMAIL_LOGO_PATH),
      showRecipientName: false,
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
    resolveParams: ({
      accessToken = "",
      carId,
      note,
      recipientName,
      status,
      vehicle,
    }) => {
      const content = STATUS_CONTENT[status];
      const submissionUrl =
        status === "not_selected"
          ? createClientUrl("/en/contact/")
          : createClientUrl("/en/my-submission", {
              token: accessToken,
              ...(status === "requested_info"
                ? { action: "edit", car: carId }
                : {}),
            });
      return {
        ...content,
        iconUrl: content.iconPath ? createClientUrl(content.iconPath) : "",
        logoUrl: createEmailImageUrl(EMAIL_LOGO_PATH),
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

  return render({
    ...templateParams,
  });
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
