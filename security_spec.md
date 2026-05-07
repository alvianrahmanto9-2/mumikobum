# Security Specification for Mosque Attendance App

## Data Invariants
1. Students cannot be created without a name and classType.
2. Attendance records must point to a valid student ID (verified by client, rules check presence of required fields).
3. Attendance status must be one of: 'Hadir', 'Izin', 'Alfa'.
4. Teacher names must be from the allowed list or just validated as strings.

## The Dirty Dozen Payloads
1. Attempt to create a student without a name. (Fail)
2. Attempt to create an attendance record with an invalid status like 'Bolos'. (Fail)
3. Attempt to update a student's ID (Immutability check). (Fail)
4. Attempt to write to `attendance` without being authenticated. (Fail)
5. Attempt to write a 2MB string into `student.name`. (Fail)
6. Attempt to delete all students as an unauthenticated user. (Fail)
7. Attempt to inject a field `isAdmin: true` into a student record. (Fail)
8. Attempt to record attendance for a non-existent student (Exists check). (Fail)
9. Attempt to update `joinDate` on a student after creation. (Fail)
10. Attempt to create a teacher config with 1000 names (Size limit). (Fail)
11. Attempt to change `classType` of a student to 'Mati' (Enum check). (Fail)
12. Attempt to read PII from a user profile (N/A here as we don't store PII yet, but good to keep in mind).

## Implementation Details
- `isValidStudent(data)`: checks keys, types, and classType enum.
- `isValidAttendance(data)`: checks keys, types, status enum, and student existence.
- `isSignedIn()`: standard auth check.
