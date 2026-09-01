"""A test about the test suite itself.

``backend/analyzer/tests/`` once held 28 tests that ``manage.py test`` never
ran. The directory had no ``__init__.py``, and ``analyzer/tests.py`` already
owned the name ``analyzer.tests``: a regular module wins over a namespace
package on the import path, so Django imported ``tests.py``, found what it
expected, and never walked the directory. The suite reported 670 tests for
weeks while 28 of them — seven of which failed — sat unread on disk.

The workflow's floor of 200 discovered tests cannot catch that. A floor
notices a suite that has collapsed, not a corner of it that has gone quiet,
and the number it compares against is a constant somebody has to remember to
raise.

So this asserts the property directly: every file in the app that *looks*
like a test file must be reachable under the dotted name Django will try to
import it as. A file that is not reachable fails the build here rather than
disappearing from the count.
"""

import importlib.util
from pathlib import Path

from django.test import SimpleTestCase

#: The app directory. ``__file__`` rather than a settings lookup so this keeps
#: working if the app is ever moved or renamed.
APP_DIR = Path(__file__).resolve().parent

#: Django's default discovery pattern.
TEST_FILE_GLOB = "test*.py"

#: Directories that hold fixtures and generated files rather than source.
IGNORED_DIRECTORIES = {"__pycache__", "migrations", "data", "media", "tmp"}


def _iter_test_files():
    """Every ``test*.py`` under the app, excluding generated directories."""
    for path in sorted(APP_DIR.rglob(TEST_FILE_GLOB)):
        if any(part in IGNORED_DIRECTORIES for part in path.relative_to(APP_DIR).parts):
            continue
        yield path


def _dotted_name(path: Path) -> str:
    """The module name Django's loader will import ``path`` as."""
    relative = path.relative_to(APP_DIR).with_suffix("")
    return ".".join((APP_DIR.name, *relative.parts))


class TestDiscoveryReachabilityTests(SimpleTestCase):
    """Every test file must be importable under the name discovery will use."""

    def test_at_least_one_test_file_is_found(self):
        """Guards the guard: a walk that finds nothing would pass everything."""
        found = list(_iter_test_files())
        self.assertGreater(
            len(found),
            20,
            "Expected the app to hold many test modules; the walk found "
            f"{len(found)}. Either the app moved or this check is looking in "
            "the wrong place.",
        )

    def test_every_test_file_is_inside_an_importable_package(self):
        """A test file under a directory with no ``__init__.py`` is invisible.

        Python treats such a directory as a namespace package, which Django's
        loader will not descend into once a module of the same name exists
        beside it. Requiring ``__init__.py`` on every directory in the path
        removes the ambiguity entirely.
        """
        for path in _iter_test_files():
            directory = path.parent
            while directory != APP_DIR:
                with self.subTest(test_file=str(path.relative_to(APP_DIR))):
                    self.assertTrue(
                        (directory / "__init__.py").exists(),
                        f"{path.relative_to(APP_DIR)} sits under "
                        f"{directory.name}/, which has no __init__.py. Django "
                        "will not import it, and the tests in it will not run. "
                        "Add the __init__.py, or move the file up to "
                        f"analyzer/tests_<area>.py as the rest of the app does.",
                    )
                directory = directory.parent

    def test_every_test_file_resolves_to_itself(self):
        """The name resolves, and it resolves to *this* file rather than a shadow.

        ``find_spec`` is the same machinery the test loader uses. When
        ``analyzer/tests.py`` shadowed ``analyzer/tests/``, the spec for
        ``analyzer.tests.test_multilingual`` could not be built at all — which
        is precisely the failure this catches.
        """
        for path in _iter_test_files():
            dotted = _dotted_name(path)
            with self.subTest(module=dotted):
                try:
                    spec = importlib.util.find_spec(dotted)
                except (ImportError, AttributeError, ValueError) as exc:
                    self.fail(
                        f"{path.relative_to(APP_DIR)} is not importable as "
                        f"{dotted}: {exc}. Django's test loader imports by "
                        "this name, so the tests in this file never run."
                    )

                self.assertIsNotNone(
                    spec,
                    f"No module named {dotted}, so the tests in "
                    f"{path.relative_to(APP_DIR)} are never collected.",
                )
                self.assertEqual(
                    Path(spec.origin).resolve(),
                    path,
                    f"{dotted} resolves to {spec.origin}, not to "
                    f"{path}. Something on the import path shadows this file, "
                    "and its tests are being skipped silently.",
                )


class TestFileNamingConventionTests(SimpleTestCase):
    """The app keeps its tests in flat ``tests_<area>.py`` modules.

    Not a style preference: the flat layout is the one that cannot be shadowed
    by a sibling. Enforcing it keeps the app from drifting back into a nested
    package that looks fine and collects nothing.
    """

    def test_test_files_live_directly_in_the_app_directory(self):
        for path in _iter_test_files():
            with self.subTest(test_file=str(path.relative_to(APP_DIR))):
                self.assertEqual(
                    path.parent,
                    APP_DIR,
                    f"{path.relative_to(APP_DIR)} is nested. The app keeps its "
                    "tests in analyzer/tests_<area>.py; a nested package needs "
                    "an __init__.py on every level and is easy to get wrong.",
                )
