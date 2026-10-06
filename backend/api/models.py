from django.db import models

class Course(models.Model):
    name = models.CharField(max_length=150)
    course_id = models.CharField(max_length=20, unique=True)

    def __str__(self):
        return f"{self.course_id} - {self.name}"



class Professor(models.Model):
    name = models.CharField(max_length=150)
    email = models.EmailField(unique=True)
    professor_id = models.CharField(max_length=20, unique=True)

    def __str__(self):
        return self.name


class Subject(models.Model):
    name = models.CharField(max_length=150)
    subject_id = models.CharField(max_length=20, unique=True)
    workload = models.PositiveIntegerField(
        help_text="Carga horária da matéria em horas"
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name="subjects"
    )

    def __str__(self):
        return f"{self.subject_id} - {self.name}"


class TimeSlot(models.Model):

    class WeekDay(models.IntegerChoices):
        MONDAY = 1, "Segunda-feira"
        TUESDAY = 2, "Terça-feira"
        WEDNESDAY = 3, "Quarta-feira"
        THURSDAY = 4, "Quinta-feira"
        FRIDAY = 5, "Sexta-feira"
        SATURDAY = 6, "Sábado-feira"

    weekday = models.IntegerField(
        choices=WeekDay.choices
    )

    start_time = models.TimeField()
    end_time = models.TimeField()

    class Meta:
        ordering = ["weekday", "start_time"]


    def __str__(self):
        return (
            f"{self.get_weekday_display()} "
            f"{self.start_time.strftime('%H:%M')} - "    
            f"{self.end_time.strftime('%H:%M')}"
        )

class ClassGroup(models.Model):
    name = models.CharField(max_length=50)

    subject = models.ForeignKey(
        Subject,
        on_delete=models.CASCADE,
        related_name="class_groups"
    )

    professor = models.ForeignKey(
        Professor,
        on_delete=models.CASCADE,
        related_name="class_groups"
    )

    semester = models.PositiveIntegerField()

    def __str__(self):
        return f"{self.subject.name} - {self.name}"


class ScheduleEntry(models.Model):

    class_group = models.ForeignKey(
        ClassGroup,
        on_delete=models.CASCADE,
        related_name="schedule_entries"
    )

    timeslot = models.ForeignKey(
        TimeSlot,
        on_delete=models.CASCADE,
        related_name="schedle_entries"
    )

    class Meta:
        # Adicionar as restrições fortes aqui
        constraints = [
            models.UniqueConstraint(
                fields=["timeslot", "class_group"],
                name="unique_class_group_timeslot"
            )
        ]


    def __str__(self):
        return (
            f"{self.class_group} - "
            f"{self.timeslot}"
        )