import { create } from "zustand";
import { persist } from "zustand/middleware";

// Types for generation parameters
export interface ImageParams {
  prompt: string;
  model: "flux1-dev" | "flux2-dev" | "flux2-schnell";
  steps: number;
  cfgScale: number;
  width: number;
  height: number;
  seed?: number;
  negativePrompt?: string;
}

export interface VideoParams {
  prompt: string;
  model: "mochi" | "cogvideox";
  variant: "text2video" | "img2video";
  duration: number;
  fps: number;
  motionStrength: number;
  sourceImageUrl?: string;
  seed?: number;
}

export interface AudioParams {
  prompt: string;
  duration: number;
  temperature: number;
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
  model: "flux2-dev",
  steps: 30,
  cfgScale: 7,
  width: 1024,
  height: 1024,
  negativePrompt: "",
};

const defaultVideoParams: VideoParams = {
  prompt: "",
  model: "mochi",
  variant: "text2video",
  duration: 5,
  fps: 30,
  motionStrength: 5,
};

const defaultAudioParams: AudioParams = {
  prompt: "",
  duration: 30,
  temperature: 1,
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
          activeJobs: state.activeJobs.map((job) =>
            job.id === id ? { ...job, ...updates } : job
          ),
        })),
      removeJob: (id) =>
        set((state) => ({
          activeJobs: state.activeJobs.filter((job) => job.id !== id),
        })),
      clearCompletedJobs: () =>
        set((state) => ({
          activeJobs: state.activeJobs.filter(
            (job) => job.status !== "completed" && job.status !== "failed"
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
      partialize: (state) => ({
        imageParams: state.imageParams,
        videoParams: state.videoParams,
        audioParams: state.audioParams,
        history: state.history,
      }),
    }
  )
);
