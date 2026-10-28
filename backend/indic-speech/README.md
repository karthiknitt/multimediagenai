# indic-speech (Modal app)

Indic text-to-speech and speech-to-text.

| Class | Model | GPU | Endpoint |
|---|---|---|---|
| `IndicTTS.generate` | `maya-research/maya2-native` (Apache-2.0; hi, ta, te, bn, gu, kn, ml, mr, or, pa, as, en; 24 kHz) | A10G | POST `{job_id, text, language, voice?, parameters?{normalize}}` |
| `IndicSTT.transcribe` | `ai4bharat/indic-conformer-600m-multilingual` (MIT; 22 languages) | T4 | POST `{job_id, audio_url, language, parameters?{decoding: ctc\|rnnt}}` |

Maya Research has no STT model, hence AI4Bharat for STT. TTS output is a WAV in R2 (`audio/`); STT writes a JSON
transcript to R2 (`transcripts/`, `output_url`) and also returns `text`. Voice cloning is not wired up (the Maya 2 clone API is undocumented here).

## Setup
1. Accept the terms on the IndicConformer model page, then `hf auth login` and
   `modal secret create huggingface-credentials HF_TOKEN=<token>`
2. `cd backend/indic-speech && modal run main.py::download_tts_models`
3. STT is only registered with `DEPLOY_INDIC_STT=1` (so TTS can deploy before the secret exists):
   `DEPLOY_INDIC_STT=1 modal run main.py::download_stt_models && DEPLOY_INDIC_STT=1 modal deploy main.py`
   Always deploy with the flag set once STT exists, or the STT endpoint is removed.

Verified live: Tamil TTS -> STT round trip returns the same sentence (minus punctuation).
Note: the model card pins `onnxruntime-gpu==1.20.1`, which does not exist; we use 1.20.2.
