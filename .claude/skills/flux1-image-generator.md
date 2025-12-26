# flux1-image-generator

**Version**: 1.0.0
**Last Updated**: 2025-12-26

## Description

FLUX.1 [dev] Image Generation Skill - A comprehensive skill for generating high-quality images using Black Forest Labs' FLUX.1 [dev] model. This skill handles prompt optimization, parameter configuration, and production-grade image generation following proven best practices. FLUX.1 is the predecessor to FLUX.2 and serves as a reliable fallback option.

## When to Use

Use this skill when:
- User requests image generation from text prompts
- FLUX.2 is unavailable or experiencing issues (fallback)
- User specifically requests FLUX.1 model
- User wants proven, stable image generation
- Cost optimization is priority (FLUX.1 may have lower compute needs)

## Capabilities

This skill provides:
1. **High-Quality Text-to-Image**: Generate images up to 2048×2048 resolution
2. **Intelligent Prompt Enhancement**: Optimizes prompts following FLUX.1 best practices
3. **Parameter Configuration**: Optimal settings for different quality tiers
4. **Style Application**: Photography, artistic, and specialized styles
5. **Safety Compliance**: Content moderation and policy adherence
6. **Production Integration**: Ready for Modal deployment on A100 80GB

## Parameters

### Input Parameters

- `prompt` (required): Text description of the image to generate
- `quality_tier` (optional): "preview", "balanced", or "final" (default: "balanced")
- `aspect_ratio` (optional): "1:1", "16:9", "9:16", "3:2", "2:3", "4:3" (default: "1:1")
- `style` (optional): "photorealistic", "artistic", "cinematic", "illustration"
- `width` (optional): Image width (default: 1024)
- `height` (optional): Image height (default: 1024)
- `steps` (optional): Inference steps, 20-50 (default: 20)
- `guidance_scale` (optional): CFG scale, 1.0-7.5 (default: 3.5)
- `seed` (optional): Seed for reproducible results

### Output

Returns a structured generation request with:
- Optimized prompt following FLUX.1 best practices
- Generation parameters (width, height, steps, guidance)
- Cost estimate and generation time estimate
- Safety compliance status
- Ready-to-use API payload for backend

## Knowledge Base

This skill leverages comprehensive knowledge of FLUX.1 [dev]:

### Model Specifications
- **Architecture**: 12B parameter rectified flow transformer
- **VRAM**: 24GB (full precision) or 12-16GB (with optimizations)
- **Resolution Range**: 512×512 to 2048×2048
- **License**: FLUX.1 [dev] Non-Commercial License (requires HuggingFace token)

### Core Principles (Similar to FLUX.2)
1. **Natural Language Prompts**: Conversational descriptions work best
2. **Subject-First Structure**: Main subject at the beginning
3. **Descriptive Detail**: Rich descriptions produce better results
4. **Avoid Negative Prompts**: Use positive descriptions
5. **Layered Prompting**: Subject → Action → Environment → Style → Technical

### FLUX.1 vs FLUX.2 Differences

| Feature | FLUX.1 [dev] | FLUX.2 [dev] |
|---------|--------------|--------------|
| Parameters | 12B | 32B |
| VRAM (optimized) | 12-16GB | 12GB (FP8) |
| Speed | Baseline | ~2x faster |
| Quality | Excellent | Enhanced |
| Text Rendering | Limited | Improved |
| License | Non-commercial | Non-commercial |
| Use Case | Stable fallback | Primary choice |

### Parameter Recommendations

#### Quality Tiers

**Preview** (Fast iteration, ~15-20s):
- Resolution: 1024×1024
- Steps: 20
- Guidance: 3.5
- Cost: ~$0.012/generation

**Balanced** (Production default, ~25-30s):
- Resolution: 1024×1024
- Steps: 30
- Guidance: 3.5
- Cost: ~$0.018/generation

**Final** (Maximum quality, ~35-45s):
- Resolution: 2048×2048
- Steps: 50
- Guidance: 4.0
- Cost: ~$0.030/generation

#### Guidance Scale Guidelines
- **1.0-2.0**: More creative, less prompt adherence
- **3.0-5.0**: Balanced (recommended)
- **6.0-7.5**: Strict adherence (may reduce creativity)

### Prompting Techniques

#### Prompt Structure Template
```
[Subject], [action/pose]
[Environment/setting details]
[Lighting description]
[Camera/technical specs]
[Style/mood]
[Color palette]
```

#### Photography Styles
```
"Shot on Canon EOS R5, 85mm f/1.8, natural lighting, shallow depth of field"
"Vintage film photography, Kodak Portra 400, grainy texture, 1970s aesthetic"
"Professional product photography, studio lighting, clean white background"
```

#### Artistic Styles
```
"Oil painting in impressionist style, visible brushstrokes, Monet-inspired"
"Digital illustration, vibrant colors, anime-style character art"
"Minimalist vector art, flat colors, geometric shapes, modern design"
"Photorealistic 3D render, Octane render, dramatic lighting, high detail"
```

#### Lighting Techniques
```
"Golden hour natural light, warm backlit glow"
"Dramatic low-key lighting, single light source from left"
"Soft diffused studio lighting, even illumination"
"Volumetric god rays, cinematic atmospheric lighting"
```

### Common Use Cases

#### 1. Portrait Photography
```
"Professional headshot of a business executive, neutral gray background, confident expression, shot on Canon EOS R5 85mm f/1.8, soft studio lighting, sharp focus on eyes"
```

#### 2. Landscape
```
"Majestic mountain landscape at sunrise, misty valleys below, dramatic cloud formations, golden light illuminating peaks, wide-angle shot, nature photography"
```

#### 3. Product Photography
```
"Luxury wristwatch on black velvet surface, dramatic side lighting highlighting metal details, reflective surfaces, professional product photography, high-end commercial style"
```

#### 4. Concept Art
```
"Futuristic cyberpunk cityscape at night, neon lights reflecting on wet streets, flying vehicles, towering skyscrapers, cinematic composition, digital concept art"
```

## Implementation Guidelines

### Prompt Optimization Algorithm

```python
def optimize_flux1_prompt(user_input, style=None):
    """
    Optimizes user prompt for FLUX.1 [dev] generation
    """

    # 1. Extract core subject (ensure it's first)
    subject = extract_main_subject(user_input)

    # 2. Build layered prompt structure
    prompt_layers = [
        subject,  # Subject first
        extract_action_context(user_input),
        extract_environment(user_input),
        extract_lighting(user_input) or "natural lighting",
        extract_camera_specs(user_input) or generate_camera_for_style(style),
        style_description(style),
        extract_colors(user_input)
    ]

    # 3. Combine with natural language
    optimized = combine_natural_language(prompt_layers)

    # 4. Validate length (30-100 words ideal)
    if len(optimized.split()) < 20:
        optimized = expand_with_details(optimized)
    elif len(optimized.split()) > 150:
        optimized = condense_to_essentials(optimized)

    return optimized
```

### Parameter Selection Logic

```python
def select_flux1_parameters(quality_tier, aspect_ratio="1:1"):
    """
    Selects optimal generation parameters for FLUX.1
    """

    quality_configs = {
        "preview": {
            "steps": 20,
            "guidance_scale": 3.5,
            "base_resolution": 1024
        },
        "balanced": {
            "steps": 30,
            "guidance_scale": 3.5,
            "base_resolution": 1024
        },
        "final": {
            "steps": 50,
            "guidance_scale": 4.0,
            "base_resolution": 2048
        }
    }

    config = quality_configs[quality_tier]

    # Calculate resolution from aspect ratio
    width, height = calculate_resolution(
        config["base_resolution"],
        aspect_ratio,
        ensure_divisible_by=8
    )

    return {
        "width": width,
        "height": height,
        "num_inference_steps": config["steps"],
        "guidance_scale": config["guidance_scale"]
    }
```

### API Payload Generation

```python
def generate_flux1_payload(optimized_prompt, parameters, seed=None):
    """
    Creates Modal backend API request payload for FLUX.1
    """

    return {
        "job_id": generate_uuid(),
        "model": "flux1-dev",
        "prompt": optimized_prompt,
        "width": parameters["width"],
        "height": parameters["height"],
        "num_inference_steps": parameters["num_inference_steps"],
        "guidance_scale": parameters["guidance_scale"],
        "seed": seed or random.randint(0, 2**32 - 1),
        "output_format": "png"
    }
```

## Integration with Project

### Backend Integration (Modal)

This skill generates payloads compatible with the Modal image-gen backend:

```python
# backend/image-gen/main.py
@app.cls(gpu="A100-80GB", timeout=300)
class ImageGenerator:
    @modal.enter()
    def load_flux1(self):
        """Load FLUX.1 [dev] model"""
        from diffusers import FluxPipeline
        import torch
        import os

        hf_token = os.environ.get("HF_TOKEN")

        self.pipe = FluxPipeline.from_pretrained(
            "black-forest-labs/FLUX.1-dev",
            torch_dtype=torch.bfloat16,
            cache_dir="/models",
            token=hf_token
        )
        self.pipe.to("cuda")

    @modal.fastapi_endpoint(method="POST")
    def generate(self, request: dict):
        """Generate image with skill-optimized parameters"""

        image = self.pipe(
            prompt=request["prompt"],
            width=request["width"],
            height=request["height"],
            num_inference_steps=request["num_inference_steps"],
            guidance_scale=request["guidance_scale"],
            generator=torch.manual_seed(request["seed"])
        ).images[0]

        # Save and upload to R2
        output_path = f"/tmp/{request['job_id']}.png"
        image.save(output_path)

        output_url = upload_to_r2(output_path, request["job_id"])
        return {"output_url": output_url}
```

### Frontend Integration (Next.js)

```typescript
// Frontend API route for FLUX.1 image generation
export async function POST(request: Request) {
  const { prompt, quality_tier, aspect_ratio, style } = await request.json()

  // Use skill to optimize prompt
  const optimized = optimizeFlux1Prompt(prompt, {
    quality_tier: quality_tier || "balanced",
    aspect_ratio: aspect_ratio || "1:1",
    style
  })

  // Call Modal backend
  const response = await fetch(
    `${process.env.MODAL_IMAGE_GEN_URL}/generate`,
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

- **Preview**: ~20s generation, ~$0.012 cost
- **Balanced**: ~28s generation, ~$0.018 cost
- **Final**: ~40s generation, ~$0.030 cost
- **VRAM Usage**: 12-24GB depending on optimization
- **Output Quality**: Up to 2048×2048 PNG

## Limitations

1. **Text Rendering**: Limited ability to generate readable text
2. **Public Figures**: Model filters public figure references
3. **NSFW Content**: Built-in safety filters
4. **Max Resolution**: Practical limit at 2048×2048
5. **Speed**: Slower than FLUX.2 for equivalent quality
6. **License**: Non-commercial use only (requires HF token)

## Error Handling

```python
def handle_flux1_errors(error):
    """
    Provides user-friendly error messages for FLUX.1
    """

    error_map = {
        "MissingHFToken": {
            "message": "HuggingFace token required for FLUX.1 [dev]",
            "suggestion": "Configure HF_TOKEN in environment variables"
        },
        "VRAMOutOfMemory": {
            "message": "Insufficient GPU memory",
            "suggestion": "Reduce resolution or switch to preview quality"
        },
        "SafetyFilterTriggered": {
            "message": "Prompt violates content policy",
            "suggestion": "Rephrase prompt to avoid restricted content"
        },
        "ModelLoadError": {
            "message": "Failed to load FLUX.1 model",
            "suggestion": "Backend issue - please try again"
        },
        "TimeoutError": {
            "message": "Generation took too long",
            "suggestion": "Reduce steps or resolution"
        }
    }

    return error_map.get(error.type, {
        "message": "Image generation failed",
        "suggestion": "Please try again or contact support"
    })
```

## Usage Examples

### Example 1: Professional Portrait
```
User: "Create a professional headshot"

Skill Output:
Optimized Prompt: "Professional corporate headshot, confident business executive in formal attire, neutral gray background, facing camera with slight smile, shot on Canon EOS R5 85mm f/1.8, soft diffused studio lighting, sharp focus on eyes, high-end corporate photography"

Parameters:
- Quality: balanced
- Resolution: 1024×1024
- Steps: 30
- Guidance: 3.5
- Estimated Time: ~28s
- Estimated Cost: $0.018
```

### Example 2: Landscape Photography
```
User: "Mountain landscape at sunset"

Skill Output:
Optimized Prompt: "Majestic mountain landscape at golden hour sunset, dramatic peaks silhouetted against vibrant orange and pink sky, misty valleys below, warm light illuminating rocky terrain, wide-angle landscape photography, nature documentary style, Hasselblad medium format quality"

Parameters:
- Quality: final
- Resolution: 2048×1536 (4:3)
- Steps: 50
- Guidance: 4.0
- Estimated Time: ~42s
- Estimated Cost: $0.029
```

### Example 3: Product Photography
```
User: "Luxury watch on dark background"

Skill Output:
Optimized Prompt: "Professional product photography of luxury Swiss wristwatch, polished stainless steel case and leather strap, dramatic side lighting highlighting reflective surfaces, black gradient background, shot on Phase One XF IQ4, commercial advertising style, high-end jewelry photography"

Parameters:
- Quality: final
- Resolution: 1536×1024 (3:2)
- Steps: 50
- Guidance: 4.0
- Estimated Time: ~40s
- Estimated Cost: $0.028
```

## Future Enhancements

Planned improvements for v2.0:
1. **ControlNet Integration**: Pose, depth, edge control
2. **Inpainting/Outpainting**: Edit and extend images
3. **LoRA Support**: Custom style fine-tuning
4. **Batch Generation**: Multiple variations in one request
5. **Automatic Upscaling**: Built-in enhancement to 4K+

## Related Skills

This skill works well with:
- `flux2-image-generator`: Upgraded version with better performance
- `cogvideox-img2video`: Animate generated images
- `image-upscaler`: Enhance resolution beyond 2048×2048
- `style-transfer`: Apply artistic styles post-generation

## References

For detailed information, refer to:
- FLUX.1 Model Card: https://huggingface.co/black-forest-labs/FLUX.1-dev
- Black Forest Labs: https://blackforestlabs.ai/
- Diffusers Documentation: https://huggingface.co/docs/diffusers/api/pipelines/flux
- [CLAUDE.md](../../CLAUDE.md) - Development guidelines
- [PRD.md](../../PRD.md) - Project architecture

## Changelog

**v1.0.0** (2025-12-26):
- Initial release
- Complete FLUX.1 [dev] implementation
- Production-ready prompt optimization
- Modal GPU integration with A100 80GB
- Safety compliance framework
- Fallback option for FLUX.2

---

**Maintained by**: AI Video Generation Platform Team
**License**: Proprietary (aligned with FLUX.1 [dev] Non-Commercial License)
**Last Tested**: 2025-12-26 with FLUX.1 [dev] on A100 80GB
