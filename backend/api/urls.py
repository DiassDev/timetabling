from rest_framework.routers import DefaultRouter
from django.urls import path, include


from .views import (
    CourseViewSet,
    ProfessorViewSet,
    SubjectViewSet,
    TimeSlotViewSet,
    ClassGroupViewSet,
    ScheduleEntryViewSet,
)


router = DefaultRouter()

router.register("courses", CourseViewSet)
router.register("professors", ProfessorViewSet)
router.register("subjects", SubjectViewSet)
router.register("timeslots", TimeSlotViewSet)
router.register("classs-groups", ClassGroupViewSet)
router.register("schedule", ScheduleEntryViewSet)



urlpatterns = [
    path("", include(router.urls)),
]
