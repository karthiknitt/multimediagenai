# indic-speech (Modal app)

Indic text-to-speech and speech-to-text.

| Class | Model | GPU | Endpoint |
|---|---|---|---|
| `IndicTTS.generate` | `maya-research/maya2-native` (Apache-2.0; hi, ta, te, bn, gu, kn, ml, mr, or, pa, as, en; 24 kHz) | A10G | POST `{job_id, text, language, voice?, parameters?{normalize}}` |
| `IndicSTT.transcribe` | `ai4bharat/indic-conformer-600m-multilingual` (MIT; 22 languages) | T4 | POST `{job_id, audio_url, language, parameters?{decoding: ctc\|rnnt}}` |

Maya Research has no STT model, hence AI4Bharat for STT. TTS output is a WAV in R2 (`audio/`); STT writes a JSON
transcript to R2 (`transcripts/`, `output_url`) and also returns `text`. Voice cloning is not wired up (the Maya 2 clone API is undocumented here).

## Setup
1. Accept the terms on the IndicConformer model page, then create the secret:
   `modal secret create huggingface-credentials HF_TOKEN=<token>`
2. `cd backend/indic-speech && modal run main.py::download_tts_models && modal run main.py::download_stt_models`
3. `modal deploy main.py` -> two URLs (`generate`, `transcribe`) for the frontend env.

Not yet deployed or run on a GPU: image builds (maya3 from git, cu128 torch) are unverified.
