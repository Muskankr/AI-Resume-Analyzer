"""Every module in the app must import cleanly.

``ApplicationLog`` was added to ``models.py`` with a ``settings.AUTH_USER_MODEL``
foreign key and no ``from django.conf import settings``. The name is only
resolved when the class body executes, which happens while Django is populating
the app registry — so the failure was::

    NameError: name 'settings' is not defined

raised out of ``apps.populate()``, before any command had begun its own work.
``runserver``, ``migrate``, ``shell`` and ``manage.py test`` all died the same
way, and the traceback was fifteen frames of Django internals with the real
cause on the last line.

A test cannot guard ``models.py`` itself: the runner needs the registry to be
populated before it can collect anything, so a break there kills the process
that would have reported it. CI's ``manage.py check`` step is the gate for that
one.

What a test *can* guard is everything else. Most of this app's modules are
imported lazily — a ``*_views.py`` module is reached only when ``urls.py``
imports it, a helper only when a view calls it — so a module-scope typo in one
of them surfaces at request time in production rather than at import time in
CI. Six view modules were, at the point this file was written, imported by
nothing at all.

So: import every module in the package and assert it survives. No database, no
client, no fixtures.
"""

import importlib
import pkgutil

from django.apps import apps
from django.test import SimpleTestCase

import analyzer

# Importing these has side effects beyond defining names, so they are checked
# by the suites that own them rather than swept up here.
SKIP_PREFIXES = (
    "analyzer.migrations",
    "analyzer.tests",
    "analyzer.management",
)


def _app_modules():
    """Every importable module under the ``analyzer`` package."""
    for info in pkgutil.walk_packages(analyzer.__path__, prefix="analyzer."):
        if info.name.startswith(SKIP_PREFIXES):
            continue
        yield info.name


class AppModuleImportTests(SimpleTestCase):
    """A module-scope error in any app module is a build failure."""

    def test_every_module_imports(self):
        failures = []

        for name in _app_modules():
            try:
                importlib.import_module(name)
            except Exception as exc:  # noqa: BLE001 - the point is to report any of them
                failures.append(f"{name}: {type(exc).__name__}: {exc}")

        self.assertEqual(
            failures,
            [],
            "These modules raise on import, so anything that reaches them "
            "fails at runtime rather than here:\n  " + "\n  ".join(failures),
        )

    def test_the_walk_actually_finds_modules(self):
        """Guards the guard: an empty walk would pass the assertion above."""
        found = list(_app_modules())
        self.assertGreaterEqual(
            len(found),
            20,
            f"Expected the app to hold many modules, walked only {len(found)}. "
            "If the package layout changed, this walk needs to change with it.",
        )

    def test_models_module_resolved_its_module_scope_names(self):
        """The specific break this file exists for.

        ``apps.get_model`` forces the registry to be ready, and reaching
        ``ApplicationLog.user`` at all means the ``settings`` reference in its
        field definition resolved. Belt and braces next to the walk above,
        because this is the one module the walk cannot really claim credit for.
        """
        model = apps.get_model("analyzer", "ApplicationLog")
        self.assertEqual(model._meta.get_field("user").related_model.__name__, "User")
