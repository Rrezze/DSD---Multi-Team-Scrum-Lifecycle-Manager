from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Absence

User = get_user_model()


def user_url(user):
    return f"/api/users/{user.pk}/absences/"


class AbsenceModelTests(TestCase):
    def test_database_rejects_end_before_start(self):
        user = User.objects.create_user(username="ana")
        with self.assertRaises(IntegrityError), transaction.atomic():
            Absence.objects.create(user=user, start_date="2026-11-20", end_date="2026-11-19")


class UserAbsencesApiTests(APITestCase):
    def setUp(self):
        self.ana = User.objects.create_user(username="ana")
        self.marko = User.objects.create_user(username="marko")

    def add(self, user, **data):
        return self.client.post(user_url(user), data, format="json")

    def test_add_absence(self):
        response = self.add(self.ana, start_date="2026-11-26", end_date="2026-11-28",
                            reason="holiday")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        absence = Absence.objects.get()
        self.assertEqual(response.data, {
            "id": absence.pk, "user": self.ana.pk, "start_date": "2026-11-26",
            "end_date": "2026-11-28", "reason": "holiday", "hours": None,
        })

    def test_reason_is_optional(self):
        response = self.add(self.ana, start_date="2026-11-26", end_date="2026-11-26")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["reason"], "")

    def test_user_comes_from_url_not_body(self):
        response = self.client.post(
            user_url(self.ana),
            {"start_date": "2026-11-26", "end_date": "2026-11-26", "user": self.marko.pk},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["user"], self.ana.pk)

    def test_dates_are_required(self):
        response = self.add(self.ana, reason="holiday")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("start_date", response.data)
        self.assertIn("end_date", response.data)

    def test_end_before_start_is_rejected(self):
        response = self.add(self.ana, start_date="2026-11-28", end_date="2026-11-26")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("end_date", response.data)

    def test_invalid_date(self):
        response = self.add(self.ana, start_date="26/11/2026", end_date="2026-11-26")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("start_date", response.data)

    def test_partial_day_with_hours(self):
        response = self.add(self.ana, start_date="2026-11-26", end_date="2026-11-26",
                            hours=4, reason="doctor")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["hours"], 4)

    def test_hours_only_for_one_day(self):
        response = self.add(self.ana, start_date="2026-11-26", end_date="2026-11-27", hours=4)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("hours", response.data)

    def test_hours_between_1_and_8(self):
        for hours in (0, 9):
            with self.subTest(hours=hours):
                response = self.add(self.ana, start_date="2026-11-26",
                                    end_date="2026-11-26", hours=hours)
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertIn("hours", response.data)

    def test_overlapping_absence_is_rejected(self):
        self.add(self.ana, start_date="2026-11-26", end_date="2026-11-28")
        for start, end in (("2026-11-28", "2026-11-30"), ("2026-11-20", "2026-11-26"),
                           ("2026-11-27", "2026-11-27")):
            with self.subTest(start=start, end=end):
                response = self.add(self.ana, start_date=start, end_date=end)
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Absence.objects.count(), 1)

    def test_next_day_is_not_an_overlap(self):
        self.add(self.ana, start_date="2026-11-26", end_date="2026-11-28")
        response = self.add(self.ana, start_date="2026-11-29", end_date="2026-11-30")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_other_user_can_be_absent_on_the_same_days(self):
        self.add(self.ana, start_date="2026-11-26", end_date="2026-11-28")
        response = self.add(self.marko, start_date="2026-11-26", end_date="2026-11-28")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_list_absences_of_one_user_oldest_first(self):
        self.add(self.ana, start_date="2026-12-10", end_date="2026-12-11")
        self.add(self.ana, start_date="2026-11-26", end_date="2026-11-26")
        self.add(self.marko, start_date="2026-11-26", end_date="2026-11-26")
        response = self.client.get(user_url(self.ana))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([a["start_date"] for a in response.data],
                         ["2026-11-26", "2026-12-10"])

    def test_unknown_user(self):
        response = self.client.get("/api/users/9999/absences/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        response = self.client.post("/api/users/9999/absences/",
                                    {"start_date": "2026-11-26", "end_date": "2026-11-26"},
                                    format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class DeleteAbsenceApiTests(APITestCase):
    def setUp(self):
        self.ana = User.objects.create_user(username="ana")
        self.absence = Absence.objects.create(user=self.ana, start_date="2026-11-26",
                                              end_date="2026-11-28")

    def test_delete_absence(self):
        response = self.client.delete(f"/api/absences/{self.absence.pk}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Absence.objects.exists())

    def test_delete_unknown_absence(self):
        response = self.client.delete("/api/absences/9999/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_only_delete_is_allowed_on_one_absence(self):
        response = self.client.get(f"/api/absences/{self.absence.pk}/")
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)


class AbsenceListApiTests(APITestCase):
    def setUp(self):
        self.ana = User.objects.create_user(username="ana")
        self.marko = User.objects.create_user(username="marko")
        self.ivan = User.objects.create_user(username="ivan")
        Absence.objects.create(user=self.ana, start_date="2026-11-10", end_date="2026-11-12")
        Absence.objects.create(user=self.ana, start_date="2026-11-26", end_date="2026-11-28")
        Absence.objects.create(user=self.marko, start_date="2026-11-30", end_date="2026-12-02")
        Absence.objects.create(user=self.ivan, start_date="2026-11-20", end_date="2026-11-20")

    def get(self, query=""):
        return self.client.get("/api/absences/" + query)

    def pairs(self, response):
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return [(a["user"], a["start_date"]) for a in response.data]

    def test_all_absences(self):
        self.assertEqual(len(self.get().data), 4)

    def test_absences_of_some_users(self):
        result = self.pairs(self.get(f"?users={self.ana.pk},{self.marko.pk}"))
        self.assertEqual(result, [(self.ana.pk, "2026-11-10"), (self.ana.pk, "2026-11-26"),
                                  (self.marko.pk, "2026-11-30")])

    def test_absences_overlapping_a_sprint(self):
        # sprint 16/11 - 29/11: ana's late-November absence, ivan's day and
        # nothing from marko (starts 30/11) or ana's early one (ends 12/11)
        result = self.pairs(self.get("?from=2026-11-16&to=2026-11-29"))
        self.assertEqual(result, [(self.ana.pk, "2026-11-26"), (self.ivan.pk, "2026-11-20")])

    def test_absence_partly_inside_the_period_counts(self):
        result = self.pairs(self.get("?from=2026-12-01&to=2026-12-14"))
        self.assertEqual(result, [(self.marko.pk, "2026-11-30")])

    def test_users_and_period_together(self):
        result = self.pairs(self.get(f"?users={self.ana.pk}&from=2026-11-16&to=2026-11-29"))
        self.assertEqual(result, [(self.ana.pk, "2026-11-26")])

    def test_invalid_users(self):
        for value in ("abc", "1,x", ","):
            with self.subTest(value=value):
                response = self.get(f"?users={value}")
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertIn("users", response.data)

    def test_invalid_date(self):
        response = self.get("?from=16-11-2026")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("from", response.data)

    def test_to_before_from(self):
        response = self.get("?from=2026-11-29&to=2026-11-16")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("to", response.data)


class DeactivatedUserAbsenceApiTests(APITestCase):
    def setUp(self):
        self.ana = User.objects.create_user(username="ana")
        Absence.objects.create(user=self.ana, start_date="2026-11-10", end_date="2026-11-12")
        self.ana.is_active = False
        self.ana.save()

    def test_cannot_add_absence_to_deactivated_user(self):
        response = self.client.post(user_url(self.ana),
                                    {"start_date": "2026-12-01", "end_date": "2026-12-02"},
                                    format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual([str(e) for e in response.data["non_field_errors"]],
                         ["This user is deactivated."])
        self.assertEqual(self.ana.absences.count(), 1)

    def test_old_absences_of_deactivated_user_can_still_be_read(self):
        response = self.client.get(user_url(self.ana))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
