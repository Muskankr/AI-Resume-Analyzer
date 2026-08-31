"""Where a skill name starts and stops.

``is_word_boundary`` treated ``-`` as a character that continues a skill token,
which meant a hyphen on either side of a match disqualified it. Because
``normalize_text`` deliberately *keeps* hyphens, every hyphenated mention of a
skill extracted nothing at all::

    extract_skills("Python-based microservices")  -> []
    extract_skills("React-Redux frontends")       -> []
    extract_skills("Docker-compose deployments")  -> []

That is not a rare way to write a resume. It fed straight through
``nlp_matcher.calculate_jd_match``, which builds its resume-skill set from
``extract_skills``, so a resume naming five of the job's skills scored 12 and
reported all five as missing.

The tests below are in three groups:

* hyphenated mentions are found (the bug),
* the false positives the old rule was protecting against are still rejected
  (``c`` in ``c++``, ``react`` in ``reactive``, ``java`` in ``javascript``),
* hyphenated *skill names* — objective-c, react-native, scikit-learn — still
  resolve to themselves and do not also emit the fragments now visible inside
  them.

The third group is the one that makes the fix non-trivial: once a hyphen is a
boundary, "Objective-C" contains a perfectly well-bounded "c".
"""

from django.test import SimpleTestCase

from .nlp_matcher import calculate_jd_match
from .skill_matcher import (
    _longest_matches,
    extract_skills,
    extract_skills_detailed,
    is_word_boundary,
    is_word_in_text,
    normalize_text,
)


class HyphenatedMentionTests(SimpleTestCase):
    """A hyphen joins two words. It does not make them one word."""

    def assert_extracts(self, text, expected):
        self.assertIn(
            expected,
            extract_skills(text),
            f"{expected!r} not extracted from {text!r}",
        )

    def test_skill_used_as_a_compound_adjective(self):
        for text, skill in [
            ("Built Python-based microservices", "python"),
            ("Java-based backend services", "java"),
            ("Docker-compose deployments", "docker"),
            ("Kubernetes-managed clusters", "kubernetes"),
            ("Terraform-managed infrastructure", "terraform"),
            ("AWS-hosted workloads", "amazon web services"),
            ("SQL-heavy reporting pipelines", "sql"),
        ]:
            with self.subTest(text=text):
                self.assert_extracts(text, skill)

    def test_skill_after_a_hyphen(self):
        for text, skill in [
            ("Full-stack React work", "react"),
            ("in-house Python tooling", "python"),
            ("Cross-team Kubernetes rollout", "kubernetes"),
        ]:
            with self.subTest(text=text):
                self.assert_extracts(text, skill)

    def test_two_skills_hyphenated_together(self):
        found = extract_skills("React-Redux frontends")
        self.assertIn("react", found)
        self.assertIn("redux", found)

    def test_skill_followed_by_a_hyphenated_version(self):
        self.assert_extracts("Java-8 experience", "java")
        self.assert_extracts("Python-3 scripts", "python")

    def test_hyphen_used_to_join_a_multi_word_skill_name(self):
        """The dictionary carries the spaced form; people write the hyphen."""
        for text, skill in [
            ("machine-learning pipelines", "machine learning"),
            ("deep-learning research", "deep learning"),
            ("data-science team", "data science"),
            ("node-js backend", "node.js"),
        ]:
            with self.subTest(text=text):
                self.assert_extracts(text, skill)


class BoundaryRegressionTests(SimpleTestCase):
    """What the old rule was actually protecting. None of it should change."""

    def test_c_is_not_found_inside_c_plus_plus_or_c_sharp(self):
        self.assertEqual(extract_skills("C++ and C# developer"), ["c++", "c#"])
        self.assertNotIn("c", extract_skills("C++ developer"))
        self.assertNotIn("c", extract_skills("C# developer"))

    def test_c_on_its_own_is_still_found(self):
        self.assertIn("c", extract_skills("Systems programming in C and assembly"))

    def test_react_is_not_found_inside_reactive(self):
        self.assertNotIn("react", extract_skills("reactive programming"))

    def test_java_is_not_found_inside_javascript(self):
        found = extract_skills("JavaScript developer")
        self.assertIn("javascript", found)
        self.assertNotIn("java", found)

    def test_dotted_names_resolve_to_their_canonical_skill(self):
        found = extract_skills("node.js and react.js")
        self.assertIn("node.js", found)
        self.assertIn("react", found)

    def test_underscore_still_continues_a_token(self):
        self.assertNotIn("react", extract_skills("my_react_helper"))

    def test_plain_mentions_are_unaffected(self):
        self.assertEqual(
            extract_skills("Python, Java, React, Docker"),
            ["python", "java", "react", "docker"],
        )


class HyphenatedSkillNameTests(SimpleTestCase):
    """Skills whose own name contains a hyphen.

    Once ``-`` is a boundary, "objective-c" contains a well-bounded "c" and
    "react-native" contains a well-bounded "react". Longest match wins.
    """

    def test_objective_c_does_not_also_report_c(self):
        found = extract_skills("Objective-C developer")
        self.assertEqual(found, ["objective-c"])

    def test_react_native_does_not_also_report_react(self):
        found = extract_skills("React-Native app")
        self.assertEqual(found, ["react native"])

    def test_scikit_learn_stays_whole(self):
        self.assertEqual(extract_skills("scikit-learn models"), ["scikit-learn"])

    def test_react_and_react_native_both_appear_when_both_are_mentioned(self):
        found = extract_skills("React on the web and React-Native on mobile")
        self.assertIn("react", found)
        self.assertIn("react native", found)


class LongestMatchTests(SimpleTestCase):
    """The overlap rule on its own, without the dictionary in the way."""

    def test_nested_span_is_dropped(self):
        spans = [(0, 11, "objective-c", "objective-c"), (10, 11, "c", "c")]
        self.assertEqual(_longest_matches(spans), [(0, 11, "objective-c", "objective-c")])

    def test_disjoint_spans_are_both_kept(self):
        spans = [(0, 6, "python", "python"), (11, 15, "java", "java")]
        self.assertEqual(len(_longest_matches(spans)), 2)

    def test_partial_overlap_keeps_both(self):
        # Not nesting: neither span contains the other.
        spans = [(0, 5, "aaaaa", "a"), (3, 9, "aaaaaa", "b")]
        self.assertEqual(len(_longest_matches(spans)), 2)

    def test_identical_spans_keep_the_first(self):
        spans = [(0, 4, "java", "java"), (0, 4, "java", "other")]
        kept = _longest_matches(spans)
        self.assertEqual(len(kept), 1)

    def test_input_order_does_not_matter(self):
        forwards = [(0, 11, "objective-c", "objective-c"), (10, 11, "c", "c")]
        backwards = list(reversed(forwards))
        self.assertEqual(_longest_matches(forwards), _longest_matches(backwards))

    def test_empty_input(self):
        self.assertEqual(_longest_matches([]), [])


class BoundaryHelperAgreementTests(SimpleTestCase):
    """The two boundary checks in this module used to disagree.

    ``is_word_in_text`` guards with ``(?<!\\w)…(?!\\w)``, and ``\\w`` does not
    include ``-``, so it has always treated a hyphen as a boundary.
    ``is_word_boundary`` did not. ``match_skills_with_partial`` calls both, so
    whether a hyphenated mention counted depended on which branch it reached.
    """

    def test_both_helpers_agree_that_a_hyphen_ends_a_word(self):
        text = normalize_text("Python-based work")
        start = text.index("python")

        self.assertTrue(is_word_in_text("python", text))
        self.assertTrue(is_word_boundary(text, start, start + len("python")))

    def test_both_helpers_agree_that_a_letter_does_not(self):
        text = normalize_text("reactive programming")
        start = text.index("react")

        self.assertFalse(is_word_in_text("react", text))
        self.assertFalse(is_word_boundary(text, start, start + len("react")))


class DetailedExtractionTests(SimpleTestCase):
    """``extract_skills_detailed`` feeds the partial-match logic."""

    def test_records_the_alias_that_matched(self):
        details = extract_skills_detailed("Python-based services")
        self.assertIn("python", details)
        self.assertIn("python", details["python"])

    def test_does_not_record_a_fragment_of_a_hyphenated_name(self):
        details = extract_skills_detailed("Objective-C developer")
        self.assertNotIn("c", details)
        self.assertIn("objective-c", details)


class JobDescriptionMatchTests(SimpleTestCase):
    """The user-visible consequence.

    ``calculate_jd_match`` builds its resume-skill set from ``extract_skills``,
    so the hyphen bug turned every one of these into a missing skill.
    """

    JD = "We need Python, Java, React, Docker and Kubernetes experience."

    HYPHENATED = (
        "Built Python-based and Java-based microservices, React-Redux "
        "frontends, Docker-compose deployments and Kubernetes-managed clusters."
    )
    PLAIN = (
        "Built Python and Java microservices, React frontends, Docker "
        "deployments and Kubernetes clusters."
    )

    def test_hyphenated_resume_no_longer_reports_everything_as_missing(self):
        score, missing, matched = calculate_jd_match(self.HYPHENATED, self.JD)

        self.assertEqual(missing, [], f"still reported as missing: {missing}")
        self.assertCountEqual(
            matched, ["python", "java", "react", "docker", "kubernetes"]
        )
        self.assertGreater(score, 50)

    def test_hyphenation_no_longer_decides_the_score(self):
        """The two resumes say the same thing. They used to score 12 and 77."""
        hyphenated, _, _ = calculate_jd_match(self.HYPHENATED, self.JD)
        plain, _, _ = calculate_jd_match(self.PLAIN, self.JD)

        # Not equal: the TF-IDF half of the score legitimately sees different
        # tokens. The skill half — 60% of the weight — must agree.
        self.assertLess(
            abs(hyphenated - plain),
            15,
            f"hyphenated={hyphenated} plain={plain}: writing a skill with a "
            "hyphen should not meaningfully change the match score",
        )
