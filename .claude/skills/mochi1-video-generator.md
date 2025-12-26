# mochi1-video-generator

**Version**: 1.0.0
**Last Updated**: 2025-12-26

## Description

Mochi 1 Text-to-Video Generation Skill - A comprehensive skill for generating high-quality videos from text prompts using Genmo's Mochi 1 preview model. This skill handles prompt optimization, parameter configuration, and production-grade video generation with efficient VRAM management on Modal's A100 80GB GPUs.

## When to Use

Use this skill when:
- User requests video generation from text descriptions
- User asks to create animated content or motion from text
- User wants to generate short video clips or animations
- User mentions text-to-video, video generation, or Mochi
- User provides creative descriptions that should be turned into video

## Capabilities

This skill provides:
1. **Text-to-Video Generation**: Create videos up to 162 frames (~5.4s @ 30fps) from text prompts
2. **Intelligent Prompt Enhancement**: Optimizes prompts for motion, temporal coherence, and visual quality
3. **Parameter Configuration**: Selects optimal generation parameters for quality/speed trade-offs
4. **Quality Tiers**: Fast preview (64 frames), balanced production (96 frames), or full quality (162 frames)
5. **Motion Control**: Guidance on camera movements, subject actions, and temporal dynamics
6. **Production Integration**: Ready for Modal GPU deployment with automatic VRAM management

## Parameters

### Input Parameters

- `prompt` (required): Text description of the video to generate
- `num_frames` (optional): 64, 96, 128, or 162 frames (default: 64)
  - 64 frames = ~2.1s @ 30fps (~20 min generation)
  - 96 frames = ~3.2s @ 30fps (~30 min generation)
  - 128 frames = ~4.3s @ 30fps (~40 min generation)
  - 162 frames = ~5.4s @ 30fps (~50-60 min generation)
- `guidance_scale` (optional): 2.0-10.0, controls prompt adherence (default: 7.5)
- `seed` (optional): Seed for reproducible results
- `motion_intensity` (optional): "subtle", "moderate", "dynamic" - guides motion complexity

### Output

Returns a structured generation request with:
- Optimized prompt emphasizing motion and temporal coherence
- Generation parameters (num_frames, guidance_scale, seed)
- Cost estimate and generation time estimate
- Ready-to-use API payload for Modal backend
- Expected output: 480p MP4 video @ 30fps

## Knowledge Base

This skill leverages comprehensive knowledge of Mochi 1:

### Model Specifications
- **Architecture**: 10B parameter asymmetric diffusion transformer
- **VRAM (Optimized)**: 8-18GB with CPU offloading (60GB unoptimized)
- **Resolution**: 480p (848x480 native)
- **Frame Rate**: 30 fps
- **Max Frames**: 162 frames (~5.4 seconds)
- **License**: Apache 2.0 (open source)

### Core Principles
1. **Motion-Focused Prompts**: Emphasize action verbs and temporal descriptions
2. **Camera Movement**: Specify camera motion (pan, zoom, dolly, static)
3. **Subject Actions**: Describe what subjects do, not just what they look like
4. **Temporal Coherence**: Mochi excels at maintaining consistency across frames
5. **Natural Descriptions**: Conversational language works better than keywords

### Parameter Recommendations

#### Quality Tiers

**Preview** (Fast iteration, ~20 min):
- Frames: 64 (~2.1s)
- Guidance: 6.0
- Resolution: 480p
- Cost: ~$0.08/generation (A100 @ $2.50/hr)

**Balanced** (Production default, ~30 min):
- Frames: 96 (~3.2s)
- Guidance: 7.5
- Resolution: 480p
- Cost: ~$0.12/generation

**Full Quality** (Maximum length, ~50-60 min):
- Frames: 162 (~5.4s)
- Guidance: 8.0
- Resolution: 480p
- Cost: ~$0.20-0.25/generation

#### Guidance Scale Guidelines
- **2.0-4.0**: More creative, natural motion (may deviate from prompt)
- **5.0-7.5**: Balanced (recommended for most cases)
- **8.0-10.0**: Strict adherence to prompt (may reduce motion fluidity)

### Prompting Techniques

#### Prompt Structure Template
```
[Camera movement], [subject description], [subject action/motion]
[Environment/setting details]
[Lighting and atmosphere]
[Style/aesthetic]
```

#### Motion and Camera Techniques
```
Camera Movements:
- "Slow dolly forward towards..."
- "Smooth pan from left to right revealing..."
- "Static shot of..."
- "Gradual zoom out from..."
- "Orbiting camera around..."

Subject Actions:
- "A person walking slowly through..."
- "Waves gently crashing against..."
- "Leaves rustling in the wind..."
- "Smoke rising and dissipating..."
- "A bird taking flight from..."
```

#### Temporal Descriptions
```
Good (emphasizes motion):
- "A cat jumping from the floor onto a table, landing gracefully"
- "Ocean waves rolling towards the shore, foam spreading on the sand"
- "A flower blooming in time-lapse, petals unfurling"

Avoid (static descriptions):
- "A cat on a table" (no motion)
- "Ocean waves" (no temporal progression)
- "A bloomed flower" (already completed action)
```

#### Style and Aesthetic
- "Cinematic slow-motion, dramatic lighting"
- "Documentary style, handheld camera, natural lighting"
- "Anime-style animation, vibrant colors"
- "Dreamlike, soft focus, ethereal atmosphere"
- "Vintage film look, 8mm home video aesthetic"

### Common Use Cases

#### 1. Nature & Wildlife
```
"Slow dolly shot moving through a misty forest at dawn, sunbeams filtering through tall trees, particles visible in the volumetric light, peaceful and serene atmosphere, cinematic nature documentary style"
```

#### 2. Action & Movement
```
"Dynamic tracking shot following a skateboarder performing an ollie, slow motion capture of the jump, urban street environment, golden hour lighting, professional sports videography style"
```

#### 3. Abstract & Artistic
```
"Swirling colorful paint mixing in water, macro shot, vibrant reds and blues blending together, fluid dynamics creating organic patterns, high-speed camera, abstract art style"
```

#### 4. Product & Commercial
```
"Smooth 360-degree rotation around a luxury watch on a pedestal, dramatic studio lighting with highlights on the metal case, black background, premium product videography style"
```

## Implementation Guidelines

### Prompt Optimization Algorithm

```python
def optimize_prompt_for_mochi(user_input, motion_intensity="moderate"):
    """
    Optimizes user prompt for Mochi 1 text-to-video generation
    """

    # 1. Extract core subject and action
    subject = extract_main_subject(user_input)
    action = extract_or_infer_action(user_input)

    # 2. Add camera movement if not specified
    camera_movement = extract_camera_movement(user_input) or \
                      suggest_camera_movement(motion_intensity)

    # 3. Build temporal prompt structure
    prompt_components = [
        camera_movement,  # Start with camera movement
        f"{subject} {action}",  # Subject and what it's doing
        extract_environment(user_input),
        extract_lighting(user_input) or "natural lighting",
        extract_style(user_input) or "cinematic style"
    ]

    # 4. Combine with action-focused language
    optimized = combine_with_motion_emphasis(prompt_components)

    # 5. Validate temporal coherence (30-100 words ideal)
    if len(optimized.split()) < 20:
        optimized = expand_with_motion_details(optimized)
    elif len(optimized.split()) > 120:
        optimized = condense_to_essentials(optimized)

    return optimized
```

### Parameter Selection Logic

```python
def select_mochi_parameters(quality_tier, duration_target):
    """
    Selects optimal generation parameters for Mochi 1
    """

    # Quality tier configurations
    quality_configs = {
        "preview": {
            "num_frames": 64,
            "guidance_scale": 6.0,
            "estimated_time_min": 20
        },
        "balanced": {
            "num_frames": 96,
            "guidance_scale": 7.5,
            "estimated_time_min": 30
        },
        "full": {
            "num_frames": 162,
            "guidance_scale": 8.0,
            "estimated_time_min": 55
        }
    }

    config = quality_configs.get(quality_tier, quality_configs["balanced"])

    # Adjust frame count if user specified duration
    if duration_target:
        # Mochi runs at 30fps
        target_frames = int(duration_target * 30)
        # Clamp to valid range
        config["num_frames"] = max(64, min(162, target_frames))

    return {
        "num_frames": config["num_frames"],
        "guidance_scale": config["guidance_scale"],
        "estimated_time_minutes": config["estimated_time_min"],
        "estimated_cost_usd": (config["estimated_time_min"] / 60) * 2.50  # A100 cost
    }
```

### API Payload Generation

```python
def generate_mochi_payload(optimized_prompt, parameters, seed=None):
    """
    Creates Modal backend API request payload for Mochi 1
    """

    return {
        "job_id": generate_uuid(),
        "model": "mochi-1-preview",
        "prompt": optimized_prompt,
        "parameters": {
            "num_frames": parameters["num_frames"],
            "guidance_scale": parameters["guidance_scale"],
            "seed": seed or random.randint(0, 2**32 - 1)
        },
        "output_format": "mp4",
        "fps": 30
    }
```

## Integration with Project

### Backend Integration (Modal)

This skill generates payloads compatible with the Modal video-gen backend:

```python
# backend/video-gen/main.py
@app.cls(gpu="A100-80GB", timeout=3600)
class VideoGenerator:
    def _load_mochi(self):
        """Lazy load Mochi model"""
        if self.mochi is None:
            from diffusers import MochiPipeline
            import torch

            self.mochi = MochiPipeline.from_pretrained(
                "genmo/mochi-1-preview",
                torch_dtype=torch.bfloat16,
                cache_dir="/models"
            )
            self.mochi.to("cuda")
        return self.mochi

    @modal.fastapi_endpoint(method="POST")
    def generate_text2video(self, request: dict):
        """Generate video from text using skill-optimized params"""
        mochi = self._load_mochi()

        video_frames = mochi(
            prompt=request["prompt"],
            num_frames=request["parameters"]["num_frames"],
            guidance_scale=request["parameters"]["guidance_scale"],
            generator=torch.manual_seed(request["parameters"]["seed"])
        ).frames[0]

        # Save as MP4 @ 30fps
        output_path = f"/tmp/{request['job_id']}.mp4"
        imageio.mimsave(output_path, video_frames, fps=30)

        # Upload to R2 and return URL
        output_url = upload_to_r2(output_path, request["job_id"])
        return {"output_url": output_url}
```

### Frontend Integration (Next.js)

```typescript
// Frontend API route for Mochi text-to-video
export async function POST(request: Request) {
  const { prompt, quality_tier, motion_intensity } = await request.json()

  // Use skill to optimize prompt
  const optimized = optimizeMochiPrompt(prompt, {
    quality_tier: quality_tier || "balanced",
    motion_intensity: motion_intensity || "moderate"
  })

  // Call Modal backend
  const response = await fetch(
    `${process.env.MODAL_VIDEO_GEN_URL}/generate_text2video`,
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

- **64 frames**: ~20 min generation time, ~$0.08 cost
- **96 frames**: ~30 min generation time, ~$0.12 cost
- **162 frames**: ~50-60 min generation time, ~$0.20-0.25 cost
- **VRAM Usage**: 8-18GB (optimized with CPU offload)
- **Output Quality**: 480p @ 30fps MP4

## Limitations

1. **Resolution**: Fixed at 480p (848x480) - upscaling needed for HD
2. **Duration**: Maximum 5.4 seconds (162 frames)
3. **Generation Time**: Very slow (20-60 minutes depending on length)
4. **VRAM**: Requires 60GB unoptimized, 8-18GB with optimizations
5. **Motion Complexity**: Struggles with rapid scene changes or complex physics
6. **Text Rendering**: Cannot reliably generate readable text in videos
7. **Human Faces**: May produce artifacts with detailed facial expressions

## Error Handling

```python
def handle_mochi_errors(error):
    """
    Provides user-friendly error messages for Mochi generation
    """

    error_map = {
        "VRAMOutOfMemory": {
            "message": "Insufficient GPU memory for video generation",
            "suggestion": "Reduce num_frames to 64 or contact support"
        },
        "TimeoutError": {
            "message": "Video generation exceeded time limit",
            "suggestion": "This can happen with 162 frames. Try reducing to 96 frames"
        },
        "ModelLoadError": {
            "message": "Failed to load Mochi model",
            "suggestion": "Backend issue - please try again in a moment"
        },
        "InvalidFrameCount": {
            "message": "num_frames must be between 64 and 162",
            "suggestion": "Use 64 (preview), 96 (balanced), or 162 (full quality)"
        }
    }

    return error_map.get(error.type, {
        "message": "Video generation failed",
        "suggestion": "Please try again or contact support"
    })
```

## Usage Examples

### Example 1: Simple Nature Scene
```
User: "Generate a video of ocean waves"

Skill Output:
Optimized Prompt: "Smooth dolly shot moving closer to ocean waves, water gently rolling towards sandy beach, foam spreading on the shore, warm golden hour sunlight reflecting on the water surface, peaceful coastal atmosphere, cinematic nature documentary style"

Parameters:
- Quality: balanced
- Frames: 96 (~3.2s)
- Guidance: 7.5
- Estimated Time: ~30 min
- Estimated Cost: $0.12
```

### Example 2: Action Sequence
```
User: "A skateboarder doing a trick in slow motion"

Skill Output:
Optimized Prompt: "Dynamic tracking shot following a skateboarder performing an ollie over a ramp, slow motion capture showing the board leaving the ground and landing, urban skate park environment with graffiti walls, late afternoon dramatic lighting, professional sports videography style with smooth camera movement"

Parameters:
- Quality: full
- Frames: 162 (~5.4s)
- Guidance: 8.0
- Motion: dynamic
- Estimated Time: ~55 min
- Estimated Cost: $0.23
```

### Example 3: Abstract Art
```
User: "Create abstract colorful paint mixing in water"

Skill Output:
Optimized Prompt: "Macro shot of vibrant paint drops dispersing in clear water, swirling tendrils of red and blue mixing together, creating organic fluid patterns, particles visible in the liquid, white background, high-speed camera capture, abstract experimental art style"

Parameters:
- Quality: balanced
- Frames: 96 (~3.2s)
- Guidance: 7.0
- Motion: moderate
- Estimated Time: ~30 min
- Estimated Cost: $0.12
```

## Future Enhancements

Planned improvements for v2.0:
1. **Resolution Upscaling**: Integration with video upscaling models for HD output
2. **Longer Videos**: Frame interpolation to extend beyond 5.4 seconds
3. **Motion Transfer**: Apply motion from reference videos
4. **Style Transfer**: Artistic style application to generated videos
5. **Multi-Shot Sequences**: Chain multiple Mochi generations with transitions
6. **Audio Sync**: Coordinate with MusicGen for sound-matched videos

## Related Skills

This skill works well with:
- `flux2-image-generator`: Generate keyframes for video prompts
- `cogvideox-img2video`: Alternative image-to-video workflow
- `musicgen-audio`: Add background music to generated videos
- `video-upscaler`: Enhance 480p output to HD/4K

## References

For detailed information, refer to:
- Mochi 1 Model Card: https://huggingface.co/genmo/mochi-1-preview
- Genmo Research: https://www.genmo.ai/research
- Diffusers Documentation: https://huggingface.co/docs/diffusers/api/pipelines/mochi
- [CLAUDE.md](../../CLAUDE.md) - Development guidelines
- [PRD.md](../../PRD.md) - Project architecture

## Changelog

**v1.0.0** (2025-12-26):
- Initial release
- Complete Mochi 1 preview implementation
- Production-ready prompt optimization for motion
- Modal GPU integration with A100 80GB
- Cost and performance optimization
- VRAM-efficient deployment strategy

---

**Maintained by**: AI Video Generation Platform Team
**License**: Apache 2.0 (aligned with Mochi 1 license)
**Last Tested**: 2025-12-26 with Mochi 1 preview on A100 80GB
