"""
Email Service Module for Moneyssutra
====================================
Modular email service that can switch between providers:
- Resend (via Emergent integration) - Default for trial
- SendGrid - For commercial scale
- Mailgun - Alternative option

To switch providers, change EMAIL_PROVIDER in .env
"""

import os
import time
import logging
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Email Provider Configuration — NO unsafe fallbacks
EMAIL_PROVIDER = os.environ.get("EMAIL_PROVIDER", "resend")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL")
SENDER_NAME = os.environ.get("SENDER_NAME")
APP_URL = os.environ.get("APP_URL")

if not SENDER_EMAIL:
    logger.critical("SENDER_EMAIL is NOT set — emails will fail. Set it to noreply@moneyssutra.com")
    raise RuntimeError("SENDER_EMAIL environment variable is required")
if not SENDER_NAME:
    SENDER_NAME = "MoneySSutra Support"
if not APP_URL:
    APP_URL = "https://moneyssutra.com"

# MoneySSutra Brand Colors
BRAND_PRIMARY = "#00D09C"  # Mint Green
BRAND_DARK = "#0B8F70"
BRAND_BG = "#F8FAF9"
TEXT_PRIMARY = "#1a1a1a"
TEXT_SECONDARY = "#666666"

# ── Startup validation ──
_resend_key = os.environ.get("RESEND_API_KEY")
if not _resend_key:
    logger.critical("RESEND_API_KEY is NOT set — all OTP and notification emails WILL FAIL")
    raise RuntimeError("RESEND_API_KEY environment variable is required")

logger.info(f"Email service ready: provider={EMAIL_PROVIDER}, sender={SENDER_EMAIL}, key=...{_resend_key[-6:]}")


def get_email_header():
    """Returns branded email header HTML"""
    return f"""
    <div style="background: linear-gradient(135deg, {BRAND_PRIMARY} 0%, {BRAND_DARK} 100%); padding: 30px 20px; text-align: center;">
        <h1 style="margin: 0; font-family: 'Segoe UI', Arial, sans-serif; font-size: 28px; font-weight: bold; color: white; letter-spacing: 1px;">
            MoneySSutra
        </h1>
        <p style="margin: 5px 0 0 0; font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: rgba(255,255,255,0.8);">
            Your Personal Finance Tracker
        </p>
    </div>
    """


def get_email_footer():
    """Returns branded email footer HTML"""
    return f"""
    <div style="background-color: #f5f5f5; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
        <p style="margin: 0 0 10px 0; font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px; color: {TEXT_PRIMARY};">
            Stay Wealthy,<br>
            <strong style="color: {BRAND_PRIMARY};">Team MoneySSutra</strong>
        </p>
        <p style="margin: 0; font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #999;">
            This is an automated message, please do not reply.
        </p>
    </div>
    """


def get_username_recovery_email(username: str) -> dict:
    """
    Generate Username Recovery Email
    """
    subject = "Your MoneySSutra Username"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: {BRAND_BG}; font-family: 'Segoe UI', Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <tr>
                <td>
                    {get_email_header()}
                </td>
            </tr>
            <tr>
                <td style="padding: 40px 30px;">
                    <h2 style="margin: 0 0 20px 0; font-family: 'Segoe UI', Arial, sans-serif; font-size: 22px; color: {TEXT_PRIMARY};">
                        Hello,
                    </h2>
                    <p style="margin: 0 0 25px 0; font-family: 'Segoe UI', Arial, sans-serif; font-size: 16px; color: {TEXT_SECONDARY}; line-height: 1.6;">
                        We received a request to remind you of the username associated with your MoneySSutra account.
                    </p>
                    
                    <div style="background-color: {BRAND_BG}; border-left: 4px solid {BRAND_PRIMARY}; padding: 20px; border-radius: 0 8px 8px 0; margin: 25px 0;">
                        <p style="margin: 0 0 5px 0; font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px; color: {TEXT_SECONDARY};">
                            Your Username:
                        </p>
                        <p style="margin: 0; font-family: 'Segoe UI', Arial, sans-serif; font-size: 24px; font-weight: bold; color: {BRAND_PRIMARY};">
                            {username}
                        </p>
                    </div>
                    
                    <p style="margin: 25px 0; font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px; color: {TEXT_SECONDARY}; line-height: 1.6;">
                        If you did not request this information, you can safely ignore this email. Your account remains secure.
                    </p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{APP_URL}" style="display: inline-block; background-color: {BRAND_PRIMARY}; color: white; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-family: 'Segoe UI', Arial, sans-serif; font-size: 16px; font-weight: 600;">
                            Log In Now
                        </a>
                    </div>
                </td>
            </tr>
            <tr>
                <td>
                    {get_email_footer()}
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    
    return {"subject": subject, "html": html_content}


def get_password_reset_email(username: str, reset_link: str) -> dict:
    """
    Generate Password Reset Email
    """
    subject = "Reset your MoneySSutra Password"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: {BRAND_BG}; font-family: 'Segoe UI', Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <tr>
                <td>
                    {get_email_header()}
                </td>
            </tr>
            <tr>
                <td style="padding: 40px 30px;">
                    <h2 style="margin: 0 0 20px 0; font-family: 'Segoe UI', Arial, sans-serif; font-size: 22px; color: {TEXT_PRIMARY};">
                        Hello {username},
                    </h2>
                    <p style="margin: 0 0 25px 0; font-family: 'Segoe UI', Arial, sans-serif; font-size: 16px; color: {TEXT_SECONDARY}; line-height: 1.6;">
                        You recently requested to reset your password for your MoneySSutra account. Click the button below to choose a new one:
                    </p>
                    
                    <div style="text-align: center; margin: 35px 0;">
                        <a href="{reset_link}" style="display: inline-block; background-color: {BRAND_PRIMARY}; color: white; text-decoration: none; padding: 16px 50px; border-radius: 8px; font-family: 'Segoe UI', Arial, sans-serif; font-size: 18px; font-weight: 600; box-shadow: 0 4px 12px rgba(0, 208, 156, 0.3);">
                            Reset Password
                        </a>
                    </div>
                    
                    <div style="background-color: #FFF9E6; border: 1px solid #FFE082; padding: 15px 20px; border-radius: 8px; margin: 25px 0;">
                        <p style="margin: 0; font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px; color: #8B6914;">
                            ⏱ For your security, this link will expire in <strong>30 minutes</strong>.
                        </p>
                    </div>
                    
                    <p style="margin: 20px 0; font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px; color: {TEXT_SECONDARY}; line-height: 1.6;">
                        If you did not request a password reset, please ignore this email or contact our support team if you have concerns about your account security.
                    </p>
                    
                    <p style="margin: 20px 0 0 0; font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #999; line-height: 1.6;">
                        If the button doesn't work, copy and paste this link into your browser:<br>
                        <a href="{reset_link}" style="color: {BRAND_PRIMARY}; word-break: break-all;">{reset_link}</a>
                    </p>
                </td>
            </tr>
            <tr>
                <td>
                    {get_email_footer()}
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    
    return {"subject": subject, "html": html_content}


def get_password_changed_email(username: str) -> dict:
    """
    Generate Password Changed Security Notification Email
    """
    subject = "Your MoneySSutra Password Has Been Changed"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: {BRAND_BG}; font-family: 'Segoe UI', Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <tr>
                <td>
                    {get_email_header()}
                </td>
            </tr>
            <tr>
                <td style="padding: 40px 30px;">
                    <div style="text-align: center; margin-bottom: 25px;">
                        <div style="display: inline-block; background-color: #E8F5E9; border-radius: 50%; padding: 15px;">
                            <span style="font-size: 32px;">🔐</span>
                        </div>
                    </div>
                    
                    <h2 style="margin: 0 0 20px 0; font-family: 'Segoe UI', Arial, sans-serif; font-size: 22px; color: {TEXT_PRIMARY}; text-align: center;">
                        Password Successfully Changed
                    </h2>
                    
                    <p style="margin: 0 0 25px 0; font-family: 'Segoe UI', Arial, sans-serif; font-size: 16px; color: {TEXT_SECONDARY}; line-height: 1.6; text-align: center;">
                        Hello {username}, your MoneySSutra account password has been successfully changed.
                    </p>
                    
                    <div style="background-color: #FFEBEE; border: 1px solid #FFCDD2; padding: 20px; border-radius: 8px; margin: 25px 0;">
                        <p style="margin: 0; font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px; color: #C62828; line-height: 1.6;">
                            <strong>⚠️ If you didn't make this change</strong><br>
                            Someone may have accessed your account. Please reset your password immediately and review your account activity.
                        </p>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{APP_URL}" style="display: inline-block; background-color: {BRAND_PRIMARY}; color: white; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-family: 'Segoe UI', Arial, sans-serif; font-size: 16px; font-weight: 600;">
                            Go to MoneySSutra
                        </a>
                    </div>
                </td>
            </tr>
            <tr>
                <td>
                    {get_email_footer()}
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    
    return {"subject": subject, "html": html_content}


def send_email_resend(to_email: str, subject: str, html_content: str) -> dict:
    """Send email using Resend API — simple sync call"""
    try:
        import resend

        resend.api_key = os.environ.get("RESEND_API_KEY")
        if not resend.api_key:
            msg = "RESEND_API_KEY not set in environment"
            logger.error(msg)
            raise ValueError(msg)

        sender = f"{SENDER_NAME} <{SENDER_EMAIL}>"
        logger.info(f"Sending email: from={sender}, to={to_email}, subject={subject[:50]}")

        params = {
            "from": sender,
            "to": [to_email],
            "subject": subject,
            "html": html_content
        }

        t0 = time.time()
        email = resend.Emails.send(params)
        elapsed = round((time.time() - t0) * 1000)

        logger.info(f"Email sent to {to_email} via Resend in {elapsed}ms, id={email.get('id')}, response={email}")
        return {"success": True, "email_id": email.get("id")}

    except Exception as e:
        logger.error(f"Failed to send email via Resend to {to_email}: {str(e)}", exc_info=True)
        return {"success": False, "error": str(e)}


def send_email_sendgrid(to_email: str, subject: str, html_content: str) -> dict:
    """Send email using SendGrid API (for commercial scale)"""
    try:
        from sendgrid import SendGridAPIClient
        from sendgrid.helpers.mail import Mail

        message = Mail(
            from_email=SENDER_EMAIL,
            to_emails=to_email,
            subject=subject,
            html_content=html_content
        )

        sg = SendGridAPIClient(os.environ.get("SENDGRID_API_KEY"))
        response = sg.send(message)

        logger.info(f"Email sent to {to_email} via SendGrid, status={response.status_code}")
        return {"success": True, "status_code": response.status_code}

    except Exception as e:
        logger.error(f"Failed to send email via SendGrid to {to_email}: {str(e)}")
        return {"success": False, "error": str(e)}


def send_email_mailgun(to_email: str, subject: str, html_content: str) -> dict:
    """Send email using Mailgun API"""
    try:
        import requests

        response = requests.post(
            f"https://api.mailgun.net/v3/{os.environ.get('MAILGUN_DOMAIN')}/messages",
            auth=("api", os.environ.get("MAILGUN_API_KEY")),
            data={
                "from": f"{SENDER_NAME} <{SENDER_EMAIL}>",
                "to": to_email,
                "subject": subject,
                "html": html_content
            }
        )

        if response.status_code == 200:
            logger.info(f"Email sent to {to_email} via Mailgun")
            return {"success": True}
        else:
            logger.error(f"Mailgun failed for {to_email}: {response.text}")
            return {"success": False, "error": response.text}

    except Exception as e:
        logger.error(f"Failed to send email via Mailgun to {to_email}: {str(e)}")
        return {"success": False, "error": str(e)}


def send_email(to_email: str, subject: str, html_content: str) -> dict:
    """Main email sending function - routes to appropriate provider (sync)"""
    provider = EMAIL_PROVIDER.lower()

    if provider == "resend":
        return send_email_resend(to_email, subject, html_content)
    elif provider == "sendgrid":
        return send_email_sendgrid(to_email, subject, html_content)
    elif provider == "mailgun":
        return send_email_mailgun(to_email, subject, html_content)
    else:
        logger.error(f"Unknown email provider: {provider}")
        return {"success": False, "error": f"Unknown email provider: {provider}"}


# Convenience functions for specific email types (all sync)
def send_username_recovery_email(to_email: str, username: str) -> dict:
    """Send username recovery email"""
    email_data = get_username_recovery_email(username)
    return send_email(to_email, email_data["subject"], email_data["html"])


def send_password_reset_email(to_email: str, username: str, reset_token: str) -> dict:
    """Send password reset email with reset link"""
    reset_link = f"{APP_URL}/reset-password?token={reset_token}"
    email_data = get_password_reset_email(username, reset_link)
    return send_email(to_email, email_data["subject"], email_data["html"])


def send_password_changed_notification(to_email: str, username: str) -> dict:
    """Send password changed security notification"""
    email_data = get_password_changed_email(username)
    return send_email(to_email, email_data["subject"], email_data["html"])


def get_otp_email(otp: str) -> dict:
    """Generate lightweight OTP email — fast to render, fast to deliver"""
    subject = f"Your MoneySSutra OTP: {otp}"

    html_content = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:20px;font-family:Arial,sans-serif;background:#f8faf9;">
<table width="100%" style="max-width:480px;margin:0 auto;background:#fff;border-radius:8px;border:1px solid #e0e0e0;">
<tr><td style="background:linear-gradient(135deg,{BRAND_PRIMARY},{BRAND_DARK});padding:16px;text-align:center;">
<b style="color:#fff;font-size:20px;">MoneySSutra</b></td></tr>
<tr><td style="padding:30px;text-align:center;">
<p style="margin:0 0 20px;color:{TEXT_SECONDARY};font-size:15px;">Your verification code is</p>
<div style="background:{BRAND_BG};border:2px dashed {BRAND_PRIMARY};padding:18px;border-radius:8px;display:inline-block;">
<b style="font-family:monospace;font-size:32px;color:{BRAND_PRIMARY};letter-spacing:8px;">{otp}</b></div>
<p style="margin:20px 0 0;color:#8B6914;font-size:13px;">Valid for 5 minutes. Do not share.</p>
</td></tr></table></body></html>"""

    return {"subject": subject, "html": html_content}


def send_otp_email(to_email: str, otp: str) -> dict:
    """Send OTP verification email (sync)"""
    email_data = get_otp_email(otp)
    return send_email(to_email, email_data["subject"], email_data["html"])


def send_otp_email_sync(to_email: str, otp: str):
    """Synchronous OTP email — plain text for maximum deliverability"""
    import resend as _resend
    _resend.api_key = os.environ.get("RESEND_API_KEY")
    if not _resend.api_key:
        msg = f"RESEND_API_KEY not set. Cannot send OTP to {to_email}"
        logger.error(f"[BG] {msg}")
        raise ValueError(msg)

    sender = f"{SENDER_NAME} <{SENDER_EMAIL}>"
    logger.info(f"[BG] Sending OTP email: from={sender}, to={to_email}")

    params = {
        "from": sender,
        "to": [to_email],
        "subject": f"Your MoneySSutra OTP: {otp}",
        "text": f"Your MoneySSutra verification code is: {otp}\n\nValid for 5 minutes. Do not share this code with anyone.\n\n- MoneySSutra Team",
    }

    for attempt in range(2):
        try:
            t0 = __import__("time").time()
            result = _resend.Emails.send(params)
            elapsed = round((__import__("time").time() - t0) * 1000)
            logger.info(f"[BG] OTP email sent to {to_email} in {elapsed}ms (id={result.get('id')}, response={result})")
            return
        except Exception as e:
            logger.error(f"[BG] OTP email attempt {attempt+1} failed for {to_email}: {e}", exc_info=True)
            if attempt == 0:
                __import__("time").sleep(2)

    raise RuntimeError(f"OTP email to {to_email} failed after 2 attempts")


def send_email_sync(to_email: str, subject: str, html_content: str):
    """Synchronous email send with retry — for background tasks"""
    import resend as _resend
    _resend.api_key = os.environ.get("RESEND_API_KEY")
    if not _resend.api_key:
        msg = f"RESEND_API_KEY not set. Cannot send email to {to_email}"
        logger.error(f"[BG] {msg}")
        raise ValueError(msg)

    params = {
        "from": f"{SENDER_NAME} <{SENDER_EMAIL}>",
        "to": [to_email],
        "subject": subject,
        "html": html_content,
    }

    for attempt in range(2):
        try:
            t0 = __import__("time").time()
            result = _resend.Emails.send(params)
            elapsed = round((__import__("time").time() - t0) * 1000)
            logger.info(f"[BG] Email sent to {to_email} in {elapsed}ms (id={result.get('id')})")
            return
        except Exception as e:
            logger.error(f"[BG] Email attempt {attempt+1} failed for {to_email}: {e}")
            if attempt == 0:
                __import__("time").sleep(2)

    raise RuntimeError(f"Email to {to_email} failed after 2 attempts")
