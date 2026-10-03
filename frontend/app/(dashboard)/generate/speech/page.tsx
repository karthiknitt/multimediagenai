import { redirect } from "next/navigation";

// Speech lives on the Audio page (Speech tab) with the full Qwen3-TTS parameter set.
export default function SpeechGenerationPage() {
  redirect("/generate/audio");
}
