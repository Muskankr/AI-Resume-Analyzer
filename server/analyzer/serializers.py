from rest_framework import serializers
from .models import Resume

class ResumeSerializer(serializers.ModelSerializer):

    class Meta:
        model = Resume
        fields = "__all__"