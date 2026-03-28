import { Image } from "expo-image";
import {
  Bell,
  Calendar,
  ChevronRight,
  CreditCard,
  Heart,
  HelpCircle,
  LogOut,
  MapPin,
  MessageCircle,
  Settings,
  Shield,
  Star,
  User,
} from "lucide-react-native";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import Colors from "@/constants/colors";

const currentUser = {
  id: "1",
  firstName: "Alex",
  lastName: "Johnson",
  avatar: "https://i.pravatar.cc/150?img=68",
  rating: 4.9,
  reviewCount: 24,
  verified: { email: true, phone: true, id: true, payment: true },
  joinedDate: "2024-01-15",
  location: "Toronto, ON",
};

export default function ProfileScreen() {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.profileInfo}>
          <Image
            source={{ uri: currentUser.avatar }}
            style={styles.avatar}
            contentFit="cover"
          />
          <View style={styles.profileText}>
            <Text style={styles.name}>
              {currentUser.firstName} {currentUser.lastName}
            </Text>
            <View style={styles.ratingRow}>
              <Star size={16} color={Colors.gold} fill={Colors.gold} />
              <Text style={styles.rating}>{currentUser.rating.toFixed(1)}</Text>
              <Text style={styles.reviewCount}>
                ({currentUser.reviewCount} reviews)
              </Text>
            </View>
            <View style={styles.locationRow}>
              <MapPin size={14} color={Colors.textLight} />
              <Text style={styles.location}>{currentUser.location}</Text>
            </View>
          </View>
        </View>

        <View style={styles.verificationRow}>
          {currentUser.verified.email && (
            <VerificationBadge icon={<Shield size={14} color={Colors.verified} />} label="Email" />
          )}
          {currentUser.verified.phone && (
            <VerificationBadge icon={<Shield size={14} color={Colors.verified} />} label="Phone" />
          )}
          {currentUser.verified.id && (
            <VerificationBadge icon={<Shield size={14} color={Colors.verified} />} label="ID" />
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Rentals</Text>
        <MenuItem
          icon={<Calendar size={20} color={Colors.primary} />}
          title="Your Bookings"
          subtitle="View and manage your rentals"
          onPress={() => console.log("Bookings")}
        />
        <MenuItem
          icon={<Heart size={20} color={Colors.primary} />}
          title="Favorites"
          subtitle="Your saved listings"
          onPress={() => console.log("Favorites")}
        />
        <MenuItem
          icon={<MessageCircle size={20} color={Colors.primary} />}
          title="Messages"
          subtitle="Chat with owners and renters"
          badge="2"
          onPress={() => console.log("Messages")}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Listings</Text>
        <MenuItem
          icon={<User size={20} color={Colors.primary} />}
          title="Manage Listings"
          subtitle="Edit your club listings"
          onPress={() => console.log("Manage Listings")}
        />
        <MenuItem
          icon={<Calendar size={20} color={Colors.primary} />}
          title="Booking Requests"
          subtitle="Review incoming requests"
          onPress={() => console.log("Booking Requests")}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <MenuItem
          icon={<Settings size={20} color={Colors.primary} />}
          title="Settings"
          subtitle="Account preferences"
          onPress={() => console.log("Settings")}
        />
        <MenuItem
          icon={<CreditCard size={20} color={Colors.primary} />}
          title="Payment Methods"
          subtitle="Manage cards and payouts"
          onPress={() => console.log("Payment Methods")}
        />
        <MenuItem
          icon={<Bell size={20} color={Colors.primary} />}
          title="Notifications"
          subtitle="Push, email, and SMS"
          onPress={() => console.log("Notifications")}
        />
        <MenuItem
          icon={<Shield size={20} color={Colors.primary} />}
          title="Verification"
          subtitle="Complete your profile"
          onPress={() => console.log("Verification")}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        <MenuItem
          icon={<HelpCircle size={20} color={Colors.primary} />}
          title="Help Center"
          subtitle="FAQs and support articles"
          onPress={() => console.log("Help Center")}
        />
        <MenuItem
          icon={<MessageCircle size={20} color={Colors.primary} />}
          title="Contact Us"
          subtitle="Get in touch with ClubSwap"
          onPress={() => console.log("Contact Us")}
        />
      </View>

      <Pressable style={styles.logoutButton}>
        <LogOut size={20} color={Colors.error} />
        <Text style={styles.logoutText}>Log Out</Text>
      </Pressable>

      <View style={styles.footer}>
        <Text style={styles.footerText}>ClubSwap v1.0.0</Text>
        <Text style={styles.footerText}>Member since Jan 2024</Text>
      </View>
    </ScrollView>
  );
}

function VerificationBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <View style={styles.verificationBadge}>
      {icon}
      <Text style={styles.verificationText}>{label}</Text>
    </View>
  );
}

function MenuItem({
  icon,
  title,
  subtitle,
  badge,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  badge?: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuIcon}>{icon}</View>
      <View style={styles.menuContent}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuSubtitle}>{subtitle}</Text>
      </View>
      {badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
      <ChevronRight size={20} color={Colors.textLight} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  header: {
    backgroundColor: Colors.background,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  profileInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  profileText: {
    flex: 1,
  },
  name: {
    fontSize: 24,
    fontWeight: "800" as const,
    color: Colors.text,
    marginBottom: 6,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  rating: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  reviewCount: {
    fontSize: 14,
    color: Colors.textLight,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  location: {
    fontSize: 14,
    color: Colors.textLight,
  },
  verificationRow: {
    flexDirection: "row",
    gap: 8,
  },
  verificationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.surface,
    borderRadius: 16,
  },
  verificationText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.verified,
  },
  section: {
    marginTop: 24,
    backgroundColor: Colors.background,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: Colors.textLight,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.error,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: Colors.background,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 20,
    marginTop: 32,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: 12,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.error,
  },
  footer: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 4,
  },
  footerText: {
    fontSize: 12,
    color: Colors.textLight,
  },
});
