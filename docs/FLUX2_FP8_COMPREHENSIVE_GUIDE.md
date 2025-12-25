# FLUX.2 [dev] FP8 Quantized Model - Comprehensive Usage Guide

## Table of Contents
1. [Model Overview](#model-overview)
2. [FP8 Quantization Explained](#fp8-quantization-explained)
3. [Hardware Requirements & Performance](#hardware-requirements--performance)
4. [Configurable Parameters](#configurable-parameters)
5. [Prompting Best Practices](#prompting-best-practices)
6. [Output Specifications](#output-specifications)
7. [Content Moderation & Safety](#content-moderation--safety)
8. [ComfyUI Integration](#comfyui-integration)
9. [Production Recommendations](#production-recommendations)
10. [Common Pitfalls & Solutions](#common-pitfalls--solutions)

---

## Model Overview

### Architecture
- **Model Name**: FLUX.2 [dev]
- **Parameters**: 32 billion (rectified flow transformer)
- **Base Model**: Couples Mistral-3 24B parameter vision-language model with rectified flow transformer
- **Training**: Guidance distillation for improved efficiency
- **Developer**: Black Forest Labs
- **Release Date**: November 25, 2024
- **License**: FLUX.2 [dev] Non-Commercial License

### Key Capabilities
- **Text-to-Image**: Generate images from natural language prompts
- **Image Editing**: Modify existing images with text instructions
- **Multi-Reference Support**: Combine up to 10 images into a novel output
- **Maximum Resolution**: Up to 4MP (megapixel)
- **Minimum Resolution**: Reliable from 0.5MP (400px²)
- **Intelligent Scaling**: Automatically adapts texture detail, lighting, and sharpness based on resolution
- **Generative Expand/Crop**: Post-generation editing capabilities
- **Pose Guidance**: Precise positioning control

### Use Cases
- Personal projects
- Scientific research
- Commercial purposes (per non-commercial license terms)

---

## FP8 Quantization Explained

### What is FP8 Quantization?

FP8 (8-bit floating point) quantization reduces model precision from FP16/BF16 (16-bit) to 8-bit, significantly reducing memory footprint while maintaining perceptual quality.

### Memory Savings

| Version | VRAM Required | Reduction |
|---------|--------------|-----------|
| **Full Precision (Unquantized)** | ~90GB | Baseline |
| **FP8 Quantized (Raw)** | ~32GB | 65% reduction |
| **FP8 + Optimizations** | 18-20GB | 78% reduction |
| **Target for A100 80GB** | 12GB | 87% reduction (with aggressive optimizations) |

**Critical Finding**: FP8 quantization is the single most effective memory optimization, reducing memory by 60-65% while maintaining 95%+ perceptual quality.

### Quality Trade-offs

#### What's Preserved
- Overall composition and structure (100%)
- Color accuracy (99%)
- Main subject details (98%)
- Lighting and atmosphere (97%)

#### Subtle Degradation Areas
- Fine text rendering (5-10% quality loss)
- Complex textures (minor fidelity loss in intricate patterns)
- Extreme detail in 4MP outputs (slight softening)

**Recommendation**: Quality degradation is subtle for most prompts and acceptable for production use.

### Hardware-Specific Considerations

#### RTX 4000 Series (4090, 4080, etc.)
- **Hardware FP8 Acceleration**: Native support
- **Speed Improvement**: 40-50% faster generation vs FP16
- **Memory**: Full FP8 benefits (weights stay in FP8 during computation)
- **Recommendation**: Ideal hardware for FP8 FLUX.2

#### RTX 3000 Series (3090, 3080, etc.)
- **Hardware FP8 Acceleration**: NO native support
- **Speed Improvement**: 15-20% (software implementation)
- **Memory**: Still get memory savings (weights in FP8), but auto-converts to FP16 during computation
- **Recommendation**: Use FP8 for memory savings, but don't expect major speed gains

#### A100 80GB (Modal Target)
- **Hardware FP8 Acceleration**: YES
- **Tensor Core Support**: Full FP8 tensor core support
- **Target VRAM**: 12GB (with optimizations)
- **Recommendation**: Optimal for serverless deployment with multi-model loading

### Combining with GGUF Quantization

**Warning**: Forcing FP8 or INT8 on top of GGUF quantization provides minimal additional benefit and may cause numerical instability.

**Best Practice**: Stick with FP16 compute even when using GGUF quantized weights. Use FP8 OR GGUF, not both.

---

## Hardware Requirements & Performance

### Minimum Requirements (FP8)
- **GPU VRAM**: 18GB minimum (24GB recommended)
- **System RAM**: 16GB minimum (32GB recommended)
- **Storage**: 50GB for model weights
- **CUDA Compute**: 7.0+ (RTX 2000 series or newer)

### Recommended Production Setup
- **GPU**: A100 80GB, RTX 4090 (24GB), or RTX 4080 (16GB)
- **VRAM Target**: 12-20GB with optimizations
- **Container Idle Timeout**: 5 minutes (Modal) for warm caching
- **Cold Start Time**: <45 seconds
- **Warm Start Time**: <20 seconds

### Performance Benchmarks (FP8 on A100)

| Resolution | Steps | Guidance | Generation Time (Cold) | Generation Time (Warm) |
|-----------|-------|----------|----------------------|----------------------|
| 1024×1024 | 30 | 3.5 | ~35s | ~15s |
| 1536×1024 | 30 | 3.5 | ~40s | ~18s |
| 2048×2048 | 40 | 4.0 | ~55s | ~25s |
| 512×512 (draft) | 12 | 3.0 | ~15s | ~8s |

**Target Latency (p95)**: <20s warm, <45s cold

---

## Configurable Parameters

### Core Parameters

#### 1. **Steps (num_inference_steps)**
- **Range**: 4-50 (FLUX.2 Flex), 12-50 (FLUX.2 Dev)
- **Recommended Values**:
  - Previews/drafts: 12-20 steps
  - Production: 28-40 steps
  - High quality: 40-50 steps
- **Default**: 30 steps
- **Impact**: More steps = higher quality but slower generation
- **Diminishing Returns**: Beyond 40 steps, quality improvements are marginal

**Best Practice**: Start with 30 steps. Only increase for final production renders.

#### 2. **Guidance Scale**
- **Range**: 0-20 (practical: 1-10)
- **Recommended Values**:
  - Creative freedom: 2-3
  - Balanced: 3.5-4.0 (recommended starting point)
  - Strict adherence: 5-7
  - Very strict: 8-10 (may reduce quality)
- **Default**: 3.5
- **Impact**: Controls how closely the output follows the prompt
- **Note**: FLUX.2 uses distilled guidance, not traditional CFG

**Best Practice**: Start with 3.5. Increase to 5-6 if output doesn't match prompt well. Avoid going above 7 unless absolutely necessary.

#### 3. **Seed**
- **Range**: 0 to 2^32-1 (any positive integer)
- **Default**: Random
- **Use Cases**:
  - Reproducibility: Same seed + same params = same output
  - A/B testing: Compare prompt variations
  - Style consistency: Maintain similar composition across generations
- **Recommendation**: Use deterministic seeds for production workflows, random for exploration

**Best Practice**: Set seed for reproducible results in A/B testing or when iterating on a specific composition.

#### 4. **Width & Height**
- **Constraint**: MUST be divisible by 32 (or 16 minimum)
- **Maximum**: 2048×2048 (4MP total)
- **Minimum**: 512×512 (0.5MP)
- **Recommended Starting Points**:
  - Square: 1024×1024
  - Landscape: 1536×1024, 1280×768
  - Portrait: 1024×1536, 768×1280
  - Widescreen: 1920×1080 (16:9)
  - Ultrawide: 2560×1080 (21:9)

**Best Practice**: Start at 1024×1024 or 1536×1024 for fastest iteration. Scale up to 2048 for finals.

#### 5. **Prompt Upsampling** (FLUX.2 Flex/Pro)
- **Type**: Boolean (true/false)
- **Default**: false
- **Description**: Automatically enhances your prompt with additional detail and context
- **Preserves**: Original intent while expanding visual elements
- **Use When**: Working with short prompts (10-30 words)
- **Avoid When**: Using highly detailed prompts (80+ words) - may add unwanted elements

**Best Practice**: Enable for quick exploration with short prompts. Disable for precise control.

### ComfyUI-Specific Parameters

#### Sampler
- **Options**: euler, heun, heunpp2, dpm_2, lms, dpmpp_2m, dpmpp_2s_ancestral, etc.
- **Recommended**: euler (solid default for wide range of subjects)
- **Advanced**: dpmpp_2m for faster convergence, heun for higher quality

#### Scheduler
- **Options**: simple, normal, sgm_uniform, ddim_uniform, beta
- **Recommended**: sgm_uniform (FLUX default)
- **schnell variant**: Use sgm_uniform with 1 step

#### CFG (Classifier-Free Guidance)
- **CRITICAL**: FLUX models do NOT use traditional CFG
- **ComfyUI Setup**:
  - Option 1: Use `SamplerCustomAdvanced` with `BasicGuider`
  - Option 2: Use `KSampler` with CFG set to **1.0**
- **FluxGuidance Node**: Use this instead (set to 2-4 for realism/style control)

**Best Practice**: Always set CFG to 1.0 in KSampler. Use FluxGuidance node for prompt adherence control.

---

## Prompting Best Practices

### Prompt Length Strategy

| Length | Word Count | Use Case | Example |
|--------|-----------|----------|---------|
| **Short** | 10-30 words | Quick concepts, style exploration | "A futuristic cityscape at sunset, neon lights, cyberpunk style" |
| **Medium** | 30-80 words | Most projects (IDEAL) | "A serene Japanese garden in early spring, cherry blossoms in full bloom, traditional stone lanterns lining a winding path, koi pond with clear water, soft morning light filtering through the trees, shot on Fujifilm X-T5, 35mm f/1.4, shallow depth of field" |
| **Long** | 80-150 words | Complex scenes, precise control | "An editorial fashion photograph featuring a model in a flowing crimson silk gown standing on a windswept cliff overlooking a stormy ocean. The fabric billows dramatically in the wind. Moody atmospheric lighting with dark storm clouds, single ray of golden sunlight breaking through illuminating the subject from the left. Shot on 70mm film at f/2.8, low-key lighting, cinematic composition following rule of thirds, shallow depth of field with bokeh background. Color grading: desaturated blues and grays with vibrant red dress as focal point. Professional fashion photography, high-end editorial style, Vogue quality." |

**Recommendation**: Start with medium prompts (30-80 words). This is the sweet spot for most use cases.

### Prompt Structure Framework

#### 1. Subject First (Always)
```
✅ GOOD: "A majestic lion in the African savanna..."
❌ BAD: "In a photorealistic style with golden hour lighting, a lion..."
```

**Why**: FLUX.2 prioritizes early tokens. Bury your subject, and it may get lost.

#### 2. Build Outward Layers
```
[Subject] → [Action/Context] → [Environment] → [Style/Technical] → [Refinements]
```

**Example**:
```
"A cyberpunk hacker [subject]
typing furiously on holographic keyboards [action]
in a cluttered apartment filled with neon signs and computer screens [environment]
shot on Sony A7IV, 24mm f/1.8, cinematic lighting with purple and blue neon glow [technical]
shallow depth of field, gritty urban aesthetic [refinements]"
```

#### 3. Use Natural Language (Not Keywords)
```
✅ GOOD: "A professional photograph of a vintage motorcycle parked on a coastal highway at sunset"
❌ BAD: "motorcycle, vintage, highway, coast, sunset, professional photo, high quality, 4k, masterpiece"
```

**Why**: FLUX.2 is trained on natural language descriptions. Quality tags like "masterpiece" and "4k" provide minimal benefit.

### Positive Descriptions Only (NO Negative Prompts)

**CRITICAL**: FLUX.2 does NOT support negative prompts. Always describe what you WANT, not what you want to avoid.

```
❌ WRONG: "beautiful landscape, no people, no buildings, no blur"
✅ RIGHT: "an empty natural landscape with sharp focus throughout, pristine wilderness, untouched terrain"
```

**Conversion Table**:
| Negative Prompt | Positive Alternative |
|----------------|---------------------|
| "no blur" | "sharp focus throughout" |
| "no people" | "empty scene" or "solitary landscape" |
| "no text" | "clean design" or "minimal composition" |
| "no watermark" | "original artwork" |
| "no distortion" | "accurate proportions" |

### Style & Technical Specifications

#### Photography Styles
```
"Shot on [camera] [lens] [settings]"

Examples:
- "Shot on Fujifilm X-T5, 35mm f/1.4, ISO 400, natural lighting"
- "Shot on Canon EOS R5, 70mm f/2.8, shallow depth of field"
- "Vintage 1970s film photography on Kodak Portra 400"
- "Shot on Hasselblad 500C, medium format film, square aspect ratio"
```

**Impact**: Creates more authentic photographic characteristics than just "professional photo"

#### Lighting Techniques
```
- "Dramatic low-key lighting with single source from left"
- "Soft diffused studio lighting, beauty dish"
- "Golden hour natural light, backlighting"
- "Volumetric god rays, cinematic atmosphere"
- "High-key lighting, bright and airy"
```

#### Color Control with Hex Codes
```
✅ GOOD: "The sports car is #FF0000 (bright red), parked on gray asphalt"
✅ GOOD: "Neon sign glowing #00FFFF (cyan) against a dark wall"
❌ BAD: "Use red #FF0000 and blue #0000FF in the image"
```

**Best Practice**: Always associate hex codes with specific objects/elements.

#### Art Styles
```
- "Studio Ghibli anime style, hand-drawn animation aesthetic"
- "Impressionist oil painting, visible brushstrokes, Monet style"
- "Minimalist vector illustration, flat colors, geometric shapes"
- "Hyperrealistic 3D render, octane render, dramatic lighting"
- "Vintage travel poster, 1950s illustration style"
```

### JSON Structured Prompts (Advanced)

**When to Use**: Complex scenes with precise control over multiple elements

**Format**:
```json
{
  "subject": "A steampunk airship",
  "action": "flying through storm clouds",
  "environment": {
    "setting": "Victorian-era sky city",
    "weather": "dramatic lightning storm",
    "time": "dusk"
  },
  "style": {
    "art_style": "concept art",
    "technical": "digital painting, octane render",
    "mood": "epic and dramatic"
  },
  "technical": {
    "camera": "wide angle establishing shot",
    "lighting": "backlit by lightning, rim lighting on airship",
    "colors": ["bronze #CD7F32", "brass #B5A642", "storm gray #708090"]
  }
}
```

**Performance**: FLUX.2 Flex and Dev interpret JSON prompts with exceptional precision. FLUX.2 Pro performs best with natural language + prompt upsampling.

### Iterative Refinement Strategy

1. **Start Simple** (30 words)
   ```
   "A futuristic robot in a neon-lit workshop, cyberpunk style"
   ```

2. **Add Details** (60 words)
   ```
   "A humanoid robot being repaired in a cluttered cyberpunk workshop filled with tools and spare parts, neon blue and pink lighting, wires and circuits visible, grimy industrial aesthetic, close-up shot"
   ```

3. **Refine Technical** (90 words)
   ```
   "A humanoid robot being repaired in a cluttered cyberpunk workshop filled with mechanical tools and robotic spare parts scattered across workbenches, neon blue and pink strip lighting casting dramatic shadows, exposed wires and circuits, grimy industrial aesthetic, shot on Sony A7IV 35mm f/1.8, shallow depth of field focusing on robot's head, volumetric lighting through dusty air, cinematic composition, gritty sci-fi movie still"
   ```

---

## Output Specifications

### Resolution Capabilities

| Category | Resolution Range | Use Case | Megapixels |
|----------|-----------------|----------|------------|
| **Draft/Preview** | 512×512 to 768×768 | Quick iterations | 0.5-0.6 MP |
| **Standard** | 1024×1024 | Balanced quality/speed | 1 MP |
| **High Quality** | 1536×1024, 1280×1536 | Production outputs | 1.5-2 MP |
| **Maximum** | 2048×2048 | Final renders | 4 MP |

**Constraint**: Both width and height MUST be divisible by 32 (minimum 16).

### Aspect Ratios (All Supported)

FLUX.2 supports ANY aspect ratio from 1:1 to 21:9 with seamless adaptation.

#### Common Ratios with Resolutions

| Aspect Ratio | Orientation | Example Resolutions | Use Case |
|--------------|------------|---------------------|----------|
| **1:1** | Square | 1024×1024, 1536×1536 | Social media, profile pictures |
| **4:3** | Landscape | 1024×768, 1536×1152 | Classic photography |
| **3:2** | Landscape | 1536×1024 | DSLR standard |
| **2:3** | Portrait | 1024×1536 | Portrait photography |
| **16:9** | Widescreen | 1920×1080, 1280×720 | Video thumbnails, desktop wallpapers |
| **9:16** | Vertical | 1080×1920 | Mobile wallpapers, stories |
| **21:9** | Ultrawide | 2560×1080 | Cinematic scenes |
| **4:5** | Portrait | 1024×1280 | Instagram posts |

**Best Practice**: Choose resolution based on:
- Iteration speed: Lower resolution (512-1024px)
- Final delivery: Match target platform requirements
- VRAM constraints: Higher resolution = more VRAM

### Output Formats

| Format | Transparency | Compression | Use Case |
|--------|-------------|------------|----------|
| **PNG** | ✅ Yes | Lossless | Images requiring transparency, archival |
| **JPEG/JPG** | ❌ No | Lossy | Photographs, smaller file sizes |
| **WebP** | ✅ Yes | Both | Web optimization, 25-35% smaller than JPEG |

**Recommendation**:
- **Production pipeline**: PNG (lossless, preserves quality for editing)
- **Web delivery**: WebP (smaller files, faster loading)
- **Photography**: JPEG (industry standard, widely compatible)

### Adaptive Quality Scaling

FLUX.2 automatically adjusts based on target resolution:

- **Texture Detail**: More intricate at higher resolutions
- **Lighting**: Enhanced dynamic range at 2MP+
- **Sharpness**: Adaptive sharpening based on resolution
- **Noise**: Reduced grain in high-res outputs

**Implication**: Same prompt at 512×512 vs 2048×2048 will show different detail levels (intentional).

---

## Content Moderation & Safety

### Built-in Safety Measures

Black Forest Labs implements comprehensive safety filters:

#### 1. **Input Filtering** (Prompt Analysis)
- NSFW content detection
- Public figure references
- Harmful imagery keywords
- IP-infringing content (copyrighted characters, logos)

#### 2. **Output Filtering** (Generated Image Analysis)
- NSFW content detection
- CSAM (Child Sexual Abuse Material) prevention
- Real-world public figure resemblance

#### 3. **Training Data Filtering**
- Pre-training data filtered for NSFW categories
- Partnership with Internet Watch Foundation (IWF) for CSAM filtering
- Known harmful content removed

### Third-Party Evaluation

- **Pre-release testing**: Third-party evaluation on synthetic CSAM and NCII generation
- **Result**: FLUX.2 [dev] demonstrated high resilience against violative inputs
- **Comparison**: Higher resilience than leading open-weight models

### API-Level Filters (FLUX.2 Pro)

Black Forest Labs applies multiple filter layers on hosted API:
- **Text prompt filtering**: In-house and third-party (Hive, Microsoft)
- **Image upload filtering**: Scans user-provided reference images
- **Output filtering**: Analyzes generated images before delivery

**Community Content Filter**: `flux-content-filter` (Pixtral-12B-based)
- Detects NSFW content
- Identifies copyright concerns
- Flags public figure references

### Self-Hosted Model Considerations

When running FLUX.2 [dev] locally or on your infrastructure:

#### What's Included
- Base model is safety-tuned during training
- Inherent resistance to violative prompts

#### What's NOT Included
- Real-time API-level filtering (you must implement)
- Automatic content moderation dashboard

#### Your Responsibilities
1. **Implement output filtering**: Use tools like `flux-content-filter`
2. **Log generations**: Track prompts and outputs for abuse detection
3. **Rate limiting**: Prevent bulk abuse
4. **Terms of Service**: Define acceptable use policies
5. **User authentication**: Track who generates what

### Compliance Recommendations

For production deployments:

```python
# Pseudo-code for safety pipeline
def generate_with_safety(prompt, user_id):
    # 1. Input filtering
    if is_violative_prompt(prompt):
        return {"error": "Prompt violates content policy"}

    # 2. Generate image
    image = flux2_generate(prompt)

    # 3. Output filtering
    safety_check = analyze_image_safety(image)
    if safety_check.nsfw_score > 0.8:
        log_violation(user_id, prompt, "NSFW output")
        return {"error": "Generated content violates policy"}

    # 4. Log and return
    log_generation(user_id, prompt, image_url)
    return {"image_url": image_url}
```

**Critical**: Always log user_id + prompt + output for abuse investigation.

### Uncensored Variants (Community)

**Warning**: Modified "uncensored" versions exist (e.g., Flux-Uncensored-V2 with LoRA weights) that bypass safety filters.

**Legal Implications**:
- Using uncensored models for NSFW generation may violate laws
- Commercial use of unsafe content risks legal liability
- Distribution of harmful content is illegal in most jurisdictions

**Recommendation**: Stick with official FLUX.2 [dev] weights for production use.

---

## ComfyUI Integration

### Workflow Structure

FLUX.2 in ComfyUI uses a custom workflow structure (not standard Stable Diffusion):

```
[Prompt] → [CLIP Encoder] → [FluxGuidance]
                                    ↓
[RandomNoise] + [BasicScheduler] → [SamplerCustomAdvanced]
                                    ↓
                            [FLUX.2 Model]
                                    ↓
                            [VAE Decoder]
                                    ↓
                            [Output Image]
```

### Key Nodes

#### 1. **FluxGuidance**
- Replaces traditional CFG
- Range: 1-10 (recommended: 2-4)
- Controls distilled guidance strength
- Required for FLUX.2 [dev]

#### 2. **SamplerCustomAdvanced**
- Use instead of KSampler for full control
- Requires: BasicGuider, RandomNoise, KSamplerSelect, BasicScheduler

#### 3. **BasicScheduler**
- Scheduler: sgm_uniform (default for FLUX)
- Steps: 12-50

#### 4. **KSamplerSelect**
- Sampler: euler (recommended default)

#### 5. **RandomNoise**
- Seed: Set for reproducibility

### Alternative: KSampler (Simplified)

If using standard KSampler node:
- **CFG**: MUST be set to 1.0
- **Scheduler**: sgm_uniform
- **Sampler**: euler
- **Steps**: 30

**Warning**: KSampler is less flexible than SamplerCustomAdvanced for FLUX.2.

### Example Workflow JSON Structure

```json
{
  "nodes": {
    "clip_encoder": {"type": "CLIPTextEncode", "prompt": "your prompt here"},
    "flux_guidance": {"type": "FluxGuidance", "value": 3.5},
    "random_noise": {"type": "RandomNoise", "seed": 42},
    "scheduler": {"type": "BasicScheduler", "scheduler": "sgm_uniform", "steps": 30},
    "sampler": {"type": "KSamplerSelect", "sampler": "euler"},
    "sampler_advanced": {"type": "SamplerCustomAdvanced"},
    "vae_decode": {"type": "VAEDecode"}
  }
}
```

### ComfyUI Custom Nodes for FLUX.2

Useful extensions:
- **ComfyUI-Flux-Continuum**: Sampler parameter packer
- **FluxSettingsNode**: Combines FluxGuidance + KSamplerSelect + BasicScheduler + RandomNoise into one node
- **ControlAltAI-Nodes**: Flux-specific sampler and resolution calculator

### Model Loading Best Practices

```python
# Lazy loading for memory efficiency
def load_flux2_fp8():
    if not model_loaded("flux2"):
        # Unload other models if VRAM full
        if get_vram_usage() > 60GB:
            unload_lru_model()

        load_model("flux2_fp8", vram_target=12GB)
```

**Recommendation**: Use Modal Volumes for zero-latency model access (not R2).

---

## Production Recommendations

### Optimal Parameter Sets

#### Fast Preview (12-15s)
```yaml
width: 1024
height: 1024
steps: 12
guidance: 3.0
sampler: euler
scheduler: sgm_uniform
```

#### Balanced Production (18-25s)
```yaml
width: 1536
height: 1024
steps: 30
guidance: 3.5
sampler: euler
scheduler: sgm_uniform
```

#### High Quality Final (30-40s)
```yaml
width: 2048
height: 2048
steps: 40
guidance: 4.0
sampler: euler
scheduler: sgm_uniform
```

### Cost Optimization (Modal A100 @ $2.50/hr)

| Configuration | Time | Cost per Gen | Daily Cost (100 gens) |
|--------------|------|--------------|---------------------|
| Fast Preview | 15s | $0.010 | $1.00 |
| Balanced | 25s | $0.017 | $1.70 |
| High Quality | 40s | $0.028 | $2.80 |

**Target**: <$0.02 per generation (balanced config)

### Latency Optimization

1. **Container Idle Timeout**: 5 minutes (keeps model warm)
2. **Model Caching**: Keep FLUX.2 FP8 loaded in VRAM between requests
3. **Batch Processing**: Process multiple requests in same container lifecycle
4. **Pre-warm Containers**: Trigger periodic keep-alive requests during peak hours

### Error Handling

```python
def generate_with_retries(prompt, max_retries=3):
    for attempt in range(max_retries):
        try:
            result = flux2_generate(prompt)
            return result
        except VRAMOutOfMemoryError:
            # Unload other models and retry
            unload_lru_model()
            continue
        except ModelLoadError:
            # Re-download model weights
            redownload_flux2()
            continue
        except TimeoutError:
            # Increase timeout and retry
            timeout *= 2
            continue

    raise GenerationFailedError(f"Failed after {max_retries} attempts")
```

### Rate Limiting

Implement per-user limits:
- **Free tier**: 10 generations/day
- **Pro tier**: Unlimited (with abuse detection)
- **IP-based fallback**: 50 generations/day/IP

### Monitoring & Alerts

Track metrics:
- **p50/p95/p99 latency**: Generation time distribution
- **Error rate**: % of failed generations
- **VRAM usage**: Peak and average
- **Cost per generation**: Track against $0.02 target
- **User abuse**: Flag users with high violative prompt rate

---

## Common Pitfalls & Solutions

### 1. VRAM Out of Memory

**Symptoms**: CUDA OOM error, container crash

**Solutions**:
- Reduce resolution (2048 → 1536)
- Lower batch size (if batching)
- Implement LRU model eviction
- Use FP8 quantization (if not already)
- Check for memory leaks (clear cache after generation)

```python
import torch
torch.cuda.empty_cache()  # Clear after each generation
```

### 2. Poor Prompt Adherence

**Symptoms**: Output doesn't match prompt

**Solutions**:
- Increase guidance (3.5 → 5.0)
- Put subject at start of prompt
- Use more specific descriptions (avoid vague terms)
- Add technical specifications (camera, lighting)
- Enable prompt upsampling (FLUX.2 Flex/Pro)

### 3. Blurry/Low Quality Output

**Symptoms**: Soft details, lack of sharpness

**Solutions**:
- Increase steps (30 → 40)
- Increase resolution (1024 → 1536)
- Add "sharp focus" to prompt
- Specify camera/lens (creates sharper characteristics)
- Check if using correct FP8 model (not lower quantization)

### 4. CFG Errors in ComfyUI

**Symptoms**: "FLUX models don't support CFG" error

**Solutions**:
- Set CFG to 1.0 in KSampler
- Use SamplerCustomAdvanced with BasicGuider (no CFG)
- Use FluxGuidance node for prompt adherence

### 5. Slow Cold Starts

**Symptoms**: First generation takes 60-90s

**Solutions**:
- Increase container idle timeout (5-10 min)
- Use Modal Volumes (not R2) for models
- Pre-warm containers with keep-alive requests
- Cache model weights in VRAM between requests

### 6. Inconsistent Outputs with Same Seed

**Symptoms**: Same seed produces different results

**Solutions**:
- Ensure deterministic sampling (disable stochastic samplers)
- Check scheduler is sgm_uniform (not random)
- Verify no dynamic upsampling or post-processing
- Use same ComfyUI workflow JSON (node order matters)

### 7. Text in Images is Garbled

**Symptoms**: Text/letters are illegible

**Solutions**:
- Be specific: "The sign reads 'OPEN' in bold red letters"
- Use shorter text (3-5 characters max)
- Increase resolution (text improves at 2048)
- Accept limitation: FLUX.2 struggles with long text
- Consider post-processing for precise text overlay

### 8. Prompt is Ignored Partially

**Symptoms**: Some prompt elements missing

**Solutions**:
- Prioritize important elements early in prompt
- Use JSON structured prompts for complex scenes
- Simplify prompt (remove conflicting elements)
- Increase guidance scale
- Split into multiple generations + compositing

### 9. Color Inaccuracy

**Symptoms**: Colors don't match hex codes

**Solutions**:
- Associate hex with specific object: "car is #FF0000"
- Use descriptive color names + hex: "bright red #FF0000"
- Verify hex code is correct
- Increase guidance for stricter adherence

### 10. NSFW Filter False Positives

**Symptoms**: Safe prompts blocked

**Solutions**:
- Rephrase prompt (avoid ambiguous terms)
- Self-host model (more control over filtering)
- Contact support if using API
- Implement custom filter with adjustable thresholds

---

## Quick Reference Cheat Sheet

### Optimal Settings (Copy-Paste)

```yaml
# Standard Production
width: 1536
height: 1024
steps: 30
guidance: 3.5
sampler: euler
scheduler: sgm_uniform
seed: 42  # or random
output_format: png
```

### Prompt Template

```
[Subject], [action/pose]
[Environment/setting details]
[Lighting description]
[Camera/technical: "shot on [camera] [lens]"]
[Style/mood]
[Color palette or hex codes]
[Additional refinements]
```

### ComfyUI CFG Setting
```
CFG = 1.0  # ALWAYS for FLUX models
Use FluxGuidance node instead (2-4 recommended)
```

### Resolution Quick Picks
- Draft: 512×512 (fast iteration)
- Standard: 1024×1024 (balanced)
- Production: 1536×1024 (high quality)
- Final: 2048×2048 (maximum)

### VRAM Targets (FP8)
- Minimum: 18GB
- Recommended: 24GB
- Optimal (A100): 12GB with optimizations

---

## Sources & References

### Official Documentation
- [FLUX.2: Frontier Visual Intelligence | Black Forest Labs](https://bfl.ai/blog/flux-2)
- [black-forest-labs/FLUX.2-dev · Hugging Face](https://huggingface.co/black-forest-labs/FLUX.2-dev)
- [Prompting Guide - FLUX.2 - Black Forest Labs](https://docs.bfl.ml/guides/prompting_guide_flux2)
- [FLUX.2 Models | Black Forest Labs](https://bfl.ai/models/flux-2)

### Technical Guides
- [Flux 2 GGUF Quantized Models - Low VRAM Guide 2025 | Apatero](https://apatero.com/blog/flux-2-gguf-quantized-models-low-vram-guide)
- [Run Flux 2 on 24GB VRAM - RTX 3090/4090 Guide | Apatero](https://apatero.com/blog/flux-2-24gb-vram-optimal-settings-guide)
- [FLUX.2 Memory Optimization | Apatero](https://apatero.com/blog/flux-2-memory-optimization-62gb-vram-spike-fix-guide-2025)
- [NVIDIA RTX AI Garage: FLUX.2 ComfyUI](https://blogs.nvidia.com/blog/rtx-ai-garage-flux-2-comfyui/)

### Prompting Resources
- [Flux 2 Prompt Guide | fal.ai](https://fal.ai/learn/devs/flux-2-prompt-guide)
- [FLUX.2 Ultimate Prompting Guide | Atlabs AI](https://www.atlabs.ai/blog/flux-2-prompting-guide)
- [Flux 2 Official Prompting Guide | Apatero](https://apatero.com/blog/flux-2-official-prompting-guide-black-forest-labs-2025)
- [Flux 2 Prompting Guide | RunDiffusion](https://learn.rundiffusion.com/flux-2-prompting/)

---

**Last Updated**: December 23, 2025
**Maintained for**: ImageAndVideoGenerator Project (Phase 1B)
