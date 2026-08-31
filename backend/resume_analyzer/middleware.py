class ContentSecurityPolicyMiddleware:
    """Middleware to add Content-Security-Policy (CSP) and Cache-Control headers to Django responses.

    Differentiates between API responses (JSON) and HTML/Admin views to
    maximize security and ensure dynamic responses are excluded from aggressive CDN caching.
    """

    def __init__(self, get_response):
        """Initialize the middleware with get_response handler."""
        self.get_response = get_response

    def __call__(self, request):
        """Inject CSP and Cache-Control headers based on response content type and path."""
        response = self.get_response(request)
        content_type = response.get("Content-Type", "")
        is_api = request.path.startswith(
            "/api/") or (content_type and content_type.startswith("application/json"))

        if is_api:
            # API requests don't need to load scripts, styles, or frame other websites
            response["Content-Security-Policy"] = (
                "default-src 'none'; frame-ancestors 'none';"
            )
            # Ensure API responses are excluded from aggressive CDN/browser caching
            if "Cache-Control" not in response:
                response["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
                response["Pragma"] = "no-cache"
                response["Expires"] = "0"
        else:
            # HTML pages (like Django Admin) need standard resources from self
            response["Content-Security-Policy"] = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data:; "
                "frame-ancestors 'none';"
            )
            if "Cache-Control" not in response and content_type and "text/html" in content_type:
                response["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"

        return response
