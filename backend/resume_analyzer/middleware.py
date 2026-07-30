class ContentSecurityPolicyMiddleware:
    """Middleware to add Content-Security-Policy (CSP) headers to all Django responses.

    Differentiates between API responses (JSON) and HTML/Admin views to
    maximize security.
    """

    def __init__(self, get_response):
        """Initialize the middleware with get_response handler."""
        self.get_response = get_response

    def __call__(self, request):
        """Inject the Content-Security-Policy header based on response content type."""
        response = self.get_response(request)
        content_type = response.get("Content-Type", "")

        if content_type and content_type.startswith("application/json"):
            # API requests don't need to load scripts, styles, or frame other websites
            response["Content-Security-Policy"] = (
                "default-src 'none'; frame-ancestors 'none';"
            )
        else:
            # HTML pages (like Django Admin) need standard resources from self
            response["Content-Security-Policy"] = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data:; "
                "frame-ancestors 'none';"
            )

        return response
