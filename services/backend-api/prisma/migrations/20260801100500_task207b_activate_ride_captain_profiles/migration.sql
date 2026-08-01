-- Task 207B-H1: Convert Ride Captain profiles after ACTIVE enum value has committed.

UPDATE "taxi_driver_profiles"
SET "status" = 'ACTIVE'
WHERE "status" = 'ACTIVE_TEST';
