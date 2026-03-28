import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  Calendar,
  Check,
  ChevronLeft,
  Heart,
  MapPin,
  Shield,
  Star,
  Truck,
  User,
  Zap,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Dimensions,
} from "react-native";

import Colors from "@/constants/colors";
import { mockListings, conditionLabels, flexLabels } from "@/mocks/listings";


const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const listing = mockListings.find((l) => l.id === id);
  const [isFavorite, setIsFavorite] = useState(listing?.isFavorite || false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  if (!listing) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Listing not found</Text>
      </View>
    );
  }

  const handleBook = () => {
    console.log("Book listing:", id);
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <View style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.imageSection}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                setCurrentImageIndex(index);
              }}
              scrollEventThrottle={16}
            >
              {listing.photos.map((photo, index) => (
                <Image
                  key={index}
                  source={{ uri: photo }}
                  style={styles.photo}
                  contentFit="cover"
                />
              ))}
            </ScrollView>

            <View style={styles.imageOverlay}>
              <Pressable style={styles.backButton} onPress={() => router.back()}>
                <ChevronLeft size={24} color={Colors.text} />
              </Pressable>
              <Pressable
                style={styles.favoriteButton}
                onPress={() => setIsFavorite(!isFavorite)}
              >
                <Heart
                  size={24}
                  color={isFavorite ? Colors.error : Colors.text}
                  fill={isFavorite ? Colors.error : "transparent"}
                />
              </Pressable>
            </View>

            <View style={styles.imageIndicator}>
              {listing.photos.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    index === currentImageIndex && styles.dotActive,
                  ]}
                />
              ))}
            </View>
          </View>

          <View style={styles.content}>
            <View style={styles.titleSection}>
              <View style={styles.titleRow}>
                <Text style={styles.title}>{listing.title}</Text>
                {listing.features.instantBooking && (
                  <View style={styles.instantBadge}>
                    <Zap size={16} color={Colors.primary} fill={Colors.primary} />
                  </View>
                )}
              </View>
              <View style={styles.ratingRow}>
                <Star size={16} color={Colors.gold} fill={Colors.gold} />
                <Text style={styles.ratingText}>{listing.rating.toFixed(1)}</Text>
                <Text style={styles.reviewCount}>
                  ({listing.reviewCount} reviews)
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.ownerSection}>
              <View style={styles.ownerLeft}>
                <Image
                  source={{ uri: listing.owner.avatar }}
                  style={styles.ownerAvatar}
                  contentFit="cover"
                />
                <View>
                  <Text style={styles.ownerName}>
                    {listing.owner.firstName} {listing.owner.lastName[0]}.
                  </Text>
                  <View style={styles.ownerVerification}>
                    {listing.owner.verified.id && (
                      <View style={styles.verifiedBadge}>
                        <Shield size={12} color={Colors.verified} />
                        <Text style={styles.verifiedText}>ID Verified</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
              <Pressable style={styles.ownerButton}>
                <User size={18} color={Colors.primary} />
                <Text style={styles.ownerButtonText}>View Profile</Text>
              </Pressable>
            </View>

            <View style={styles.divider} />

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Specifications</Text>
              <View style={styles.specGrid}>
                <SpecItem label="Brand" value={listing.brand} />
                {listing.model && <SpecItem label="Model" value={listing.model} />}
                {listing.year && <SpecItem label="Year" value={listing.year.toString()} />}
                <SpecItem
                  label="Handedness"
                  value={listing.handedness === "right" ? "Right-Handed" : "Left-Handed"}
                />
                {listing.flex && (
                  <SpecItem label="Flex" value={flexLabels[listing.flex]} />
                )}
                <SpecItem label="Condition" value={conditionLabels[listing.condition]} />
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{listing.description}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>What's Included</Text>
              {listing.whatsIncluded.map((item, index) => (
                <View key={index} style={styles.includedItem}>
                  <Check size={18} color={Colors.success} />
                  <Text style={styles.includedText}>{item}</Text>
                </View>
              ))}
            </View>

            <View style={styles.divider} />

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Features</Text>
              <View style={styles.featuresGrid}>
                {listing.features.instantBooking && (
                  <FeatureCard
                    icon={<Zap size={20} color={Colors.primary} />}
                    title="Instant Booking"
                    description="Book immediately without waiting for approval"
                  />
                )}
                {listing.features.deliveryAvailable && (
                  <FeatureCard
                    icon={<Truck size={20} color={Colors.primary} />}
                    title="Delivery Available"
                    description="Owner can deliver to your location"
                  />
                )}
                <FeatureCard
                  icon={<Shield size={20} color={Colors.primary} />}
                  title="Protected Rental"
                  description="$100K damage protection included"
                />
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Location</Text>
              <View style={styles.locationCard}>
                <MapPin size={20} color={Colors.primary} />
                <View style={styles.locationInfo}>
                  <Text style={styles.locationName}>{listing.location.name}</Text>
                  <Text style={styles.locationAddress}>
                    {listing.location.city}, {listing.location.province}
                  </Text>
                  {listing.location.distance && (
                    <Text style={styles.locationDistance}>
                      {listing.location.distance} km away
                    </Text>
                  )}
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Availability</Text>
              <View style={styles.availabilityCard}>
                <Calendar size={20} color={Colors.primary} />
                <View style={styles.availabilityInfo}>
                  <Text style={styles.availabilityText}>
                    Min: {listing.availability.minDays} day
                    {listing.availability.minDays > 1 ? "s" : ""} • Max:{" "}
                    {listing.availability.maxDays} days
                  </Text>
                  <Text style={styles.availabilitySubtext}>
                    Book {listing.availability.advanceNotice}h in advance
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.bottomSpacer} />
          </View>
        </ScrollView>

        <View style={styles.bottomBar}>
          <View style={styles.priceSection}>
            <View style={styles.priceRow}>
              <Text style={styles.priceAmount}>${listing.pricing.daily}</Text>
              <Text style={styles.priceLabel}>/day</Text>
            </View>
            {listing.pricing.weekly && (
              <Text style={styles.weeklyPrice}>
                ${listing.pricing.weekly}/week (save $
                {listing.pricing.daily * 7 - listing.pricing.weekly})
              </Text>
            )}
          </View>
          <Pressable style={styles.bookButton} onPress={handleBook}>
            <Text style={styles.bookButtonText}>
              {listing.features.instantBooking ? "Book Now" : "Request to Book"}
            </Text>
          </Pressable>
        </View>
      </View>
    </>
  );
}

function SpecItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.specItem}>
      <Text style={styles.specLabel}>{label}</Text>
      <Text style={styles.specValue}>{value}</Text>
    </View>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.featureCard}>
      <View style={styles.featureIcon}>{icon}</View>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDescription}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 18,
    color: Colors.textSecondary,
  },
  imageSection: {
    position: "relative",
    height: 400,
  },
  photo: {
    width: SCREEN_WIDTH,
    height: 400,
  },
  imageOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.select({ ios: 60, android: 50, web: 20 }),
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  favoriteButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  imageIndicator: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  dotActive: {
    backgroundColor: Colors.background,
    width: 20,
  },
  content: {
    paddingHorizontal: 20,
  },
  titleSection: {
    paddingTop: 24,
    paddingBottom: 20,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  title: {
    flex: 1,
    fontSize: 28,
    fontWeight: "800" as const,
    color: Colors.text,
  },
  instantBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  reviewCount: {
    fontSize: 16,
    color: Colors.textLight,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: 24,
  },
  ownerSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ownerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  ownerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  ownerName: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: 4,
  },
  ownerVerification: {
    flexDirection: "row",
    gap: 8,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  verifiedText: {
    fontSize: 12,
    color: Colors.verified,
    fontWeight: "600" as const,
  },
  ownerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  ownerButtonText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.primary,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: 16,
  },
  specGrid: {
    gap: 16,
  },
  specItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  specLabel: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  specValue: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.textSecondary,
  },
  includedItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  includedText: {
    fontSize: 16,
    color: Colors.text,
  },
  featuresGrid: {
    gap: 16,
  },
  featureCard: {
    padding: 16,
    backgroundColor: Colors.surface,
    borderRadius: 12,
  },
  featureIcon: {
    marginBottom: 12,
    alignItems: "flex-start" as const,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  locationCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    backgroundColor: Colors.surface,
    borderRadius: 12,
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  locationDistance: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: "600" as const,
  },
  availabilityCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    backgroundColor: Colors.surface,
    borderRadius: 12,
  },
  availabilityInfo: {
    flex: 1,
  },
  availabilityText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
    marginBottom: 4,
  },
  availabilitySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  bottomSpacer: {
    height: 100,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    ...Platform.select({
      ios: {
        paddingBottom: 32,
      },
      android: {
        paddingBottom: 16,
      },
    }),
  },
  priceSection: {
    flex: 1,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    marginBottom: 4,
  },
  priceAmount: {
    fontSize: 28,
    fontWeight: "800" as const,
    color: Colors.primary,
  },
  priceLabel: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  weeklyPrice: {
    fontSize: 12,
    color: Colors.textLight,
  },
  bookButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    backgroundColor: Colors.primary,
    borderRadius: 12,
  },
  bookButtonText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.background,
  },
});
