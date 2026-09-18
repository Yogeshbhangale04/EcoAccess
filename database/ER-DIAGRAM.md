# EcoAccess ER Diagram

This ER diagram shows the entities and their relationships for the complete EcoAccess project in the `FD/dev` branch.

> Open this file in GitHub, VS Code with Mermaid support, or Mermaid Live Editor to render the connected diagram.

```mermaid
erDiagram
    USERS ||--o{ USER_ROLES : "has"
    ROLES ||--o{ USER_ROLES : "assigned through"

    USERS ||--o{ OTP_VERIFICATIONS : "receives"
    USERS ||--o{ PASSWORD_RESET_TOKENS : "requests"

    USERS ||--o{ JOURNEY_VALIDATIONS : "validates"
    STATIONS ||--o{ JOURNEY_VALIDATIONS : "used at"

    JOURNEY_VALIDATIONS ||--o{ BOOKINGS : "supports"
    USERS ||--o{ BOOKINGS : "creates"
    SERVICE_TYPES ||--o{ BOOKINGS : "selected for"
    STATIONS ||--o{ BOOKINGS : "starts at"
    USERS o|--o{ BOOKINGS : "assigned staff"

    BOOKINGS ||--o{ BOOKING_STATUS_HISTORY : "has status history"
    USERS o|--o{ BOOKING_STATUS_HISTORY : "changes status"
    BOOKINGS ||--o| PAYMENTS : "has payment"
    COUPONS o|--o{ PAYMENTS : "discounts"

    STATIONS ||--o{ INVENTORY : "contains"
    RESOURCE_TYPES ||--o{ INVENTORY : "categorizes"
    INVENTORY ||--o{ INVENTORY_TRANSACTIONS : "records movement"
    BOOKINGS o|--o{ INVENTORY_TRANSACTIONS : "reserves resource"
    USERS o|--o{ INVENTORY_TRANSACTIONS : "performs"

    USERS ||--o{ WASTE_SUBMISSIONS : "submits"
    JOURNEY_VALIDATIONS ||--o{ WASTE_SUBMISSIONS : "required for"
    USERS o|--o{ WASTE_SUBMISSIONS : "reviews"
    WASTE_SUBMISSIONS o|--o{ REWARD_LEDGER : "generates points"
    USERS ||--o{ REWARD_LEDGER : "owns points"

    USERS ||--o{ REDEMPTIONS : "makes"
    REDEMPTIONS ||--o| COUPONS : "generates"
    USERS ||--o{ COUPONS : "owns"

    USERS ||--o{ FEEDBACK_COMPLAINTS : "submits"
    BOOKINGS o|--o{ FEEDBACK_COMPLAINTS : "concerns"
    USERS o|--o{ FEEDBACK_COMPLAINTS : "resolves"

    USERS {
        uuid user_id PK
        varchar full_name
        varchar mobile UK
        varchar email UK
        text password_hash
        enum account_status
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

    OTP_VERIFICATIONS {
        uuid otp_id PK
        uuid user_id FK
        varchar identity_value
        varchar purpose
        text otp_hash
        timestamptz expires_at
        timestamptz verified_at
    }

    PASSWORD_RESET_TOKENS {
        uuid token_id PK
        uuid user_id FK
        varchar token_hash UK
        timestamptz expires_at
        timestamptz used_at
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
        enum status
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
        enum status
        uuid changed_by FK
        text notes
        timestamptz changed_at
    }

    PAYMENTS {
        uuid payment_id PK
        uuid booking_id FK,UK
        uuid coupon_id FK
        enum method
        enum status
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
        enum status
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
        enum status
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
        enum status
        timestamptz created_at
        timestamptz expires_at
        timestamptz used_at
        varchar used_for
        varchar used_reference
    }

    FEEDBACK_COMPLAINTS {
        uuid case_id PK
        varchar case_reference UK
        uuid passenger_id FK
        uuid booking_id FK
        enum case_type
        smallint rating
        varchar subject
        text description
        enum status
        uuid resolved_by FK
        timestamptz created_at
        timestamptz resolved_at
    }
```

## Relationship/cardinality legend

- `||--o{`: one parent record can have zero or many child records.
- `||--o|`: one parent record can have zero or one child record.
- `o|--o{`: an optional parent reference can be associated with zero or many records.
- `PK`: primary key.
- `FK`: foreign key.
- `UK`: unique key.

## Main business flow

```text
Passenger/User
    │
    ├── validates Journey ──> Journey Validation ──> creates Booking
    │                                               │
    │                                               ├── assigned Staff
    │                                               ├── uses Station Inventory
    │                                               ├── receives Status History
    │                                               └── has Payment ──> optional Coupon
    │
    ├── submits Waste ──> Admin Review ──> Reward Ledger ──> Points
    │                                                        │
    │                                                        └── Redemption ──> Coupon
    │
    └── submits Feedback/Complaint ──> Booking and Admin Resolution
```

## LocalStorage-to-database connections

| Current localStorage key | Relational tables | Important connection |
|---|---|---|
| `passengers` | `users`, `user_roles` | `bookings.passenger_id -> users.user_id` |
| `staff` | `users`, `user_roles` | `bookings.assigned_staff_id -> users.user_id` |
| `journeyValidations` | `journey_validations`, `stations` | `bookings.journey_id -> journey_validations.journey_id` |
| `bookings` | `bookings`, `booking_status_history`, `payments` | Booking connects passenger, journey, station, service, and staff |
| `resources` | `resource_types`, `inventory`, `inventory_transactions` | Inventory connects station and resource type |
| `waste` | `waste_submissions`, `reward_ledger` | Approved waste creates reward points |
| `coupons` | `coupons` | Coupon can discount a payment or train fare |
| `redemptions` | `redemptions`, `coupons` | Redemption generates a coupon |
| `complaints` | `feedback_complaints` | Case connects passenger and optional booking |
