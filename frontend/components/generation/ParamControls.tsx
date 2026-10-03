"use client";

import { ChevronDown, ChevronUp, Dices, RotateCcw, X } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { defaultsFor, type ParamDef } from "@/lib/model-params";
import { cn } from "@/lib/utils";

interface ParamControlsProps {
  defs: readonly ParamDef[];
  values: Record<string, unknown>;
  /** set one or more values (presets set width and height together) */
  onChange: (patch: Record<string, unknown>) => void;
  disabled?: boolean;
  className?: string;
}

function formatValue(def: ParamDef, value: number): string {
  const decimals = (def.step ?? 1) < 1 ? String(def.step).split(".")[1]?.length : 0;
  return `${value.toFixed(decimals ?? 0)}${def.unit ? ` ${def.unit}` : ""}`;
}

function Help({ text }: { text?: string }) {
  return text ? <p className="text-xs text-muted-foreground">{text}</p> : null;
}

function Field({
  def,
  values,
  onChange,
  disabled,
}: {
  def: ParamDef;
  values: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const raw = values[def.key];
  const set = (v: unknown) => onChange({ [def.key]: v });

  switch (def.kind) {
    case "slider": {
      const value = typeof raw === "number" ? raw : (def.default as number);
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor={id}>{def.label}</Label>
            <span className="font-mono text-sm text-muted-foreground">
              {formatValue(def, value)}
            </span>
          </div>
          <Slider
            id={id}
            value={value}
            min={def.min}
            max={def.max}
            step={def.step}
            onValueChange={set}
            disabled={disabled}
            showValue={false}
          />
          {def.presets && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {def.presets.map((p) => {
                const active = values.width === p.width && values.height === p.height;
                return (
                  <button
                    key={p.label}
                    type="button"
                    disabled={disabled}
                    aria-pressed={active}
                    onClick={() => onChange({ width: p.width, height: p.height })}
                    title={`${p.width} × ${p.height}`}
                    className={cn(
                      "rounded-md border px-2 py-1 font-mono text-xs transition-colors disabled:opacity-50",
                      active
                        ? "border-cyan-400 bg-cyan-500/20 text-cyan-300"
                        : "border-border text-muted-foreground hover:border-cyan-400/50 hover:text-foreground",
                    )}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          )}
          <Help text={def.help} />
        </div>
      );
    }

    case "number":
      return (
        <div className="space-y-2">
          <Label htmlFor={id}>{def.label}</Label>
          <Input
            id={id}
            type="number"
            min={def.min}
            max={def.max}
            step={def.step ?? 1}
            value={typeof raw === "number" ? raw : ""}
            placeholder={def.placeholder ?? "Auto"}
            disabled={disabled}
            onChange={(e) => set(e.target.value === "" ? undefined : Number(e.target.value))}
            className="font-mono"
          />
          <Help text={def.help} />
        </div>
      );

    case "seed":
      return (
        <div className="space-y-2">
          <Label htmlFor={id}>{def.label}</Label>
          <div className="flex gap-2">
            <Input
              id={id}
              type="number"
              min={0}
              value={typeof raw === "number" ? raw : ""}
              placeholder="Random"
              disabled={disabled}
              onChange={(e) => {
                const n = Number.parseInt(e.target.value, 10);
                set(Number.isNaN(n) ? undefined : n);
              }}
              className="flex-1 font-mono"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={disabled}
              title="Pick a random seed"
              aria-label="Pick a random seed"
              onClick={() => set(Math.floor(Math.random() * 2_147_483_647))}
            >
              <Dices className="h-4 w-4" />
            </Button>
            {typeof raw === "number" && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={disabled}
                title="Clear (random each time)"
                aria-label="Clear seed"
                onClick={() => set(undefined)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <Help text={def.help} />
        </div>
      );

    case "switch": {
      const on = typeof raw === "boolean" ? raw : Boolean(def.default);
      return (
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor={id}>{def.label}</Label>
            <button
              id={id}
              type="button"
              role="switch"
              aria-checked={on}
              disabled={disabled}
              onClick={() => set(!on)}
              className={cn(
                "relative h-6 w-11 shrink-0 rounded-full border transition-colors disabled:opacity-50",
                on ? "border-cyan-400 bg-cyan-500/40" : "border-border bg-secondary",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-4.5 w-4.5 rounded-full bg-foreground transition-all",
                  on ? "left-[1.375rem]" : "left-0.5",
                )}
              />
            </button>
          </div>
          <Help text={def.help} />
        </div>
      );
    }

    case "select": {
      const value = typeof raw === "string" ? raw : String(def.default ?? "");
      return (
        <div className="space-y-2">
          <Label htmlFor={id}>{def.label}</Label>
          <Select value={value} onValueChange={set} disabled={disabled}>
            <SelectTrigger id={id} aria-label={def.label}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {def.options?.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Help text={def.help} />
        </div>
      );
    }

    case "text":
    case "textarea": {
      const value = typeof raw === "string" ? raw : "";
      const common = {
        id,
        value,
        placeholder: def.placeholder,
        disabled,
        maxLength: def.maxLength,
        onChange: (
          e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>,
        ) => set(e.target.value === "" ? undefined : e.target.value),
      };
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor={id}>{def.label}</Label>
            {def.maxLength && (
              <span className="font-mono text-xs text-muted-foreground">
                {value.length}/{def.maxLength}
              </span>
            )}
          </div>
          {def.kind === "textarea" ? <Textarea rows={3} {...common} /> : <Input {...common} />}
          <Help text={def.help} />
        </div>
      );
    }
  }
}

function Section({ defs, values, onChange, disabled }: Omit<ParamControlsProps, "className">) {
  const visible = defs.filter((d) => !d.when || d.when(values));
  const out: React.ReactNode[] = [];
  let lastGroup: string | undefined;
  for (const d of visible) {
    if (d.group && d.group !== lastGroup) {
      out.push(
        <h4
          key={`g-${d.group}`}
          className="pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        >
          {d.group}
        </h4>,
      );
    }
    lastGroup = d.group;
    out.push(<Field key={d.key} def={d} values={values} onChange={onChange} disabled={disabled} />);
  }
  return <div className="space-y-5">{out}</div>;
}

/**
 * Schema-driven parameter form: renders every registry entry for a model, with the
 * `advanced` ones in a collapsible section. Values are controlled by the parent page.
 */
export function ParamControls({ defs, values, onChange, disabled, className }: ParamControlsProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const main = defs.filter((d) => !d.advanced);
  const advanced = defs.filter((d) => d.advanced);
  const advancedVisible = advanced.some((d) => !d.when || d.when(values));

  return (
    <div className={cn("space-y-5", className)}>
      <Section defs={main} values={values} onChange={onChange} disabled={disabled} />

      {advancedVisible && (
        <>
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-between"
            aria-expanded={showAdvanced}
            onClick={() => setShowAdvanced((s) => !s)}
          >
            Advanced options
            {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          {showAdvanced && (
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <Section defs={advanced} values={values} onChange={onChange} disabled={disabled} />
            </div>
          )}
        </>
      )}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled}
        onClick={() => {
          const reset: Record<string, unknown> = { ...defaultsFor(defs) };
          for (const d of defs) if (d.default === undefined) reset[d.key] = undefined;
          onChange(reset);
        }}
        className="text-muted-foreground"
      >
        <RotateCcw className="mr-2 h-3.5 w-3.5" />
        Reset parameters
      </Button>
    </div>
  );
}
