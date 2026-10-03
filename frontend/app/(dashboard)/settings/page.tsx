"use client";

import { useQueryClient } from "@tanstack/react-query";
import { KeyRound, SlidersHorizontal, Trash2, User } from "lucide-react";
import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { authClient, useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { useGenerationStore } from "@/store/generation-store";
import { useUserStore } from "@/store/user-store";

type Notice = { kind: "ok" | "error"; text: string } | null;

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof User;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="card-premium p-6">
      <div className="mb-5 flex items-start gap-3">
        <div className="rounded-xl bg-cyan-500/10 p-2">
          <Icon className="h-5 w-5 text-cyan-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold">{title}</h2>
          <p className="text-sm text-foreground/60">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function NoticeLine({ notice }: { notice: Notice }) {
  if (!notice) return null;
  return (
    <p
      role={notice.kind === "error" ? "alert" : "status"}
      className={cn("text-sm", notice.kind === "error" ? "text-red-400" : "text-emerald-400")}
    >
      {notice.text}
    </p>
  );
}

const fieldClass = "input-premium w-full";
const buttonClass = "btn-premium px-5 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50";

function ProfileSection() {
  const { data: session } = useSession();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  useEffect(() => {
    if (session?.user?.name) setName(session.user.name);
  }, [session?.user?.name]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setNotice({ kind: "error", text: "Name must be at least 2 characters." });
      return;
    }
    setBusy(true);
    const { error } = await authClient.updateUser({ name: trimmed });
    setBusy(false);
    setNotice(
      error
        ? { kind: "error", text: error.message ?? "Update failed." }
        : { kind: "ok", text: "Profile updated." },
    );
  };

  return (
    <Section icon={User} title="Profile" description="How you appear in the app.">
      <form onSubmit={onSubmit} className="max-w-md space-y-4">
        <div className="space-y-2">
          <label htmlFor="settings-name" className="text-sm font-medium">
            Name
          </label>
          <input
            id="settings-name"
            className={fieldClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            autoComplete="name"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="settings-email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="settings-email"
            className={cn(fieldClass, "opacity-60")}
            value={session?.user?.email ?? ""}
            readOnly
          />
        </div>
        <div className="flex items-center gap-4">
          <button type="submit" className={buttonClass} disabled={busy}>
            {busy ? "Saving…" : "Save profile"}
          </button>
          <NoticeLine notice={notice} />
        </div>
      </form>
    </Section>
  );
}

function PasswordSection() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [revoke, setRevoke] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (next.length < 8) {
      setNotice({ kind: "error", text: "New password must be at least 8 characters." });
      return;
    }
    if (next !== confirm) {
      setNotice({ kind: "error", text: "New passwords don't match." });
      return;
    }
    setBusy(true);
    const { error } = await authClient.changePassword({
      currentPassword: current,
      newPassword: next,
      revokeOtherSessions: revoke,
    });
    setBusy(false);
    if (error) {
      setNotice({ kind: "error", text: error.message ?? "Couldn't change password." });
      return;
    }
    setCurrent("");
    setNext("");
    setConfirm("");
    setNotice({ kind: "ok", text: "Password changed." });
  };

  return (
    <Section icon={KeyRound} title="Password" description="Change the password you sign in with.">
      <form onSubmit={onSubmit} className="max-w-md space-y-4">
        {[
          {
            id: "cur",
            label: "Current password",
            value: current,
            set: setCurrent,
            ac: "current-password",
          },
          { id: "new", label: "New password", value: next, set: setNext, ac: "new-password" },
          {
            id: "conf",
            label: "Confirm new password",
            value: confirm,
            set: setConfirm,
            ac: "new-password",
          },
        ].map((f) => (
          <div key={f.id} className="space-y-2">
            <label htmlFor={`settings-${f.id}`} className="text-sm font-medium">
              {f.label}
            </label>
            <input
              id={`settings-${f.id}`}
              type="password"
              className={fieldClass}
              value={f.value}
              onChange={(e) => f.set(e.target.value)}
              autoComplete={f.ac}
              required
            />
          </div>
        ))}
        <label className="flex items-center gap-2 text-sm text-foreground/70">
          <input type="checkbox" checked={revoke} onChange={(e) => setRevoke(e.target.checked)} />
          Sign out of my other devices
        </label>
        <div className="flex items-center gap-4">
          <button type="submit" className={buttonClass} disabled={busy || !current || !next}>
            {busy ? "Changing…" : "Change password"}
          </button>
          <NoticeLine notice={notice} />
        </div>
      </form>
    </Section>
  );
}

function PreferencesSection() {
  const { preferences, setPreferences } = useUserStore();
  const resetImage = useGenerationStore((s) => s.resetImageParams);
  const resetVideo = useGenerationStore((s) => s.resetVideoParams);
  const resetAudio = useGenerationStore((s) => s.resetAudioParams);
  const [notice, setNotice] = useState<Notice>(null);

  return (
    <Section
      icon={SlidersHorizontal}
      title="Generation preferences"
      description="Stored in this browser."
    >
      <div className="max-w-md space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium" id="adv-label">
              Open advanced options by default
            </p>
            <p className="text-xs text-foreground/60">
              Expands the advanced parameter group on the generation pages.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={preferences.showAdvancedOptions}
            aria-labelledby="adv-label"
            onClick={() =>
              setPreferences({ showAdvancedOptions: !preferences.showAdvancedOptions })
            }
            className={cn(
              "relative h-6 w-11 shrink-0 rounded-full border transition-colors",
              preferences.showAdvancedOptions
                ? "border-cyan-400 bg-cyan-500/40"
                : "border-border bg-secondary",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-4.5 w-4.5 rounded-full bg-foreground transition-all",
                preferences.showAdvancedOptions ? "left-[1.375rem]" : "left-0.5",
              )}
            />
          </button>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="rounded-lg border border-foreground/20 px-4 py-2 text-sm font-semibold hover:border-cyan-400/50"
            onClick={() => {
              resetImage();
              resetVideo();
              resetAudio();
              setNotice({ kind: "ok", text: "Saved parameters reset to defaults." });
            }}
          >
            Reset saved parameters
          </button>
          <NoticeLine notice={notice} />
        </div>
      </div>
    </Section>
  );
}

function DataSection() {
  const queryClient = useQueryClient();
  const clearHistory = useGenerationStore((s) => s.clearHistory);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const deleteAll = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/generations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE" }),
      });
      if (!res.ok) throw new Error("Request failed");
      const data: { deleted: number } = await res.json();
      clearHistory();
      await queryClient.invalidateQueries();
      setNotice({
        kind: "ok",
        text: `Deleted ${data.deleted} generation${data.deleted === 1 ? "" : "s"}.`,
      });
    } catch {
      setNotice({ kind: "error", text: "Couldn't delete generations. Please try again." });
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  return (
    <Section
      icon={Trash2}
      title="Your data"
      description="Permanently remove everything you've generated, including the stored files."
    >
      <div className="flex flex-wrap items-center gap-4">
        {confirming ? (
          <>
            <span className="text-sm text-red-300">
              This can't be undone. Delete all generations?
            </span>
            <button
              type="button"
              disabled={busy}
              onClick={deleteAll}
              className="rounded-lg bg-red-500/20 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/30 disabled:opacity-50"
            >
              {busy ? "Deleting…" : "Yes, delete everything"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirming(false)}
              className="rounded-lg border border-foreground/20 px-4 py-2 text-sm font-semibold"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="rounded-lg border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/10"
          >
            Delete all my generations
          </button>
        )}
        <NoticeLine notice={notice} />
      </div>
    </Section>
  );
}

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-4xl sm:text-5xl font-bold mb-2">
          <span className="gradient-text">Settings</span>
        </h1>
        <p className="text-foreground/60 text-lg">Manage your account and preferences</p>
      </header>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ProfileSection />
        <PasswordSection />
        <PreferencesSection />
        <DataSection />
      </div>
    </div>
  );
}
