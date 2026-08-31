# Add to existing models.py

class WebsiteGeneration(models.Model):
    """Model to track website generations"""
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='website_generations'
    )
    resume = models.ForeignKey(
        'Resume',
        on_delete=models.SET_NULL,
        null=True,
        related_name='website_generations'
    )
    template = models.CharField(max_length=50)
    color_scheme = models.CharField(max_length=50)
    customizations = models.JSONField(default=dict)
    website_data = models.JSONField()
    generated_at = models.DateTimeField(auto_now_add=True)
    download_count = models.IntegerField(default=0)
    
    class Meta:
        ordering = ['-generated_at']
        indexes = [
            models.Index(fields=['user', 'generated_at']),
            models.Index(fields=['resume']),
        ]
    
    def __str__(self):
        return f"Website for {self.user.username} - {self.generated_at}"