import logging
from django.conf import settings
from django.core.cache import cache
from .models import SignupAbuseEvent

logger = logging.getLogger(__name__)

def get_abuse_window_key(ip_address):
    return f"signup_abuse_window_{ip_address}"

def get_abuse_cooldown_key(ip_address):
    return f"signup_abuse_cooldown_{ip_address}"

def check_signup_abuse(ip_address, user_agent):
    """
    Checks if a signup attempt from an IP address constitutes abuse.
    Returns (is_allowed, reason).
    """
    if not settings.SIGNUP_ABUSE_ENABLED or not ip_address:
        return True, "allowed"

    cooldown_key = get_abuse_cooldown_key(ip_address)
    if cache.get(cooldown_key):
        return False, "cooldown_active"

    window_key = get_abuse_window_key(ip_address)
    window_data = cache.get(window_key) or {"count": 0, "user_agents": set()}

    window_data["count"] += 1
    if user_agent:
        window_data["user_agents"].add(user_agent)

    threshold = getattr(settings, 'SIGNUP_ABUSE_THRESHOLD', 50)
    window_minutes = getattr(settings, 'SIGNUP_ABUSE_WINDOW_MINUTES', 60)

    cache.set(window_key, window_data, timeout=window_minutes * 60)

    # Check for abuse
    if window_data["count"] > threshold:
        # Check if it's likely a shared network (many distinct user agents)
        unique_ua_count = len(window_data["user_agents"])
        # A shared network should have more than 1 distinct user agent, and proportional to the threshold
        is_shared_network = unique_ua_count > max(1, threshold * 0.3)

        if is_shared_network:
            # We flag it for review but do NOT block, to support legitimate shared networks
            if window_data["count"] == threshold + 1:  # Log only once when threshold crossed
                SignupAbuseEvent.objects.create(
                    ip_address=ip_address,
                    signup_count=window_data["count"],
                    window_minutes=window_minutes,
                    user_agent=user_agent or "",
                    status='reviewed',
                    notes=f"Detected high volume ({window_data['count']} signups) but allowed due to high user-agent entropy ({unique_ua_count} unique UAs). Likely a shared network."
                )
                logger.info(f"Allowed high-volume signup from shared network IP {ip_address}")
            return True, "allowed_shared_network"
        else:
            # Suspicious: high volume, low user agent entropy
            if window_data["count"] == threshold + 1:
                SignupAbuseEvent.objects.create(
                    ip_address=ip_address,
                    signup_count=window_data["count"],
                    window_minutes=window_minutes,
                    user_agent=user_agent or "",
                    status='flagged',
                    notes=f"Blocked due to high volume ({window_data['count']} signups) and low user-agent entropy ({unique_ua_count} unique UAs)."
                )
                logger.warning(f"Signup abuse detected for IP {ip_address}. Unique UAs: {unique_ua_count}")

            # Apply cooldown
            cooldown_minutes = getattr(settings, 'SIGNUP_ABUSE_COOLDOWN_MINUTES', 60)
            cache.set(cooldown_key, True, timeout=cooldown_minutes * 60)
            return False, "abuse_detected"

    return True, "allowed"
