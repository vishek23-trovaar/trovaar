import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  RefreshControl,
  Animated,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@/lib/auth";
import { api, getToken, API_URL } from "@/lib/api";
import { colors, typography, spacing, radius, shadows, getStatusColor, getCategoryIcon } from "../../lib/theme";

const COLORS = {
  primary: colors.primary,
  primaryDark: colors.primaryDark,
  secondary: colors.text,
  muted: colors.muted,
  surface: colors.surface,
  border: colors.border,
  success: colors.success,
  successLight: "#ecfdf5",
  danger: colors.danger,
  white: colors.white,
  warning: colors.warning,
  warningBg: "#fffbeb",
};

const CATEGORIES = [
  "All",
  "Plumbing",
  "Electrical",
  "HVAC",
  "Painting",
  "Carpentry",
  "Roofing",
  "Landscaping",
  "Cleaning",
  "General Repair",
];

interface PortfolioItem {
  id: string;
  title: string;
  category: string;
  before_photos: string[];
  after_photos: string[];
  description?: string;
  created_at: string;
}

function SkeletonLoader() {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View style={{ padding: 20, opacity }}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={{ backgroundColor: "#e2e8f0", height: 180, borderRadius: 16, marginBottom: 16 }} />
      ))}
    </Animated.View>
  );
}

export default function PortfolioScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showAddForm, setShowAddForm] = useState(false);

  // Add form state
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("General Repair");
  const [newDescription, setNewDescription] = useState("");
  const [beforePhotos, setBeforePhotos] = useState<string[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const fetchPortfolio = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data } = await api<{ portfolio?: PortfolioItem[]; items?: PortfolioItem[] }>(
        `/api/portfolio?contractorId=${user.id}`
      );
      setItems(data.portfolio || data.items || []);
    } catch {
      /* ignore */
    }
    setLoading(false);
    setRefreshing(false);
  }, [user?.id]);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPortfolio();
  };

  const totalPhotos = items.reduce((sum, item) => {
    const before = Array.isArray(item.before_photos) ? item.before_photos.length : 0;
    const after = Array.isArray(item.after_photos) ? item.after_photos.length : 0;
    return sum + before + after;
  }, 0);
  const meetsGate = totalPhotos >= 3;

  const filteredItems =
    selectedCategory === "All"
      ? items
      : items.filter((item) => item.category?.toLowerCase() === selectedCategory.toLowerCase());

  const groupedItems: Record<string, PortfolioItem[]> = {};
  filteredItems.forEach((item) => {
    const cat = item.category || "Other";
    if (!groupedItems[cat]) groupedItems[cat] = [];
    groupedItems[cat].push(item);
  });

  const pickPhotos = async (type: "before" | "after") => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow access to your photo library.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      const uris = result.assets.map((a) => a.uri);
      if (type === "before") {
        setBeforePhotos((prev) => [...prev, ...uris]);
      } else {
        setAfterPhotos((prev) => [...prev, ...uris]);
      }
    }
  };

  const getMimeType = (uri: string): string => {
    const ext = uri.split(".").pop()?.toLowerCase() || "jpg";
    const mimeMap: Record<string, string> = {
      jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif",
      webp: "image/webp", heic: "image/heic", heif: "image/heif", bmp: "image/bmp",
      tiff: "image/tiff", tif: "image/tiff", avif: "image/avif", svg: "image/svg+xml",
      mp4: "video/mp4", mov: "video/quicktime", avi: "video/x-msvideo",
      mkv: "video/x-matroska", webm: "video/webm", wmv: "video/x-ms-wmv",
    };
    return mimeMap[ext] || "image/jpeg";
  };

  const handleSubmit = async () => {
    if (!newTitle.trim()) {
      Alert.alert("Error", "Please enter a project title");
      return;
    }
    if (beforePhotos.length === 0 && afterPhotos.length === 0) {
      Alert.alert("Error", "Please add at least one photo or video");
      return;
    }
    setSubmitting(true);
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append("title", newTitle);
      formData.append("category", newCategory);
      if (newDescription) formData.append("description", newDescription);
      beforePhotos.forEach((uri, i) => {
        const ext = uri.split(".").pop()?.toLowerCase() || "jpg";
        formData.append("before_photos", {
          uri,
          type: getMimeType(uri),
          name: `before_${i}.${ext}`,
        } as any);
      });
      afterPhotos.forEach((uri, i) => {
        const ext = uri.split(".").pop()?.toLowerCase() || "jpg";
        formData.append("after_photos", {
          uri,
          type: getMimeType(uri),
          name: `after_${i}.${ext}`,
        } as any);
      });
      const res = await fetch(`${API_URL}/api/portfolio`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });
      if (!res.ok) {
        // Fall back to JSON upload if multipart is not supported
        await api("/api/portfolio", {
          method: "POST",
          body: JSON.stringify({
            title: newTitle,
            category: newCategory,
            description: newDescription,
            before_photos: beforePhotos,
            after_photos: afterPhotos,
          }),
        });
      }
      Alert.alert("Success", "Portfolio item added!");
      setShowAddForm(false);
      setNewTitle("");
      setNewCategory("General Repair");
      setNewDescription("");
      setBeforePhotos([]);
      setAfterPhotos([]);
      fetchPortfolio();
    } catch (err: unknown) {
      Alert.alert("Error", (err as Error).message);
    }
    setSubmitting(false);
  };

  const removePhoto = (type: "before" | "after", index: number) => {
    if (type === "before") {
      setBeforePhotos((prev) => prev.filter((_, i) => i !== index));
    } else {
      setAfterPhotos((prev) => prev.filter((_, i) => i !== index));
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <SkeletonLoader />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Portfolio</Text>
            <Text style={styles.headerSubtitle}>Showcase your best work</Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddForm(!showAddForm)}
            activeOpacity={0.8}
          >
            <Ionicons name={showAddForm ? "close" : "add"} size={22} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        {/* Portfolio Gate Info */}
        <View style={[styles.gateCard, meetsGate ? styles.gateCardSuccess : styles.gateCardWarning]}>
          <View style={styles.gateCardHeader}>
            <Ionicons
              name={meetsGate ? "checkmark-circle" : "alert-circle"}
              size={22}
              color={meetsGate ? COLORS.success : COLORS.warning}
            />
            <Text style={[styles.gateCardTitle, { color: meetsGate ? COLORS.success : COLORS.warning }]}>
              {totalPhotos} photo{totalPhotos !== 1 ? "s" : ""} uploaded
            </Text>
          </View>
          <Text style={styles.gateCardDesc}>
            {meetsGate
              ? "You meet the minimum requirement to bid on jobs."
              : `You need at least 3 photos to bid on jobs. Add ${3 - totalPhotos} more.`}
          </Text>
        </View>

        {/* Category Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
          style={{ marginBottom: 16 }}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryChip, selectedCategory === cat && styles.categoryChipActive]}
              onPress={() => setSelectedCategory(cat)}
              activeOpacity={0.7}
            >
              <Text style={[styles.categoryChipText, selectedCategory === cat && styles.categoryChipTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Add Form */}
        {showAddForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Add New Project</Text>

            <Text style={styles.label}>Project Title *</Text>
            <TextInput
              style={styles.input}
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="e.g., Kitchen Remodel - Smith Residence"
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.label}>Category</Text>
            <TouchableOpacity
              style={styles.pickerBtn}
              onPress={() => setShowCategoryPicker(!showCategoryPicker)}
              activeOpacity={0.7}
            >
              <Text style={styles.pickerBtnText}>{newCategory}</Text>
              <Ionicons name="chevron-down" size={18} color={COLORS.muted} />
            </TouchableOpacity>
            {showCategoryPicker && (
              <View style={styles.pickerList}>
                {CATEGORIES.filter((c) => c !== "All").map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.pickerItem, cat === newCategory && styles.pickerItemActive]}
                    onPress={() => {
                      setNewCategory(cat);
                      setShowCategoryPicker(false);
                    }}
                  >
                    <Text style={[styles.pickerItemText, cat === newCategory && { color: COLORS.primary, fontWeight: "600" }]}>
                      {cat}
                    </Text>
                    {cat === newCategory && <Ionicons name="checkmark" size={18} color={COLORS.primary} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, { minHeight: 80, textAlignVertical: "top" }]}
              value={newDescription}
              onChangeText={setNewDescription}
              placeholder="Describe the project..."
              placeholderTextColor="#94a3b8"
              multiline
            />

            {/* Before Photos */}
            <Text style={styles.label}>Before Photos</Text>
            <View style={styles.photoRow}>
              {beforePhotos.map((uri, i) => (
                <View key={i} style={styles.photoThumbWrap}>
                  <Image source={{ uri }} style={styles.photoThumb} />
                  <TouchableOpacity style={styles.photoRemoveBtn} onPress={() => removePhoto("before", i)}>
                    <Ionicons name="close-circle" size={20} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={styles.addPhotoBtn} onPress={() => pickPhotos("before")}>
                <Ionicons name="camera-outline" size={24} color={COLORS.muted} />
                <Text style={styles.addPhotoBtnText}>Add</Text>
              </TouchableOpacity>
            </View>

            {/* After Photos */}
            <Text style={styles.label}>After Photos</Text>
            <View style={styles.photoRow}>
              {afterPhotos.map((uri, i) => (
                <View key={i} style={styles.photoThumbWrap}>
                  <Image source={{ uri }} style={styles.photoThumb} />
                  <TouchableOpacity style={styles.photoRemoveBtn} onPress={() => removePhoto("after", i)}>
                    <Ionicons name="close-circle" size={20} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={styles.addPhotoBtn} onPress={() => pickPhotos("after")}>
                <Ionicons name="camera-outline" size={24} color={COLORS.muted} />
                <Text style={styles.addPhotoBtnText}>Add</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={18} color={COLORS.white} />
                  <Text style={styles.submitBtnText}>Add to Portfolio</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Portfolio Items */}
        {items.length === 0 && !showAddForm ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="images-outline" size={48} color="#cbd5e1" />
            </View>
            <Text style={styles.emptyTitle}>Add your first project to showcase your work</Text>
            <Text style={styles.emptySubtitle}>
              Upload before and after photos to build trust with clients and unlock bidding.
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => setShowAddForm(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={20} color={COLORS.white} />
              <Text style={styles.emptyBtnText}>Add Your First Project</Text>
            </TouchableOpacity>
          </View>
        ) : (
          Object.entries(groupedItems).map(([category, categoryItems]) => (
            <View key={category} style={styles.categoryGroup}>
              <View style={styles.categoryGroupHeader}>
                <Text style={styles.categoryGroupTitle}>{category}</Text>
                <View style={styles.categoryGroupBadge}>
                  <Text style={styles.categoryGroupCount}>{categoryItems.length}</Text>
                </View>
              </View>
              {categoryItems.map((item) => {
                const beforeArr = Array.isArray(item.before_photos) ? item.before_photos : [];
                const afterArr = Array.isArray(item.after_photos) ? item.after_photos : [];
                return (
                  <View key={item.id} style={styles.portfolioCard}>
                    <View style={styles.portfolioCardHeader}>
                      <Text style={styles.portfolioCardTitle}>{item.title}</Text>
                      <Text style={styles.portfolioCardDate}>
                        {new Date(item.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </Text>
                    </View>
                    {item.description ? (
                      <Text style={styles.portfolioCardDesc} numberOfLines={2}>
                        {item.description}
                      </Text>
                    ) : null}
                    {/* Before Photos */}
                    {beforeArr.length > 0 && (
                      <View style={styles.photoSection}>
                        <Text style={styles.photoSectionLabel}>Before</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                          {beforeArr.map((url, i) => (
                            <Image key={i} source={{ uri: url }} style={styles.portfolioPhoto} resizeMode="cover" />
                          ))}
                        </ScrollView>
                      </View>
                    )}
                    {/* After Photos */}
                    {afterArr.length > 0 && (
                      <View style={styles.photoSection}>
                        <Text style={styles.photoSectionLabel}>After</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                          {afterArr.map((url, i) => (
                            <Image key={i} source={{ uri: url }} style={styles.portfolioPhoto} resizeMode="cover" />
                          ))}
                        </ScrollView>
                      </View>
                    )}
                    <View style={styles.portfolioCardFooter}>
                      <Ionicons name="images-outline" size={14} color={COLORS.muted} />
                      <Text style={styles.portfolioCardPhotoCount}>
                        {beforeArr.length + afterArr.length} photos
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.surface },
  container: { padding: 20 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerTitle: { fontSize: 28, fontWeight: "800", color: COLORS.secondary },
  headerSubtitle: { fontSize: 14, color: COLORS.muted, marginTop: 2 },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: { shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 6 },
    }),
  },

  // Gate card
  gateCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
  },
  gateCardSuccess: { backgroundColor: COLORS.successLight, borderColor: "#a7f3d0" },
  gateCardWarning: { backgroundColor: COLORS.warningBg, borderColor: "#fde68a" },
  gateCardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  gateCardTitle: { fontSize: 16, fontWeight: "700" },
  gateCardDesc: { fontSize: 14, color: "#475569", lineHeight: 20, marginLeft: 30 },

  // Category filter
  categoryScroll: { gap: 8, paddingRight: 16 },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  categoryChipText: { fontSize: 14, color: COLORS.muted, fontWeight: "500" },
  categoryChipTextActive: { color: COLORS.white, fontWeight: "600" },

  // Form
  formCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.md,
  },
  formTitle: { fontSize: 20, fontWeight: "800", color: COLORS.secondary, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", color: "#334155", marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.secondary,
  },
  pickerBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  pickerBtnText: { fontSize: 16, color: COLORS.secondary },
  pickerList: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    marginTop: 4,
    overflow: "hidden",
  },
  pickerItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  pickerItemActive: { backgroundColor: "#eff6ff" },
  pickerItemText: { fontSize: 15, color: COLORS.secondary },

  // Photo inputs
  photoRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  photoThumbWrap: { position: "relative" },
  photoThumb: { width: 80, height: 80, borderRadius: 12 },
  photoRemoveBtn: { position: "absolute", top: -6, right: -6, backgroundColor: COLORS.white, borderRadius: 10 },
  addPhotoBtn: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.surface,
  },
  addPhotoBtnText: { fontSize: 11, color: COLORS.muted, marginTop: 2 },

  submitBtn: {
    flexDirection: "row",
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    gap: 8,
    ...shadows.md,
  },
  submitBtnText: { color: colors.white, fontSize: 16, fontWeight: "600" },

  // Empty state
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: COLORS.secondary, textAlign: "center", marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: COLORS.muted, textAlign: "center", lineHeight: 20, marginBottom: 24 },
  emptyBtn: {
    flexDirection: "row",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    gap: 8,
  },
  emptyBtnText: { color: COLORS.white, fontSize: 16, fontWeight: "700" },

  // Category Group
  categoryGroup: { marginBottom: 20 },
  categoryGroupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  categoryGroupTitle: { fontSize: 18, fontWeight: "700", color: COLORS.secondary, textTransform: "capitalize" },
  categoryGroupBadge: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
  },
  categoryGroupCount: { fontSize: 13, fontWeight: "700", color: COLORS.primary },

  // Portfolio Card
  portfolioCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  portfolioCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  portfolioCardTitle: { fontSize: 16, fontWeight: "700", color: COLORS.secondary, flex: 1 },
  portfolioCardDate: { fontSize: 12, color: COLORS.muted },
  portfolioCardDesc: { fontSize: 14, color: "#475569", lineHeight: 20, marginBottom: 12 },

  photoSection: { marginBottom: 10 },
  photoSectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.muted,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  portfolioPhoto: { width: 120, height: 90, borderRadius: 10, backgroundColor: "#e2e8f0" },

  portfolioCardFooter: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 },
  portfolioCardPhotoCount: { fontSize: 12, color: COLORS.muted },
});
