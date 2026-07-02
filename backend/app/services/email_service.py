import base64
import html
import logging
import smtplib
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import get_settings

logger = logging.getLogger(__name__)

BRAND_COLOR = "#7c3aed"
BRAND_MUTED = "#71717a"
BRAND_BG = "#f4f4f5"


def _branded_html_email(*, title: str, body_html: str, footer_note: str) -> str:
    settings = get_settings()
    brand = html.escape(settings.SMTP_FROM_NAME.strip() or "Nexora")
    return f"""\
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{html.escape(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:{BRAND_BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:{BRAND_BG};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
            <tr>
              <td style="background:{BRAND_COLOR};padding:24px 32px;">
                <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">{brand}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                {body_html}
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 28px;">
                <p style="margin:0;font-size:12px;line-height:1.6;color:{BRAND_MUTED};">{html.escape(footer_note)}</p>
                <p style="margin:12px 0 0;font-size:12px;color:{BRAND_MUTED};">© {brand}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
"""


def _format_from_header(from_name: str | None = None) -> str:
    settings = get_settings()
    if from_name and from_name.strip():
        return f"{from_name.strip()} <{settings.SMTP_FROM_EMAIL}>"
    return settings.email_from_header


def _send_via_resend(
    *,
    to_addresses: list[str],
    cc_addresses: list[str] | None,
    bcc_addresses: list[str] | None,
    subject: str,
    text_body: str,
    html_body: str | None,
    from_header: str,
    attachment_paths: list[tuple[str, str, bytes]] | None,
) -> None:
    import resend

    settings = get_settings()
    resend.api_key = settings.RESEND_API_KEY

    payload: dict = {
        "from": from_header,
        "to": to_addresses,
        "subject": subject,
        "text": text_body,
    }
    if html_body:
        payload["html"] = html_body
    if cc_addresses:
        payload["cc"] = cc_addresses
    if bcc_addresses:
        payload["bcc"] = bcc_addresses
    if attachment_paths:
        payload["attachments"] = [
            {
                "filename": filename,
                "content": base64.b64encode(content).decode("ascii"),
            }
            for filename, _content_type, content in attachment_paths
        ]

    resend.Emails.send(payload)


def _send_via_smtp(
    *,
    to_addresses: list[str],
    cc_addresses: list[str] | None,
    bcc_addresses: list[str] | None,
    subject: str,
    text_body: str,
    html_body: str | None,
    from_header: str,
    attachment_paths: list[tuple[str, str, bytes]] | None,
) -> None:
    settings = get_settings()
    all_recipients = list(to_addresses) + list(cc_addresses or []) + list(bcc_addresses or [])

    if attachment_paths:
        message = MIMEMultipart("mixed")
        alt = MIMEMultipart("alternative")
        alt.attach(MIMEText(text_body, "plain", "utf-8"))
        if html_body:
            alt.attach(MIMEText(html_body, "html", "utf-8"))
        message.attach(alt)
        for filename, _content_type, content in attachment_paths:
            part = MIMEApplication(content, Name=filename)
            part["Content-Disposition"] = f'attachment; filename="{filename}"'
            message.attach(part)
    else:
        message = MIMEMultipart("alternative")
        message.attach(MIMEText(text_body, "plain", "utf-8"))
        if html_body:
            message.attach(MIMEText(html_body, "html", "utf-8"))

    message["Subject"] = subject
    message["From"] = from_header
    message["To"] = ", ".join(to_addresses)
    if cc_addresses:
        message["Cc"] = ", ".join(cc_addresses)

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=30) as server:
        if settings.SMTP_USE_TLS:
            server.starttls()
        if settings.SMTP_USER:
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(settings.SMTP_FROM_EMAIL, all_recipients, message.as_string())


def _dispatch_email(
    *,
    to_addresses: list[str],
    cc_addresses: list[str] | None = None,
    bcc_addresses: list[str] | None = None,
    subject: str,
    text_body: str,
    html_body: str | None = None,
    from_name: str | None = None,
    attachment_paths: list[tuple[str, str, bytes]] | None = None,
) -> None:
    settings = get_settings()
    if not settings.email_enabled:
        raise RuntimeError(
            "Email is not configured. Set RESEND_API_KEY or SMTP_HOST and SMTP_FROM_EMAIL."
        )

    from_header = _format_from_header(from_name)
    if settings.use_resend:
        _send_via_resend(
            to_addresses=to_addresses,
            cc_addresses=cc_addresses,
            bcc_addresses=bcc_addresses,
            subject=subject,
            text_body=text_body,
            html_body=html_body,
            from_header=from_header,
            attachment_paths=attachment_paths,
        )
        provider = "resend"
    else:
        _send_via_smtp(
            to_addresses=to_addresses,
            cc_addresses=cc_addresses,
            bcc_addresses=bcc_addresses,
            subject=subject,
            text_body=text_body,
            html_body=html_body,
            from_header=from_header,
            attachment_paths=attachment_paths,
        )
        provider = "smtp"

    logger.info(
        "Email sent via %s to %s: %s",
        provider,
        ", ".join(to_addresses),
        subject,
    )


def send_crm_email(
    *,
    to_addresses: list[str],
    cc_addresses: list[str] | None = None,
    bcc_addresses: list[str] | None = None,
    subject: str,
    text_body: str,
    html_body: str | None = None,
    from_name: str | None = None,
    attachment_paths: list[tuple[str, str, bytes]] | None = None,
) -> None:
    """Send CRM email to multiple recipients with optional attachments.

    attachment_paths: list of (filename, content_type, content_bytes)
    """
    _dispatch_email(
        to_addresses=to_addresses,
        cc_addresses=cc_addresses,
        bcc_addresses=bcc_addresses,
        subject=subject,
        text_body=text_body,
        html_body=html_body,
        from_name=from_name,
        attachment_paths=attachment_paths,
    )


def send_email(*, to: str, subject: str, text_body: str, html_body: str | None = None) -> None:
    _dispatch_email(
        to_addresses=[to],
        subject=subject,
        text_body=text_body,
        html_body=html_body,
    )


def send_password_reset_email(*, to: str, full_name: str, reset_url: str) -> None:
    settings = get_settings()
    brand = settings.SMTP_FROM_NAME.strip() or "Nexora"
    greeting = html.escape(full_name.strip() or "there")
    safe_url = html.escape(reset_url, quote=True)
    expire_minutes = settings.PASSWORD_RESET_EXPIRE_MINUTES
    subject = f"{brand} — Reset your password"

    text_body = (
        f"Hi {full_name.strip() or 'there'},\n\n"
        f"We received a request to reset your {brand} account password.\n\n"
        f"Reset your password (expires in {expire_minutes} minutes):\n{reset_url}\n\n"
        "If you did not request this, you can safely ignore this email. "
        "Your password will not change.\n\n"
        f"— The {brand} team"
    )

    body_html = f"""\
<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#18181b;">Hi {greeting},</p>
<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#3f3f46;">
  We received a request to reset the password for your {html.escape(brand)} account.
  Click the button below to choose a new password.
</p>
<p style="margin:0 0 24px;text-align:center;">
  <a href="{safe_url}" style="display:inline-block;padding:12px 24px;background:{BRAND_COLOR};color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">
    Reset password
  </a>
</p>
<p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:{BRAND_MUTED};">
  This link expires in {expire_minutes} minutes and can only be used once.
</p>
<p style="margin:0;font-size:13px;line-height:1.6;color:{BRAND_MUTED};">
  If you did not request a password reset, you can ignore this email.
</p>
"""

    html_body = _branded_html_email(
        title=subject,
        body_html=body_html,
        footer_note="You received this email because a password reset was requested for your account.",
    )
    send_email(to=to, subject=subject, text_body=text_body, html_body=html_body)
