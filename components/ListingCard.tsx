import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Heart, MapPin, Star, Zap } from "lucide-react-native";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View, Platform } from "react-native";

import Colors from "@/constants/colors";
import { Listing } from "@/types";

interface ListingCardProps {
  listing: Listing;
  onToggleFavorite?: (id: string) => void;
}

export default function ListingCard({ listing, onToggleFavorite }: ListingCardProps) {
  const router = useRouter();
  const [isFavorite, setIsFavorite] = useState(listing.isFavorite || false);

  const handleFavoritePress = () => {
    setIsFavorite(!isFavorite);
    onToggleFavorite?.(listing.id);
  };

  const handlePress = () => {
    router.push(`/listing/${listing.id}` as any);
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        pressed && Platform.OS !== 'web' && styles.pressed,
      ]}
      onPress={handlePress}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: listing.photos[0] }}
          style={styles.image}
          contentFit="cover"
          transition={200}
        />
        <Pressable
          style={styles.favoriteButton}
          onPress={handleFavoritePress}
        >
          <Heart
            size={20}
            color={isFavorite ? Colors.error : Colors.text}
            fill={isFavorite ? Colors.error : "transparent"}
            strokeWidth={2}
          />
        </Pressable>
        {listing.features.instantBooking && (
          <View style={styles.instantBadge}>
            <Zap size={12} color={Colors.primary} fill={Colors.primary} />
            <Text style={styles.instantText}>Instant</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.ratingContainer}>
              <Star size={14} color={Colors.gold} fill={Colors.gold} />
              <Text style={styles.rating}>{listing.rating.toFixed(1)}</Text>
              <Text style={styles.reviewCount}>({listing.reviewCount})</Text>
            </View>
          </View>
          {listing.location.distance && (
            <View style={styles.distanceContainer}>
              <MapPin size={12} color={Colors.textLight} />
              <Text style={styles.distance}>{listing.location.distance} km</Text>
            </View>
          )}
        </View>

        <Text style={styles.title} numberOfLines={1}>
          {listing.title}
        </Text>

        <View style={styles.specs}>
          <Text style={styles.specText}>{listing.brand}</Text>
          <Text style={styles.specDivider}>•</Text>
          <Text style={styles.specText}>{listing.handedness === "right" ? "RH" : "LH"}</Text>
          {listing.flex && (
            <>
              <Text style={styles.specDivider}>•</Text>
              <Text style={styles.specText}>{listing.flex}</Text>
            </>
          )}
        </View>

        <View style={styles.footer}>
          <View style={styles.priceContainer}>
            <Text style={styles.price}>${listing.pricing.daily}</Text>
            <Text style={styles.priceLabel}>/day</Text>
          </View>
          {listing.features.deliveryAvailable && (
            <View style={styles.deliveryBadge}>
              <Text style={styles.deliveryText}>Delivery</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      },
    }),
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  imageContainer: {
    position: "relative",
    width: "100%",
    height: 220,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  favoriteButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  instantBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  instantText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.primary,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  headerLeft: {
    flex: 1,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  rating: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  reviewCount: {
    fontSize: 14,
    color: Colors.textLight,
  },
  distanceContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  distance: {
    fontSize: 12,
    color: Colors.textLight,
  },
  title: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: 6,
  },
  specs: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  specText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  specDivider: {
    fontSize: 14,
    color: Colors.textLight,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  price: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: Colors.primary,
  },
  priceLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  deliveryBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deliveryText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.background,
  },
});
