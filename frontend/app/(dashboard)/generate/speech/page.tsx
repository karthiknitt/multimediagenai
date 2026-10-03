"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Volume2, Upload } from "lucide-react";

export default function SpeechGenerationPage() {
  const [text, setText] = useState("");
  const [speed, setSpeed] = useState(1.0);
  const [language, setLanguage] = useState("en");
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const maxChars = 500;
  const charCount = text.length;

  const handleGenerate = async () => {
    if (!text.trim() || charCount > maxChars) return;

    setIsGenerating(true);

    try {
      // TODO: Implement TTS generation API call
      // const response = await fetch('/api/generate/speech', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     text,
      //     speed: speed,
      //     language,
      //   }),
      // });

      // const data = await response.json();
      // setAudioUrl(data.outputUrl);

      // Simulate generation for now
      await new Promise(resolve => setTimeout(resolve, 3000));
      console.log("Generated speech:", { text, speed: speed, language });
    } catch (error) {
      console.error("Generation error:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Text to Speech</h1>
        <p className="text-muted-foreground mt-2">
          Generate natural-sounding speech from text using F5-TTS
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Sidebar - Controls */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>Configure speech parameters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Language Selection */}
            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger id="language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="zh" disabled>Chinese (Coming Soon)</SelectItem>
                  <SelectItem value="fr" disabled>French (Coming Soon)</SelectItem>
                  <SelectItem value="de" disabled>German (Coming Soon)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Speed Control */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="speed">Speed</Label>
                <span className="text-sm text-muted-foreground">{speed.toFixed(1)}x</span>
              </div>
              <Slider
                id="speed"
                min={0.8}
                max={1.5}
                step={0.1}
                value={speed}
                onValueChange={setSpeed}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0.8x</span>
                <span>1.5x</span>
              </div>
            </div>

            {/* Voice Selection */}
            <div className="space-y-2">
              <Label>Voice</Label>
              <Select defaultValue="professional-male">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional-male">Professional Male</SelectItem>
                  <SelectItem value="professional-female">Professional Female</SelectItem>
                  <SelectItem value="casual-male">Casual Male</SelectItem>
                  <SelectItem value="casual-female">Casual Female</SelectItem>
                  <SelectItem value="narrator">Narrator</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Upload Custom Voice */}
            <div className="space-y-2">
              <Label>Custom Voice (Optional)</Label>
              <Button variant="outline" className="w-full" disabled>
                <Upload className="mr-2 h-4 w-4" />
                Upload Voice Sample
              </Button>
              <p className="text-xs text-muted-foreground">
                Upload 3-10s audio for voice cloning (Coming Soon)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Main Area - Text Input & Preview */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Text Input</CardTitle>
            <CardDescription>
              Enter text to convert to speech (max {maxChars} characters)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Text Input */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="text">Text</Label>
                <span className={`text-sm ${charCount > maxChars ? "text-destructive" : "text-muted-foreground"}`}>
                  {charCount} / {maxChars}
                </span>
              </div>
              <Textarea
                id="text"
                placeholder="Enter your text here..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="min-h-[200px] resize-none"
                maxLength={maxChars}
              />
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={!text.trim() || charCount > maxChars || isGenerating}
              className="w-full"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Speech...
                </>
              ) : (
                <>
                  <Volume2 className="mr-2 h-4 w-4" />
                  Generate Speech
                </>
              )}
            </Button>

            {/* Audio Preview */}
            {audioUrl && (
              <div className="mt-6 p-4 border rounded-lg bg-muted/50">
                <Label className="mb-2 block">Generated Audio</Label>
                <audio controls className="w-full">
                  <source src={audioUrl} type="audio/wav" />
                  Your browser does not support the audio element.
                </audio>
              </div>
            )}

            {/* Info Box */}
            <div className="mt-4 p-4 border rounded-lg bg-muted/30">
              <h4 className="text-sm font-semibold mb-2">About F5-TTS</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• State-of-the-art text-to-speech quality</li>
                <li>• Natural-sounding voice synthesis</li>
                <li>• Fast generation (~4-6 seconds for 30s audio)</li>
                <li>• Voice cloning support (coming soon)</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
