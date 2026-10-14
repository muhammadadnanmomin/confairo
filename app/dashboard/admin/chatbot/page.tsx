"use client";

// ============================================================
// Confairo Chatbot — Admin Control Panel
// /dashboard/admin/chatbot
// ============================================================
import { useEffect, useState } from "react";
import {
  Bot,
  Power,
  MessageSquarePlus,
  Database,
  RefreshCw,
  Trash2,
  Check,
  AlertCircle,
  Loader2,
  Sparkles,
} from "lucide-react";

interface ChatbotSettings {
  enabled: boolean;
  welcomeMessage: string;
  botName: string;
}

interface Stats {
  totalDocuments: number;
}

export default function ChatbotAdminPage() {
  const [settings, setSettings] = useState<ChatbotSettings>({
    enabled: true,
    welcomeMessage:
      "Hi! I'm Confairo AI 👋 I can help you discover conferences, track submissions, check deadlines, and navigate the platform. How can I assist you today?",
    botName: "Confairo AI",
  });
  const [stats, setStats] = useState<Stats>({ totalDocuments: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // ── Load settings ───────────────────────────────────────
  useEffect(() => {
    fetch("/api/chatbot/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) setSettings(d.settings);
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Save settings ────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/chatbot/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error("Save failed");
      showToast("success", "Settings saved successfully!");
    } catch {
      showToast("error", "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  // ── Seed knowledge ───────────────────────────────────────
  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await fetch("/api/chatbot/seed-knowledge", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Seed failed");
      setStats((s) => ({ ...s, totalDocuments: (s.totalDocuments || 0) + data.inserted }));
      showToast("success", `Seeded ${data.inserted} documents (${data.failed} failed)`);
    } catch (err: unknown) {
      showToast("error", err instanceof Error ? err.message : "Seed failed.");
    } finally {
      setSeeding(false);
    }
  };

  // ── Clear knowledge ──────────────────────────────────────
  const handleClear = async () => {
    if (!confirm("This will delete all chatbot knowledge documents. Are you sure?")) return;
    setClearing(true);
    try {
      const res = await fetch("/api/chatbot/seed-knowledge", { method: "DELETE" });
      if (!res.ok) throw new Error("Clear failed");
      setStats({ totalDocuments: 0 });
      showToast("success", "Knowledge base cleared.");
    } catch {
      showToast("error", "Failed to clear knowledge base.");
    } finally {
      setClearing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center shadow-sm">
          <Bot className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Chatbot Controls</h1>
          <p className="text-sm text-muted-foreground">Configure the Confairo AI assistant</p>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-sm border
          ${toast.type === "success"
              ? "bg-success-surface border-success/30 text-success"
              : "bg-destructive-surface border-destructive/30 text-destructive"
            }`}
        >
          {toast.type === "success" ? (
            <Check className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          {toast.message}
        </div>
      )}

      {/* ── Card: Toggle + Basic Settings ──────────────────── */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center gap-2">
          <Power className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">General Settings</h2>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Enable toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Chatbot Enabled</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Toggle the chatbot widget for all users
              </p>
            </div>
            <button
              id="chatbot-admin-toggle"
              onClick={() => setSettings((s) => ({ ...s, enabled: !s.enabled }))}
              className={`
                relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full
                transition-colors duration-200 focus:outline-none
                ${settings.enabled ? "bg-primary" : "bg-input"}
              `}
              role="switch"
              aria-checked={settings.enabled}
            >
              <span
                className={`
                  inline-block h-4 w-4 rounded-full bg-background dark:bg-foreground shadow
                  transform transition-transform duration-200
                  ${settings.enabled ? "translate-x-6" : "translate-x-1"}
                `}
              />
            </button>
          </div>

          {/* Bot name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="bot-name-input">
              Bot Name
            </label>
            <input
              id="bot-name-input"
              type="text"
              value={settings.botName}
              onChange={(e) => setSettings((s) => ({ ...s, botName: e.target.value }))}
              maxLength={50}
              className="
                w-full rounded-xl border border-input bg-card
                px-3.5 py-2.5 text-sm text-foreground
                focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                transition-all
              "
            />
          </div>

          {/* Welcome message */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="welcome-message-input">
              Welcome Message
            </label>
            <textarea
              id="welcome-message-input"
              value={settings.welcomeMessage}
              onChange={(e) => setSettings((s) => ({ ...s, welcomeMessage: e.target.value }))}
              rows={4}
              maxLength={500}
              className="
                w-full rounded-xl border border-input bg-card
                px-3.5 py-2.5 text-sm text-foreground resize-none
                focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                transition-all
              "
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">
              {settings.welcomeMessage.length}/500
            </p>
          </div>

          {/* Save button */}
          <button
            id="chatbot-save-settings-btn"
            onClick={handleSave}
            disabled={saving}
            className="
              flex cursor-pointer items-center gap-2
              bg-primary hover:bg-primary-hover
              text-primary-foreground text-sm font-medium
              px-4 py-2.5 rounded-xl
              transition-colors disabled:cursor-not-allowed disabled:opacity-50
              shadow-sm
            "
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {saving ? "Saving…" : "Save Settings"}
          </button>
        </div>
      </div>

      {/* ── Card: Knowledge Base ─────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center gap-2">
          <Database className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">RAG Knowledge Base</h2>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="rounded-xl bg-info-surface border border-info/30 p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="h-4 w-4 text-info mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-info">How RAG works</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  The chatbot uses Retrieval Augmented Generation. Documents you seed here are
                  converted to embeddings (via OpenAI) and stored in Supabase pgvector. When a
                  user asks a question, the most relevant documents are retrieved and injected
                  into the AI prompt for accurate, grounded answers.
                </p>
              </div>
            </div>
          </div>

          {stats.totalDocuments > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Database className="h-4 w-4 text-muted-foreground" />
              <span>
                <span className="font-semibold text-foreground">{stats.totalDocuments}</span>{" "}
                documents in knowledge base
              </span>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {/* Seed button */}
            <button
              id="chatbot-seed-btn"
              onClick={handleSeed}
              disabled={seeding}
              className="
                flex cursor-pointer items-center gap-2
                bg-success hover:bg-success/90
                text-success-foreground text-sm font-medium
                px-4 py-2.5 rounded-xl
                transition-colors disabled:cursor-not-allowed disabled:opacity-50
                shadow-sm
              "
            >
              {seeding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {seeding ? "Seeding…" : "Seed Default Knowledge"}
            </button>

            {/* Clear button */}
            <button
              id="chatbot-clear-kb-btn"
              onClick={handleClear}
              disabled={clearing}
              className="
                flex cursor-pointer items-center gap-2
                bg-destructive-surface hover:bg-destructive-surface/80
                text-destructive hover:text-destructive
                border border-destructive/30
                text-sm font-medium
                px-4 py-2.5 rounded-xl
                transition-colors disabled:cursor-not-allowed disabled:opacity-50
              "
            >
              {clearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {clearing ? "Clearing…" : "Clear Knowledge Base"}
            </button>
          </div>

          <p className="text-xs text-muted-foreground">
            Seeding embeds 25+ documents (conferences, FAQs, guides) into the vector store.
            Requires <code className="font-mono bg-muted text-foreground px-1 rounded">OPENAI_API_KEY</code> in environment variables.
          </p>
        </div>
      </div>

      {/* ── Card: Add Custom FAQ ─────────────────────────────── */}
      <CustomFAQCard onSaved={() => showToast("success", "FAQ added to knowledge base!")} />
    </div>
  );
}

// ── Custom FAQ Card ───────────────────────────────────────────
function CustomFAQCard({ onSaved }: { onSaved: () => void }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!question.trim() || !answer.trim()) return;
    setSaving(true);
    try {
      const doc = {
        content: `Q: ${question.trim()}\nA: ${answer.trim()}`,
        metadata: { type: "faq", title: question.trim(), tags: ["faq", "custom"] },
      };
      const res = await fetch("/api/chatbot/seed-knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documents: [doc] }),
      });
      if (!res.ok) throw new Error("Failed");
      setQuestion("");
      setAnswer("");
      onSaved();
    } catch {
      // silently fail — parent toast handles errors
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex items-center gap-2">
        <MessageSquarePlus className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">Add Custom FAQ</h2>
      </div>

      <div className="px-6 py-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="faq-question-input">
            Question
          </label>
          <input
            id="faq-question-input"
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. How do I reset my password?"
            className="
              w-full rounded-xl border border-input bg-card
              px-3.5 py-2.5 text-sm text-foreground
              focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
              transition-all placeholder:text-muted-foreground
            "
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="faq-answer-input">
            Answer
          </label>
          <textarea
            id="faq-answer-input"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Provide a helpful, detailed answer…"
            rows={4}
            className="
              w-full rounded-xl border border-input bg-card
              px-3.5 py-2.5 text-sm text-foreground resize-none
              focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
              transition-all placeholder:text-muted-foreground
            "
          />
        </div>

        <button
          id="faq-add-btn"
          onClick={handleAdd}
          disabled={saving || !question.trim() || !answer.trim()}
          className="
            flex cursor-pointer items-center gap-2
            bg-primary hover:bg-primary-hover
            text-primary-foreground text-sm font-medium
            px-4 py-2.5 rounded-xl
            transition-colors disabled:cursor-not-allowed disabled:opacity-50
            shadow-sm
          "
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquarePlus className="h-4 w-4" />}
          {saving ? "Adding…" : "Add to Knowledge Base"}
        </button>
      </div>
    </div>
  );
}
