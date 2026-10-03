import { create } from "zustand";
import { persist } from "zustand/middleware";

// Types for generation parameters
export interface ImageParams {
  prompt: string;
  model: "z-image-turbo";
  steps: number;
  cfgScale: number;
  width: number;
  height: number;
  seed?: number;
  negativePrompt?: string;
}

export interface VideoParams {
  prompt: string;
  variant: "text2video" | "img2video";
  numFrames: number;
  cfgScale: number;
  seed?: number;
  sourceImageUrl?: string;
}

export interface AudioParams {
  variant: "music" | "tts";

  // ACE-Step fields
  prompt: string;
  duration: number;
  guidanceScale: number;

  // Qwen3-TTS fields
  text?: string;
  voicePreset?:
    | "ryan"
    | "aiden"
    | "vivian"
    | "serena"
    | "uncle_fu"
    | "dylan"
    | "eric"
    | "ono_anna"
    | "sohee"
    | "custom";
  voiceReferenceUrl?: string;
  language: "en" | "zh" | "ja" | "ko" | "de" | "fr" | "ru" | "pt" | "es" | "it";
  speed: number;
}

export interface GenerationJob {
  id: string;
  type: "image" | "video" | "audio";
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  prompt: string;
  outputUrl?: string;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

interface GenerationStore {
  // Image generation state
  imageParams: ImageParams;
  setImageParams: (params: Partial<ImageParams>) => void;
  resetImageParams: () => void;

  // Video generation state
  videoParams: VideoParams;
  setVideoParams: (params: Partial<VideoParams>) => void;
  resetVideoParams: () => void;

  // Audio generation state
  audioParams: AudioParams;
  setAudioParams: (params: Partial<AudioParams>) => void;
  resetAudioParams: () => void;

  // Active generation jobs
  activeJobs: GenerationJob[];
  addJob: (job: GenerationJob) => void;
  updateJob: (id: string, updates: Partial<GenerationJob>) => void;
  removeJob: (id: string) => void;
  clearCompletedJobs: () => void;

  // History (last 50 generations)
  history: GenerationJob[];
  addToHistory: (job: GenerationJob) => void;
  clearHistory: () => void;
}

const defaultImageParams: ImageParams = {
  prompt: "",
  model: "z-image-turbo",
  steps: 9,
  cfgScale: 0,
  width: 1024,
  height: 1024,
  negativePrompt: "",
};

const defaultVideoParams: VideoParams = {
  prompt: "",
  variant: "text2video",
  numFrames: 81,
  cfgScale: 4.0,
};

const defaultAudioParams: AudioParams = {
  variant: "music",
  prompt: "",
  duration: 30,
  guidanceScale: 3.0,
  language: "en",
  speed: 1.0,
};

export const useGenerationStore = create<GenerationStore>()(
  persist(
    (set) => ({
      // Image state
      imageParams: defaultImageParams,
      setImageParams: (params) =>
        set((state) => ({
          imageParams: { ...state.imageParams, ...params },
        })),
      resetImageParams: () => set({ imageParams: defaultImageParams }),

      // Video state
      videoParams: defaultVideoParams,
      setVideoParams: (params) =>
        set((state) => ({
          videoParams: { ...state.videoParams, ...params },
        })),
      resetVideoParams: () => set({ videoParams: defaultVideoParams }),

      // Audio state
      audioParams: defaultAudioParams,
      setAudioParams: (params) =>
        set((state) => ({
          audioParams: { ...state.audioParams, ...params },
        })),
      resetAudioParams: () => set({ audioParams: defaultAudioParams }),

      // Active jobs
      activeJobs: [],
      addJob: (job) =>
        set((state) => ({
          activeJobs: [...state.activeJobs, job],
        })),
      updateJob: (id, updates) =>
        set((state) => ({
          activeJobs: state.activeJobs.map((job) => (job.id === id ? { ...job, ...updates } : job)),
        })),
      removeJob: (id) =>
        set((state) => ({
          activeJobs: state.activeJobs.filter((job) => job.id !== id),
        })),
      clearCompletedJobs: () =>
        set((state) => ({
          activeJobs: state.activeJobs.filter(
            (job) => job.status !== "completed" && job.status !== "failed",
          ),
        })),

      // History
      history: [],
      addToHistory: (job) =>
        set((state) => ({
          history: [job, ...state.history].slice(0, 50), // Keep last 50
        })),
      clearHistory: () => set({ history: [] }),
    }),
    {
      name: "generation-storage",
      // v2: models were swapped (FLUX/Mochi/CogVideoX/MusicGen/F5-TTS ->
      // Z-Image-Turbo/Wan2.2/ACE-Step/Qwen3-TTS), so old persisted params are invalid.
      version: 2,
      migrate: (persisted) => ({
        ...(persisted as GenerationStore),
        imageParams: defaultImageParams,
        videoParams: defaultVideoParams,
        audioParams: defaultAudioParams,
      }),
      partialize: (state) => ({
        imageParams: state.imageParams,
        videoParams: state.videoParams,
        audioParams: state.audioParams,
        history: state.history,
      }),
    },
  ),
);
