# Security Specification: HealthGuard Hospital

## 1. Data Invariants
- An appointment cannot be booked for a non-existent doctor.
- A user can only access their own appointments, reports, and private profile data.
- Only admins can manage doctor listings and departments.
- Doctors and Admins can view appointments related to their patients.
- Messages are only readable by the sender or the receiver.

## 2. The "Dirty Dozen" Payloads (Denial Tests)

1. **Identity Spoofing**: Attempt to create a user profile with a different UID.
2. **Privilege Escalation**: Attempt to set `role: 'admin'` on a self-created user profile.
3. **Shadow Update**: Attempt to update an appointment status without proper authorization.
4. **ID Poisoning**: Attempt to use an extremely long string as an appointment ID.
5. **PII Leak**: Attempt to list all users' private information.
6. **Orphaned Writing**: Attempt to book an appointment for a non-existent doctor ID.
7. **Terminal State Bypass**: Attempt to edit an appointment that's already 'completed'.
8. **Resource Exhaustion**: Send an array of 1000 items in dummy metadata to a document.
9. **Timestamp Spoofing**: Provide a future `createdAt` timestamp from the client.
10. **Ghost Field Injection**: Add `isVerified: true` to a doctor document update.
11. **Cross-User Messaging**: Attempt to read messages where the user is neither sender nor receiver.
12. **Blanket Read Attack**: Attempt to query all appointments without a userId filter.

## 3. Test Runner (Draft)
The `firestore.rules.test.ts` will verify these scenarios.
