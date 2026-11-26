"""Capacity of team members and teams in a sprint (TEAM-7).

Capacity is never stored or typed in, it is calculated from:
- the member's available_hours in the sprint (default 80 = 2 weeks x 40h),
- minus their absences that overlap the sprint (TEAM-6),
and turned into story points with HOURS_PER_POINT.
"""

from datetime import timedelta

HOURS_PER_DAY = 8
# 1 point per available working day, so a full 2-week sprint is 10 points.
HOURS_PER_POINT = 8


def working_days(start, end):
    """Number of Monday-Friday days from start to end, both included."""
    days = 0
    day = start
    while day <= end:
        if day.weekday() < 5:
            days += 1
        day += timedelta(days=1)
    return days


def absent_hours(membership):
    """Hours the member is absent during the membership's sprint.

    An absence with hours set (a partial day) counts those hours. Without
    hours, every working day of the absence inside the sprint counts as a
    full day.
    """
    sprint = membership.sprint
    total = 0
    for absence in membership.user.absences.all():
        start = max(absence.start_date, sprint.start_date)
        end = min(absence.end_date, sprint.end_date)
        days = working_days(start, end) if start <= end else 0
        if days == 0:
            continue
        if absence.hours is not None:
            total += min(absence.hours, days * HOURS_PER_DAY)
        else:
            total += days * HOURS_PER_DAY
    return total


def member_capacity_hours(membership):
    return max(membership.available_hours - absent_hours(membership), 0)


def member_capacity_points(membership):
    return member_capacity_hours(membership) // HOURS_PER_POINT

