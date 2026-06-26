"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, X, Phone, MessageSquare, Mail, Users, Timer, Square } from "lucide-react";
import { InteractionType } from "@lms/types";
import { useAddInteraction, useUploadFile, useLeadInteractions } from "@/hooks/useLeadDetail";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";

const TYPES = [
  { value: InteractionType.NOTE, label: "Note", icon: MessageSquare },
  { value: InteractionType.CALL, label: "Call", icon: Phone },
  { value: InteractionType.EMAIL, label: "Email", icon: Mail },
  { value: InteractionType.MEETING, label: "Meeting", icon: Users },
];

function formatTime(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function formatDur(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}

export function AddInteractionForm({ leadId }: { leadId: string }) {
  const [type, setType] = useState<InteractionType>(InteractionType.NOTE);
  const [note, setNote] = useState("");
  const [recording, setRecording] = useState<File | null>(null);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Call duration state
  const [timerRunning, setTimerRunning] = useState(false);
  const [elapsedSecs, setElapsedSecs] = useState(0);
  const [manualMins, setManualMins] = useState("");
  const [manualSecs, setManualSecs] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  const addInteraction = useAddInteraction(leadId);
  const uploadFile = useUploadFile();

  // Today's accumulated call duration for this lead (from cache — no extra fetch)
  const { data: interactionsData } = useLeadInteractions(leadId);
  const todayCallSecs = (interactionsData?.interactions ?? [])
    .filter(
      (i: { type: string; callDurationSecs: number | null; createdAt: Date | string }) =>
        i.type === "CALL" &&
        i.callDurationSecs != null &&
        dayjs(i.createdAt).isSame(dayjs(), "day"),
    )
    .reduce(
      (sum: number, i: { callDurationSecs: number | null }) => sum + (i.callDurationSecs ?? 0),
      0,
    );

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Stop timer when switching away from CALL type
  useEffect(() => {
    if (type !== InteractionType.CALL && timerRunning) {
      stopTimer();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  function startTimer() {
    setElapsedSecs(0);
    setTimerRunning(true);
    intervalRef.current = setInterval(() => {
      setElapsedSecs((s) => s + 1);
    }, 1000);
  }

  function stopTimer() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setTimerRunning(false);
    // Populate manual fields from elapsed time
    setManualMins(Math.floor(elapsedSecs / 60).toString());
    setManualSecs((elapsedSecs % 60).toString());
  }

  function resetTimer() {
    stopTimer();
    setElapsedSecs(0);
    setManualMins("");
    setManualSecs("");
  }

  function getDurationSecs(): number | undefined {
    const m = parseInt(manualMins || "0", 10);
    const s = parseInt(manualSecs || "0", 10);
    const total = (isNaN(m) ? 0 : m) * 60 + (isNaN(s) ? 0 : s);
    return total > 0 ? total : undefined;
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setRecording(file);
    setIsUploading(true);

    try {
      const result = await uploadFile.mutateAsync({
        file,
        type: "recording",
      });
      setRecordingUrl(result.url);
    } catch {
      setRecording(null);
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSubmit() {
    if (!note.trim() && !recordingUrl) return;

    if (timerRunning) stopTimer();

    const dur = type === InteractionType.CALL ? getDurationSecs() : undefined;
    await addInteraction.mutateAsync({
      type,
      ...(note.trim() && { note: note.trim() }),
      ...(recordingUrl && { callRecordingUrl: recordingUrl }),
      ...(dur !== undefined && { callDurationSecs: dur }),
    });

    setNote("");
    setRecording(null);
    setRecordingUrl(null);
    resetTimer();
  }

  return (
    <div className="bg-white border border-surface-200 rounded-xl p-4 space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        Add Interaction
      </p>

      {/* Type selector */}
      <div className="flex gap-2 flex-wrap">
        {TYPES.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => setType(t.value)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                type === t.value
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-gray-600 border-surface-200 hover:border-primary",
              )}
            >
              <Icon size={12} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Call duration — only for CALL type */}
      {type === InteractionType.CALL && (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-surface-50 border border-surface-200">
          <Timer size={14} className="text-primary shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1.5">
            <span className="text-xs font-medium text-gray-600">Duration</span>

            {timerRunning ? (
              // Running timer display
              <div className="flex items-center gap-2 flex-wrap">
                {todayCallSecs > 0 && (
                  <span className="text-xs text-gray-400">{formatDur(todayCallSecs)} +</span>
                )}
                <span className="font-mono text-sm font-semibold text-primary tabular-nums">
                  {formatTime(elapsedSecs)}
                </span>
                {todayCallSecs > 0 && (
                  <span className="text-xs text-green-700 font-medium">
                    = {formatDur(todayCallSecs + elapsedSecs)} today
                  </span>
                )}
                <button
                  type="button"
                  onClick={stopTimer}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-red-100 text-red-600 text-xs font-medium hover:bg-red-200 transition-colors"
                >
                  <Square size={10} />
                  Stop
                </button>
              </div>
            ) : (
              // Manual entry + start button
              <div className="flex items-center gap-2 flex-wrap">
                {todayCallSecs > 0 && (
                  <span className="text-xs text-gray-400 shrink-0">
                    {formatDur(todayCallSecs)} +
                  </span>
                )}
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    max={999}
                    value={manualMins}
                    onChange={(e) => setManualMins(e.target.value)}
                    placeholder="0"
                    className="w-14 px-2 py-1 text-sm text-center rounded border border-surface-200 outline-none focus:border-primary tabular-nums"
                    aria-label="Minutes"
                  />
                  <span className="text-xs text-gray-400">min</span>
                  <input
                    type="number"
                    min={0}
                    max={59}
                    value={manualSecs}
                    onChange={(e) => setManualSecs(e.target.value)}
                    placeholder="0"
                    className="w-14 px-2 py-1 text-sm text-center rounded border border-surface-200 outline-none focus:border-primary tabular-nums"
                    aria-label="Seconds"
                  />
                  <span className="text-xs text-gray-400">sec</span>
                </div>
                {todayCallSecs > 0 && (getDurationSecs() ?? 0) > 0 && (
                  <span className="text-xs text-green-700 font-medium shrink-0">
                    = {formatDur(todayCallSecs + (getDurationSecs() ?? 0))} today
                  </span>
                )}
                <button
                  type="button"
                  onClick={startTimer}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                >
                  <Timer size={10} />
                  Start timer
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Note input */}
      <textarea
        title="Add interaction note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={
          type === InteractionType.CALL
            ? "What happened on the call? Any key points..."
            : type === InteractionType.EMAIL
              ? "Describe the email sent..."
              : "Write your note here..."
        }
        rows={3}
        className="w-full px-3 py-2.5 rounded-lg border border-surface-200 text-sm outline-none focus:border-primary resize-none"
      />

      {/* Recording upload — only for CALL type */}
      {type === InteractionType.CALL && (
        <div>
          {recording ? (
            <div className="flex items-center gap-2 px-3 py-2 bg-surface-50 rounded-lg border border-surface-200">
              <Phone size={13} className="text-primary" />
              <span className="text-xs text-gray-600 flex-1 truncate">
                {isUploading ? "Uploading..." : recording.name}
              </span>
              {!isUploading && (
                <button
                  type="button"
                  title="Remove recording"
                  onClick={() => {
                    setRecording(null);
                    setRecordingUrl(null);
                  }}
                  className="text-gray-400 hover:text-red-500"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-surface-300 text-xs text-gray-500 hover:border-primary hover:text-primary transition-colors w-full"
            >
              <Upload size={13} />
              Upload call recording (optional)
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            title="Select call recording file"
            accept="audio/*,video/mp4"
            onChange={(e) => void handleFileSelect(e)}
            className="hidden"
          />
        </div>
      )}

      {/* Submit */}
      <div className="flex justify-end">
        <button
          type="submit"
          onClick={() => void handleSubmit()}
          disabled={
            (!note.trim() && !recordingUrl) ||
            addInteraction.isPending ||
            isUploading
          }
          className="px-5 py-2 rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary-800 disabled:opacity-50 transition-colors"
        >
          {addInteraction.isPending ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
