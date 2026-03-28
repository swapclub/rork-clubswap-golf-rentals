import { LinearGradient } from "expo-linear-gradient";
import { MapPin, Search, SlidersHorizontal } from "lucide-react-native";
import React, { useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ListingCard from "@/components/ListingCard";
import Colors from "@/constants/colors";
import { mockListings } from "@/mocks/listings";
import { ClubType, Listing } from "@/types";

const CLUB_TYPES: { key: ClubType; label: string }[] = [
  { key: "complete-set", label: "Complete Sets" },
  { key: "driver", label: "Drivers" },
  { key: "iron-set", label: "Iron Sets" },
  { key: "fairway-wood", label: "Fairway Woods" },
  { key: "hybrid", label: "Hybrids" },
  { key: "putter", label: "Putters" },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<ClubType | null>(null);
  const [listings, setListings] = useState<Listing[]>(mockListings);

  const filteredListings = listings.filter((listing) => {
    const matchesSearch =
      !searchQuery ||
      listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listing.brand.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = !selectedType || listing.clubType === selectedType;
    return matchesSearch && matchesType;
  });

  const handleToggleFavorite = (id: string) => {
    setListings((prev) =>
      prev.map((listing) =>
        listing.id === id ? { ...listing, isFavorite: !listing.isFavorite } : listing
      )
    );
  };

  const handleFilterPress = () => {
    console.log("Open filters");
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.primary, Colors.primaryDark]}
        style={[styles.headerGradient, { paddingTop: Platform.OS === "web" ? 20 : insets.top + 10 }]}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>ClubSwap</Text>
          <Text style={styles.headerSubtitle}>Rent premium golf clubs nearby</Text>
        </View>

        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Search size={20} color={Colors.textLight} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search clubs, brands, courses..."
              placeholderTextColor={Colors.textLight}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <Pressable style={styles.filterButton} onPress={handleFilterPress}>
            <SlidersHorizontal size={20} color={Colors.background} />
          </Pressable>
        </View>

        <View style={styles.locationBar}>
          <MapPin size={16} color={Colors.background} />
          <Text style={styles.locationText}>Toronto, ON</Text>
          <Text style={styles.locationRange}>• Within 25 km</Text>
        </View>
      </LinearGradient>

      <FlatList
        data={filteredListings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScroll}
            >
              <Pressable
                style={[styles.categoryChip, !selectedType && styles.categoryChipActive]}
                onPress={() => setSelectedType(null)}
              >
                <Text
                  style={[
                    styles.categoryText,
                    !selectedType && styles.categoryTextActive,
                  ]}
                >
                  All
                </Text>
              </Pressable>
              {CLUB_TYPES.map((type) => (
                <Pressable
                  key={type.key}
                  style={[
                    styles.categoryChip,
                    selectedType === type.key && styles.categoryChipActive,
                  ]}
                  onPress={() => setSelectedType(type.key)}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      selectedType === type.key && styles.categoryTextActive,
                    ]}
                  >
                    {type.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.resultsHeader}>
              <Text style={styles.resultsCount}>
                {filteredListings.length} {filteredListings.length === 1 ? "club" : "clubs"}{" "}
                available
              </Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <ListingCard listing={item} onToggleFavorite={handleToggleFavorite} />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No clubs found</Text>
            <Text style={styles.emptyText}>
              Try adjusting your search or filters
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  headerGradient: {
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "800" as const,
    color: Colors.background,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.9)",
  },
  searchSection: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
  },
  filterButton: {
    width: 50,
    height: 50,
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  locationBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  locationText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.background,
  },
  locationRange: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
  },
  categoryScroll: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 10,
  },
  categoryChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  categoryTextActive: {
    color: Colors.background,
  },
  resultsHeader: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  resultsCount: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
});
