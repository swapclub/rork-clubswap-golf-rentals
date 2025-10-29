-- ClubSwap Database Schema for Supabase (PostgreSQL)
-- This schema implements all tables, relationships, indexes, and Row-Level Security policies
-- Enable PostGIS extension for geospatial queries

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE user_role AS ENUM ('renter', 'owner', 'both');
CREATE TYPE verification_level AS ENUM ('email', 'phone', 'id', 'payment');
CREATE TYPE club_type AS ENUM ('driver', 'fairway_wood', 'hybrid', 'iron_set', 'wedge_set', 'putter', 'complete_set');
CREATE TYPE handedness AS ENUM ('right', 'left');
CREATE TYPE flex AS ENUM ('extra_stiff', 'stiff', 'regular', 'senior', 'ladies');
CREATE TYPE condition_type AS ENUM ('excellent', 'very_good', 'good', 'fair');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'declined');
CREATE TYPE cancellation_policy AS ENUM ('flexible', 'moderate', 'strict');
CREATE TYPE dispute_status AS ENUM ('open', 'under_review', 'resolved', 'closed');
CREATE TYPE dispute_type AS ENUM ('damage', 'missing_equipment', 'inaccurate_listing', 'late_return', 'no_show', 'inappropriate_behavior');
CREATE TYPE notification_type AS ENUM ('booking', 'message', 'review', 'payout', 'system');
CREATE TYPE notification_channel AS ENUM ('push', 'email', 'sms');

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Golf courses directory
CREATE TABLE golf_courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    province TEXT NOT NULL,
    postal_code TEXT,
    country TEXT DEFAULT 'Canada',
    location GEOGRAPHY(Point, 4326) NOT NULL, -- PostGIS point for lat/lng
    phone TEXT,
    website TEXT,
    holes INTEGER DEFAULT 18,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone_number TEXT,
    phone_verified BOOLEAN DEFAULT FALSE,
    avatar_url TEXT,
    bio TEXT CHECK (char_length(bio) <= 150),
    role user_role DEFAULT 'renter',
    experience_level TEXT CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
    handicap INTEGER,
    home_course_id UUID REFERENCES golf_courses(id),

    -- Verification
    verification_levels verification_level[] DEFAULT ARRAY['email']::verification_level[],
    id_verified BOOLEAN DEFAULT FALSE,
    stripe_verified BOOLEAN DEFAULT FALSE,

    -- Ratings and stats
    overall_rating DECIMAL(3, 2) DEFAULT 0.00,
    total_reviews INTEGER DEFAULT 0,
    total_bookings_as_renter INTEGER DEFAULT 0,
    total_bookings_as_owner INTEGER DEFAULT 0,
    response_rate DECIMAL(5, 2) DEFAULT 0.00,
    average_response_time_minutes INTEGER,

    -- Settings
    preferred_currency TEXT DEFAULT 'CAD',
    language TEXT DEFAULT 'en',
    timezone TEXT DEFAULT 'America/Toronto',

    -- Privacy
    show_email BOOLEAN DEFAULT FALSE,
    show_phone BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ DEFAULT NOW()
);

-- Listings table
CREATE TABLE listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Basic info
    title TEXT NOT NULL CHECK (char_length(title) <= 60),
    description TEXT NOT NULL CHECK (char_length(description) <= 500),
    club_type club_type NOT NULL,

    -- Specifications
    brand TEXT NOT NULL,
    model TEXT,
    year INTEGER,
    handedness handedness NOT NULL,
    flex flex NOT NULL,
    condition condition_type NOT NULL,
    serial_numbers TEXT[],

    -- What's included
    includes_bag BOOLEAN DEFAULT FALSE,
    bag_type TEXT,
    includes_balls BOOLEAN DEFAULT FALSE,
    ball_count INTEGER,
    accessories TEXT[], -- headcovers, towel, tees, divot tool, gloves, rangefinder, etc.
    club_composition JSONB, -- {woods: 3, hybrids: 2, irons: 7, wedges: 3, putter: 1}

    -- Pricing
    daily_rate DECIMAL(10, 2) NOT NULL CHECK (daily_rate >= 20 AND daily_rate <= 500),
    weekly_rate DECIMAL(10, 2),
    security_deposit DECIMAL(10, 2) DEFAULT 100.00 CHECK (security_deposit >= 50 AND security_deposit <= 300),

    -- Location
    pickup_location_type TEXT CHECK (pickup_location_type IN ('golf_course', 'residence', 'both', 'custom')),
    golf_course_id UUID REFERENCES golf_courses(id),
    location GEOGRAPHY(Point, 4326), -- PostGIS point for lat/lng
    address TEXT, -- Full address (hidden until booking confirmed)
    city TEXT NOT NULL,
    province TEXT NOT NULL,
    neighborhood TEXT, -- Public neighborhood name

    -- Delivery
    delivery_available BOOLEAN DEFAULT FALSE,
    delivery_fee DECIMAL(10, 2),
    max_delivery_distance_km INTEGER,

    -- Availability
    minimum_rental_days INTEGER DEFAULT 1,
    maximum_rental_days INTEGER,
    advance_notice_days INTEGER DEFAULT 1,
    preparation_time_days INTEGER DEFAULT 0,

    -- Booking settings
    instant_booking BOOLEAN DEFAULT FALSE,
    response_time_commitment_hours INTEGER DEFAULT 24,
    cancellation_policy cancellation_policy DEFAULT 'moderate',
    special_instructions TEXT,

    -- Status and metrics
    is_active BOOLEAN DEFAULT TRUE,
    is_draft BOOLEAN DEFAULT FALSE,
    view_count INTEGER DEFAULT 0,
    favorite_count INTEGER DEFAULT 0,
    booking_count INTEGER DEFAULT 0,
    average_rating DECIMAL(3, 2) DEFAULT 0.00,
    total_reviews INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_booked_at TIMESTAMPTZ
);

-- Listing photos
CREATE TABLE listing_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    cloudinary_public_id TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    is_primary BOOLEAN DEFAULT FALSE,
    width INTEGER,
    height INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Availability windows
CREATE TABLE availability_windows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_blocked BOOLEAN DEFAULT FALSE, -- TRUE means owner blocked this period
    reason TEXT, -- "booked", "personal_use", "maintenance"
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bookings table
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID NOT NULL REFERENCES listings(id),
    renter_id UUID NOT NULL REFERENCES profiles(id),
    owner_id UUID NOT NULL REFERENCES profiles(id),

    -- Booking details
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    rental_days INTEGER NOT NULL,

    -- Pricing
    daily_rate DECIMAL(10, 2) NOT NULL,
    total_rental_fee DECIMAL(10, 2) NOT NULL,
    service_fee DECIMAL(10, 2) NOT NULL,
    security_deposit DECIMAL(10, 2) NOT NULL,
    delivery_fee DECIMAL(10, 2) DEFAULT 0.00,
    total_amount DECIMAL(10, 2) NOT NULL,

    -- Payment
    stripe_payment_intent_id TEXT,
    stripe_deposit_hold_id TEXT,
    deposit_released BOOLEAN DEFAULT FALSE,
    deposit_captured BOOLEAN DEFAULT FALSE,
    deposit_release_date TIMESTAMPTZ,

    -- Status
    status booking_status DEFAULT 'pending',

    -- Pickup/Delivery
    pickup_method TEXT CHECK (pickup_method IN ('owner_location', 'delivery')),
    pickup_address TEXT,
    delivery_address TEXT,
    pickup_instructions TEXT,

    -- Messages
    renter_message TEXT, -- Initial message from renter
    owner_decline_reason TEXT, -- If owner declines

    -- Reviews
    renter_reviewed BOOLEAN DEFAULT FALSE,
    owner_reviewed BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- Payments table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id),
    user_id UUID NOT NULL REFERENCES profiles(id),

    -- Payment details
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'CAD',
    payment_type TEXT CHECK (payment_type IN ('rental', 'deposit_hold', 'deposit_capture', 'refund')),

    -- Stripe
    stripe_payment_intent_id TEXT,
    stripe_charge_id TEXT,
    stripe_refund_id TEXT,
    stripe_transfer_id TEXT,

    -- Status
    status TEXT CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
    failure_reason TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- Payout accounts (Stripe Connect)
CREATE TABLE payout_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,

    -- Stripe Connect
    stripe_account_id TEXT NOT NULL UNIQUE,
    stripe_account_status TEXT, -- 'pending', 'enabled', 'disabled'
    charges_enabled BOOLEAN DEFAULT FALSE,
    payouts_enabled BOOLEAN DEFAULT FALSE,

    -- Bank details (minimal, Stripe handles actual data)
    country TEXT DEFAULT 'CA',
    currency TEXT DEFAULT 'CAD',
    last_four TEXT, -- Last 4 of bank account
    bank_name TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    onboarding_completed_at TIMESTAMPTZ
);

CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID REFERENCES listings(id),
    booking_id UUID REFERENCES bookings(id),
    participant_1_id UUID NOT NULL REFERENCES profiles(id),
    participant_2_id UUID NOT NULL REFERENCES profiles(id),
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(participant_1_id, participant_2_id, listing_id)
);

-- Messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id),
    recipient_id UUID NOT NULL REFERENCES profiles(id),
    booking_id UUID REFERENCES bookings(id),
    listing_id UUID REFERENCES listings(id),

    -- Message content
    content TEXT NOT NULL CHECK (char_length(content) <= 1000),
    image_url TEXT,

    -- Status
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    is_flagged BOOLEAN DEFAULT FALSE,
    is_system_message BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reviews table
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id),
    reviewer_id UUID NOT NULL REFERENCES profiles(id),
    reviewee_id UUID NOT NULL REFERENCES profiles(id),
    listing_id UUID REFERENCES listings(id),

    -- Review type
    review_type TEXT CHECK (review_type IN ('listing', 'renter')),

    -- Overall rating
    overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),

    -- Category ratings (for listings)
    equipment_quality_rating INTEGER CHECK (equipment_quality_rating >= 1 AND equipment_quality_rating <= 5),
    cleanliness_rating INTEGER CHECK (cleanliness_rating >= 1 AND cleanliness_rating <= 5),
    communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
    accuracy_rating INTEGER CHECK (accuracy_rating >= 1 AND accuracy_rating <= 5),
    value_rating INTEGER CHECK (value_rating >= 1 AND value_rating <= 5),

    -- Category ratings (for renters)
    respect_rating INTEGER CHECK (respect_rating >= 1 AND respect_rating <= 5),
    timeliness_rating INTEGER CHECK (timeliness_rating >= 1 AND timeliness_rating <= 5),
    condition_on_return_rating INTEGER CHECK (condition_on_return_rating >= 1 AND condition_on_return_rating <= 5),

    -- Written review
    review_text TEXT CHECK (char_length(review_text) >= 50 AND char_length(review_text) <= 500),

    -- Private feedback
    private_feedback TEXT,

    -- Response
    owner_response TEXT CHECK (char_length(owner_response) <= 500),
    response_created_at TIMESTAMPTZ,
    response_locked_at TIMESTAMPTZ, -- 48 hours after response

    -- Status
    is_public BOOLEAN DEFAULT TRUE,
    is_flagged BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ -- Both reviews published when both submitted or 14 days elapsed
);

-- Disputes table
CREATE TABLE disputes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id),
    initiator_id UUID NOT NULL REFERENCES profiles(id),
    respondent_id UUID NOT NULL REFERENCES profiles(id),

    -- Dispute details
    dispute_type dispute_type NOT NULL,
    description TEXT NOT NULL,
    evidence_urls TEXT[], -- Photo URLs

    -- Status
    status dispute_status DEFAULT 'open',

    -- Resolution
    admin_notes TEXT,
    resolution TEXT,
    refund_amount DECIMAL(10, 2),
    deposit_action TEXT CHECK (deposit_action IN ('release', 'capture', 'partial_capture')),
    partial_capture_amount DECIMAL(10, 2),

    -- Appeal
    appeal_submitted BOOLEAN DEFAULT FALSE,
    appeal_text TEXT,
    appeal_decision TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Notification details
    type notification_type NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,

    -- Related entities
    booking_id UUID REFERENCES bookings(id),
    listing_id UUID REFERENCES listings(id),
    message_id UUID REFERENCES messages(id),
    review_id UUID REFERENCES reviews(id),

    -- Delivery
    channels notification_channel[] DEFAULT ARRAY['push']::notification_channel[],

    -- Status
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,

    -- Action URL
    action_url TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification preferences
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,

    -- Channels enabled
    push_enabled BOOLEAN DEFAULT TRUE,
    email_enabled BOOLEAN DEFAULT TRUE,
    sms_enabled BOOLEAN DEFAULT FALSE,

    -- Notification types
    booking_notifications BOOLEAN DEFAULT TRUE,
    message_notifications BOOLEAN DEFAULT TRUE,
    review_notifications BOOLEAN DEFAULT TRUE,
    payout_notifications BOOLEAN DEFAULT TRUE,
    marketing_notifications BOOLEAN DEFAULT FALSE,

    -- Do not disturb
    dnd_enabled BOOLEAN DEFAULT FALSE,
    dnd_start_hour INTEGER, -- 0-23
    dnd_end_hour INTEGER, -- 0-23

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User favorites
CREATE TABLE favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, listing_id)
);

-- Verification documents
CREATE TABLE verification_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Document details
    document_type TEXT CHECK (document_type IN ('drivers_license', 'passport', 'national_id')),
    document_number TEXT,

    -- Stripe Identity
    stripe_verification_session_id TEXT,
    verification_status TEXT CHECK (verification_status IN ('pending', 'verified', 'failed')),

    -- Documents (stored securely via Stripe)
    front_image_url TEXT,
    back_image_url TEXT,
    selfie_image_url TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    verified_at TIMESTAMPTZ
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Profiles
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_phone ON profiles(phone_number);
CREATE INDEX idx_profiles_rating ON profiles(overall_rating DESC);

-- Listings
CREATE INDEX idx_listings_owner ON listings(owner_id);
CREATE INDEX idx_listings_active ON listings(is_active, is_draft);
CREATE INDEX idx_listings_club_type ON listings(club_type);
CREATE INDEX idx_listings_city ON listings(city, province);
CREATE INDEX idx_listings_location ON listings USING GIST(location);
CREATE INDEX idx_listings_rating ON listings(average_rating DESC);
CREATE INDEX idx_listings_price ON listings(daily_rate);
CREATE INDEX idx_listings_created ON listings(created_at DESC);
CREATE INDEX idx_listings_instant_booking ON listings(instant_booking) WHERE instant_booking = TRUE;
CREATE INDEX idx_availability_listing_dates ON availability_windows(listing_id, start_date, end_date);

-- Golf courses
CREATE INDEX idx_golf_courses_location ON golf_courses USING GIST(location);
CREATE INDEX idx_golf_courses_city ON golf_courses(city, province);

-- Bookings
CREATE INDEX idx_bookings_renter ON bookings(renter_id);
CREATE INDEX idx_bookings_owner ON bookings(owner_id);
CREATE INDEX idx_bookings_listing ON bookings(listing_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_dates ON bookings(start_date, end_date);
CREATE INDEX idx_bookings_created ON bookings(created_at DESC);

-- Messages
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_recipient ON messages(recipient_id);
CREATE INDEX idx_messages_unread ON messages(recipient_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_conversations_participants ON conversations(participant_1_id, participant_2_id);

-- Reviews
CREATE INDEX idx_reviews_booking ON reviews(booking_id);
CREATE INDEX idx_reviews_reviewee ON reviews(reviewee_id);
CREATE INDEX idx_reviews_listing ON reviews(listing_id);
CREATE INDEX idx_reviews_created ON reviews(created_at DESC);

-- Notifications
CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- Favorites
CREATE INDEX idx_favorites_user ON favorites(user_id);
CREATE INDEX idx_favorites_listing ON favorites(listing_id);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE golf_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Golf courses policies 
CREATE POLICY "Golf courses are viewable by everyone"
    ON golf_courses FOR SELECT
    USING (true);

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
    ON profiles FOR SELECT
    USING (true);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- Listings policies
CREATE POLICY "Active listings are viewable by everyone"
    ON listings FOR SELECT
    USING (is_active = true AND is_draft = false);

CREATE POLICY "Owners can view their own listings"
    ON listings FOR SELECT
    USING (auth.uid() = owner_id);

CREATE POLICY "Owners can insert their own listings"
    ON listings FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their own listings"
    ON listings FOR UPDATE
    USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their own listings"
    ON listings FOR DELETE
    USING (auth.uid() = owner_id);

-- Listing photos policies
CREATE POLICY "Photos visible for viewable listings"
    ON listing_photos FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM listings
            WHERE listings.id = listing_photos.listing_id
            AND (listings.is_active = true OR listings.owner_id = auth.uid())
        )
    );

CREATE POLICY "Owners can manage their listing photos"
    ON listing_photos FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM listings
            WHERE listings.id = listing_photos.listing_id
            AND listings.owner_id = auth.uid()
        )
    );

-- Availability windows policies
CREATE POLICY "Users can view availability for active listings"
    ON availability_windows FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM listings
            WHERE listings.id = availability_windows.listing_id
            AND (listings.is_active = true OR listings.owner_id = auth.uid())
        )
    );

CREATE POLICY "Owners can manage their listing availability"
    ON availability_windows FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM listings
            WHERE listings.id = availability_windows.listing_id
            AND listings.owner_id = auth.uid()
        )
    );
-- Payments policies
CREATE POLICY "Users can view their own payment records"
    ON payments FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "System can create payment records"
    ON payments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Disputes policies
CREATE POLICY "Involved parties can view disputes"
    ON disputes FOR SELECT
    USING (auth.uid() = initiator_id OR auth.uid() = respondent_id);

CREATE POLICY "Users can create disputes for their bookings"
    ON disputes FOR INSERT
    WITH CHECK (auth.uid() = initiator_id);

CREATE POLICY "Involved parties can update disputes"
    ON disputes FOR UPDATE
    USING (auth.uid() = initiator_id OR auth.uid() = respondent_id);

-- Bookings policies
CREATE POLICY "Users can view their own bookings"
    ON bookings FOR SELECT
    USING (auth.uid() = renter_id OR auth.uid() = owner_id);

CREATE POLICY "Renters can create bookings"
    ON bookings FOR INSERT
    WITH CHECK (auth.uid() = renter_id);

CREATE POLICY "Involved parties can update bookings"
    ON bookings FOR UPDATE
    USING (auth.uid() = renter_id OR auth.uid() = owner_id);

-- Messages policies
CREATE POLICY "Users can view their own messages"
    ON messages FOR SELECT
    USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send messages"
    ON messages FOR INSERT
    WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their sent messages"
    ON messages FOR UPDATE
    USING (auth.uid() = sender_id);

CREATE POLICY "Users can view their conversations"
    ON conversations FOR SELECT
    USING (auth.uid() = participant_1_id OR auth.uid() = participant_2_id);

CREATE POLICY "Users can create conversations"
    ON conversations FOR INSERT
    WITH CHECK (auth.uid() = participant_1_id OR auth.uid() = participant_2_id);

-- Reviews policies
CREATE POLICY "Published reviews are viewable by everyone"
    ON reviews FOR SELECT
    USING (is_public = true AND published_at IS NOT NULL);

CREATE POLICY "Reviewers can view their own reviews"
    ON reviews FOR SELECT
    USING (auth.uid() = reviewer_id);

CREATE POLICY "Reviewees can view reviews about them"
    ON reviews FOR SELECT
    USING (auth.uid() = reviewee_id);

CREATE POLICY "Users can create reviews for their bookings"
    ON reviews FOR INSERT
    WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Reviewers can update their own reviews"
    ON reviews FOR UPDATE
    USING (auth.uid() = reviewer_id OR auth.uid() = reviewee_id);

-- Favorites policies
CREATE POLICY "Users can view their own favorites"
    ON favorites FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own favorites"
    ON favorites FOR ALL
    USING (auth.uid() = user_id);

-- Notifications policies
CREATE POLICY "Users can view their own notifications"
    ON notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
    ON notifications FOR UPDATE
    USING (auth.uid() = user_id);

-- Notification preferences policies
CREATE POLICY "Users can manage their own notification preferences"
    ON notification_preferences FOR ALL
    USING (auth.uid() = user_id);

-- Payout accounts policies
CREATE POLICY "Users can view their own payout account"
    ON payout_accounts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own payout account"
    ON payout_accounts FOR ALL
    USING (auth.uid() = user_id);

-- Verification documents policies
CREATE POLICY "Users can manage their own verification documents"
    ON verification_documents FOR ALL
    USING (auth.uid() = user_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_listings_updated_at BEFORE UPDATE ON listings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_disputes_updated_at BEFORE UPDATE ON disputes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, email, first_name, last_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', '')
    );

    INSERT INTO notification_preferences (user_id)
    VALUES (NEW.id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to calculate distance between two points
CREATE OR REPLACE FUNCTION calculate_distance(lat1 FLOAT, lng1 FLOAT, lat2 FLOAT, lng2 FLOAT)
RETURNS FLOAT AS $$
BEGIN
    RETURN ST_Distance(
        ST_MakePoint(lng1, lat1)::geography,
        ST_MakePoint(lng2, lat2)::geography
    ) / 1000; -- Convert meters to kilometers
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to search listings by location and filters
CREATE OR REPLACE FUNCTION search_listings(
    p_user_lat FLOAT DEFAULT NULL,
    p_user_lng FLOAT DEFAULT NULL,
    p_radius_km INTEGER DEFAULT 50,
    p_club_types club_type[] DEFAULT NULL,
    p_price_min DECIMAL DEFAULT NULL,
    p_price_max DECIMAL DEFAULT NULL,
    p_handedness handedness DEFAULT NULL,
    p_flex flex[] DEFAULT NULL,
    p_instant_booking BOOLEAN DEFAULT NULL,
    p_delivery_available BOOLEAN DEFAULT NULL,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    listing_id UUID,
    distance_km FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        l.id,
        CASE
            WHEN p_user_lat IS NOT NULL AND p_user_lng IS NOT NULL THEN
                ST_Distance(
                    l.location,
                    ST_MakePoint(p_user_lng, p_user_lat)::geography
                ) / 1000
            ELSE NULL
        END AS distance_km
    FROM listings l
    WHERE l.is_active = true
        AND l.is_draft = false
        AND (p_club_types IS NULL OR l.club_type = ANY(p_club_types))
        AND (p_price_min IS NULL OR l.daily_rate >= p_price_min)
        AND (p_price_max IS NULL OR l.daily_rate <= p_price_max)
        AND (p_handedness IS NULL OR l.handedness = p_handedness)
        AND (p_flex IS NULL OR l.flex = ANY(p_flex))
        AND (p_instant_booking IS NULL OR l.instant_booking = p_instant_booking)
        AND (p_delivery_available IS NULL OR l.delivery_available = p_delivery_available)
        AND (
            p_user_lat IS NULL OR p_user_lng IS NULL OR
            ST_DWithin(
                l.location,
                ST_MakePoint(p_user_lng, p_user_lat)::geography,
                p_radius_km * 1000
            )
        )
        AND (
            p_start_date IS NULL OR p_end_date IS NULL OR
            NOT EXISTS (
                SELECT 1 FROM bookings b
                WHERE b.listing_id = l.id
                AND b.status IN ('confirmed', 'in_progress')
                AND (
                    (b.start_date <= p_end_date AND b.end_date >= p_start_date)
                )
            )
        )
    ORDER BY distance_km NULLS LAST
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- SEED DATA - Sample Golf Courses in Canada
-- ============================================================================

INSERT INTO golf_courses (name, address, city, province, postal_code, location, phone) VALUES
('St. George''s Golf and Country Club', '1668 Islington Ave', 'Toronto', 'ON', 'M9A 3N8', ST_SetSRID(ST_MakePoint(-79.5400, 43.6532), 4326)::geography, '416-231-4181'),
('Hamilton Golf and Country Club', '232 Golf Links Rd', 'Ancaster', 'ON', 'L9G 2N8', ST_SetSRID(ST_MakePoint(-79.9500, 43.2167), 4326)::geography, '905-648-4471'),
('The National Golf Club of Canada', '134 Hwy 6', 'Woodbridge', 'ON', 'L4H 2S4', ST_SetSRID(ST_MakePoint(-79.5833, 43.8000), 4326)::geography, '905-832-7788'),
('Cabot Links', '1 Cabot Dr', 'Inverness', 'NS', 'B0E 1N0', ST_SetSRID(ST_MakePoint(-61.0700, 46.1900), 4326)::geography, '902-258-4653'),
('Cabot Cliffs', '1 Cabot Dr', 'Inverness', 'NS', 'B0E 1N0', ST_SetSRID(ST_MakePoint(-61.0700, 46.1900), 4326)::geography, '902-258-4653'),
('Banff Springs Golf Course', '405 Spray Ave', 'Banff', 'AB', 'T1L 1J4', ST_SetSRID(ST_MakePoint(-115.5733, 51.1533), 4326)::geography, '403-762-6801'),
('Jasper Park Lodge Golf Club', '1 Old Lodge Rd', 'Jasper', 'AB', 'T0E 1E0', ST_SetSRID(ST_MakePoint(-118.0500, 52.8833), 4326)::geography, '780-852-6090'),
('Shaughnessy Golf and Country Club', '4300 S W Marine Dr', 'Vancouver', 'BC', 'V6N 4A3', ST_SetSRID(ST_MakePoint(-123.2100, 49.2333), 4326)::geography, '604-266-4141'),
('Capilano Golf and Country Club', '420 Southborough Ave', 'West Vancouver', 'BC', 'V7S 1M2', ST_SetSRID(ST_MakePoint(-123.1500, 49.3333), 4326)::geography, '604-922-9331'),
('Royal Montreal Golf Club', '40 Chemin South Ridge', 'Île-Bizard', 'QC', 'H9C 1E8', ST_SetSRID(ST_MakePoint(-73.9000, 45.5167), 4326)::geography, '514-626-3639');

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE profiles IS 'User profiles extending Supabase auth.users';
COMMENT ON TABLE golf_courses IS 'Directory of golf courses across Canada';
COMMENT ON TABLE listings IS 'Equipment listings created by owners';
COMMENT ON TABLE bookings IS 'Rental bookings and transactions';
COMMENT ON TABLE messages IS 'Real-time chat messages between users';
COMMENT ON TABLE reviews IS 'Reviews and ratings for listings and renters';
COMMENT ON TABLE disputes IS 'Dispute resolution system for booking issues';

COMMENT ON FUNCTION search_listings IS 'Advanced search function with geospatial filtering and availability checking';
COMMENT ON FUNCTION calculate_distance IS 'Calculate distance in kilometers between two lat/lng coordinates';
