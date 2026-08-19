from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed
from .models import UserSession


class CustomJWTAuthentication(JWTAuthentication):
    """Custom JWT Authentication class that validates active user sessions.

    If a user session has been revoked (i.e. deleted from UserSession model),
    incoming requests using the associated access token are rejected immediately.
    """

    def authenticate(self, request):
        result = super().authenticate(request)
        if result is None:
            return None

        user, validated_token = result
        jti = validated_token.get("jti")

        # Check if the access token's jti is active in the UserSession table.
        # This provides immediate revocation.
        if not UserSession.objects.filter(user=user, access_jti=jti).exists():
            raise AuthenticationFailed("Session has been revoked or is inactive.")

        return user, validated_token
