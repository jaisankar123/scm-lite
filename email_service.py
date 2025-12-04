# email_service.py
import smtplib
from email.mime.text import MIMEText
from config import settings
from typing import Awaitable, Callable
import logging

logger = logging.getLogger(__name__)

# NOTE: For production, you would typically use an async library 
# or a service like SendGrid, but this uses the standard smtplib for demonstration.

async def send_password_reset_email(recipient_email: str, reset_url: str) -> bool:
    """
    Sends a password reset email to the recipient with the reset URL.
    """
    if settings.EMAIL_HOST == "smtp.gmail.com":
        logger.warning("Email settings are placeholder. Email will NOT be sent.")
        print(f"To: {recipient_email}")
        print(f"Reset Link: {reset_url}")
        print(f"---")
        

    subject = "Password Reset Request for SCM-Lite"
    body = f"""
    Hello,

    We received a request to reset the password for your account.
    Please click the following link to set a new password:

    {reset_url}

    This link will expire in 15 minutes. If you did not request a password reset, 
    please ignore this email.

    Thank you,
    SCM-Lite Support
    """

    msg = MIMEText(body)
    msg['Subject'] = subject
    msg['From'] = settings.EMAIL_USERNAME
    msg['To'] = recipient_email


    try:
        with smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT) as server:
            server.starttls()
            server.login(settings.EMAIL_USERNAME, settings.EMAIL_PASSWORD)
            server.sendmail(settings.EMAIL_USERNAME, recipient_email, msg.as_string())
        logger.info(f"Password reset email sent to {recipient_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {recipient_email}: {e}")
        return False
    

async def send_2fa_code_email(recipient_email: str, code: str) -> bool:
    """
    Sends the 6-digit two-factor authentication code to the recipient.
    """
    if settings.EMAIL_HOST == "smtp.gmail.com":
        logger.warning("Email settings are placeholder. Email will NOT be sent, but code is logged.")
        print(f"\n*** 2FA CODE SENT (SIMULATED) ***")
        print(f"To: {recipient_email}")
        print(f"Code: {code}")
        print(f"*********************************\n")

    subject = "Your Two-Factor Authentication Code"
    body = f"""
    Hello,

    Your 6-digit verification code is:

    {code}

    This code is required to complete your login. It will expire in 5 minutes.
    If you did not attempt to log in, please ignore this email.

    Thank you,
    SCM-Lite Security
    """

    msg = MIMEText(body)
    msg['Subject'] = subject
    msg['From'] = settings.EMAIL_USERNAME
    msg['To'] = recipient_email

    try:
        with smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT) as server:
            server.starttls()
            server.login(settings.EMAIL_USERNAME, settings.EMAIL_PASSWORD)
            server.sendmail(settings.EMAIL_USERNAME, recipient_email, msg.as_string())
        logger.info(f"2FA code email sent to {recipient_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send 2FA code email to {recipient_email}: {e}")
        return False