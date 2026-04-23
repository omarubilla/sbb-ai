import { NextResponse } from "next/server";

interface SupportInquiryRequest {
  name?: string;
  email?: string;
  institution?: string;
  message?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SupportInquiryRequest;

    const name = body.name?.trim() ?? "";
    const email = body.email?.trim() ?? "";
    const institution = body.institution?.trim() ?? "";
    const message = body.message?.trim() ?? "";

    if (!name || !email || !institution || !message) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 },
      );
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.SUPPORT_EMAIL_FROM;
    const supportRecipient =
      process.env.SUPPORT_EMAIL_TO ?? "support@south-bay-bio.com";

    if (!resendApiKey || !fromEmail) {
      return NextResponse.json(
        {
          error:
            "Support email is not configured. Missing RESEND_API_KEY or SUPPORT_EMAIL_FROM.",
        },
        { status: 500 },
      );
    }

    const supportSubject = `Scientific Support Inquiry - ${name}`;
    const supportText = [
      "New scientific support inquiry",
      "",
      `Name: ${name}`,
      `Email: ${email}`,
      `Institution: ${institution}`,
      "",
      "Project Message:",
      message,
    ].join("\n");

    const userSubject = "We received your South Bay Bio support inquiry";
    const userText = [
      `Hi ${name},`,
      "",
      "Thanks for contacting South Bay Bio scientific support. We received your inquiry and our team will follow up shortly.",
      "",
      "Your submitted details:",
      `Institution: ${institution}`,
      "",
      "Your message:",
      message,
      "",
      "Best regards,",
      "South Bay Bio Scientific Support",
    ].join("\n");

    const emailEndpoint = "https://api.resend.com/emails";

    const [supportResponse, userResponse] = await Promise.all([
      fetch(emailEndpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [supportRecipient],
          subject: supportSubject,
          text: supportText,
          reply_to: email,
        }),
      }),
      fetch(emailEndpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [email],
          subject: userSubject,
          text: userText,
        }),
      }),
    ]);

    if (!supportResponse.ok || !userResponse.ok) {
      const [supportErrorText, userErrorText] = await Promise.all([
        supportResponse.text(),
        userResponse.text(),
      ]);

      console.error("Support inquiry email send failed", {
        supportStatus: supportResponse.status,
        userStatus: userResponse.status,
        supportErrorText,
        userErrorText,
      });

      return NextResponse.json(
        { error: "Could not send support inquiry emails." },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Support inquiry request failed", error);
    return NextResponse.json(
      { error: "Unexpected server error while sending support inquiry." },
      { status: 500 },
    );
  }
}
