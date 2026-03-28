import { Heart } from "lucide-react-native";
import React, { useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

import ListingCard from "@/components/ListingCard";
import Colors from "@/constants/colors";
import { mockListings } from "@/mocks/listings";
import { Listing } from "@/types";

export default function FavoritesScreen() {
  const [listings, setListings] = useState<Listing[]>(
    mockListings.filter((l) => l.isFavorite)
  );

  const handleToggleFavorite = (id: string) => {
    setListings((prev) => prev.filter((listing) => listing.id !== id));
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <ListingCard listing={item} onToggleFavorite={handleToggleFavorite} />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Heart size={48} color={Colors.textLight} strokeWidth={1.5} />
            </View>
            <Text style={styles.emptyTitle}>No favorites yet</Text>
            <Text style={styles.emptyText}>
              Tap the heart icon on listings to save them here
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
  listContent: {
    padding: 20,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 80,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: 40,
  },
});
