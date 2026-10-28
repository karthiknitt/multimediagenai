/** Languages and voices of the `indic-speech` Modal app (backend/indic-speech/main.py). */
export const INDIC_TTS_LANGUAGES = {
  hi: "Hindi",
  ta: "Tamil",
  te: "Telugu",
  kn: "Kannada",
  ml: "Malayalam",
  bn: "Bengali",
  mr: "Marathi",
  gu: "Gujarati",
  pa: "Punjabi",
  or: "Odia",
  as: "Assamese",
  en: "English",
} as const;

export const INDIC_STT_LANGUAGES = {
  hi: "Hindi",
  ta: "Tamil",
  te: "Telugu",
  kn: "Kannada",
  ml: "Malayalam",
  bn: "Bengali",
  mr: "Marathi",
  gu: "Gujarati",
  pa: "Punjabi",
  or: "Odia",
  as: "Assamese",
  ur: "Urdu",
  ne: "Nepali",
  sa: "Sanskrit",
  brx: "Bodo",
  doi: "Dogri",
  kok: "Konkani",
  ks: "Kashmiri",
  mai: "Maithili",
  mni: "Manipuri",
  sat: "Santali",
  sd: "Sindhi",
} as const;

export const INDIC_VOICES = ["Ahana", "Vaidehi", "Ritvik", "Abhay"] as const;

export type IndicTtsLanguage = keyof typeof INDIC_TTS_LANGUAGES;
export type IndicSttLanguage = keyof typeof INDIC_STT_LANGUAGES;
