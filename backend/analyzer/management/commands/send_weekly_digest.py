import random
from django.core.management.base import BaseCommand
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.auth.models import User
from analyzer.models import ResumeAnalysis
from analyzer.unsubscribe_tokens import build_unsubscribe_url

RESUME_TIPS_CATALOG = [
    {
        "title": "Quantify Your Accomplishments",
        "tip": "Instead of saying 'Improved performance', write 'Optimized database queries, reducing API response latency by 35% across 2M daily requests'."
    },
    {
        "title": "Use Strong Action Verbs",
        "tip": "Start bullet points with strong action verbs like Spearheaded, Engineered, Architected, Automated, and Orchestrated."
    },
    {
        "title": "Target Role Keywords",
        "tip": "Ensure core frameworks and tools mentioned in job descriptions are explicitly named in your Skills and Professional Experience sections."
    },
    {
        "title": "Clean, ATS-Friendly Layout",
        "tip": "Avoid multi-column tables, text boxes, and background images that confuse PDF parser engines."
    },
    {
        "title": "Concise 1-2 Page Format",
        "tip": "Keep your resume focused on relevant experience from the past 5-10 years to maintain recruiter interest."
    }
]


class Command(BaseCommand):
    help = "Send weekly resume tips email digest to opted-in users."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Print email digest outputs without sending emails.",
        )

    def handle(self, *args, **options):
        # argparse stores --dry-run under "dry_run"; the old "dry-run" lookup
        # was always None, so --dry-run sent real email.
        dry_run = options.get("dry_run", False)
        opted_in_users = User.objects.filter(profile__weekly_digest_opt_in=True)

        count = 0
        self.stdout.write(f"Found {opted_in_users.count()} opted-in user(s) for weekly digest.")

        for user in opted_in_users:
            if not user.email:
                continue

            analyses = ResumeAnalysis.objects.filter(user=user).order_by("-created_at")
            recent_score = analyses.first().score if analyses.exists() else None
            
            # Check score progression
            nudge = ""
            if analyses.count() >= 2:
                latest = analyses[0].score
                previous = analyses[1].score
                if latest <= previous:
                    nudge = f"💡 Nudge: Your recent resume ATS score is {latest}%. Try quantifying your bullet points and adding role-specific skills to boost your score!"
            elif recent_score is not None and recent_score < 70:
                nudge = f"💡 Nudge: Your current ATS score is {recent_score}%. Incorporate missing skills from target job descriptions to hit 80%+!"

            tip_item = random.choice(RESUME_TIPS_CATALOG)
            # Signed, expiring token instead of a bare email address, so a link
            # only unsubscribes the account it was issued for.
            unsubscribe_link = build_unsubscribe_url(user)

            subject = "Your Weekly Resume Tips & Insights Digest"
            body = (
                f"Hello {user.username},\n\n"
                f"Here is your weekly AI Resume Analyzer Digest!\n\n"
                f"📌 Weekly Tip: {tip_item['title']}\n"
                f"{tip_item['tip']}\n\n"
            )
            if nudge:
                body += f"{nudge}\n\n"

            body += (
                f"Keep optimizing your career journey!\n\n"
                f"---\n"
                f"Don't want to receive these emails? Unsubscribe anytime: {unsubscribe_link}\n"
            )

            if dry_run:
                self.stdout.write(f"[DRY-RUN] To: {user.email}\nSubject: {subject}\n{body}\n")
            else:
                try:
                    send_mail(
                        subject=subject,
                        message=body,
                        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@ai-resume-analyzer.dev"),
                        recipient_list=[user.email],
                        fail_silently=True,
                    )
                    count += 1
                except Exception as e:
                    self.stderr.write(f"Failed to send email to {user.email}: {e}")

        self.stdout.write(self.style.SUCCESS(f"Successfully processed weekly digest for {count} user(s)."))
