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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/80">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-400" />
              Multimodal Complaint Intake
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Submit civic grievances via text, citizen voice audio, or photo evidence into the AI triage pipeline.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success State */}
        {result ? (
          <div className="p-8 space-y-6">
            <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-200 flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-emerald-300">Complaint Triaged Successfully!</h3>
                <p className="text-xs text-emerald-300/80 mt-1">
                  Ticket <span className="font-mono font-bold text-white">{result.complaint_id}</span> has been processed
                  through urgency scoring, locality normalization, and duplicate detection.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 uppercase font-semibold">Assigned Department</span>
                  <p className="text-sm font-semibold text-white mt-0.5">
                    {result.ai_recommendation.department || "General Administration"}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500 uppercase font-semibold">Category</span>
                  <p className="text-sm font-semibold text-slate-200 mt-0.5">
                    {result.ai_recommendation.category || "Unclassified"}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500 uppercase font-semibold">Urgency Assessment</span>
                  <p className="text-sm font-semibold text-amber-400 mt-0.5">
                    {result.ai_recommendation.urgency || "MEDIUM"} (Score: {result.ai_recommendation.urgency_score || 0}/12)
                  </p>
                </div>
                <div>
                  <span className="text-slate-500 uppercase font-semibold">Duplicate Advisory</span>
                  <p className="text-sm font-semibold text-slate-300 mt-0.5 capitalize">
                    {result.duplicate_info.duplicate_status || "Unique"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={resetAll}
                className="px-4 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                Submit Another Complaint
              </button>
              <Link
                href={`/complaints/${result.complaint_id}`}
                onClick={handleClose}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm transition-colors"
              >
                Open Ticket for Review
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmitTriage} className="p-6 space-y-5">
            {/* Tabs */}
            <div className="flex border-b border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab("text")}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                  activeTab === "text"
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <FileText className="w-4 h-4" />
                Text Intake
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("audio")}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                  activeTab === "audio"
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Mic className="w-4 h-4" />
                Voice / Audio Intake
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("image")}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                  activeTab === "image"
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Camera className="w-4 h-4" />
                Photo Evidence Intake
              </button>
            </div>

            {error && (
              <div className="p-3.5 rounded-lg bg-red-950/60 border border-red-800/80 text-red-200 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* TAB 1: TEXT */}
            {activeTab === "text" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Citizen Complaint Statement
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Enter verbatim complaint in Hindi, Hinglish, or English..."
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                {/* Quick Demo Pre-sets */}
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                    Quick Demo Presets
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setRawText("Kolar me 3 din se paani nahi aa raha hai, pipeline phat gayi hai.");
                        setLanguage("Hinglish");
                      }}
                      className="px-2.5 py-1 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-700 transition-colors"
                    >
                      💧 Multilingual (Kolar Water)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRawText("Urgent: Main road open manhole in MP Nagar Zone 1, two wheelers falling, severe hazard.");
                        setLanguage("English");
                      }}
                      className="px-2.5 py-1 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-700 transition-colors"
                    >
                      🚨 Critical Hazard (MP Nagar Drain)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRawText("Arera Colony E-sector mein pichle ek hafte se kachra nahi utha hai, bohot badbu aa rahi hai.");
                        setLanguage("Hinglish");
                      }}
                      className="px-2.5 py-1 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-700 transition-colors"
                    >
                      🗑️ Sanitation (Arera Garbage)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: AUDIO */}
            {activeTab === "audio" && (
              <div className="space-y-4">
                <div className="p-4 border-2 border-dashed border-slate-700 rounded-xl bg-slate-950/60 text-center">
                  <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-300 font-medium">Upload audio recording</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Supports .wav, .mp3, .ogg, .m4a, .webm (max 25MB)</p>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleAudioUpload(e.target.files[0]);
                    }}
                    className="mt-3 text-xs text-slate-400 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
                  />
                </div>

                {/* Demo Audio Buttons */}
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                    Or select demo voice recording:
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
                      className="px-2.5 py-1 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-700 transition-colors"
                    >
                      🎙️ Audio: Kolar Water Call
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleSelectDemoAudio(
                          "mp_nagar_pothole",
                          "Hamare MP Nagar main road par bohot bada gaddha ho gaya hai, bikes gir rahi hain."
                        )
                      }
                      className="px-2.5 py-1 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-700 transition-colors"
                    >
                      🎙️ Audio: Pothole Hazard Call
                    </button>
                  </div>
                </div>

                {transcribing && (
                  <div className="flex items-center justify-center gap-2 p-3 bg-blue-950/40 rounded-lg text-xs text-blue-300">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                    Transcribing speech to text...
                  </div>
                )}

                {transcript && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-1.5 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Operator Transcript Inspection (Editable)
                    </label>
                    <textarea
                      rows={3}
                      value={transcript}
                      onChange={(e) => {
                        setTranscript(e.target.value);
                        setRawText(e.target.value);
                      }}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-emerald-800/80 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: IMAGE */}
            {activeTab === "image" && (
              <div className="space-y-4">
                <div className="p-4 border-2 border-dashed border-slate-700 rounded-xl bg-slate-950/60 text-center">
                  <Camera className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-300 font-medium">Upload grievance photograph</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Supports .jpg, .png, .webp</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleImageUpload(e.target.files[0]);
                    }}
                    className="mt-3 text-xs text-slate-400 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Optional Citizen Caption
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Road near Kolar has a dangerous pothole..."
                    value={imageCaption}
                    onChange={(e) => setImageCaption(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                {/* Demo Photo Buttons */}
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
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
                      className="px-2.5 py-1 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-700 transition-colors"
                    >
                      📷 Photo: Kolar Pothole
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
                      className="px-2.5 py-1 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-700 transition-colors"
                    >
                      📷 Photo: Overflowing Garbage
                    </button>
                  </div>
                </div>

                {analyzingImage && (
                  <div className="flex items-center justify-center gap-2 p-3 bg-blue-950/40 rounded-lg text-xs text-blue-300">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                    Extracting visual evidence and problem representation...
                  </div>
                )}

                {extractedDescription && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-1.5 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Common Complaint Representation (Visual + Caption)
                    </label>
                    <textarea
                      rows={3}
                      value={extractedDescription}
                      onChange={(e) => {
                        setExtractedDescription(e.target.value);
                        setRawText(e.target.value);
                      }}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-emerald-800/80 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Channels & Language */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Source Channel</label>
                <select
                  value={sourceChannel}
                  onChange={(e) => setSourceChannel(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500"
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
                <label className="block text-xs font-semibold text-slate-400 mb-1">Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="Hinglish">Hinglish</option>
                  <option value="Hindi">Hindi</option>
                  <option value="English">English</option>
                </select>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={handleClose}
                disabled={submitting}
                className="px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !rawText.trim()}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:pointer-events-none rounded-lg shadow-sm transition-colors"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Running AI Triage...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Submit & Run AI Triage
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
