"""Skipping a test only while the bug it documents is still there.

Turning ``analyzer/tests/`` back on (#913) exposed seven tests that had failed
from the day they were written and had never been collected. They describe
genuine product bugs, tracked separately, so this change quarantines them
rather than landing a red build for work it is not doing.

A plain ``@skip`` would be the obvious way, and it is the wrong one: the fix
for each bug lands in a different pull request, branched from a ``main`` that
does not have the decorator yet, so nothing in that pull request can remove it.
The quarantine would survive its own reason and the test would stay silent for
good — which is the failure this whole change is about.

``skip_while_broken`` takes a probe that returns ``True`` while the bug is
present. The test skips until the fix lands and runs by itself afterwards, in
whatever order the pull requests are merged. The decorator is then dead weight
and can be deleted whenever someone notices, rather than being the thing that
has to be noticed.
"""

import functools
import unittest


def skip_while_broken(probe, reason):
    """Skip the decorated test while ``probe()`` reports the bug is present.

    Args:
        probe: A zero-argument callable returning ``True`` while the bug is
            still there. Evaluated at call time, not at import, so it sees the
            module under test as the merge left it.
        reason: Shown in the skip output. Name the issue that tracks the bug.
    """

    def decorator(test):
        @functools.wraps(test)
        def wrapper(self, *args, **kwargs):
            try:
                still_broken = bool(probe())
            except Exception:
                # A probe that cannot run is not evidence the bug is fixed.
                still_broken = True

            if still_broken:
                raise unittest.SkipTest(reason)

            return test(self, *args, **kwargs)

        return wrapper

    return decorator
