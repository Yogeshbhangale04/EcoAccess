# EcoAccess Database Design

This design covers the complete EcoAccess flow represented in the `FD/dev` branch:

- Passenger, staff, and admin authentication
- Passenger registration, OTP verification, profile, and password reset
- Journey/PNR validation
- Porter, wheelchair, and inter-platform vehicle bookings
- Fare calculation, coupons, and simulated payments
- Staff assignment and service-status tracking
- Waste-disposal photo review and reward points
- Reward coupons and redemptions
- Feedback and complaints
- Station resource availability

The current project is a frontend prototype using `localStorage` as a mock backend. The design below is a production-oriented relational model intended to replace those localStorage collections with a real API and database.

## ER diagram

```mermaid
erDiagram
    USERS ||--o{ USER_ROLES : has
    ROLES ||--o{ USER_ROLES : grants
    USERS ||--o{ OTP_VERIFICATIONS : verifies
    USERS ||--o{ PASSWORD_RESET_TOKENS : requests
    USERS ||--o{ JOURNEY_VALIDATIONS : validates
    STATIONS ||--o{ JOURNEY_VALIDATIONS : used_at
    JOURNEY_VALIDATIONS ||--o{ BOOKINGS : supports
    USERS ||--o{ BOOKINGS : creates
    SERVICE_TYPES ||--o{ BOOKINGS : requested_as
    STATIONS ||--o{ BOOKINGS : starts_at
    USERS ||--o{ BOOKINGS : assigned_to
    BOOKINGS ||--o{ BOOKING_STATUS_HISTORY : records
    USERS ||--o{ BOOKING_STATUS_HISTORY : changes
    BOOKINGS ||--o{ PAYMENTS : paid_by
    COUPONS ||--o{ PAYMENTS : discounts
    USERS ||--o{ COUPONS : owns
    USERS ||--o{ WASTE_SUBMISSIONS : submits
    JOURNEY_VALIDATIONS ||--o{ WASTE_SUBMISSIONS : supports
    WASTE_SUBMISSIONS ||--o{ REWARD_LEDGER : earns
    USERS ||--o{ REWARD_LEDGER : owns
    USERS ||--o{ REDEMPTIONS : makes
    REDEMPTIONS ||--o| COUPONS : generates
    USERS ||--o{ FEEDBACK_COMPLAINTS : submits
    BOOKINGS ||--o{ FEEDBACK_COMPLAINTS : concerns
    USERS ||--o{ FEEDBACK_COMPLAINTS : resolves
    STATIONS ||--o{ INVENTORY : contains
    RESOURCE_TYPES ||--o{ INVENTORY : measures
    INVENTORY ||--o{ INVENTORY_TRANSACTIONS : changes
    USERS ||--o{ INVENTORY_TRANSACTIONS : performs

    USERS {
        uuid user_id PK
        varchar full_name
        varchar mobile UK
        varchar email UK
        text password_hash
        varchar account_status
        timestamptz created_at
        timestamptz updated_at
    }
    ROLES {
        smallint role_id PK
        varchar role_name UK
    }
    USER_ROLES {
        uuid user_id PK,FK
        smallint role_id PK,FK
    }
    STATIONS {
        uuid station_id PK
        varchar station_code UK
        varchar station_name UK
        boolean active
    }
    JOURNEY_VALIDATIONS {
        uuid journey_id PK
        uuid passenger_id FK
        varchar pnr
        varchar train_number
        date journey_date
        uuid station_id FK
        varchar platform_number
        varchar origin
        varchar destination
        varchar coach
        varchar travel_class
        boolean is_valid
        timestamptz validated_at
    }
    SERVICE_TYPES {
        smallint service_type_id PK
        varchar service_name UK
        numeric base_rate
        boolean active
    }
    BOOKINGS {
        uuid booking_id PK
        varchar booking_reference UK
        uuid passenger_id FK
        uuid journey_id FK
        smallint service_type_id FK
        uuid station_id FK
        uuid assigned_staff_id FK
        varchar status
        date service_date
        time service_time
        int passenger_count
        int bag_count
        varchar weight_range
        int pick_platform
        int drop_platform
        numeric gross_fare
        numeric tax_amount
        numeric discount_amount
        numeric payable_amount
        timestamptz created_at
    }
    BOOKING_STATUS_HISTORY {
        bigint history_id PK
        uuid booking_id FK
        varchar status
        uuid changed_by FK
        text notes
        timestamptz changed_at
    }
    PAYMENTS {
        uuid payment_id PK
        uuid booking_id FK
        uuid coupon_id FK
        varchar method
        varchar payment_status
        varchar provider_reference
        numeric amount
        timestamptz paid_at
    }
    RESOURCE_TYPES {
        smallint resource_type_id PK
        varchar resource_name UK
    }
    INVENTORY {
        uuid inventory_id PK
        uuid station_id FK
        smallint resource_type_id FK
        int total_quantity
        int available_quantity
        boolean active
    }
    INVENTORY_TRANSACTIONS {
        bigint transaction_id PK
        uuid inventory_id FK
        uuid booking_id FK
        uuid performed_by FK
        varchar transaction_type
        int quantity
        text notes
        timestamptz created_at
    }
    WASTE_SUBMISSIONS {
        uuid waste_submission_id PK
        varchar submission_reference UK
        uuid passenger_id FK
        uuid journey_id FK
        text photo_url
        varchar status
        int reward_points
        text reviewer_remark
        uuid reviewed_by FK
        timestamptz submitted_at
        timestamptz reviewed_at
    }
    REWARD_LEDGER {
        bigint ledger_id PK
        uuid passenger_id FK
        uuid waste_submission_id FK
        int points_delta
        varchar reason
        timestamptz created_at
    }
    REDEMPTIONS {
        uuid redemption_id PK
        uuid passenger_id FK
        int points_redeemed
        numeric coupon_value
        varchar status
        timestamptz created_at
        timestamptz reviewed_at
    }
    COUPONS {
        uuid coupon_id PK
        varchar coupon_code UK
        uuid passenger_id FK
        uuid redemption_id FK
        int points_redeemed
        numeric original_value
        numeric remaining_value
        varchar status
        timestamptz created_at
        timestamptz expires_at
        timestamptz used_at
    }
    FEEDBACK_COMPLAINTS {
        uuid case_id PK
        varchar case_reference UK
        uuid passenger_id FK
        uuid booking_id FK
        varchar case_type
        smallint rating
        varchar subject
        text description
        varchar status
        uuid resolved_by FK
        timestamptz created_at
        timestamptz resolved_at
    }
    OTP_VERIFICATIONS {
        uuid otp_id PK
        uuid user_id FK
        varchar purpose
        varchar otp_hash
        timestamptz expires_at
        timestamptz verified_at
    }
    PASSWORD_RESET_TOKENS {
        uuid token_id PK
        uuid user_id FK
        varchar token_hash
        timestamptz expires_at
        timestamptz used_at
    }
```

## Mapping from the current frontend

| Current localStorage collection | Database table(s) |
|---|---|
| `passengers` | `users`, `user_roles`, `reward_ledger` |
| `staff` | `users`, `user_roles` |
| admin demo account | `users`, `user_roles` |
| `journeyValidations` | `journey_validations`, `stations` |
| `bookings` | `bookings`, `booking_status_history`, `payments` |
| `resources.wheelchairs` / `resources.vehicles` | `resource_types`, `inventory`, `inventory_transactions` |
| `waste` | `waste_submissions`, `reward_ledger` |
| `rewards` | `service_types` is unrelated; maintain a future `reward_catalog` if fixed rewards are reintroduced |
| `redemptions` | `redemptions`, `coupons` |
| `coupons` | `coupons` |
| `complaints` | `feedback_complaints` |
| `session` | server-side session or access/refresh-token store; do not persist plaintext session data in the browser |
| `pending` | short-lived registration transaction or `otp_verifications` |

## Important implementation decisions

1. Store only password hashes; the demo passwords in the README must not be inserted into production.
2. Use UUIDs internally and human-readable references such as `BK-...`, `WD-...`, and `CP-...` for UI display.
3. Keep status history rather than overwriting the booking status without an audit trail.
4. Store waste images in object storage and save only the URL/key in `waste_submissions.photo_url`.
5. A reward balance is derived from `reward_ledger`; do not update a passenger points column without a matching ledger entry.
6. Do not store full card number or CVV. The payment table stores only the payment method and provider reference.
7. Enforce the four-hour waste submission cooldown and 24-hour review SLA in the service layer and scheduled jobs, with database indexes supporting those queries.
8. The DDL uses PostgreSQL types and constraints. Adapt UUID generation if the selected database is MySQL or SQL Server.
