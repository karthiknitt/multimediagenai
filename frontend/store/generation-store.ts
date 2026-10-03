import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  defaultsFor,
  IMAGE_PARAMS,
  MUSIC_PARAMS,
  type ParamInput,
  TTS_PARAMS,
  VIDEO_PARAMS,
} from "@/lib/model-params";

// Generation parameters: the per-model tunables come from the registry in lib/model-params.ts
export type ImageParams = {
  prompt: string;
  model: "z-image-turbo";
} & ParamInput<typeof IMAGE_PARAMS>;

export type VideoParams = {
  prompt: string;
  variant: "text2video" | "img2video";
  sourceImageUrl?: string;
} & ParamInput<typeof VIDEO_PARAMS>;

export type AudioParams = {
  variant: "music" | "tts";
  prompt: string;
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
} & ParamInput<typeof MUSIC_PARAMS> &
  ParamInput<typeof TTS_PARAMS>;

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
  ...(defaultsFor(IMAGE_PARAMS) as ParamInput<typeof IMAGE_PARAMS>),
};

const defaultVideoParams: VideoParams = {
  prompt: "",
  variant: "text2video",
  ...(defaultsFor(VIDEO_PARAMS) as ParamInput<typeof VIDEO_PARAMS>),
};

const defaultAudioParams: AudioParams = {
  variant: "music",
  prompt: "",
  language: "en",
  ...(defaultsFor(MUSIC_PARAMS) as ParamInput<typeof MUSIC_PARAMS>),
  ...(defaultsFor(TTS_PARAMS) as ParamInput<typeof TTS_PARAMS>),
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
      // v3: params are registry-driven (lib/model-params.ts); reset to the new defaults.
      version: 3,
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
