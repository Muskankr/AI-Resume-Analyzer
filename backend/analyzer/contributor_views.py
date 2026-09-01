"""Certificate of Contribution Generator.

Fetches real GitHub contribution records (merged PRs and issues) for contributors
to the AI-Resume-Analyzer repository and generates official certificates of contribution.
"""

import hashlib
import re
from datetime import datetime
import requests
from django.core.cache import cache
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.throttling import AnonRateThrottle

GITHUB_USERNAME_REGEX = re.compile(r"^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$")
DEFAULT_REPO = "Muskankr/AI-Resume-Analyzer"


def compute_certificate_id(username: str, repo: str, count: int) -> str:
    """Generate a stable, human-readable verification ID for the certificate."""
    raw = f"{username.lower()}:{repo.lower()}:{count}:ai-resume-analyzer"
    digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()[:8].upper()
    return f"ARA-CONTR-{digest}"


def get_contribution_tier(merged_prs: int) -> dict:
    """Calculate recognition tier based on the volume of merged pull requests."""
    if merged_prs >= 10:
        return {
            "tier": "Platinum Contributor",
            "badge": "💎",
            "title": "Distinguished Maintainer & Core Contributor",
            "color": "#e0f2fe",
        }
    if merged_prs >= 5:
        return {
            "tier": "Gold Contributor",
            "badge": "🥇",
            "title": "Core Community Contributor",
            "color": "#fef08a",
        }
    if merged_prs >= 2:
        return {
            "tier": "Silver Contributor",
            "badge": "🥈",
            "title": "Active Project Contributor",
            "color": "#e2e8f0",
        }
    return {
        "tier": "Bronze Contributor",
        "badge": "🥉",
        "title": "Recognized Open Source Contributor",
        "color": "#fed7aa",
    }


class ContributorCertificateThrottle(AnonRateThrottle):
    scope = "anon"
    rate = "60/minute"


class ContributorCertificateView(APIView):
    """Generates verifiable certificate metadata for repository contributors."""

    permission_classes = [AllowAny]
    throttle_classes = [ContributorCertificateThrottle]

    def get(self, request):
        raw_username = request.query_params.get("username", "").strip()
        repo = request.query_params.get("repo", DEFAULT_REPO).strip()

        if not raw_username:
            return Response(
                {"error": "Please provide a GitHub username to generate a contribution certificate."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not GITHUB_USERNAME_REGEX.match(raw_username):
            return Response(
                {"error": "Invalid GitHub username format. Usernames may only contain alphanumeric characters or single hyphens."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cache_key = f"gh_contr_cert:{repo.lower()}:{raw_username.lower()}"
        cached = cache.get(cache_key)
        if cached:
            return Response(cached, status=status.HTTP_200_OK)

        # 1. Fetch user info from GitHub
        user_info = {
            "username": raw_username,
            "name": raw_username,
            "avatar_url": f"https://github.com/{raw_username}.png",
            "profile_url": f"https://github.com/{raw_username}",
            "bio": "",
        }

        try:
            gh_user_resp = requests.get(
                f"https://api.github.com/users/{raw_username}",
                headers={"Accept": "application/vnd.github.v3+json", "User-Agent": "AI-Resume-Analyzer-Cert"},
                timeout=6,
            )
            if gh_user_resp.status_code == 200:
                data = gh_user_resp.json()
                user_info["name"] = data.get("name") or raw_username
                user_info["avatar_url"] = data.get("avatar_url") or user_info["avatar_url"]
                user_info["bio"] = data.get("bio") or ""
            elif gh_user_resp.status_code == 404:
                return Response(
                    {"error": f"GitHub user '{raw_username}' does not exist."},
                    status=status.HTTP_404_NOT_FOUND,
                )
        except requests.RequestException:
            pass  # Fallback to default user_info on network failure

        # 2. Search for merged PRs in this repo authored by the user
        merged_prs = []
        try:
            query = f"repo:{repo} type:pr is:merged author:{raw_username}"
            search_resp = requests.get(
                "https://api.github.com/search/issues",
                params={"q": query, "sort": "created", "order": "desc", "per_page": 50},
                headers={"Accept": "application/vnd.github.v3+json", "User-Agent": "AI-Resume-Analyzer-Cert"},
                timeout=6,
            )

            if search_resp.status_code == 200:
                items = search_resp.json().get("items", [])
                for item in items:
                    merged_prs.append({
                        "number": item.get("number"),
                        "title": item.get("title"),
                        "html_url": item.get("html_url"),
                        "created_at": item.get("created_at"),
                        "closed_at": item.get("closed_at"),
                    })
        except requests.RequestException:
            pass

        merged_count = len(merged_prs)

        # If zero merged PRs found, check if this is an existing contributor query
        if merged_count == 0:
            return Response(
                {
                    "error": f"No merged pull requests found for @{raw_username} in {repo}. Contributions must be merged to generate an official certificate.",
                    "username": raw_username,
                    "repo": repo,
                    "merged_prs_count": 0,
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        # Contribution dates
        dates = [pr["created_at"] for pr in merged_prs if pr.get("created_at")]
        dates.sort()
        first_date = dates[0][:10] if dates else datetime.utcnow().strftime("%Y-%m-%d")
        latest_date = dates[-1][:10] if dates else datetime.utcnow().strftime("%Y-%m-%d")
        issue_date_str = datetime.utcnow().strftime("%B %d, %Y")

        tier_info = get_contribution_tier(merged_count)
        cert_id = compute_certificate_id(raw_username, repo, merged_count)

        payload = {
            "certificate_id": cert_id,
            "contributor": {
                "username": raw_username,
                "name": user_info["name"],
                "avatar_url": user_info["avatar_url"],
                "profile_url": user_info["profile_url"],
                "bio": user_info["bio"],
            },
            "project": {
                "name": "AI Resume Analyzer",
                "repo": repo,
                "repo_url": f"https://github.com/{repo}",
            },
            "statistics": {
                "merged_prs_count": merged_count,
                "tier": tier_info["tier"],
                "tier_badge": tier_info["badge"],
                "tier_title": tier_info["title"],
                "first_contribution_date": first_date,
                "latest_contribution_date": latest_date,
            },
            "pull_requests": merged_prs[:10],
            "issued_date": issue_date_str,
            "verification_url": f"https://github.com/{repo}/pulls?q=is%3Apr+is%3Amerged+author%3A{raw_username}",
        }

        # Cache for 10 minutes
        cache.set(cache_key, payload, 600)

        return Response(payload, status=status.HTTP_200_OK)
