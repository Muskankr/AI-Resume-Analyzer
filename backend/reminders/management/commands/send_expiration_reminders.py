"""
Django Management Command for Sending Expiration Reminders
"""

import logging
from django.core.management.base import BaseCommand
from reminders.tasks import send_expiration_reminders

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Send resume expiration reminders to eligible users'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Run without actually sending emails',
        )
    
    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)
        
        if dry_run:
            self.stdout.write(self.style.WARNING('Running in DRY RUN mode - no emails will be sent'))
        
        self.stdout.write(self.style.SUCCESS('Starting expiration reminder job...'))
        
        # In dry run, just list eligible users
        if dry_run:
            from reminders.services import ReminderService
            service = ReminderService()
            eligible = service.find_eligible_users()
            
            self.stdout.write(f'Found {len(eligible)} eligible users:')
            for user in eligible[:10]:
                self.stdout.write(f'  - {user["email"]} ({user["days_since_update"]} days inactive)')
            
            if len(eligible) > 10:
                self.stdout.write(f'  ... and {len(eligible) - 10} more')
            return
        
        # Run the celery task
        result = send_expiration_reminders.delay()
        self.stdout.write(self.style.SUCCESS(f'Task queued: {result.id}'))