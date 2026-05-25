import logging
import threading

logger = logging.getLogger(__name__)


def _send_registration_email(email, event_title):
    logger.info("Sending registration confirmation to %s for %s", email, event_title)


def send_registration_email_async(email, event_title):
    thread = threading.Thread(
        target=_send_registration_email,
        args=(email, event_title),
        daemon=True,
    )
    thread.start()
    return thread

