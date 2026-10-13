"use client";

import { useState } from "react";
import Link from "next/link";
import {
  X,
  FileText,
  Mic,
  Camera,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowRight,
  Sparkles,
  Zap,
  Volume2,
  ImageIcon,
} from "lucide-react";
import {
  transcribeAudio,
  analyzeImageComplaint,
  createComplaintIntake,
  ComplaintDetail,
} from "@/lib/api";

interface IntakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (complaint: ComplaintDetail) => void;
}

export default function IntakeModal({ isOpen, onClose, onSuccess }: IntakeModalProps) {
  const [activeTab, setActiveTab] = useState<"text" | "audio" | "image">("text");

  // Text state
  const [rawText, setRawText] = useState("");
  const [sourceChannel, setSourceChannel] = useState("Web Portal");
  const [language, setLanguage] = useState("Hinglish");

  // Audio state
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioFileName, setAudioFileName] = useState("");
  const [transcribing, setTranscribing] = useState(false);
  const [transcript, setTranscript] = useState("");

  // Image state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageFileName, setImageFileName] = useState("");
  const [imageCaption, setImageCaption] = useState("");
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [extractedDescription, setExtractedDescription] = useState("");

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ComplaintDetail | null>(null);

  if (!isOpen) return null;

  const resetAll = () => {
    setRawText("");
    setAudioFile(null);
    setAudioFileName("");
    setTranscript("");
    setImageFile(null);
    setImageFileName("");
    setImageCaption("");
    setExtractedDescription("");
    setError(null);
    setResult(null);
  };

  const handleClose = () => {
    resetAll();
    onClose();
  };

  // Convert File to base64 string
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  // Handle audio file selection and transcription
  const handleAudioUpload = async (file: File) => {
    setAudioFile(file);
    setAudioFileName(file.name);
    setTranscribing(true);
    setError(null);
    try {
      const b64 = await fileToBase64(file);
      const res = await transcribeAudio(b64, file.name);
      setTranscript(res.transcript);
      setRawText(res.transcript);
      setSourceChannel("Voice Recording");
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Audio transcription failed.");
    } finally {
      setTranscribing(false);
    }
  };

  // Handle mock demo audio sample
  const handleSelectDemoAudio = async (sampleName: string, text: string) => {
    setAudioFileName(`${sampleName}.wav`);
    setTranscribing(true);
    setError(null);
    setTimeout(() => {
      setTranscript(text);
      setRawText(text);
      setSourceChannel("Voice Recording");
      setTranscribing(false);
    }, 600);
  };

  // Handle image file selection and multimodal analysis
  const handleImageUpload = async (file: File) => {
    setImageFile(file);
    setImageFileName(file.name);
    setAnalyzingImage(true);
    setError(null);
    try {
      const b64 = await fileToBase64(file);
      const res = await analyzeImageComplaint(b64, file.name, imageCaption);
      setExtractedDescription(res.extracted_complaint);
      setRawText(res.extracted_complaint);
      setSourceChannel("Citizen Photo");
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Image analysis failed.");
    } finally {
      setAnalyzingImage(false);
    }
  };

  // Handle mock demo image sample
  const handleSelectDemoImage = (sampleName: string, caption: string, extracted: string) => {
    setImageFileName(`${sampleName}.jpg`);
    setImageCaption(caption);
    setExtractedDescription(extracted);
    setRawText(extracted);
    setSourceChannel("Citizen Photo");
  };

  // Submit Complaint for AI Triage
  const handleSubmitTriage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText || rawText.trim().length < 5) {
      setError("Please provide a complaint statement of at least 5 characters.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const newTicket = await createComplaintIntake({
        raw_text: rawText.trim(),
        source_channel: sourceChannel,
        language: language,
        run_triage: true,
      });
      setResult(newTicket);
      if (onSuccess) onSuccess(newTicket);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to triage complaint.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-3xl glass-panel-elevated overflow-hidden my-8 animate-float-up border border-[var(--border-default)]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-subtle)] bg-[#030712]/60">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
                <Sparkles className="w-4 h-4" />
              </span>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Multimodal Grievance Ingestion
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Ingest text, citizen voice notes, or photo evidence directly into the Gemini triage pipeline.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success State */}
        {result ? (
          <div className="p-7 space-y-6">
            <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-200 flex items-start gap-3.5">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-emerald-300 text-sm">Grievance Triaged Successfully!</h3>
                <p className="text-xs text-emerald-300/80 mt-1 leading-relaxed">
                  Ticket <span className="font-mono font-bold text-white">{result.complaint_id}</span> has been processed
                  through urgency scoring, locality normalization, and duplicate detection.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/[0.08] space-y-3">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 uppercase font-bold text-[10px]">Assigned Department</span>
                  <p className="text-sm font-bold text-white mt-1">
                    {result.ai_recommendation.department || "General Administration"}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 uppercase font-bold text-[10px]">Category</span>
                  <p className="text-sm font-semibold text-slate-200 mt-1">
                    {result.ai_recommendation.category || "Unclassified"}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 uppercase font-bold text-[10px]">Urgency Assessment</span>
                  <p className="text-sm font-bold text-amber-400 mt-1">
                    {result.ai_recommendation.urgency || "MEDIUM"} (Score: {result.ai_recommendation.urgency_score || 0}/12)
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 uppercase font-bold text-[10px]">Duplicate Status</span>
                  <p className="text-sm font-semibold text-slate-300 mt-1 capitalize">
                    {result.duplicate_info.duplicate_status || "Unique"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={resetAll}
                className="px-4 py-2.5 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
              >
                Submit Another Complaint
              </button>
              <Link
                href={`/complaints/${result.complaint_id}`}
                onClick={handleClose}
                className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-lg shadow-blue-500/25 transition-all"
              >
                <span>Open Ticket for Review</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmitTriage} className="p-6 space-y-5">
            {/* Tabs */}
            <div className="flex p-1 rounded-xl bg-slate-900/80 border border-white/[0.06] text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("text")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-bold transition-all ${
                  activeTab === "text"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Text Grievance</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("audio")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-bold transition-all ${
                  activeTab === "audio"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Mic className="w-4 h-4" />
                <span>Voice Audio</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("image")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-bold transition-all ${
                  activeTab === "image"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>Photo Evidence</span>
              </button>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* TAB 1: TEXT */}
            {activeTab === "text" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                    Citizen Complaint Statement
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Enter citizen grievance in Hindi, Hinglish, or English..."
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900 border border-white/[0.1] rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors leading-relaxed"
                  />
                </div>

                {/* Quick Demo Pre-sets */}
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Quick Scenario Presets:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setRawText("Kolar me 3 din se paani nahi aa raha hai, pipeline phat gayi hai.");
                        setLanguage("Hinglish");
                      }}
                      className="px-3 py-1.5 text-xs font-semibold bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-xl border border-white/[0.06] transition-colors"
                    >
                      💧 Kolar Pipeline Burst
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRawText("Urgent: Main road open manhole in MP Nagar Zone 1, two wheelers falling, severe hazard.");
                        setLanguage("English");
                      }}
                      className="px-3 py-1.5 text-xs font-semibold bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-xl border border-white/[0.06] transition-colors"
                    >
                      🚨 MP Nagar Open Manhole
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRawText("Arera Colony E-sector mein pichle ek hafte se kachra nahi utha hai, bohot badbu aa rahi hai.");
                        setLanguage("Hinglish");
                      }}
                      className="px-3 py-1.5 text-xs font-semibold bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-xl border border-white/[0.06] transition-colors"
                    >
                      🗑️ Arera Colony Garbage
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: AUDIO */}
            {activeTab === "audio" && (
              <div className="space-y-4">
                <div className="p-6 border-2 border-dashed border-slate-700/80 rounded-2xl bg-slate-900/40 text-center">
                  <UploadCloud className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-200 font-bold">Upload voice note recording</p>
                  <p className="text-[11px] text-slate-500 mt-1">Supports .wav, .mp3, .ogg, .m4a, .webm (max 25MB)</p>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleAudioUpload(e.target.files[0]);
                    }}
                    className="mt-3 text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
                  />
                </div>

                {/* Demo Audio Buttons */}
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Or select pre-recorded voice note:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleSelectDemoAudio(
                          "kolar_water_call",
                          "Kolar me 3 din se paani nahi aa raha hai kripya jaldi theek karein, pipeline leak ho rahi hai."
                        )
                      }
                      className="px-3 py-1.5 text-xs font-semibold bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-xl border border-white/[0.06] transition-colors"
                    >
                      🎙️ Audio: Kolar Water Supply
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleSelectDemoAudio(
                          "mp_nagar_pothole",
                          "Hamare MP Nagar main road par bohot bada gaddha ho gaya hai, bikes gir rahi hain."
                        )
                      }
                      className="px-3 py-1.5 text-xs font-semibold bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-xl border border-white/[0.06] transition-colors"
                    >
                      🎙️ Audio: Road Pothole Call
                    </button>
                  </div>
                </div>

                {transcribing && (
                  <div className="flex items-center justify-center gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-300 font-semibold">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                    Transcribing speech with speech model...
                  </div>
                )}

                {transcript && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1.5 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Speech Transcript (Editable)
                    </label>
                    <textarea
                      rows={3}
                      value={transcript}
                      onChange={(e) => {
                        setTranscript(e.target.value);
                        setRawText(e.target.value);
                      }}
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-emerald-500/40 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: IMAGE */}
            {activeTab === "image" && (
              <div className="space-y-4">
                <div className="p-6 border-2 border-dashed border-slate-700/80 rounded-2xl bg-slate-900/40 text-center">
                  <Camera className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-200 font-bold">Upload citizen photo</p>
                  <p className="text-[11px] text-slate-500 mt-1">Supports .jpg, .png, .webp evidence files</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleImageUpload(e.target.files[0]);
                    }}
                    className="mt-3 text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Optional Citizen Caption
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Deep pothole causing accidents near Kolar market..."
                    value={imageCaption}
                    onChange={(e) => setImageCaption(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-white/[0.1] rounded-xl text-xs text-white placeholder-slate-500"
                  />
                </div>

                {/* Demo Photo Scenarios */}
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Or select demo photo scenario:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleSelectDemoImage(
                          "pothole_kolar",
                          "Dangerous deep pothole near Kolar market",
                          "Visual Evidence: Photo shows a severe deep pothole and broken asphalt hazard on the road. Citizen caption: 'Dangerous deep pothole near Kolar market'."
                        )
                      }
                      className="px-3 py-1.5 text-xs font-semibold bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-xl border border-white/[0.06] transition-colors"
                    >
                      📷 Photo: Kolar Road Pothole
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleSelectDemoImage(
                          "garbage_arera",
                          "Garbage pile overflowing for 5 days",
                          "Visual Evidence: Photo shows an overflowing municipal garbage dump with uncollected waste scattered on the street. Citizen caption: 'Garbage pile overflowing for 5 days'."
                        )
                      }
                      className="px-3 py-1.5 text-xs font-semibold bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-xl border border-white/[0.06] transition-colors"
                    >
                      📷 Photo: Waste Overflow
                    </button>
                  </div>
                </div>

                {analyzingImage && (
                  <div className="flex items-center justify-center gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-300 font-semibold">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                    Extracting problem representations via Gemini Vision...
                  </div>
                )}

                {extractedDescription && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1.5 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Visual Ingestion Summary
                    </label>
                    <textarea
                      rows={3}
                      value={extractedDescription}
                      onChange={(e) => {
                        setExtractedDescription(e.target.value);
                        setRawText(e.target.value);
                      }}
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-emerald-500/40 rounded-xl text-xs text-white"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Channels & Language */}
            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/[0.06]">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">Source Channel</label>
                <select
                  value={sourceChannel}
                  onChange={(e) => setSourceChannel(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-white/[0.1] rounded-xl text-xs text-white"
                >
                  <option value="Web Portal">Web Portal</option>
                  <option value="Helpline 181">Helpline 181</option>
                  <option value="Voice Recording">Voice Recording</option>
                  <option value="Citizen Photo">Citizen Photo</option>
                  <option value="WhatsApp Bot">WhatsApp Bot</option>
                  <option value="Walk-in Kiosk">Walk-in Kiosk</option>
                  <option value="Mobile App">Mobile App</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-white/[0.1] rounded-xl text-xs text-white"
                >
                  <option value="Hinglish">Hinglish</option>
                  <option value="Hindi">Hindi</option>
                  <option value="English">English</option>
                </select>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={handleClose}
                disabled={submitting}
                className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !rawText.trim()}
                className="btn-sheen flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:pointer-events-none rounded-xl shadow-lg shadow-blue-500/25 transition-all"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Running AI Triage...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Submit & Run AI Triage</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
