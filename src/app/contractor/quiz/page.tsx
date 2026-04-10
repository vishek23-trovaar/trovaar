"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { CATEGORIES } from "@/lib/constants";
import { QUIZ_CATEGORIES } from "@/lib/quiz-questions";

// ─── Types ───────────────────────────────────────────────────────────────────

interface QuizQuestionClient {
  id: string;
  category: string;
  question: string;
  options: string[];
  difficulty: string;
}

interface QuizResult {
  questionId: string;
  correct: boolean;
  correctIndex: number;
  explanation: string;
}

interface QuizScore {
  category: string;
  best_percentage: number;
  best_score: number;
  total_questions: number;
  last_taken: string;
}

type QuizState = "select" | "taking" | "results";

// ─── Page ────────────────────────────────────────────────────────────────────

export default function QuizPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [quizState, setQuizState] = useState<QuizState>("select");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestionClient[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [results, setResults] = useState<QuizResult[]>([]);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [percentage, setPercentage] = useState(0);
  const [scores, setScores] = useState<QuizScore[]>([]);
  const [userCategories, setUserCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const [elapsed, setElapsed] = useState(0);

  // Auth guard
  useEffect(() => {
    if (!authLoading && (!user || user.role !== "contractor")) {
      router.replace("/client/dashboard");
    }
  }, [user, authLoading, router]);

  // Fetch contractor categories and existing scores
  useEffect(() => {
    if (!user || user.role !== "contractor") return;

    async function fetchData() {
      try {
        const [profileRes, scoresRes] = await Promise.all([
          fetch(`/api/contractors/${user!.id}`),
          fetch(`/api/quiz/scores/${user!.id}`),
        ]);
        if (profileRes.ok) {
          const data = await profileRes.json();
          try {
            const cats = JSON.parse(data.profile?.categories || "[]") as string[];
            setUserCategories(cats);
          } catch {
            setUserCategories([]);
          }
        }
        if (scoresRes.ok) {
          const data = await scoresRes.json();
          setScores(data.scores ?? []);
        }
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user]);

  // Timer
  useEffect(() => {
    if (quizState !== "taking" || startTime === 0) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [quizState, startTime]);

  const formatTime = useCallback((seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }, []);

  // Start quiz
  async function startQuiz(category: string) {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/quiz?category=${category}`);
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429) {
          const retakeAt = data.retakeAvailableAt ? new Date(data.retakeAvailableAt) : null;
          setError(
            retakeAt
              ? `You can retake this quiz after ${retakeAt.toLocaleString()}`
              : data.error || "Please wait 24 hours before retaking"
          );
        } else {
          setError(data.error || "Failed to load quiz");
        }
        return;
      }
      setSelectedCategory(category);
      setQuestions(data.questions);
      setCurrentIndex(0);
      setSelectedAnswers({});
      setResults([]);
      setQuizState("taking");
      setStartTime(Date.now());
      setElapsed(0);
    } catch {
      setError("Failed to load quiz. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Select an answer
  function selectAnswer(questionId: string, optionIndex: number) {
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  }

  // Submit quiz
  async function submitQuiz() {
    if (!selectedCategory) return;
    setSubmitting(true);
    setError(null);

    const answers = questions.map((q) => ({
      questionId: q.id,
      selectedIndex: selectedAnswers[q.id] ?? -1,
    }));

    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: selectedCategory, answers }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to submit quiz");
        return;
      }
      setScore(data.score);
      setTotal(data.total);
      setPercentage(data.percentage);
      setResults(data.results);
      setQuizState("results");

      // Refresh scores
      if (user) {
        const scoresRes = await fetch(`/api/quiz/scores/${user.id}`);
        if (scoresRes.ok) {
          const scoresData = await scoresRes.json();
          setScores(scoresData.scores ?? []);
        }
      }
    } catch {
      setError("Failed to submit quiz. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Loading / Auth ────────────────────────────────────────────────────────

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="flex justify-center py-24">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // ── Quiz categories available for this contractor ─────────────────────────

  const quizCategoryKeys = Object.keys(QUIZ_CATEGORIES);
  // Show quiz categories that match the contractor's service categories
  // Also include "general_contracting" for everyone
  const availableQuizCategories = quizCategoryKeys.filter(
    (cat) => cat === "general_contracting" || userCategories.includes(cat)
  );
  // If no matching categories, show all quiz categories
  const displayCategories = availableQuizCategories.length > 0 ? availableQuizCategories : quizCategoryKeys;

  function getScoreForCategory(cat: string): QuizScore | undefined {
    return scores.find((s) => s.category === cat);
  }

  function getCategoryLabel(cat: string): string {
    return QUIZ_CATEGORIES[cat] || CATEGORIES.find((c) => c.value === cat)?.label || cat;
  }

  // ── Render: Category Selection ────────────────────────────────────────────

  if (quizState === "select") {
    return (
      <div className="bg-white min-h-screen">
        <div className="max-w-2xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/contractor/profile"
              className="text-sm text-primary hover:underline mb-4 inline-block"
            >
              &larr; Back to Profile
            </Link>
            <h1 className="text-2xl font-bold text-secondary">Skills Assessment</h1>
            <p className="text-muted mt-1">
              Prove your trade knowledge and earn badges for your profile. Score 70% or
              higher to display your badge publicly.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="space-y-3">
              {displayCategories.map((cat) => {
                const existing = getScoreForCategory(cat);
                const label = getCategoryLabel(cat);
                return (
                  <div
                    key={cat}
                    className="bg-white rounded-2xl border border-border p-5 flex items-center justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-secondary">{label}</h3>
                      {existing ? (
                        <div className="flex items-center gap-3 mt-1">
                          <span
                            className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold ${
                              existing.best_percentage >= 80
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : existing.best_percentage >= 70
                                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                                  : "bg-gray-100 text-gray-600 border border-gray-200"
                            }`}
                          >
                            {existing.best_percentage >= 70 ? "\uD83E\uDDE0" : ""} {existing.best_percentage}%
                          </span>
                          <span className="text-xs text-muted">
                            Best: {existing.best_score}/{existing.total_questions}
                          </span>
                          <span className="text-xs text-muted">
                            Last taken{" "}
                            {new Date(existing.last_taken).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                      ) : (
                        <p className="text-xs text-muted mt-1">Not taken yet</p>
                      )}
                    </div>
                    <button
                      onClick={() => startQuiz(cat)}
                      disabled={loading}
                      className="shrink-0 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {existing ? "Retake" : "Start Quiz"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-blue-800 mb-1">How it works</h3>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>- 10 questions per quiz, drawn from real trade knowledge</li>
              <li>- Score 70%+ to display your badge on your public profile</li>
              <li>- Score 80%+ for a highlighted achievement badge</li>
              <li>- You can retake each quiz once every 24 hours</li>
              <li>- Questions cover code requirements, safety, best practices, and technical knowledge</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: Taking Quiz ───────────────────────────────────────────────────

  if (quizState === "taking" && questions.length > 0) {
    const currentQuestion = questions[currentIndex];
    const answeredCount = Object.keys(selectedAnswers).length;
    const allAnswered = answeredCount === questions.length;
    const progressPct = Math.round(((currentIndex + 1) / questions.length) * 100);

    return (
      <div className="bg-white min-h-screen">
        <div className="max-w-2xl mx-auto px-4 py-8">
          {/* Header bar */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-lg font-bold text-secondary">
                {getCategoryLabel(selectedCategory!)} Quiz
              </h1>
              <p className="text-xs text-muted">
                Question {currentIndex + 1} of {questions.length}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-mono text-muted">{formatTime(elapsed)}</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 bg-gray-100 rounded-full mb-8 overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* Difficulty badge */}
          <div className="mb-4">
            <span
              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                currentQuestion.difficulty === "basic"
                  ? "bg-green-100 text-green-700"
                  : currentQuestion.difficulty === "intermediate"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-red-100 text-red-700"
              }`}
            >
              {currentQuestion.difficulty}
            </span>
          </div>

          {/* Question */}
          <h2 className="text-base font-semibold text-secondary leading-relaxed mb-6">
            {currentQuestion.question}
          </h2>

          {/* Options */}
          <div className="space-y-3 mb-8">
            {currentQuestion.options.map((option, idx) => {
              const selected = selectedAnswers[currentQuestion.id] === idx;
              return (
                <button
                  key={idx}
                  onClick={() => selectAnswer(currentQuestion.id, idx)}
                  className={`w-full text-left px-4 py-3.5 rounded-xl border text-sm transition-all cursor-pointer ${
                    selected
                      ? "border-primary bg-primary/5 text-secondary font-medium ring-2 ring-primary/20"
                      : "border-border text-secondary hover:border-primary/40 hover:bg-gray-50"
                  }`}
                >
                  <span className="font-mono text-xs text-muted mr-2">
                    {String.fromCharCode(65 + idx)}.
                  </span>
                  {option}
                </button>
              );
            })}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className="px-4 py-2 text-sm font-medium text-muted hover:text-secondary disabled:opacity-30 cursor-pointer"
            >
              &larr; Previous
            </button>

            <div className="flex gap-1.5">
              {questions.map((q, idx) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-7 h-7 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    idx === currentIndex
                      ? "bg-primary text-white"
                      : selectedAnswers[q.id] !== undefined
                        ? "bg-primary/10 text-primary"
                        : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>

            {currentIndex < questions.length - 1 ? (
              <button
                onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                className="px-4 py-2 text-sm font-medium text-primary hover:text-primary/80 cursor-pointer"
              >
                Next &rarr;
              </button>
            ) : (
              <button
                onClick={submitQuiz}
                disabled={!allAnswered || submitting}
                className="px-5 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit Quiz"}
              </button>
            )}
          </div>

          {!allAnswered && currentIndex === questions.length - 1 && (
            <p className="text-xs text-amber-600 text-center mt-3">
              Answer all {questions.length} questions to submit ({answeredCount}/{questions.length}{" "}
              answered)
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── Render: Results ───────────────────────────────────────────────────────

  if (quizState === "results") {
    const passed = percentage >= 70;
    const excellent = percentage >= 80;

    return (
      <div className="bg-white min-h-screen">
        <div className="max-w-2xl mx-auto px-4 py-8">
          {/* Score hero */}
          <div className={`rounded-2xl p-8 text-center mb-8 ${
            excellent
              ? "bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200"
              : passed
                ? "bg-gradient-to-br from-blue-50 to-sky-50 border border-blue-200"
                : "bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200"
          }`}>
            {excellent && (
              <div className="text-4xl mb-3 animate-bounce">
                \uD83C\uDF89
              </div>
            )}
            <p className="text-5xl font-extrabold text-secondary mb-2">{percentage}%</p>
            <p className="text-lg font-semibold text-secondary">
              {score} out of {total} correct
            </p>
            <p className="text-sm text-muted mt-1">
              Time: {formatTime(elapsed)}
            </p>

            {excellent ? (
              <div className="mt-4">
                <span className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 text-sm font-bold px-4 py-2 rounded-full border border-emerald-300">
                  \uD83C\uDFC6 Excellent! Scored {percentage}% on {getCategoryLabel(selectedCategory!)}
                </span>
                <p className="text-sm text-emerald-700 mt-2">
                  Congratulations! Your badge is now displayed on your profile.
                </p>
              </div>
            ) : passed ? (
              <div className="mt-4">
                <span className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 text-sm font-bold px-4 py-2 rounded-full border border-blue-300">
                  \uD83E\uDDE0 Scored {percentage}% on {getCategoryLabel(selectedCategory!)}
                </span>
                <p className="text-sm text-blue-700 mt-2">
                  Passed! Your badge is now displayed on your profile.
                </p>
              </div>
            ) : (
              <div className="mt-4">
                <p className="text-sm text-gray-600">
                  Score 70% or higher to earn a badge. You can retake this quiz in 24 hours.
                </p>
              </div>
            )}
          </div>

          {/* Question-by-question results */}
          <h2 className="text-base font-bold text-secondary mb-4">Question Breakdown</h2>
          <div className="space-y-4 mb-8">
            {questions.map((q, idx) => {
              const result = results.find((r) => r.questionId === q.id);
              const userAnswer = selectedAnswers[q.id];
              return (
                <div
                  key={q.id}
                  className={`rounded-xl border p-4 ${
                    result?.correct
                      ? "border-emerald-200 bg-emerald-50/30"
                      : "border-red-200 bg-red-50/30"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        result?.correct
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {result?.correct ? "\u2713" : "\u2717"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-secondary mb-2">
                        {idx + 1}. {q.question}
                      </p>
                      <div className="space-y-1 mb-2">
                        {q.options.map((opt, oi) => {
                          const isCorrect = oi === result?.correctIndex;
                          const isSelected = oi === userAnswer;
                          return (
                            <div
                              key={oi}
                              className={`text-xs px-2.5 py-1.5 rounded-lg ${
                                isCorrect
                                  ? "bg-emerald-100 text-emerald-800 font-medium"
                                  : isSelected && !isCorrect
                                    ? "bg-red-100 text-red-700 line-through"
                                    : "text-gray-500"
                              }`}
                            >
                              <span className="font-mono mr-1">{String.fromCharCode(65 + oi)}.</span>
                              {opt}
                              {isCorrect && " \u2713"}
                              {isSelected && !isCorrect && " (your answer)"}
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-xs text-muted italic">{result?.explanation}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                setQuizState("select");
                setSelectedCategory(null);
                setError(null);
              }}
              className="flex-1 px-4 py-3 bg-gray-100 text-secondary text-sm font-semibold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
            >
              Take Another Quiz
            </button>
            <Link
              href="/contractor/profile"
              className="flex-1 px-4 py-3 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors text-center"
            >
              View My Profile
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Fallback loading
  return (
    <div className="flex justify-center py-24">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );
}
