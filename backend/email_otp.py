"""Отправка OTP на email (SMTP или вывод в stdout для MVP)."""
from __future__ import annotations

import logging
import os
import smtplib
import ssl
from email.message import EmailMessage

logger = logging.getLogger(__name__)


def normalize_email(email: str) -> str:
    return (email or "").strip().lower()


def send_otp_email(to_addr: str, otp: str) -> None:
    host = (os.environ.get("SMTP_HOST") or "").strip()
    port = int(os.environ.get("SMTP_PORT") or "587")
    user = (os.environ.get("SMTP_USER") or "").strip()
    password = (os.environ.get("SMTP_PASSWORD") or "").strip()
    from_addr = (os.environ.get("SMTP_FROM") or user or "noreply@localhost").strip()

    body = (
        f"Ваш код подтверждения Proffi: {otp}\n\n"
        f"Код действителен 5 минут. Если вы не запрашивали код, проигнорируйте это письмо.\n"
    )

    if not host:
        print(f"OTP CODE ({to_addr}): {otp}", flush=True)
        logger.warning("SMTP_HOST не задан — OTP только в stdout (см. journalctl / консоль)")
        return

    msg = EmailMessage()
    msg["Subject"] = "Код подтверждения Proffi"
    msg["From"] = from_addr
    msg["To"] = to_addr
    msg.set_content(body)

    ctx = ssl.create_default_context()
    enc = (os.environ.get("SMTP_ENCRYPTION") or "").strip().lower()
    if enc in ("starttls",):
        enc = "tls"
    if enc not in ("tls", "ssl", "none", "off", ""):
        enc = "tls"
    if not enc:
        legacy = os.environ.get("SMTP_USE_TLS", "true").lower()
        enc = "none" if legacy in ("0", "false", "no") else "tls"
    if enc in ("off", "none"):
        enc = "none"

    try:
        if enc == "ssl" or port == 465:
            with smtplib.SMTP_SSL(host, port, context=ctx, timeout=30) as smtp:
                if user:
                    smtp.login(user, password)
                smtp.send_message(msg)
        else:
            with smtplib.SMTP(host, port, timeout=30) as smtp:
                if enc == "tls":
                    smtp.starttls(context=ctx)
                if user:
                    smtp.login(user, password)
                smtp.send_message(msg)
    except Exception as e:
        logger.exception("SMTP ошибка, fallback в stdout: %s", e)
        print(f"OTP CODE ({to_addr}): {otp}", flush=True)
