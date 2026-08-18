"""The analyzer app.

This file has to exist, and it is not merely a formality.

Django loads ``analyzer`` happily without it — Python treats a directory with
no ``__init__.py`` as an implicit namespace package (PEP 420), so every
``from analyzer.models import ...`` in the project resolves fine. Test
discovery does not work that way. ``unittest``'s discovery walks the directory
tree and skips any directory that is not a regular package, so with this file
missing ``manage.py test`` never opened a single module under ``analyzer/`` and
reported::

    Found 0 test(s).
    NO TESTS RAN

on a tree that contains 220 of them. Nothing was broken, so nothing looked
broken — which is the reason it went unnoticed for as long as it did.

If this file is ever deleted again, the CI job in ``.github/workflows/tests.yml``
asserts that the discovered test count is non-zero and will fail rather than
silently pass on an empty suite.
"""
