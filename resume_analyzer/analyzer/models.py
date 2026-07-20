from django.db import models
import uuid
class Resume(models.Model):

    file = models.FileField(upload_to="resumes/")
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return str(self.id)

class AnalysisResult(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    score = models.IntegerField()
    skills_found = models.JSONField(default=list)
    suggestions = models.JSONField(default=list)
    target_role = models.CharField(max_length=100, null=True, blank=True)
    matched_skills = models.JSONField(default=list)
    missing_skills = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return str(self.id)