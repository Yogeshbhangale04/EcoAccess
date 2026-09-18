-- EcoAccess production-oriented PostgreSQL schema
-- Source: Yogeshbhangale04/EcoAccess, branch FD/dev
-- The current UI uses localStorage. This schema is for the API/database implementation.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE account_status AS ENUM ('pending', 'active', 'suspended', 'disabled');
CREATE TYPE booking_status AS ENUM ('booked', 'assigned', 'accepted', 'reached_passenger', 'service_started', 'completed', 'rejected', 'cancelled');
CREATE TYPE payment_method AS ENUM ('upi', 'card');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
CREATE TYPE case_type AS ENUM ('feedback', 'complaint');
CREATE TYPE case_status AS ENUM ('submitted', 'open', 'resolved', 'closed');
CREATE TYPE review_status AS ENUM ('pending', 'accepted', 'rejected');
CREATE TYPE coupon_status AS ENUM ('active', 'used', 'expired', 'cancelled');
CREATE TYPE redemption_status AS ENUM ('issued', 'pending', 'approved', 'rejected');

CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(120) NOT NULL,
    mobile VARCHAR(20) UNIQUE,
    email VARCHAR(255) UNIQUE,
    password_hash TEXT NOT NULL,
    account_status account_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (mobile IS NOT NULL OR email IS NOT NULL)
);

CREATE TABLE roles (
    role_id SMALLSERIAL PRIMARY KEY,
    role_name VARCHAR(30) NOT NULL UNIQUE CHECK (role_name IN ('passenger', 'staff', 'admin'))
);

CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    role_id SMALLINT NOT NULL REFERENCES roles(role_id),
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE otp_verifications (
    otp_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    identity_value VARCHAR(255) NOT NULL,
    purpose VARCHAR(30) NOT NULL CHECK (purpose IN ('registration', 'password_reset', 'login')),
    otp_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE password_reset_tokens (
    token_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE stations (
    station_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_code VARCHAR(20) UNIQUE,
    station_name VARCHAR(120) NOT NULL UNIQUE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE journey_validations (
    journey_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    passenger_id UUID NOT NULL REFERENCES users(user_id),
    pnr VARCHAR(10) NOT NULL,
    train_number VARCHAR(10) NOT NULL,
    journey_date DATE NOT NULL,
    station_id UUID NOT NULL REFERENCES stations(station_id),
    platform_number VARCHAR(10) NOT NULL,
    origin VARCHAR(120),
    destination VARCHAR(120),
    coach VARCHAR(20),
    travel_class VARCHAR(20),
    is_valid BOOLEAN NOT NULL DEFAULT TRUE,
    validated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (passenger_id, pnr, journey_date)
);

CREATE TABLE service_types (
    service_type_id SMALLSERIAL PRIMARY KEY,
    service_name VARCHAR(50) NOT NULL UNIQUE,
    base_rate NUMERIC(10,2) NOT NULL CHECK (base_rate >= 0),
    active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE bookings (
    booking_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_reference VARCHAR(30) NOT NULL UNIQUE,
    passenger_id UUID NOT NULL REFERENCES users(user_id),
    journey_id UUID NOT NULL REFERENCES journey_validations(journey_id),
    service_type_id SMALLINT NOT NULL REFERENCES service_types(service_type_id),
    station_id UUID NOT NULL REFERENCES stations(station_id),
    assigned_staff_id UUID REFERENCES users(user_id),
    status booking_status NOT NULL DEFAULT 'booked',
    service_date DATE NOT NULL,
    service_time TIME,
    passenger_count INTEGER NOT NULL DEFAULT 1 CHECK (passenger_count BETWEEN 1 AND 8),
    bag_count INTEGER NOT NULL DEFAULT 0 CHECK (bag_count BETWEEN 0 AND 20),
    weight_range VARCHAR(50),
    pick_platform INTEGER NOT NULL CHECK (pick_platform BETWEEN 1 AND 20),
    drop_platform INTEGER NOT NULL CHECK (drop_platform BETWEEN 1 AND 20),
    gross_fare NUMERIC(10,2) NOT NULL CHECK (gross_fare >= 0),
    tax_amount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
    discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    payable_amount NUMERIC(10,2) NOT NULL CHECK (payable_amount >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (pick_platform <> drop_platform)
);

CREATE TABLE booking_status_history (
    history_id BIGSERIAL PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES bookings(booking_id) ON DELETE CASCADE,
    status booking_status NOT NULL,
    changed_by UUID REFERENCES users(user_id),
    notes TEXT,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE coupons (
    coupon_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_code VARCHAR(40) NOT NULL UNIQUE,
    passenger_id UUID NOT NULL REFERENCES users(user_id),
    points_redeemed INTEGER NOT NULL CHECK (points_redeemed > 0),
    original_value NUMERIC(10,2) NOT NULL CHECK (original_value >= 0),
    remaining_value NUMERIC(10,2) NOT NULL CHECK (remaining_value >= 0),
    status coupon_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    used_for VARCHAR(30),
    used_reference VARCHAR(60),
    redemption_id UUID
);

CREATE TABLE payments (
    payment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL UNIQUE REFERENCES bookings(booking_id),
    coupon_id UUID REFERENCES coupons(coupon_id),
    method payment_method NOT NULL,
    status payment_status NOT NULL DEFAULT 'pending',
    provider_reference VARCHAR(120),
    amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE resource_types (
    resource_type_id SMALLSERIAL PRIMARY KEY,
    resource_name VARCHAR(50) NOT NULL UNIQUE CHECK (resource_name IN ('wheelchair', 'inter_vehicle'))
);

CREATE TABLE inventory (
    inventory_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES stations(station_id) ON DELETE CASCADE,
    resource_type_id SMALLINT NOT NULL REFERENCES resource_types(resource_type_id),
    total_quantity INTEGER NOT NULL DEFAULT 0 CHECK (total_quantity >= 0),
    available_quantity INTEGER NOT NULL DEFAULT 0 CHECK (available_quantity >= 0),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (station_id, resource_type_id),
    CHECK (available_quantity <= total_quantity)
);

CREATE TABLE inventory_transactions (
    transaction_id BIGSERIAL PRIMARY KEY,
    inventory_id UUID NOT NULL REFERENCES inventory(inventory_id),
    booking_id UUID REFERENCES bookings(booking_id),
    performed_by UUID REFERENCES users(user_id),
    transaction_type VARCHAR(30) NOT NULL CHECK (transaction_type IN ('reserve', 'release', 'adjustment', 'restore')),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE waste_submissions (
    waste_submission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_reference VARCHAR(30) NOT NULL UNIQUE,
    passenger_id UUID NOT NULL REFERENCES users(user_id),
    journey_id UUID NOT NULL REFERENCES journey_validations(journey_id),
    photo_url TEXT NOT NULL,
    status review_status NOT NULL DEFAULT 'pending',
    reward_points INTEGER NOT NULL DEFAULT 0 CHECK (reward_points >= 0),
    reviewer_remark TEXT,
    reviewed_by UUID REFERENCES users(user_id),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_at TIMESTAMPTZ
);

CREATE TABLE reward_ledger (
    ledger_id BIGSERIAL PRIMARY KEY,
    passenger_id UUID NOT NULL REFERENCES users(user_id),
    waste_submission_id UUID REFERENCES waste_submissions(waste_submission_id),
    points_delta INTEGER NOT NULL CHECK (points_delta <> 0),
    reason VARCHAR(80) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE redemptions (
    redemption_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    passenger_id UUID NOT NULL REFERENCES users(user_id),
    points_redeemed INTEGER NOT NULL CHECK (points_redeemed >= 100),
    coupon_value NUMERIC(10,2) NOT NULL CHECK (coupon_value >= 0),
    status redemption_status NOT NULL DEFAULT 'issued',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_at TIMESTAMPTZ
);

ALTER TABLE coupons
    ADD CONSTRAINT coupons_redemption_fk FOREIGN KEY (redemption_id) REFERENCES redemptions(redemption_id);

CREATE TABLE feedback_complaints (
    case_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_reference VARCHAR(30) NOT NULL UNIQUE,
    passenger_id UUID NOT NULL REFERENCES users(user_id),
    booking_id UUID REFERENCES bookings(booking_id),
    case_type case_type NOT NULL,
    rating SMALLINT CHECK (rating BETWEEN 1 AND 5),
    subject VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    status case_status NOT NULL DEFAULT 'submitted',
    resolved_by UUID REFERENCES users(user_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_bookings_passenger_date ON bookings(passenger_id, service_date DESC);
CREATE INDEX idx_bookings_staff_status ON bookings(assigned_staff_id, status);
CREATE INDEX idx_bookings_station_status ON bookings(station_id, status);
CREATE INDEX idx_booking_history_booking_time ON booking_status_history(booking_id, changed_at DESC);
CREATE INDEX idx_journey_passenger_valid ON journey_validations(passenger_id, is_valid, journey_date DESC);
CREATE INDEX idx_waste_passenger_time ON waste_submissions(passenger_id, submitted_at DESC);
CREATE INDEX idx_waste_pending_review ON waste_submissions(status, submitted_at) WHERE status = 'pending';
CREATE INDEX idx_coupons_passenger_status ON coupons(passenger_id, status, expires_at);
CREATE INDEX idx_cases_status ON feedback_complaints(status, created_at DESC);
CREATE INDEX idx_inventory_station_resource ON inventory(station_id, resource_type_id);

-- Seed reference data. Replace with migrations/fixtures in the application.
INSERT INTO roles (role_name) VALUES ('passenger'), ('staff'), ('admin') ON CONFLICT DO NOTHING;
INSERT INTO service_types (service_name, base_rate) VALUES
    ('Porter', 150.00), ('Wheelchair', 100.00), ('Inter Vehicle', 180.00)
ON CONFLICT (service_name) DO NOTHING;
INSERT INTO resource_types (resource_name) VALUES ('wheelchair'), ('inter_vehicle') ON CONFLICT DO NOTHING;
