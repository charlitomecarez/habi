# Vehicle

**Files:** `lib/vehicles.ts`, `app/(app)/(tabs)/vehicle.tsx`, `app/(app)/vehicle/log-service.tsx`, `app/(app)/vehicle/mark-done.tsx`, `components/vehicle/AddVehicleSheet.tsx`, `components/vehicle/UpdateOdometerSheet.tsx`, migrations `...0300`, `...0310`, `...0900`.

## Model

- `vehicle_models` and `service_templates` are shared. The Honda ADV 160 is the default model.
- The ADV 160 intervals come from the owner's manual (migration `...0900`), then a stricter maintenance checker (migration `20261106000700`). For example: engine oil every 1,500 km or 12 months. Each item has one interval, so an inspect value and a replace value become one reminder.
- Each vehicle gets its own copy of the schedule in `vehicle_services`. This lets one vehicle change an interval without a change to the templates.

## Add a vehicle

Add vehicle asks for the model first. `useVehicleModels` lists each row of `vehicle_models`, the default first, and the sheet picks the default, so the usual path is one number and one tap. A last row, "Another model", is off and says why: only the ADV 160 has a service schedule now. A new row in `vehicle_models` shows in the picker with no app change.

`useAddVehicle` inserts the vehicle with the chosen `model_id`, make and model, a nickname and an odometer reading.

1. `vehicles_defaults` fills make, model and `model_id` from the default model only when all three are empty.
2. `vehicles_copy_templates` copies that model's templates into `vehicle_services`.

`useVehicle()` returns the primary vehicle, else the oldest one. The app shows one vehicle.

## What is due (`vehicle_service_due` view)

For each active vehicle service:

- `next_due_km` = last service km (or 0) + `interval_km`.
- `next_due_on` = last service date (or the vehicle's creation date) + `interval_months`.
- The first of the two limits to arrive wins.

| Status        | Rule                                                                            |
| ------------- | ------------------------------------------------------------------------------- |
| `overdue`     | The odometer is at or past `next_due_km`, or today is at or past `next_due_on`. |
| `due_soon`    | 500 km or fewer remain, or 14 days or fewer remain.                             |
| `no_interval` | The item has no km and no month interval.                                       |
| `ok`          | Anything else.                                                                  |

App text comes from `dueText` (for example "300 km overdue", "Due in 12 days") and `laterText` (for example "at 12,000 km or Mar 2027").

## Update the odometer

`UpdateOdometerSheet` calls `useLogOdometer`, which inserts an `odometer_logs` row.

- Before save, `newlyDueAt` lists items that the new reading makes overdue. The sheet shows them with "You'll get a reminder."
- A lower reading needs a second step. The sheet then saves with `is_correction`, and `noLongerDueAt` names the items that it ends.
- `on_odometer_logged` raises `current_odometer_km`, or sets it for a correction. No other log lowers it.
- It inserts a `vehicle_service` reminder (due now) for each overdue item that has no pending reminder.

## Log a service

`/vehicle/log-service` (`useLogService`):

1. If the user picks "Other", it inserts a new `vehicle_services` row with no interval.
2. It inserts a `service_logs` row with odometer, date, cost, shop and notes.
3. If there is a receipt photo, it uploads it to `receipts/` and sets `receipt_path`.

`on_service_logged` deletes the pending reminder for that service and raises the odometer.

`/vehicle/mark-done` (`useMarkServicesDone`) logs several services at one reading and date, with no cost or shop.

## Screens

- **Vehicle tab:** vehicle name and odometer, "Update odometer", "Service due now" (overdue and due soon), "Later", "Mark services done" and "Log another service".
- **Home:** an overdue or due-soon item shows as a "Needs attention" card. A tap opens Log service for that item.

## Checks

`vehicle/checks` holds the 6 checks before riding and the 5 weekly checks in `lib/vehicle-checks.ts`. They have no intervals and send no reminders. Ticks stay on the phone: the daily list clears each day, and the weekly list clears each Monday. Sign-out clears them.
