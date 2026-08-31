"""Request validation for the badge management endpoint.

``manage_resume_badge`` was registered for ``["GET", "POST"]`` and ran the same
three lines for both, never reading ``request.data``. Adding the two things it
was missing -- turning the badge off, and issuing a new URL -- means reading a
body for the first time, and that is worth doing through a serializer rather
than ``request.data.get(...)``:

* ``request.data.get("enabled")`` returns the string ``"false"`` for a form
  post and the boolean ``False`` for JSON. ``BooleanField`` normalises both,
  and rejects ``"maybe"`` with a 400 instead of quietly treating it as truthy.
* A caller who typos ``enable`` should be told, not silently ignored. The badge
  is a public URL; "I turned it off and it stayed on" is the one outcome this
  endpoint must not have.
"""

from rest_framework import serializers


class ResumeBadgeUpdateSerializer(serializers.Serializer):
    """Body of ``POST /api/badge/``.

    Both fields are optional and independent. ``{"rotate": true}`` re-issues
    the URL without changing whether the badge is on;
    ``{"enabled": false, "rotate": true}`` turns it off *and* invalidates the
    old URL, which is what someone who has just realised where they pasted it
    actually wants.
    """

    enabled = serializers.BooleanField(required=False)
    rotate = serializers.BooleanField(required=False, default=False)

    def validate(self, attrs):
        if "enabled" not in attrs and not attrs.get("rotate"):
            raise serializers.ValidationError(
                "Send `enabled` to turn the badge on or off, `rotate` to issue a "
                "new URL, or both. An empty body would be a no-op, and a no-op "
                "that returns 200 reads like it worked."
            )
        return attrs

    def unknown_fields(self):
        """Field names in the request that this serializer does not define.

        ``serializers.Serializer`` ignores extras rather than rejecting them,
        and for this endpoint being ignored is the dangerous outcome -- see the
        module docstring. The view turns a non-empty result into a 400.
        """
        if not isinstance(self.initial_data, dict):
            return []
        return sorted(set(self.initial_data) - set(self.fields))
