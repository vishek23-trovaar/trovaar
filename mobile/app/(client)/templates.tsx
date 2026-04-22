import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  ScrollView,
  Animated,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { colors, typography, spacing, radius, shadows, getCategoryIcon } from '../../lib/theme';


const CATEGORIES = [
  "Plumbing",
  "Electrical",
  "Landscaping",
  "Cleaning",
  "Painting",
  "HVAC",
  "Carpentry",
  "Moving",
  "Pest Control",
  "General Handyman",
  "Other",
];

const CATEGORY_EMOJIS: Record<string, string> = {
  Plumbing: "🔧",
  Electrical: "⚡",
  Landscaping: "🌿",
  Cleaning: "🧹",
  Painting: "🎨",
  HVAC: "🌡️",
  Carpentry: "🪚",
  Moving: "📦",
  "Pest Control": "🐛",
  "General Handyman": "🔨",
  Other: "➕",
};

interface Template {
  id: string;
  title: string;
  category: string;
  description: string;
  budget_min: number;
  budget_max: number;
  created_at: string;
}

interface TemplateForm {
  title: string;
  category: string;
  description: string;
  budget_min: string;
  budget_max: string;
}

const EMPTY_FORM: TemplateForm = {
  title: "",
  category: "",
  description: "",
  budget_min: "",
  budget_max: "",
};

// Skeleton pulse
function SkeletonPulse({
  width,
  height,
  borderRadius = 8,
  style,
}: {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: object;
}) {
  const animValue = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(animValue, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(animValue, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [animValue]);
  return (
    <Animated.View
      style={[
        {
          width: width as number,
          height,
          borderRadius,
          backgroundColor: colors.border,
          opacity: animValue,
        },
        style,
      ]}
    />
  );
}

function LoadingSkeleton() {
  return (
    <View style={{ padding: 16, gap: 12 }}>
      {[1, 2, 3].map((i) => (
        <View
          key={i}
          style={{
            backgroundColor: colors.white,
            borderRadius: radius.xl,
            padding: 18,
            gap: 10,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <SkeletonPulse width={120} height={14} />
            <SkeletonPulse width={70} height={22} borderRadius={11} />
          </View>
          <SkeletonPulse width={200} height={20} />
          <SkeletonPulse width={100} height={14} />
          <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
            <SkeletonPulse width={80} height={34} borderRadius={10} />
            <SkeletonPulse width={80} height={34} borderRadius={10} />
          </View>
        </View>
      ))}
    </View>
  );
}

function LabeledInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric";
  multiline?: boolean;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, multiline && { height: 80, textAlignVertical: "top" }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        keyboardType={keyboardType ?? "default"}
        multiline={multiline}
      />
    </View>
  );
}

export default function TemplatesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const screenOpacity = useRef(new Animated.Value(0)).current;

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [form, setForm] = useState<TemplateForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);

  const fetchTemplates = useCallback(async () => {
    try {
      const { data } = await api<{ templates: Template[] }>("/api/job-templates");
      setTemplates(data.templates || []);
    } catch {
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  useEffect(() => {
    Animated.timing(screenOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [screenOpacity]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTemplates();
    setRefreshing(false);
  };

  const openCreate = () => {
    setEditingTemplate(null);
    setForm(EMPTY_FORM);
    setModalVisible(true);
  };

  const openEdit = (template: Template) => {
    setEditingTemplate(template);
    setForm({
      title: template.title,
      category: template.category,
      description: template.description,
      budget_min: template.budget_min?.toString() || "",
      budget_max: template.budget_max?.toString() || "",
    });
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingTemplate(null);
    setForm(EMPTY_FORM);
    setCategoryPickerOpen(false);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      Alert.alert("Validation", "Please enter a template title.");
      return;
    }
    if (!form.category) {
      Alert.alert("Validation", "Please select a category.");
      return;
    }
    setSaving(true);
    try {
      const body = {
        title: form.title.trim(),
        category: form.category,
        description: form.description.trim(),
        budget_min: form.budget_min ? parseFloat(form.budget_min) : 0,
        budget_max: form.budget_max ? parseFloat(form.budget_max) : 0,
      };
      if (editingTemplate) {
        await api(`/api/templates/${editingTemplate.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      } else {
        await api("/api/job-templates", {
          method: "POST",
          body: JSON.stringify(body),
        });
      }
      closeModal();
      await fetchTemplates();
    } catch (err: unknown) {
      Alert.alert("Error", (err as Error).message || "Could not save template.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (template: Template) => {
    Alert.alert(
      "Delete Template",
      `Delete "${template.title}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api(`/api/templates/${template.id}`, { method: "DELETE" });
              setTemplates((prev) => prev.filter((t) => t.id !== template.id));
            } catch (err: unknown) {
              Alert.alert("Error", (err as Error).message || "Could not delete template.");
            }
          },
        },
      ]
    );
  };

  const handleUse = (template: Template) => {
    router.push({
      pathname: "/(client)/post-job",
      params: {
        template_title: template.title,
        template_category: template.category,
        template_description: template.description,
        template_budget_min: template.budget_min?.toString() || "",
        template_budget_max: template.budget_max?.toString() || "",
      },
    });
  };

  const setField = (key: keyof TemplateForm) => (value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const formatBudget = (min: number, max: number) => {
    if (!min && !max) return "No budget set";
    if (min && max) return `$${min} – $${max}`;
    if (max) return `Up to $${max}`;
    return `From $${min}`;
  };

  if (loading) {
    return (
      <View style={styles.screen}>
        <LoadingSkeleton />
      </View>
    );
  }

  return (
    <Animated.View style={[styles.screen, { opacity: screenOpacity }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Job Templates</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openCreate} activeOpacity={0.8}>
          <Ionicons name="add" size={22} color={colors.white} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={templates}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        contentContainerStyle={[
          styles.listContent,
          templates.length === 0 && { flex: 1 },
        ]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onLongPress={() => handleDelete(item)}
            activeOpacity={0.95}
            delayLongPress={400}
          >
            {/* Card header row */}
            <View style={styles.cardHeader}>
              <View style={styles.categoryRow}>
                <Text style={styles.categoryEmoji}>
                  {CATEGORY_EMOJIS[item.category] || "📋"}
                </Text>
                <View
                  style={[
                    styles.categoryBadge,
                    { backgroundColor: "#DBEAFE" },
                  ]}
                >
                  <Text style={[styles.categoryBadgeText, { color: colors.primary }]}>
                    {item.category}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => handleDelete(item)}
                style={styles.deleteIconBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="trash-outline" size={16} color={colors.muted} />
              </TouchableOpacity>
            </View>

            {/* Title */}
            <Text style={styles.cardTitle} numberOfLines={2}>
              {item.title}
            </Text>

            {/* Description */}
            {item.description ? (
              <Text style={styles.cardDescription} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}

            {/* Budget */}
            <View style={styles.budgetRow}>
              <Ionicons name="cash-outline" size={14} color={colors.muted} />
              <Text style={styles.budgetText}>
                {formatBudget(item.budget_min, item.budget_max)}
              </Text>
            </View>

            {/* Actions */}
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => openEdit(item)}
                activeOpacity={0.7}
              >
                <Ionicons name="create-outline" size={15} color={colors.primary} />
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.useBtn}
                onPress={() => handleUse(item)}
                activeOpacity={0.8}
              >
                <Ionicons name="flash-outline" size={15} color={colors.white} />
                <Text style={styles.useBtnText}>Use Template</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="document-text-outline" size={40} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No templates yet</Text>
            <Text style={styles.emptySub}>
              Save job templates to quickly post recurring services without re-entering details.
            </Text>
            <TouchableOpacity style={styles.emptyCreateBtn} onPress={openCreate} activeOpacity={0.8}>
              <Ionicons name="add-outline" size={20} color={colors.white} />
              <Text style={styles.emptyCreateBtnText}>Create First Template</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Create / Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={closeModal} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color={colors.muted} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {editingTemplate ? "Edit Template" : "New Template"}
              </Text>
              <TouchableOpacity
                style={[styles.modalSaveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.modalSaveBtnText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <LabeledInput
                label="Template Title *"
                value={form.title}
                onChangeText={setField("title")}
                placeholder="e.g. Monthly Lawn Mowing"
              />

              {/* Category Picker */}
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Category *</Text>
                <TouchableOpacity
                  style={styles.fieldInput}
                  onPress={() => setCategoryPickerOpen((o) => !o)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.pickerValue,
                      !form.category && { color: colors.muted },
                    ]}
                  >
                    {form.category || "Select a category"}
                  </Text>
                  <Ionicons
                    name={categoryPickerOpen ? "chevron-up" : "chevron-down"}
                    size={16}
                    color={colors.muted}
                  />
                </TouchableOpacity>
                {categoryPickerOpen && (
                  <View style={styles.pickerDropdown}>
                    {CATEGORIES.map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.pickerOption,
                          form.category === cat && styles.pickerOptionActive,
                        ]}
                        onPress={() => {
                          setField("category")(cat);
                          setCategoryPickerOpen(false);
                        }}
                      >
                        <Text style={styles.pickerOptionEmoji}>
                          {CATEGORY_EMOJIS[cat] || "📋"}
                        </Text>
                        <Text
                          style={[
                            styles.pickerOptionText,
                            form.category === cat && { color: colors.primary, fontWeight: "700" },
                          ]}
                        >
                          {cat}
                        </Text>
                        {form.category === cat && (
                          <Ionicons name="checkmark" size={16} color={colors.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <LabeledInput
                label="Description"
                value={form.description}
                onChangeText={setField("description")}
                placeholder="Describe the job requirements..."
                multiline
              />

              <View style={styles.budgetRow2}>
                <View style={{ flex: 1 }}>
                  <LabeledInput
                    label="Min Budget ($)"
                    value={form.budget_min}
                    onChangeText={setField("budget_min")}
                    placeholder="0"
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <LabeledInput
                    label="Max Budget ($)"
                    value={form.budget_max}
                    onChangeText={setField("budget_max")}
                    placeholder="0"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 20,
    paddingBottom: 16,
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.text,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },

  listContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 100,
  },

  // Template Card
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  categoryEmoji: { fontSize: 18 },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.md,
  },
  categoryBadgeText: { fontSize: 12, fontWeight: "600" },
  deleteIconBtn: {
    padding: 4,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 6,
    lineHeight: 23,
  },
  cardDescription: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 19,
    marginBottom: 10,
  },
  budgetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 14,
  },
  budgetText: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: "500",
  },
  cardActions: {
    flexDirection: "row",
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 14,
  },
  editBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: "#DBEAFE",
  },
  editBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
  },
  useBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  useBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.white,
  },

  // Empty state
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#DBEAFE",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 10,
  },
  emptySub: {
    fontSize: 15,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  emptyCreateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: radius.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  emptyCreateBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: colors.white,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 16 : 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  modalSaveBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: radius.md,
    minWidth: 64,
    alignItems: "center",
  },
  modalSaveBtnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "700",
  },
  modalBody: {
    flex: 1,
    padding: 20,
  },

  // Form fields
  fieldWrap: {
    marginBottom: 18,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.muted,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  fieldInput: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pickerValue: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  pickerDropdown: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginTop: 4,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  pickerOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pickerOptionActive: {
    backgroundColor: "#DBEAFE",
  },
  pickerOptionEmoji: { fontSize: 16 },
  pickerOptionText: {
    fontSize: 15,
    color: colors.text,
    flex: 1,
  },
  budgetRow2: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
});
