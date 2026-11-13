from django.test import TestCase

from .models import Sprint


class SprintModelTests(TestCase):
    def test_sprints_are_ordered_by_start_date(self):
        second = Sprint.objects.create(name="Sprint 2", start_date="2026-11-16", end_date="2026-11-29")
        first = Sprint.objects.create(name="Sprint 1", start_date="2026-11-02", end_date="2026-11-15")
        self.assertEqual(list(Sprint.objects.all()), [first, second])
        self.assertEqual(str(first), "Sprint 1")
