"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
  Alert,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParsedJob {
  title: string;
  description: string;
  category: string;
  urgency: string;
  transcript?: string;
  visual_notes?: string;
  questions?: string[];
}

interface Props {
  onComplete: (job: ParsedJob) => void;
  onCancel: () => void;
}

type Phase = "record" | "preview" | "processing" | "review";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_RECORD_SECONDS = 60;
const MIN_RECORD_SECONDS = 2;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50 MB

const URGENCY_OPTIONS = [
  { value: "low",       label: "Low",       color: "#64748b" },
  { value: "medium",    label: "Medium",    color: "#3b82f6" },
  { value: "high",      label: "High",      color: "#d97706" },
  { value: "emergency", label: "Emergency", color: "#dc2626" },
];

const CATEGORY_LABELS: Record<string, string> = {
  plumbing: "Plumbing", electrical: "Electrical", hvac: "HVAC",
  roofing: "Roofing", painting: "Painting", landscaping: "Landscaping",
  tree_service: "Tree Service", cleaning: "Cleaning", moving: "Moving",
  carpentry: "Carpentry", flooring: "Flooring", auto_repair: "Auto Repair",
  auto_detailing: "Auto Detailing", pest_control: "Pest Control",
  appliance_repair: "Appliance Repair", dog_walking: "Dog Walking",
  computer_repair: "Computer Repair", pressure_washing: "Pressure Washing",
  window_cleaning: "Window Cleaning", general_handyman: "General Handyman",
  drywall: "Drywall", locksmith: "Locksmith", security_cameras: "Security Cameras",
  smart_home_install: "Smart Home", welding: "Welding", gutter_cleaning: "Gutter Cleaning",
  it_networking: "IT Networking", photography: "Photography", videography: "Videography",
  personal_training: "Personal Training", pet_sitting: "Pet Sitting",
  pet_grooming: "Pet Grooming", event_setup: "Event Setup",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(s: number): string {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function pickVideoMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "video/webm";
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ];
  for (const t of candidates) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "video/webm";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function VoiceJobRecorder({ onComplete, onCancel }: Props) {
  // ── State ──
  const [phase, setPhase] = useState<Phase>("record");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [processingMsg, setProcessingMsg] = useState("");
  const [parsed, setParsed] = useState<ParsedJob | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editUrgency, setEditUrgency] = useState("medium");
  const [transcript, setTranscript] = useState("");
  const [visualNotes, setVisualNotes] = useState("");
  const [answers, setAnswers] = useState<Record<number, string>>({});

  // ── Web DOM refs ──
  const cameraContainerRef = useRef<View>(null);
  const previewContainerRef = useRef<View>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const videoPlaybackRef = useRef<HTMLVideoElement | null>(null);

  // ── Recording refs ──
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const videoMimeTypeRef = useRef<string>("video/webm");
  const videoBlobRef = useRef<Blob | null>(null);
  const recordingSecondsRef = useRef(0);

  // ── Animation ──
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Live camera preview element (Phase: record) ────────────────────────────
  useEffect(() => {
    if (Platform.OS !== "web" || phase !== "record") return;

    // Small delay to ensure the View has mounted and has a DOM node
    const mount = setTimeout(() => {
      const domNode = cameraContainerRef.current as unknown as HTMLElement | null;
      if (!domNode) return;

      const video = document.createElement("video");
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      video.style.cssText = "width:100%;height:100%;object-fit:cover;display:block;background:#000;";
      domNode.appendChild(video);
      videoPreviewRef.current = video;

      // Start camera stream
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: "environment" }, audio: true })
        .then((stream) => {
          streamRef.current = stream;
          video.srcObject = stream;
        })
        .catch((err) => {
          console.warn("Camera access error:", err);
          // Try again without specific facingMode
          navigator.mediaDevices
            .getUserMedia({ video: true, audio: true })
            .then((stream) => {
              streamRef.current = stream;
              video.srcObject = stream;
            })
            .catch(() => {
              // Camera unavailable — we'll handle gracefully on record attempt
            });
        });
    }, 100);

    return () => {
      clearTimeout(mount);
      const domNode = cameraContainerRef.current as unknown as HTMLElement | null;
      if (domNode && videoPreviewRef.current && domNode.contains(videoPreviewRef.current)) {
        domNode.removeChild(videoPreviewRef.current);
      }
      videoPreviewRef.current = null;
      // Stop camera tracks when leaving record phase
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ─── Recorded video playback element (Phase: preview) ──────────────────────
  useEffect(() => {
    if (Platform.OS !== "web" || phase !== "preview" || !videoBlobRef.current) return;

    const mount = setTimeout(() => {
      const domNode = previewContainerRef.current as unknown as HTMLElement | null;
      if (!domNode) return;

      const blobUrl = URL.createObjectURL(videoBlobRef.current as Blob);
      const video = document.createElement("video");
      video.src = blobUrl;
      video.controls = true;
      video.playsInline = true;
      video.loop = true;
      video.style.cssText = "width:100%;height:100%;object-fit:contain;display:block;background:#000;";
      domNode.appendChild(video);
      videoPlaybackRef.current = video;

      video.onloadedmetadata = () => {
        setVideoDuration(Math.round(video.duration));
      };

      return () => {
        URL.revokeObjectURL(blobUrl);
      };
    }, 100);

    return () => {
      clearTimeout(mount);
      const domNode = previewContainerRef.current as unknown as HTMLElement | null;
      if (domNode && videoPlaybackRef.current && domNode.contains(videoPlaybackRef.current)) {
        const src = videoPlaybackRef.current.src;
        domNode.removeChild(videoPlaybackRef.current);
        if (src.startsWith("blob:")) URL.revokeObjectURL(src);
      }
      videoPlaybackRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ─── Pulse animation ────────────────────────────────────────────────────────
  useEffect(() => {
    if (isRecording) {
      pulseLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.4, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.0, duration: 600, useNativeDriver: true }),
        ])
      );
      pulseLoopRef.current.start();
    } else {
      pulseLoopRef.current?.stop();
      Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    }
    return () => pulseLoopRef.current?.stop();
  }, [isRecording, pulseAnim]);

  // ─── Timer ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isRecording) {
      recordingSecondsRef.current = 0;
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        recordingSecondsRef.current += 1;
        setRecordingSeconds(recordingSecondsRef.current);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  // ─── Start recording ────────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (Platform.OS !== "web") return;
    if (isRecording) return;

    try {
      // Reuse the existing preview stream if available, otherwise request new
      let stream = streamRef.current;
      if (!stream || stream.getTracks().some((t) => t.readyState === "ended")) {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        streamRef.current = stream;
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream;
        }
      }

      const mimeType = pickVideoMimeType();
      videoMimeTypeRef.current = mimeType;
      videoChunksRef.current = [];

      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) videoChunksRef.current.push(e.data);
      };
      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);

      // Auto-stop after MAX_RECORD_SECONDS
      autoStopRef.current = setTimeout(() => {
        stopRecording();
      }, MAX_RECORD_SECONDS * 1000);
    } catch (err) {
      console.error("Camera/mic error:", err);
      Alert.alert(
        "Camera Access Required",
        "Please allow camera and microphone access in your browser to record a video job."
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording]);

  // ─── Stop recording ─────────────────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    if (autoStopRef.current) clearTimeout(autoStopRef.current);
    if (!mediaRecorderRef.current || !isRecording) return;

    const elapsed = recordingSecondsRef.current;
    setIsRecording(false);

    const recorder = mediaRecorderRef.current;
    const mimeType = videoMimeTypeRef.current;

    recorder.onstop = () => {
      const blob = new Blob(videoChunksRef.current, { type: mimeType });

      if (elapsed < MIN_RECORD_SECONDS || blob.size < 5000) {
        Alert.alert("Too Short", "Please hold the record button for at least 2 seconds.");
        setPhase("record");
        return;
      }

      if (blob.size > MAX_VIDEO_BYTES) {
        Alert.alert(
          "Video Too Large",
          "Your clip is over 50 MB. Please record a shorter clip (under ~30 seconds)."
        );
        setPhase("record");
        return;
      }

      videoBlobRef.current = blob;
      setVideoDuration(elapsed);
      setPhase("preview");
    };

    recorder.stop();
    // Keep the stream alive so the preview still shows on next record
  }, [isRecording]);

  // ─── Analyze with AI ────────────────────────────────────────────────────────
  const analyzeVideo = useCallback(async () => {
    if (!videoBlobRef.current) return;

    setPhase("processing");
    setProcessingMsg("Preparing video...");

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(videoBlobRef.current as Blob);
      });

      setProcessingMsg("Uploading to Gemini...");

      const mimeType = videoMimeTypeRef.current.split(";")[0]; // strip codec suffix for API

      const { data } = await api<ParsedJob & { transcript: string; visual_notes: string }>(
        "/api/ai/voice-analyze",
        {
          method: "POST",
          body: JSON.stringify({ videoBase64: base64, mimeType }),
        }
      );

      setTranscript(data.transcript || "");
      setVisualNotes(data.visual_notes || "");
      setParsed(data);
      setEditTitle(data.title);
      setEditDesc(data.description);
      setEditCategory(data.category);
      setEditUrgency(data.urgency || "medium");
      setAnswers({});
      setPhase("review");
    } catch (err) {
      console.error("Video analyze error:", err);
      Alert.alert(
        "Analysis Failed",
        "Could not analyze your video. Please try again or type your job manually."
      );
      setPhase("record");
    }
  }, []);

  // ─── Confirm & return job ───────────────────────────────────────────────────
  const handleConfirm = useCallback(() => {
    let finalDescription = editDesc;
    if (parsed?.questions) {
      const answered = parsed.questions
        .map((q, idx) => (answers[idx] ? `${q} ${answers[idx]}` : null))
        .filter((x): x is string => x !== null);
      if (answered.length > 0) {
        finalDescription += "\n\nAdditional details:\n" + answered.join("\n");
      }
    }
    onComplete({
      title: editTitle,
      description: finalDescription,
      category: editCategory,
      urgency: editUrgency,
    });
  }, [editTitle, editDesc, editCategory, editUrgency, parsed, answers, onComplete]);

  // ─── Record Again ───────────────────────────────────────────────────────────
  const resetToRecord = useCallback(() => {
    videoBlobRef.current = null;
    videoChunksRef.current = [];
    setRecordingSeconds(0);
    setVideoDuration(0);
    setPhase("record");
  }, []);

  // ─── Non-web fallback ───────────────────────────────────────────────────────
  if (Platform.OS !== "web") {
    return (
      <View style={styles.fullScreen}>
        <SafeAreaView style={styles.center}>
          <Ionicons name="videocam-outline" size={48} color="rgba(255,255,255,0.4)" />
          <Text style={styles.nativeTitle}>Video Recording</Text>
          <Text style={styles.nativeSubtitle}>
            Video job recording is available in the browser version.{"\n"}
            Open this app at localhost:8081 in your browser.
          </Text>
          <Pressable style={styles.cancelBtnDark} onPress={onCancel}>
            <Text style={styles.cancelBtnText}>Go Back</Text>
          </Pressable>
        </SafeAreaView>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Phase: RECORD
  // ═══════════════════════════════════════════════════════════════════════════
  if (phase === "record") {
    return (
      <View style={styles.fullScreen}>
        <SafeAreaView style={styles.recordSafe}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={onCancel} style={styles.iconBtn}>
              <Ionicons name="close" size={22} color="#fff" />
            </Pressable>
            <View style={styles.headerTitleRow}>
              <Ionicons name="videocam" size={16} color="#a78bfa" />
              <Text style={styles.headerTitle}>Video Job</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>

          {/* Live camera preview */}
          <View
            ref={cameraContainerRef}
            style={styles.cameraPreview}
          >
            {/* Placeholder shown before stream attaches */}
            <View style={styles.cameraPlaceholder} pointerEvents="none">
              <Ionicons name="videocam-outline" size={40} color="rgba(255,255,255,0.2)" />
              <Text style={styles.cameraPlaceholderText}>Camera preview</Text>
            </View>
          </View>

          {/* Hint */}
          <View style={styles.hintBox}>
            <Ionicons name="bulb-outline" size={16} color="#fbbf24" />
            <Text style={styles.hintText}>
              {isRecording
                ? "Describe the problem while pointing your camera at it"
                : "Point your camera at the issue and describe what you need done"}
            </Text>
          </View>

          {/* Record button */}
          <View style={styles.recordCenter}>
            <Animated.View
              style={[
                styles.pulseBg,
                { transform: [{ scale: pulseAnim }], opacity: isRecording ? 1 : 0.4 },
              ]}
            />
            <Animated.View
              style={[
                styles.pulseRing,
                { transform: [{ scale: pulseAnim }], opacity: isRecording ? 0.35 : 0 },
              ]}
            />
            <Pressable
              style={[styles.recordBtn, isRecording && styles.recordBtnActive]}
              onPressIn={startRecording}
              onPressOut={stopRecording}
              delayLongPress={100}
            >
              {isRecording ? (
                <View style={styles.stopSquare} />
              ) : (
                <Ionicons name="radio-button-on" size={36} color="#fff" />
              )}
            </Pressable>
          </View>

          {/* Timer / hint */}
          <Text style={styles.recordHint}>
            {isRecording
              ? formatTime(recordingSeconds)
              : "HOLD to record  ·  RELEASE to stop"}
          </Text>

          {isRecording && (
            <Text style={styles.maxHint}>Max {MAX_RECORD_SECONDS}s</Text>
          )}
        </SafeAreaView>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Phase: PREVIEW
  // ═══════════════════════════════════════════════════════════════════════════
  if (phase === "preview") {
    return (
      <View style={styles.fullScreen}>
        <SafeAreaView style={styles.previewSafe}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={resetToRecord} style={styles.iconBtn}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </Pressable>
            <Text style={styles.headerTitle}>Review Video</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Video playback */}
          <View ref={previewContainerRef} style={styles.videoPlayback}>
            <View style={styles.cameraPlaceholder} pointerEvents="none">
              <ActivityIndicator color="rgba(255,255,255,0.4)" />
            </View>
          </View>

          {/* Duration */}
          <View style={styles.durationRow}>
            <Ionicons name="time-outline" size={15} color="rgba(255,255,255,0.5)" />
            <Text style={styles.durationText}>Duration: {formatTime(videoDuration)}</Text>
          </View>

          {/* Action buttons */}
          <View style={styles.previewActions}>
            <Pressable style={styles.analyzeBtn} onPress={analyzeVideo}>
              <Ionicons name="sparkles" size={20} color="#fff" />
              <Text style={styles.analyzeBtnText}>Analyze with AI</Text>
            </Pressable>

            <Pressable style={styles.rerecordBtn} onPress={resetToRecord}>
              <Ionicons name="refresh" size={18} color="rgba(255,255,255,0.7)" />
              <Text style={styles.rerecordBtnText}>Record Again</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Phase: PROCESSING
  // ═══════════════════════════════════════════════════════════════════════════
  if (phase === "processing") {
    return (
      <View style={styles.fullScreen}>
        <SafeAreaView style={styles.center}>
          <View style={styles.aiSpinner}>
            <ActivityIndicator size="large" color="#a78bfa" />
          </View>
          <Text style={styles.processingTitle}>Gemini is watching your video...</Text>
          <Text style={styles.processingSubtitle}>{processingMsg}</Text>
          <Text style={styles.processingNote}>AI is analyzing what you said and showed us</Text>
        </SafeAreaView>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Phase: REVIEW
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <View style={styles.reviewScreen}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.reviewHeader}>
          <Pressable onPress={() => setPhase("preview")} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#0f172a" />
          </Pressable>
          <Text style={styles.reviewTitle}>Review & Edit</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.reviewScroll} contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
          {/* AI badge */}
          <View style={styles.aiBadge}>
            <Ionicons name="sparkles" size={14} color="#7c3aed" />
            <Text style={styles.aiBadgeText}>AI-generated from your video — edit anything</Text>
          </View>

          {/* Transcript */}
          {transcript ? (
            <View style={styles.infoCard}>
              <Text style={styles.infoCardLabel}>You said:</Text>
              <Text style={styles.infoCardText}>"{transcript}"</Text>
            </View>
          ) : null}

          {/* Visual notes */}
          {visualNotes ? (
            <View style={[styles.infoCard, styles.infoCardVisual]}>
              <View style={styles.infoCardLabelRow}>
                <Ionicons name="eye-outline" size={13} color="#7c3aed" />
                <Text style={[styles.infoCardLabel, { color: "#7c3aed" }]}>What AI saw:</Text>
              </View>
              <Text style={[styles.infoCardText, { color: "#6d28d9" }]}>{visualNotes}</Text>
            </View>
          ) : null}

          {/* Title */}
          <Text style={styles.fieldLabel}>Job Title</Text>
          <TextInput
            style={styles.fieldInput}
            value={editTitle}
            onChangeText={setEditTitle}
            placeholder="What needs to be done?"
            placeholderTextColor="#94a3b8"
          />

          {/* Description */}
          <Text style={styles.fieldLabel}>Description</Text>
          <TextInput
            style={[styles.fieldInput, styles.fieldMultiline]}
            value={editDesc}
            onChangeText={setEditDesc}
            multiline
            numberOfLines={4}
            placeholder="Describe the job in detail..."
            placeholderTextColor="#94a3b8"
            textAlignVertical="top"
          />

          {/* Category */}
          <Text style={styles.fieldLabel}>Category</Text>
          <View style={styles.categoryPill}>
            <Ionicons name="pricetag-outline" size={16} color="#3b82f6" />
            <Text style={styles.categoryText}>{CATEGORY_LABELS[editCategory] || editCategory}</Text>
          </View>

          {/* Urgency */}
          <Text style={styles.fieldLabel}>Urgency</Text>
          <View style={styles.urgencyRow}>
            {URGENCY_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                style={[
                  styles.urgencyChip,
                  editUrgency === opt.value && { backgroundColor: opt.color, borderColor: opt.color },
                ]}
                onPress={() => setEditUrgency(opt.value)}
              >
                <Text
                  style={[
                    styles.urgencyChipText,
                    editUrgency === opt.value && { color: "#fff" },
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* AI follow-up questions */}
          {parsed?.questions && parsed.questions.length > 0 && (
            <View style={styles.questionsSection}>
              <View style={styles.questionsSectionHeader}>
                <Ionicons name="help-circle-outline" size={18} color="#059669" />
                <Text style={styles.questionsSectionTitle}>AI Follow-up Questions</Text>
                <Text style={styles.questionsOptional}>(optional)</Text>
              </View>
              <Text style={styles.questionsSubtitle}>Help contractors give you accurate bids</Text>
              {parsed.questions.map((q, idx) => (
                <View key={idx} style={styles.questionItem}>
                  <Text style={styles.questionText}>{q}</Text>
                  <TextInput
                    style={styles.questionInput}
                    placeholder="Your answer..."
                    placeholderTextColor="#94a3b8"
                    value={answers[idx] || ""}
                    onChangeText={(text) => setAnswers((prev) => ({ ...prev, [idx]: text }))}
                  />
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={styles.reviewFooter}>
          <Pressable style={styles.confirmBtn} onPress={handleConfirm}>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.confirmBtnText}>Use This Job</Text>
          </Pressable>
          <Pressable style={styles.rerecordBtnLight} onPress={resetToRecord}>
            <Ionicons name="videocam-outline" size={18} color="#64748b" />
            <Text style={styles.rerecordBtnLightText}>Record Again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // ── Shared shells ──
  fullScreen: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "#0a0f1e", zIndex: 999,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },

  // ── Header ──
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8,
  },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#fff" },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center",
  },

  // ── Record phase ──
  recordSafe: { flex: 1 },
  cameraPreview: {
    flex: 1, marginHorizontal: 0, overflow: "hidden",
    backgroundColor: "#000",
  },
  cameraPlaceholder: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    alignItems: "center", justifyContent: "center", gap: 8,
  },
  cameraPlaceholderText: { color: "rgba(255,255,255,0.2)", fontSize: 13 },
  hintBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: 20, marginVertical: 10,
    backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  hintText: { flex: 1, color: "rgba(255,255,255,0.65)", fontSize: 13, lineHeight: 18 },
  recordCenter: { alignItems: "center", justifyContent: "center", height: 130, marginBottom: 4 },
  pulseBg: {
    position: "absolute", width: 100, height: 100, borderRadius: 50,
    backgroundColor: "rgba(220,38,38,0.3)",
  },
  pulseRing: {
    position: "absolute", width: 130, height: 130, borderRadius: 65,
    borderWidth: 2, borderColor: "#ef4444",
  },
  recordBtn: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: "#dc2626", alignItems: "center", justifyContent: "center",
    shadowColor: "#dc2626", shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.55, shadowRadius: 16, elevation: 14,
  },
  recordBtnActive: { backgroundColor: "#b91c1c" },
  stopSquare: {
    width: 28, height: 28, borderRadius: 5, backgroundColor: "#fff",
  },
  recordHint: {
    textAlign: "center", color: "rgba(255,255,255,0.45)", fontSize: 13,
    marginBottom: 4, fontVariant: ["tabular-nums"] as never,
    letterSpacing: 0.3,
  },
  maxHint: { textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 11, marginBottom: 8 },

  // ── Preview phase ──
  previewSafe: { flex: 1 },
  videoPlayback: {
    flex: 1, backgroundColor: "#000", overflow: "hidden",
  },
  durationRow: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  durationText: { color: "rgba(255,255,255,0.5)", fontSize: 14 },
  previewActions: { paddingHorizontal: 20, paddingBottom: 20, gap: 10 },
  analyzeBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#7c3aed", paddingVertical: 15, borderRadius: 14,
    shadowColor: "#7c3aed", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 10,
  },
  analyzeBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  rerecordBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 12, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 14,
  },
  rerecordBtnText: { color: "rgba(255,255,255,0.7)", fontSize: 15, fontWeight: "600" },

  // ── Processing phase ──
  aiSpinner: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: "rgba(124,58,237,0.25)", alignItems: "center", justifyContent: "center",
    marginBottom: 28,
  },
  processingTitle: { fontSize: 22, fontWeight: "800", color: "#fff", marginBottom: 8, textAlign: "center" },
  processingSubtitle: { fontSize: 15, color: "rgba(255,255,255,0.6)", textAlign: "center", marginBottom: 6 },
  processingNote: { fontSize: 13, color: "rgba(255,255,255,0.3)", textAlign: "center", marginTop: 16 },

  // ── Review phase ──
  reviewScreen: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "#fff", zIndex: 999,
  },
  reviewHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: "#f1f5f9",
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: "#f8fafc", alignItems: "center", justifyContent: "center",
  },
  reviewTitle: { fontSize: 18, fontWeight: "700", color: "#0f172a" },
  reviewScroll: { flex: 1 },
  aiBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#f5f3ff", paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, alignSelf: "flex-start", marginBottom: 16,
  },
  aiBadgeText: { color: "#7c3aed", fontSize: 13, fontWeight: "600" },
  infoCard: {
    backgroundColor: "#f8fafc", borderRadius: 12, padding: 14, marginBottom: 12,
    borderLeftWidth: 3, borderLeftColor: "#7c3aed",
  },
  infoCardVisual: { backgroundColor: "#faf5ff", borderLeftColor: "#a78bfa" },
  infoCardLabelRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 4 },
  infoCardLabel: {
    fontSize: 11, fontWeight: "700", color: "#94a3b8",
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 5,
  },
  infoCardText: { fontSize: 14, color: "#475569", lineHeight: 20, fontStyle: "italic" },
  fieldLabel: { fontSize: 14, fontWeight: "600", color: "#0f172a", marginBottom: 8, marginTop: 16 },
  fieldInput: {
    borderWidth: 1.5, borderColor: "#e2e8f0", borderRadius: 12,
    padding: 14, fontSize: 15, color: "#0f172a", backgroundColor: "#fff",
  },
  fieldMultiline: { height: 110, textAlignVertical: "top" },
  categoryPill: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#eff6ff", paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 12, alignSelf: "flex-start",
  },
  categoryText: { color: "#1e40af", fontSize: 15, fontWeight: "700" },
  urgencyRow: { flexDirection: "row", gap: 10, flexWrap: "wrap", marginTop: 4 },
  urgencyChip: {
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1.5, borderColor: "#e2e8f0", backgroundColor: "#fff",
  },
  urgencyChipText: { fontSize: 14, fontWeight: "600", color: "#64748b" },
  questionsSection: {
    marginTop: 24, padding: 16,
    backgroundColor: "#f0fdf4", borderRadius: 16,
    borderWidth: 1, borderColor: "#bbf7d0",
  },
  questionsSectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  questionsSectionTitle: { fontSize: 15, fontWeight: "700", color: "#059669" },
  questionsOptional: { fontSize: 12, color: "#94a3b8", marginLeft: 4 },
  questionsSubtitle: { fontSize: 13, color: "#64748b", marginBottom: 16 },
  questionItem: { marginBottom: 16 },
  questionText: { fontSize: 14, fontWeight: "600", color: "#0f172a", marginBottom: 6 },
  questionInput: {
    borderWidth: 1.5, borderColor: "#d1fae5", borderRadius: 10,
    padding: 12, fontSize: 14, color: "#0f172a", backgroundColor: "#fff",
  },
  reviewFooter: { padding: 20, gap: 10, borderTopWidth: 1, borderTopColor: "#f1f5f9" },
  confirmBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#1e40af", paddingVertical: 16, borderRadius: 14,
    shadowColor: "#1e40af", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  confirmBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  rerecordBtnLight: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 12, borderWidth: 1.5, borderColor: "#e2e8f0", borderRadius: 14,
  },
  rerecordBtnLightText: { color: "#64748b", fontSize: 15, fontWeight: "600" },

  // ── Native fallback ──
  nativeTitle: { fontSize: 22, fontWeight: "800", color: "#fff", marginTop: 16, marginBottom: 10 },
  nativeSubtitle: {
    fontSize: 15, color: "rgba(255,255,255,0.5)", textAlign: "center",
    lineHeight: 22, marginBottom: 32,
  },
  cancelBtnDark: {
    paddingHorizontal: 28, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1.5, borderColor: "rgba(255,255,255,0.2)",
  },
  cancelBtnText: { color: "rgba(255,255,255,0.7)", fontSize: 15, fontWeight: "600" },
});
