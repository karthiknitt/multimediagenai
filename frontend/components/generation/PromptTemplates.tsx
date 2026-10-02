"use client";

import { Camera, Image, Mountain, Palette, Sparkles, User } from "lucide-react";
import { useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";

interface PromptTemplatesProps {
  onSelect: (template: string) => void;
  onClose: () => void;
}

const templates = [
  {
    category: "Photography",
    icon: Camera,
    prompts: [
      {
        title: "Portrait Photo",
        prompt:
          "Professional portrait photograph of a person, soft natural lighting, shallow depth of field, 85mm lens, high resolution, photorealistic",
      },
      {
        title: "Product Shot",
        prompt:
          "Professional product photography, studio lighting, clean white background, high detail, commercial quality, 4K resolution",
      },
      {
        title: "Street Photography",
        prompt:
          "Candid street photography, urban environment, golden hour lighting, documentary style, authentic moments, 35mm aesthetic",
      },
    ],
  },
  {
    category: "Art Styles",
    icon: Palette,
    prompts: [
      {
        title: "Oil Painting",
        prompt:
          "Oil painting in the style of classical masters, rich colors, visible brushstrokes, dramatic lighting, museum quality",
      },
      {
        title: "Watercolor",
        prompt:
          "Delicate watercolor illustration, soft edges, flowing colors, artistic composition, paper texture visible",
      },
      {
        title: "Digital Art",
        prompt:
          "Digital art illustration, vibrant colors, detailed rendering, trending on ArtStation, concept art style",
      },
    ],
  },
  {
    category: "Landscapes",
    icon: Mountain,
    prompts: [
      {
        title: "Epic Landscape",
        prompt:
          "Breathtaking landscape photography, dramatic sky, golden hour, mountain vista, nature photography, ultra wide angle",
      },
      {
        title: "Fantasy World",
        prompt:
          "Fantasy landscape with floating islands, magical atmosphere, ethereal lighting, dreamlike quality, concept art",
      },
      {
        title: "Cinematic Scene",
        prompt:
          "Cinematic landscape shot, movie quality, dramatic composition, volumetric lighting, 8K resolution, film grain",
      },
    ],
  },
  {
    category: "Characters",
    icon: User,
    prompts: [
      {
        title: "Fantasy Character",
        prompt:
          "Fantasy character portrait, detailed armor, epic pose, dramatic lighting, highly detailed, concept art style",
      },
      {
        title: "Sci-Fi Character",
        prompt:
          "Futuristic sci-fi character, cyberpunk aesthetic, neon lighting, detailed costume, high tech elements",
      },
      {
        title: "Anime Style",
        prompt:
          "Anime character illustration, vibrant colors, dynamic pose, detailed features, Studio Ghibli inspired",
      },
    ],
  },
  {
    category: "Abstract",
    icon: Sparkles,
    prompts: [
      {
        title: "Abstract Art",
        prompt:
          "Abstract art composition, bold colors, geometric shapes, modern art style, gallery quality, expressive",
      },
      {
        title: "Surreal Scene",
        prompt:
          "Surrealist artwork, dreamlike imagery, impossible architecture, Salvador Dali inspired, thought-provoking",
      },
      {
        title: "Minimalist",
        prompt:
          "Minimalist design, clean composition, limited color palette, negative space, elegant simplicity",
      },
    ],
  },
];

export function PromptTemplates({ onSelect, onClose }: PromptTemplatesProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full z-50 mt-2 w-96 max-h-96 overflow-auto shadow-2xl border-2 border-cyan-400/30 bg-background rounded-lg"
      role="dialog"
      aria-label="Prompt templates"
    >
      <div className="p-4 space-y-4">
        {templates.map((category) => (
          <div key={category.category}>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground/80">
              <category.icon className="h-4 w-4 text-cyan-400" />
              {category.category}
            </div>
            <div className="space-y-1">
              {category.prompts.map((template) => (
                <button
                  key={template.title}
                  type="button"
                  onClick={() => onSelect(template.prompt)}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm glass hover-glow border border-foreground/10 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2"
                >
                  <div className="font-semibold text-foreground">{template.title}</div>
                  <div className="mt-0.5 line-clamp-2 text-xs text-foreground/60">
                    {template.prompt}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
