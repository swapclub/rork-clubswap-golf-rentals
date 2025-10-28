# ClubSwap - Golf Equipment Rental Platform

ClubSwap is a mobile-first, cross-platform golf equipment rental marketplace built with React Native (Expo), Supabase, and Stripe Connect. It allows golf enthusiasts across Canada to rent and list golf equipment easily and securely.

## 🏗️ Tech Stack

### Frontend
- **React Native 0.81.5** - Cross-platform mobile framework
- **Expo 54** - Development tooling and native modules
- **TypeScript** - Type-safe development
- **tRPC** - End-to-end typesafe APIs
- **React Query** - Data fetching and caching
- **Zustand** - State management
- **NativeWind** - TailwindCSS for React Native

### Backend
- **Hono** - Fast HTTP framework
- **tRPC** - Type-safe API layer
- **Supabase** - PostgreSQL database with real-time capabilities
- **PostGIS** - Geospatial queries for location-based search

### Services & Integrations
- **Stripe Connect** - Payment processing and payouts
- **Twilio Verify** - SMS verification
- **SendGrid/Resend** - Transactional emails
- **Cloudinary** - Image uploads and optimization
- **Mapbox** - Maps and geolocation
- **Firebase Cloud Messaging** - Push notifications
- **Sentry** - Error tracking and monitoring

## 🚀 Features

### User Authentication
- Email/password authentication
- Google Sign-In
- Apple Sign-In
- Phone verification via SMS
- Multi-level verification system

### Listings
- Create and manage equipment listings
- Rich search and filtering
- Geolocation-based discovery
- Instant booking or request-to-book
- Calendar availability management
- Photo uploads with Cloudinary

### Bookings
- Secure payment processing via Stripe
- Security deposit holds
- Automated payout to owners
- Flexible cancellation policies
- Booking status tracking
- Email and SMS notifications

### Messaging
- Real-time chat between renters and owners
- Conversation management
- Pre-booking inquiry protection
- Read receipts
- Image sharing

### Reviews & Ratings
- Double-blind review system
- Rating categories for listings and renters
- Owner response capability
- Review moderation

### User Profiles
- Verification levels (email, phone, ID, payment)
- Rating and review history
- Stripe Connect payout accounts
- Notification preferences

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **Bun** (recommended) or npm
- **Expo CLI**: `npm install -g expo-cli`
- **iOS Simulator** (Mac only) or **Android Studio** for Android emulator
- **Git**

## 🔧 Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/swapclub/rork-clubswap-golf-rentals.git
cd rork-clubswap-golf-rentals
```

### 2. Install Dependencies

```bash
bun install
# or
npm install
```

### 3. Set Up Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Fill in all the required API keys and configuration values in `.env`:

#### Required Services

1. **Supabase** (Database & Auth)
   - Create a project at [supabase.com](https://supabase.com)
   - Get your URL and anon key from Project Settings > API
   - Run the schema: Execute `supabase/schema.sql` in the SQL editor

2. **Stripe** (Payments)
   - Create an account at [stripe.com](https://stripe.com)
   - Get API keys from Dashboard > Developers > API keys
   - Set up Stripe Connect for marketplace payments

3. **Twilio** (SMS)
   - Create account at [twilio.com](https://twilio.com)
   - Set up Twilio Verify service
   - Get Account SID, Auth Token, and Verify Service SID

4. **Cloudinary** (Images)
   - Create account at [cloudinary.com](https://cloudinary.com)
   - Get Cloud Name, API Key, and API Secret
   - Create an upload preset named `clubswap_listings`

5. **SendGrid or Resend** (Emails)
   - Create account at [sendgrid.com](https://sendgrid.com) or [resend.com](https://resend.com)
   - Get API key and configure sender email

6. **Firebase** (Push Notifications)
   - Create project at [console.firebase.google.com](https://console.firebase.google.com)
   - Download service account JSON
   - Add FCM configuration to your Expo app

### 4. Set Up Supabase Database

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase/schema.sql`
4. Execute the script to create all tables, functions, and RLS policies

This will create:
- All database tables
- Row-level security policies
- PostGIS extension for geospatial queries
- Helper functions for search and distance calculation
- Seed data with 10 Canadian golf courses

### 5. Configure Stripe Connect

1. Enable Stripe Connect in your Stripe Dashboard
2. Set up your platform profile
3. Configure Connect settings for Canada (CAD currency)
4. Add your Connect client ID to `.env`

### 6. Run the Application

Start the development server:

```bash
bun run start
# or
npm run start
```

For web development:

```bash
bun run start-web
```

## 📱 Running on Devices

### iOS (Mac only)

```bash
# Press 'i' in the Expo terminal to open iOS simulator
```

### Android

```bash
# Press 'a' in the Expo terminal to open Android emulator
```

### Physical Device

1. Install Expo Go app on your device
2. Scan the QR code shown in the terminal

## 🏗️ Project Structure

```
clubswap/
├── app/                      # Expo Router screens
│   ├── (tabs)/              # Tab navigation screens
│   │   ├── home.tsx         # Browse listings
│   │   ├── favorites.tsx    # Saved favorites
│   │   └── profile.tsx      # User profile
│   └── listing/
│       └── [id].tsx         # Listing detail page
├── backend/                  # Backend API
│   ├── hono.ts              # Hono HTTP server
│   └── trpc/                # tRPC routes
│       ├── routes/
│       │   ├── listings/    # Listing endpoints
│       │   ├── bookings/    # Booking endpoints
│       │   ├── auth/        # Authentication
│       │   ├── messages/    # Messaging
│       │   └── reviews/     # Reviews & ratings
│       ├── app-router.ts    # Main router
│       └── create-context.ts # tRPC context
├── components/               # Reusable components
├── constants/                # App constants
├── lib/                      # Utility libraries
│   ├── supabase.ts          # Supabase client
│   └── trpc.ts              # tRPC client
├── services/                 # External service integrations
│   ├── stripe.ts            # Stripe payments
│   ├── sms.ts               # Twilio SMS
│   ├── email.ts             # Email service
│   └── cloudinary.ts        # Image uploads
├── supabase/                 # Database
│   └── schema.sql           # Database schema
├── types/                    # TypeScript types
│   ├── index.ts             # App types
│   └── database.ts          # Supabase types
└── mocks/                    # Mock data for development
```

## 🔐 Security

### Row-Level Security (RLS)

All Supabase tables are protected with RLS policies:
- Users can only access their own data
- Public data is read-only
- Listings visible to all when active
- Bookings only visible to involved parties
- Messages only visible to sender/recipient

### Authentication

- JWT-based authentication via Supabase
- Secure token storage with AsyncStorage
- Protected API routes with tRPC middleware
- Password requirements enforced

### Payment Security

- PCI-compliant payment processing via Stripe
- No credit card data stored locally
- Stripe Radar fraud detection
- 3D Secure for high-value transactions

## 🧪 Testing

```bash
# Run tests (when implemented)
bun test
```

## 📦 Building for Production

### iOS

```bash
eas build --platform ios
```

### Android

```bash
eas build --platform android
```

### Web

```bash
bun run build
```

## 🚢 Deployment

### Backend API

The backend can be deployed to:
- Vercel
- Cloudflare Workers
- AWS Lambda
- Any Node.js hosting platform

### Frontend

- **iOS**: Submit to App Store via EAS Submit
- **Android**: Submit to Google Play via EAS Submit
- **Web**: Deploy to Vercel, Netlify, or Cloudflare Pages

## 📚 API Documentation

### tRPC Endpoints

#### Listings
- `listings.search` - Search and filter listings
- `listings.getById` - Get listing by ID
- `listings.create` - Create new listing
- `listings.update` - Update listing
- `listings.delete` - Delete listing
- `listings.getMyListings` - Get user's listings
- `listings.toggleFavorite` - Add/remove favorite
- `listings.getFavorites` - Get user's favorites

#### Bookings
- `bookings.create` - Create booking
- `bookings.getById` - Get booking details
- `bookings.getMyBookings` - Get user's bookings
- `bookings.approve` - Approve booking request
- `bookings.decline` - Decline booking request
- `bookings.cancel` - Cancel booking
- `bookings.complete` - Mark booking complete

#### Authentication
- `auth.signUp` - Register new user
- `auth.signIn` - Sign in user
- `auth.signOut` - Sign out
- `auth.getSession` - Get current session
- `auth.getProfile` - Get user profile
- `auth.updateProfile` - Update profile
- `auth.sendPhoneVerification` - Send SMS code
- `auth.verifyPhone` - Verify phone number
- `auth.createPayoutAccount` - Set up Stripe Connect
- `auth.getPayoutAccount` - Get payout account status

#### Messages
- `messages.getConversations` - List conversations
- `messages.getConversation` - Get conversation messages
- `messages.send` - Send message
- `messages.markAsRead` - Mark message read
- `messages.getUnreadCount` - Get unread count

#### Reviews
- `reviews.createListingReview` - Review listing
- `reviews.createRenterReview` - Review renter
- `reviews.getListingReviews` - Get listing reviews
- `reviews.getUserReviews` - Get user reviews
- `reviews.respondToReview` - Owner response

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary and confidential.

## 🆘 Support

For support, email support@clubswap.ca or open an issue in the GitHub repository.

## 🙏 Acknowledgments

- Built with [Expo](https://expo.dev)
- Database powered by [Supabase](https://supabase.com)
- Payments by [Stripe](https://stripe.com)
- UI inspired by modern marketplace apps

---

**Made with ⛳ by the ClubSwap Team**
