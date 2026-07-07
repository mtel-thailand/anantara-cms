type CarSubmissionTemplate = {
  recipientName: string;
  accessToken: string;
};

const ANANTARA_CLIENT_BASE_URL = process.env.ANANTARA_CLIENT_BASE_URL ?? '';

export const submissionConfirmationTemplate = (
  templateData: CarSubmissionTemplate,
) => {
  const { accessToken, recipientName } = templateData;
  const submissionUrl = `${ANANTARA_CLIENT_BASE_URL}/en/my-submission?token=${accessToken}`;
  return `
    <!doctype html>
    <html lang="en" xmlns="http://www.w3.org/1999/xhtml">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta http-equiv="X-UA-Compatible" content="IE=edge" />
        <title>Submission Confirmed – Anantara Concorso Roma</title>
        <style>
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600&family=EB+Garamond:wght@600&display=swap');
        body,
        table,
        td,
        p,
        a {
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
        }
        table,
        td {
            mso-table-lspace: 0pt;
            mso-table-rspace: 0pt;
        }
        img {
            -ms-interpolation-mode: bicubic;
            border: 0;
            display: block;
        }
        body {
            margin: 0;
            padding: 0;
            background-color: #f0ece8;
            font-family: 'EB Garamond', Georgia, 'Times New Roman', serif;
        }
        </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f0ece8">
        <table
        role="presentation"
        width="100%"
        cellpadding="0"
        cellspacing="0"
        border="0"
        style="background-color: #f0ece8"
        >
        <tr>
            <td align="center" style="padding: 40px 16px">
            <!-- ╔══════════════════════════════════════════════════════════╗ -->
            <!-- ║          EMAIL CARD — max-width 600px                   ║ -->
            <!-- ╚══════════════════════════════════════════════════════════╝ -->
            <table
                role="presentation"
                width="600"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="max-width: 600px; width: 100%; background-color: #ffffff"
            >
                <!-- ═══ HEADER ═══════════════════════════════════════════════ -->
                <tr>
                <td
                    align="center"
                    style="
                    padding: 32px 0 24px;
                    border-bottom: 1px solid #b6b6b6;
                    background: radial-gradient(
                        ellipse 80% 200px at 50% -60px,
                        #ffedf2 0%,
                        #ffffff 70%
                    );
                    "
                >
                    <div style="width: 100%">
                    <img
                        src="https://d15j1ksm9qghj4.cloudfront.net/logo/anantara-concorso-logo-origin.png"
                        alt="Anantara Concorso Roma"
                        width="80"
                        height="61.55"
                    />
                    </div>
                </td>
                </tr>

                <!-- ═══ HERO ══════════════════════════════════════════════════ -->
                <tr>
                <td align="center" style="padding: 56px 48px 32px">
                    <table
                    role="presentation"
                    width="100%"
                    cellpadding="0"
                    cellspacing="0"
                    border="0"
                    >
                    <tr>
                        <td align="center" style="padding-bottom: 12px">
                        <p
                            style="
                            margin: 0;
                            font-family:
                                'Playfair Display', Georgia, 'Times New Roman',
                                serif;
                            font-weight: 600;
                            font-size: 52px;
                            line-height: 1.2;
                            color: #1e1e1e;
                            text-align: center;
                            "
                        >
                            Submission Confirmed
                        </p>
                        </td>
                    </tr>
                    <tr>
                        <td align="center">
                        <!-- ★ DYNAMIC — replace "John Smith" with the recipient name -->
                        <p
                            style="
                            margin: 0;
                            font-family:
                                'EB Garamond', Georgia, 'Times New Roman', serif;
                            font-weight: 600;
                            font-size: 20px;
                            line-height: 1.4;
                            color: #c71a4e;
                            text-align: center;
                            "
                        >
                            Thank you, <strong>${recipientName}</strong>. Your
                            registration for the Anantara Concorso Roma has been
                            received.
                        </p>
                        </td>
                    </tr>
                    </table>
                </td>
                </tr>

                <!-- ═══ CONTENT ═══════════════════════════════════════════════ -->
                <tr>
                <td style="padding: 0 48px 48px">
                    <table
                    role="presentation"
                    width="100%"
                    cellpadding="0"
                    cellspacing="0"
                    border="0"
                    >
                    <!-- Reference Box -->
                    <!--  <tr>
                        <td style="padding-bottom: 32px">
                        <table
                            role="presentation"
                            width="100%"
                            cellpadding="0"
                            cellspacing="0"
                            border="0"
                            style="
                            background-color: #fafafa;
                            border: 1px solid #b6b6b6;
                            border-radius: 12px;
                            "
                        >
                            <tr>
                            <td align="center" style="padding: 24px">
                                <p
                                style="
                                    margin: 0 0 8px 0;
                                    font-family: 'EB Garamond', Georgia, serif;
                                    font-weight: 600;
                                    font-size: 20px;
                                    line-height: 1.4;
                                    color: #787878;
                                    text-align: center;
                                "
                                >
                                Submission Reference
                                </p>
                                ★ DYNAMIC — replace "REF-2027-00142" with the submission reference
                                <p
                                style="
                                    margin: 0;
                                    font-family:
                                    'Playfair Display', Georgia,
                                    'Times New Roman', serif;
                                    font-weight: 600;
                                    font-size: 36px;
                                    line-height: 44px;
                                    color: #1e1e1e;
                                    text-align: center;
                                    white-space: nowrap;
                                "
                                >
                                REF-2027-00142
                                </p>
                            </td>
                            </tr>
                        </table>
                        </td>
                    </tr> -->

                    <!-- Vehicles Section Header -->
                    <tr>
                        <td style="padding-bottom: 16px; padding-top: 8px">
                        <p
                            style="
                            margin: 0 0 8px 0;
                            font-family: 'EB Garamond', Georgia, serif;
                            font-weight: 600;
                            font-size: 24px;
                            line-height: 1;
                            color: #1e1e1e;
                            "
                        >
                            Your Submitted Vehicles
                        </p>
                        <div
                            style="
                            width: 40px;
                            height: 2px;
                            background-color: #c71a4e;
                            font-size: 0;
                            line-height: 0;
                            "
                        >
                            &nbsp;
                        </div>
                        </td>
                    </tr>

                    <!-- ┌──────────────────────────────────────────────────┐ -->
                    <!-- │  VEHICLE CARD LOOP — copy this block per vehicle │ -->
                    <!-- │  (max 10 vehicles total)                         │ -->
                    <!-- └──────────────────────────────────────────────────┘ -->

                    <!-- VEHICLE CARD 1 -->
                    <tr>
                        <td style="padding-bottom: 16px">
                        <table
                            role="presentation"
                            width="100%"
                            cellpadding="0"
                            cellspacing="0"
                            border="0"
                            style="border: 1px solid #b6b6b6; border-radius: 8px"
                        >
                            <tr>
                            <td style="padding: 16px">
                                <table
                                role="presentation"
                                width="100%"
                                cellpadding="0"
                                cellspacing="0"
                                border="0"
                                >
                                <tr>
                                    <!-- ★ DYNAMIC — replace src with vehicle image URL; alt with vehicle name -->
                                    <td
                                    width="120"
                                    valign="middle"
                                    style="padding-right: 16px"
                                    >
                                    <img
                                        src="https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=240&h=160&fit=crop&auto=format"
                                        width="120"
                                        height="80"
                                        alt="Ferrari Roma Spider"
                                        style="
                                        display: block;
                                        width: 120px;
                                        height: 80px;
                                        object-fit: cover;
                                        border-radius: 4px;
                                        border: 1px solid #b6b6b6;
                                        "
                                    />
                                    </td>
                                    <td valign="middle">
                                    <!-- ★ DYNAMIC — replace vehicle name -->
                                    <p
                                        style="
                                        margin: 0 0 4px 0;
                                        font-family:
                                            'EB Garamond', Georgia, serif;
                                        font-weight: 600;
                                        font-size: 24px;
                                        line-height: 1.2;
                                        color: #1e1e1e;
                                        white-space: nowrap;
                                        "
                                    >
                                        Ferrari Roma Spider
                                    </p>
                                    <!-- ★ DYNAMIC — replace year · body style -->
                                    <p
                                        style="
                                        margin: 0;
                                        font-family:
                                            'EB Garamond', Georgia, serif;
                                        font-weight: 600;
                                        font-size: 20px;
                                        line-height: 1.4;
                                        color: #525252;
                                        "
                                    >
                                        1963 &middot; Coup&eacute;
                                    </p>
                                    </td>
                                </tr>
                                </table>
                            </td>
                            </tr>
                        </table>
                        </td>
                    </tr>
                    <!-- END VEHICLE CARD 1 -->

                    <!-- VEHICLE CARD 2 -->
                    <tr>
                        <td style="padding-bottom: 16px">
                        <table
                            role="presentation"
                            width="100%"
                            cellpadding="0"
                            cellspacing="0"
                            border="0"
                            style="border: 1px solid #b6b6b6; border-radius: 8px"
                        >
                            <tr>
                            <td style="padding: 16px">
                                <table
                                role="presentation"
                                width="100%"
                                cellpadding="0"
                                cellspacing="0"
                                border="0"
                                >
                                <tr>
                                    <td
                                    width="120"
                                    valign="middle"
                                    style="padding-right: 16px"
                                    >
                                    <img
                                        src="https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=240&h=160&fit=crop&auto=format"
                                        width="120"
                                        height="80"
                                        alt="Ferrari 250 GTO"
                                        style="
                                        display: block;
                                        width: 120px;
                                        height: 80px;
                                        object-fit: cover;
                                        border-radius: 4px;
                                        border: 1px solid #b6b6b6;
                                        "
                                    />
                                    </td>
                                    <td valign="middle">
                                    <p
                                        style="
                                        margin: 0 0 4px 0;
                                        font-family:
                                            'EB Garamond', Georgia, serif;
                                        font-weight: 600;
                                        font-size: 24px;
                                        line-height: 1.2;
                                        color: #1e1e1e;
                                        white-space: nowrap;
                                        "
                                    >
                                        Ferrari 250 GTO
                                    </p>
                                    <p
                                        style="
                                        margin: 0;
                                        font-family:
                                            'EB Garamond', Georgia, serif;
                                        font-weight: 600;
                                        font-size: 20px;
                                        line-height: 1.4;
                                        color: #525252;
                                        "
                                    >
                                        1962 &middot; Coup&eacute;
                                    </p>
                                    </td>
                                </tr>
                                </table>
                            </td>
                            </tr>
                        </table>
                        </td>
                    </tr>
                    <!-- END VEHICLE CARD 2 -->

                    <!-- ── ADD MORE VEHICLE CARDS HERE — copy any card block above ── -->

                    <!-- Tracking Section -->
                    <tr>
                        <td style="padding-top: 16px; padding-bottom: 32px">
                        <table
                            role="presentation"
                            width="100%"
                            cellpadding="0"
                            cellspacing="0"
                            border="0"
                            style="background-color: #ffedf2; border-radius: 16px"
                        >
                            <tr>
                            <td align="center" style="padding: 32px">
                                <p
                                style="
                                    margin: 0 0 24px 0;
                                    font-family: 'EB Garamond', Georgia, serif;
                                    font-weight: 600;
                                    font-size: 20px;
                                    line-height: 1.4;
                                    color: #525252;
                                    text-align: center;
                                    max-width: 380px;
                                "
                                >
                                Track your submission status at any time using
                                your personal link:
                                </p>
                                <!-- ★ BUTTON — add your URL to the href below -->
                                <a
                                href="${submissionUrl}"
                                style="
                                    display: inline-block;
                                    background-color: #c71a4e;
                                    color: #ffffff;
                                    font-family: 'EB Garamond', Georgia, serif;
                                    font-weight: 600;
                                    font-size: 16px;
                                    line-height: 1;
                                    text-decoration: none;
                                    padding: 12px 24px;
                                    border-radius: 52px;
                                    white-space: nowrap;
                                "
                                >
                                View My Submission
                                </a>
                            </td>
                            </tr>
                        </table>
                        </td>
                    </tr>

                    <!-- Footnote -->
                    <tr>
                        <td align="center">
                        <p
                            style="
                            margin: 0;
                            font-family: 'EB Garamond', Georgia, serif;
                            font-weight: 600;
                            font-size: 20px;
                            line-height: 1.4;
                            color: #787878;
                            text-align: center;
                            "
                        >
                            This link is unique to your submission.
                        </p>
                        </td>
                    </tr>
                    </table>
                </td>
                </tr>

                <!-- ═══ FOOTER ═══════════════════════════════════════════════ -->
                <tr>
                <td
                    align="center"
                    style="background-color: #fafafa; padding: 48px"
                >
                    <table
                    role="presentation"
                    cellpadding="0"
                    cellspacing="0"
                    border="0"
                    >
                    <tr>
                        <td
                        align="center"
                        style="padding-bottom: 24px; opacity: 0.5"
                        >
                        <div style="width: 100%">
                            <img
                            src="https://d15j1ksm9qghj4.cloudfront.net/logo/anantara-concorso-logo-origin.png"
                            alt="Anantara Concorso Roma"
                            width="48"
                            height="36.93"
                            />
                        </div>
                        </td>
                    </tr>
                    <tr>
                        <td align="center" style="padding-bottom: 8px">
                        <p
                            style="
                            margin: 0;
                            font-family: 'EB Garamond', Georgia, serif;
                            font-weight: 600;
                            font-size: 20px;
                            line-height: 1.4;
                            color: #787878;
                            text-align: center;
                            max-width: 400px;
                            "
                        >
                            You received this email because you submitted a vehicle
                            registration for the Anantara Concorso Roma. For
                            support, contact us at
                            <a
                            href="mailto:support@anantara.com"
                            style="color: #787878; text-decoration: underline"
                            >support@anantara.com</a
                            >
                        </p>
                        </td>
                    </tr>
                    <tr>
                        <td align="center">
                        <p
                            style="
                            margin: 0;
                            font-family: 'EB Garamond', Georgia, serif;
                            font-weight: 600;
                            font-size: 20px;
                            line-height: 1.4;
                            color: #b6b6b6;
                            text-align: center;
                            "
                        >
                            &copy; 2027 Anantara. All rights reserved.
                        </p>
                        </td>
                    </tr>
                    </table>
                </td>
                </tr>
            </table>
            <!-- End email card -->
            </td>
        </tr>
        </table>
    </body>
    </html>
`;
};
