from rest_framework import serializers

from .models import (
    Course,
    Professor,
    Subject,
    TimeSlot,
    ClassGroup,
    ScheduleEntry,
)


class CourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = "__all__"


class ProfessorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Professor
        fields = "__all__"


class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = "__all__"


class TimeSlotSerializer(serializers.ModelSerializer):
    weekday_display = serializers.CharField(
        source="get_weekday_display",
        read_only=True
    )

    class Meta:
        model = TimeSlot
        fields = [
            "id",
            "weekday",
            "weekday_display",
            "start_time",
            "end_time",
        ]


class ClassGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClassGroup
        fields = "__all__"


class ScheduleEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = ScheduleEntry
        fields = "__all__"