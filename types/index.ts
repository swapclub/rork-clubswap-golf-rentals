export type ClubType = "driver" | "fairway-wood" | "hybrid" | "iron-set" | "wedge-set" | "putter" | "complete-set";

export type Handedness = "right" | "left";

export type Flex = "extra-stiff" | "stiff" | "regular" | "senior" | "ladies";

export type ConditionType = "excellent" | "very-good" | "good" | "fair";

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  rating: number;
  reviewCount: number;
  verified: {
    email: boolean;
    phone: boolean;
    id: boolean;
    payment: boolean;
  };
  joinedDate: string;
  location: string;
}

export interface Location {
  id: string;
  name: string;
  address: string;
  city: string;
  province: string;
  lat: number;
  lng: number;
  distance?: number;
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  clubType: ClubType;
  brand: string;
  model?: string;
  year?: number;
  handedness: Handedness;
  flex?: Flex;
  condition: ConditionType;
  photos: string[];
  pricing: {
    daily: number;
    weekly?: number;
    deposit: number;
  };
  location: Location;
  owner: User;
  rating: number;
  reviewCount: number;
  features: {
    instantBooking: boolean;
    deliveryAvailable: boolean;
    bagIncluded: boolean;
  };
  availability: {
    minDays: number;
    maxDays: number;
    advanceNotice: number;
  };
  whatsIncluded: string[];
  createdAt: string;
  isFavorite?: boolean;
}

export interface SearchFilters {
  location?: string;
  radius?: number;
  clubType?: ClubType[];
  priceMin?: number;
  priceMax?: number;
  handedness?: Handedness;
  flex?: Flex[];
  instantBooking?: boolean;
  deliveryAvailable?: boolean;
  sortBy?: "distance" | "price-low" | "price-high" | "rating" | "newest";
}
