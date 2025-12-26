# musicgen-audio-generator

**Version**: 1.0.0
**Last Updated**: 2025-12-26

## Description

MusicGen Large Audio Generation Skill - A comprehensive skill for generating high-quality music and audio from text descriptions using Meta's MusicGen Large model. This skill handles prompt optimization for musical styles, parameter configuration, and production-grade audio generation with cost-efficient GPU usage.

## When to Use

Use this skill when:
- User requests music or audio generation from text
- User asks to create background music, soundtracks, or sound effects
- User wants to generate audio for videos
- User mentions MusicGen, audio generation, or music creation
- User provides musical descriptions or genres
- User needs audio content for multimedia projects

## Capabilities

This skill provides:
1. **Text-to-Music Generation**: Create music up to 30+ seconds from text prompts
2. **Genre & Style Control**: Support for diverse musical genres and styles
3. **Intelligent Prompt Enhancement**: Optimizes prompts for musical coherence
4. **Parameter Configuration**: Optimal settings for quality/duration trade-offs
5. **Duration Control**: Flexible output length from 5-30+ seconds
6. **Cost-Efficient Deployment**: Uses L40S GPU ($1.20/hr vs A100 $2.50/hr)

## Parameters

### Input Parameters

- `prompt` (required): Text description of the music/audio to generate
- `duration` (optional): Output length in seconds, 5-30s (default: 30)
- `guidance_scale` (optional): 1.0-15.0, controls prompt adherence (default: 3.0)
- `seed` (optional): Seed for reproducible results
- `temperature` (optional): 0.8-1.2, controls creativity (default: 1.0)
- `top_k` (optional): 0-250, sampling parameter (default: 250)
- `top_p` (optional): 0.0-1.0, nucleus sampling (default: 0.0)

### Output

Returns a structured generation request with:
- Optimized prompt with musical terminology
- Generation parameters (duration, guidance_scale, etc.)
- Cost estimate and generation time estimate
- Expected output: 32kHz mono WAV file

## Knowledge Base

This skill leverages comprehensive knowledge of MusicGen Large:

### Model Specifications
- **Architecture**: 1.5B parameter autoregressive transformer
- **VRAM**: ~16GB (fits on L40S at $1.20/hr)
- **Sample Rate**: 32kHz mono
- **Max Duration**: ~30 seconds (can be extended with generation chaining)
- **Training Data**: 20k hours of licensed music
- **License**: CC-BY-NC 4.0 (Non-commercial use)

### Core Principles
1. **Genre-First Prompting**: Start with genre/style for better results
2. **Instrument Specification**: Mention specific instruments for clarity
3. **Mood & Tempo**: Describe emotional tone and pace
4. **Musical Terms**: Use musical terminology (tempo, dynamics, harmony)
5. **Avoid Lyrics**: MusicGen creates instrumental music (no vocals/lyrics)

### Parameter Recommendations

#### Quality Tiers

**Preview** (Quick iteration, ~5-10s):
- Duration: 10s
- Guidance: 3.0
- Temperature: 1.0
- Cost: ~$0.003/generation (L40S @ $1.20/hr)
- Generation Time: ~15s

**Balanced** (Production default, ~15-20s):
- Duration: 20s
- Guidance: 3.0
- Temperature: 1.0
- Cost: ~$0.006/generation
- Generation Time: ~20s

**Full Length** (Maximum quality, ~30s):
- Duration: 30s
- Guidance: 3.5
- Temperature: 1.0
- Cost: ~$0.008-0.010/generation
- Generation Time: ~25s

#### Guidance Scale Guidelines
- **1.0-2.0**: More creative, diverse output (may drift from prompt)
- **3.0-5.0**: Balanced (recommended for most music)
- **6.0-15.0**: Strict adherence (may sound repetitive or constrained)

#### Temperature Guidelines
- **0.8**: More conservative, predictable patterns
- **1.0**: Balanced (recommended default)
- **1.2**: More creative, experimental sounds

### Prompting Techniques

#### Prompt Structure Template
```
[Genre/Style], [Tempo/BPM], [Mood/Emotion]
[Instruments], [Musical elements]
[Production style/Quality]
```

#### Genre & Style Examples

**Electronic**:
- "Upbeat electronic dance music, 128 BPM, energetic synths, driving bassline"
- "Ambient electronic, slow tempo, ethereal pads, minimal percussion"
- "Synthwave, 80s retro style, analog synthesizers, nostalgic atmosphere"

**Orchestral**:
- "Epic orchestral soundtrack, powerful brass section, soaring strings, dramatic percussion"
- "Classical piano composition, romantic era style, expressive dynamics, legato phrasing"
- "Cinematic orchestral, heroic theme, full orchestra with choir"

**Rock/Metal**:
- "Hard rock, distorted electric guitars, heavy drums, energetic and aggressive"
- "Acoustic rock ballad, gentle guitar strumming, emotional and introspective"
- "Progressive metal, complex time signatures, technical guitar work"

**Jazz**:
- "Smooth jazz, saxophone lead, walking bass, light drums, relaxed evening vibe"
- "Bebop jazz, fast tempo, intricate piano improvisation, acoustic bass"
- "Jazz fusion, electric guitar and keyboards, complex harmonies"

**World/Folk**:
- "Celtic folk music, Irish fiddle and tin whistle, lively jig rhythm"
- "African percussion ensemble, djembe drums, polyrhythmic patterns"
- "Flamenco guitar, Spanish classical style, passionate and rhythmic"

#### Mood & Emotion Keywords

**Energetic**: upbeat, driving, energetic, powerful, intense, vigorous
**Calm**: peaceful, serene, tranquil, gentle, soothing, relaxing
**Dark**: ominous, mysterious, haunting, suspenseful, eerie, brooding
**Happy**: cheerful, joyful, uplifting, bright, optimistic, playful
**Sad**: melancholic, somber, emotional, nostalgic, wistful, tender
**Epic**: grand, majestic, triumphant, heroic, cinematic, dramatic

#### Tempo & BPM Guidance

- **Slow**: 60-80 BPM (ballads, ambient)
- **Moderate**: 90-110 BPM (pop, rock)
- **Upbeat**: 120-140 BPM (dance, EDM)
- **Fast**: 150+ BPM (drum & bass, speed metal)

Use descriptive terms: "slow tempo", "medium pace", "fast-paced", "allegro", "andante"

#### Instrument Specification

Be specific about instruments:
- Strings: violin, cello, acoustic guitar, electric guitar, bass
- Brass: trumpet, trombone, French horn, tuba
- Woodwinds: flute, clarinet, saxophone, oboe
- Keyboards: piano, synthesizer, organ, electric piano
- Percussion: drums, timpani, cymbals, marimba, tabla
- Electronic: synth pads, bass synth, drum machine, sampler

### Common Use Cases

#### 1. Video Background Music
```
"Uplifting corporate background music, acoustic guitar and piano, positive and motivating, medium tempo, clean production"
```

#### 2. Game Soundtrack
```
"Epic fantasy game battle music, full orchestra with powerful brass and dramatic strings, intense and heroic, fast tempo, cinematic production"
```

#### 3. Podcast Intro
```
"Modern podcast intro music, upbeat electronic beats, catchy melody, professional and energetic, 10 seconds"
```

#### 4. Meditation/Relaxation
```
"Ambient meditation music, soft synthesizer pads, gentle nature sounds, peaceful and calming, slow tempo, spa atmosphere"
```

## Implementation Guidelines

### Prompt Optimization Algorithm

```python
def optimize_musicgen_prompt(user_input, duration=30):
    """
    Optimizes user prompt for MusicGen Large generation
    """

    # 1. Extract or infer genre/style
    genre = extract_genre(user_input) or infer_genre_from_context(user_input)

    # 2. Extract tempo/BPM information
    tempo = extract_tempo(user_input) or suggest_tempo_for_genre(genre)

    # 3. Extract mood and emotion
    mood = extract_mood(user_input)

    # 4. Extract instruments
    instruments = extract_instruments(user_input)

    # 5. Build structured musical prompt
    prompt_components = [
        genre,  # Genre first (most important)
        tempo,  # Tempo/pace
        mood,   # Emotional tone
        instruments if instruments else get_default_instruments_for_genre(genre),
        extract_production_style(user_input) or "professional production"
    ]

    # 6. Combine with musical terminology
    optimized = combine_musical_description(prompt_components)

    # 7. Validate length (15-60 words ideal)
    if len(optimized.split()) < 10:
        optimized = expand_with_musical_details(optimized)
    elif len(optimized.split()) > 80:
        optimized = condense_to_essentials(optimized)

    return optimized
```

### Parameter Selection Logic

```python
def select_musicgen_parameters(quality_tier, duration=30):
    """
    Selects optimal parameters for MusicGen Large
    """

    quality_configs = {
        "preview": {
            "duration": 10,
            "guidance_scale": 3.0,
            "temperature": 1.0,
            "top_k": 250,
            "estimated_time_sec": 15
        },
        "balanced": {
            "duration": 20,
            "guidance_scale": 3.0,
            "temperature": 1.0,
            "top_k": 250,
            "estimated_time_sec": 20
        },
        "full": {
            "duration": 30,
            "guidance_scale": 3.5,
            "temperature": 1.0,
            "top_k": 250,
            "estimated_time_sec": 25
        }
    }

    config = quality_configs.get(quality_tier, quality_configs["balanced"])

    # Override duration if specified
    if duration:
        config["duration"] = max(5, min(30, duration))

    # Calculate tokens: ~50 tokens per second at 32kHz
    config["max_new_tokens"] = int(config["duration"] * 50)

    return {
        **config,
        "estimated_cost_usd": (config["estimated_time_sec"] / 3600) * 1.20  # L40S cost
    }
```

### API Payload Generation

```python
def generate_musicgen_payload(optimized_prompt, parameters, seed=None):
    """
    Creates Modal backend API request payload for MusicGen
    """

    return {
        "job_id": generate_uuid(),
        "model": "musicgen-large",
        "prompt": optimized_prompt,
        "parameters": {
            "duration": parameters["duration"],
            "guidance_scale": parameters["guidance_scale"],
            "temperature": parameters.get("temperature", 1.0),
            "top_k": parameters.get("top_k", 250),
            "top_p": parameters.get("top_p", 0.0),
            "max_new_tokens": parameters["max_new_tokens"],
            "seed": seed or random.randint(0, 2**32 - 1)
        },
        "output_format": "wav",
        "sample_rate": 32000
    }
```

## Integration with Project

### Backend Integration (Modal)

This skill generates payloads compatible with the Modal audio-gen backend:

```python
# backend/audio-gen/main.py
@app.cls(gpu="L40S", timeout=300)  # Cheaper GPU!
class AudioGenerator:
    def _load_musicgen(self):
        """Lazy load MusicGen model"""
        if self.model is None:
            from transformers import MusicgenForConditionalGeneration, AutoProcessor
            import torch

            self.model = MusicgenForConditionalGeneration.from_pretrained(
                "facebook/musicgen-large",
                torch_dtype=torch.float16,
                cache_dir="/models"
            )
            self.model.to("cuda")

            self.processor = AutoProcessor.from_pretrained(
                "facebook/musicgen-large",
                cache_dir="/models"
            )
        return self.model, self.processor

    @modal.fastapi_endpoint(method="POST")
    def generate(self, request: dict):
        """Generate audio with skill-optimized parameters"""
        model, processor = self._load_musicgen()

        inputs = processor(
            text=[request["prompt"]],
            padding=True,
            return_tensors="pt"
        ).to("cuda")

        audio_values = model.generate(
            **inputs,
            max_new_tokens=request["parameters"]["max_new_tokens"],
            guidance_scale=request["parameters"]["guidance_scale"],
            do_sample=True
        )

        # Save as WAV @ 32kHz
        output_path = f"/tmp/{request['job_id']}.wav"
        sampling_rate = model.config.audio_encoder.sampling_rate
        write_wav(output_path, sampling_rate, audio_values[0, 0].cpu().numpy())

        output_url = upload_to_r2(output_path, request["job_id"])
        return {"output_url": output_url}
```

### Frontend Integration (Next.js)

```typescript
// Frontend API route for MusicGen audio generation
export async function POST(request: Request) {
  const { prompt, duration, quality_tier } = await request.json()

  // Use skill to optimize musical prompt
  const optimized = optimizeMusicGenPrompt(prompt, {
    duration: duration || 30,
    quality_tier: quality_tier || "balanced"
  })

  // Call Modal backend (cheaper L40S GPU!)
  const response = await fetch(
    `${process.env.MODAL_AUDIO_GEN_URL}/generate`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(optimized)
    }
  )

  return Response.json(await response.json())
}
```

## Performance Targets

- **10 seconds**: ~15s generation, ~$0.003 cost
- **20 seconds**: ~20s generation, ~$0.006 cost
- **30 seconds**: ~25s generation, ~$0.010 cost
- **VRAM Usage**: ~16GB (fits on L40S)
- **Output Quality**: 32kHz mono WAV

## Limitations

1. **No Vocals/Lyrics**: MusicGen creates instrumental music only
2. **Duration**: Practical limit ~30s (longer requires chaining)
3. **Sample Rate**: 32kHz (lower than professional 44.1/48kHz)
4. **Mono Output**: Single channel audio (no stereo)
5. **Musical Structure**: Limited long-form composition (no verse/chorus)
6. **Genre Mixing**: Complex genre fusion may produce unclear results
7. **Specific Artists**: Cannot mimic specific artists (copyright/licensing)

## Error Handling

```python
def handle_musicgen_errors(error):
    """
    Provides user-friendly error messages for MusicGen
    """

    error_map = {
        "DurationTooLong": {
            "message": "Duration exceeds 30 second limit",
            "suggestion": "Reduce duration to 30s or less"
        },
        "VRAMOutOfMemory": {
            "message": "Insufficient GPU memory",
            "suggestion": "Reduce duration or contact support"
        },
        "InvalidGuidanceScale": {
            "message": "Guidance scale must be between 1.0 and 15.0",
            "suggestion": "Use recommended range of 3.0-5.0"
        },
        "ModelLoadError": {
            "message": "Failed to load MusicGen model",
            "suggestion": "Backend issue - please try again"
        },
        "TimeoutError": {
            "message": "Audio generation took too long",
            "suggestion": "Try reducing duration or try again"
        }
    }

    return error_map.get(error.type, {
        "message": "Audio generation failed",
        "suggestion": "Please try again or contact support"
    })
```

## Usage Examples

### Example 1: Video Background Music
```
User: "Create uplifting background music for a corporate video"

Skill Output:
Optimized Prompt: "Uplifting corporate background music, acoustic guitar and piano melody, positive and motivating atmosphere, medium tempo 100 BPM, clean professional production, inspirational business presentation style"

Parameters:
- Duration: 30s
- Guidance: 3.0
- Temperature: 1.0
- Estimated Time: ~25s
- Estimated Cost: $0.008
```

### Example 2: Game Soundtrack
```
User: "Make epic battle music for a fantasy game"

Skill Output:
Optimized Prompt: "Epic fantasy battle music, full orchestral arrangement with powerful brass section and dramatic strings, intense and heroic mood, fast tempo 140 BPM, cinematic film score production, action-packed war scene atmosphere"

Parameters:
- Duration: 30s
- Guidance: 3.5
- Temperature: 1.0
- Estimated Time: ~25s
- Estimated Cost: $0.010
```

### Example 3: Relaxation/Meditation
```
User: "Generate calming meditation music"

Skill Output:
Optimized Prompt: "Ambient meditation music, soft synthesizer pads and gentle nature sounds, peaceful and calming atmosphere, slow tempo 60 BPM, spa and wellness production, serene yoga and mindfulness environment"

Parameters:
- Duration: 30s
- Guidance: 3.0
- Temperature: 1.0
- Estimated Time: ~25s
- Estimated Cost: $0.008
```

### Example 4: Electronic Dance
```
User: "Create an EDM drop"

Skill Output:
Optimized Prompt: "High-energy electronic dance music drop, powerful bass synth and bright lead synths, energetic and intense mood, fast tempo 128 BPM, festival EDM production, club and rave atmosphere with driving kick drum"

Parameters:
- Duration: 20s
- Guidance: 3.0
- Temperature: 1.0
- Estimated Time: ~20s
- Estimated Cost: $0.006
```

## Future Enhancements

Planned improvements for v2.0:
1. **Stereo Output**: Upgrade to stereo generation
2. **Higher Sample Rate**: 44.1kHz/48kHz professional quality
3. **Longer Compositions**: Seamless chaining for 1-3 minute tracks
4. **Melody Conditioning**: Hum/whistle melody input
5. **Audio Continuation**: Extend existing audio clips
6. **Music Structure**: Verse/chorus/bridge composition

## Related Skills

This skill works well with:
- `mochi1-video-generator`: Add music to generated videos
- `cogvideox-img2video`: Sync audio with animated images
- `audio-mixer`: Combine multiple audio generations
- `video-audio-sync`: Match audio to video timing

## References

For detailed information, refer to:
- MusicGen Model Card: https://huggingface.co/facebook/musicgen-large
- MusicGen Paper: https://arxiv.org/abs/2306.05284
- Audiocraft GitHub: https://github.com/facebookresearch/audiocraft
- [CLAUDE.md](../../CLAUDE.md) - Development guidelines
- [PRD.md](../../PRD.md) - Project architecture

## Changelog

**v1.0.0** (2025-12-26):
- Initial release
- Complete MusicGen Large implementation
- Production-ready musical prompt optimization
- Modal GPU integration with cost-efficient L40S
- Genre and style control
- Duration and quality configuration

---

**Maintained by**: AI Video Generation Platform Team
**License**: CC-BY-NC 4.0 (aligned with MusicGen license)
**Last Tested**: 2025-12-26 with MusicGen Large on L40S GPU
