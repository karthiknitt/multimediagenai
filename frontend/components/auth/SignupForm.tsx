"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowRight, Check, Loader2, Lock, Mail, Sparkles, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUp } from "@/lib/auth-client";
import { type SignupInput, signupSchema } from "@/lib/validation";

const passwordRequirements = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "One number", test: (p: string) => /\d/.test(p) },
];

export function SignupForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const password = watch("password", "");

  const onSubmit = async (data: SignupInput) => {
    setError(null);

    try {
      const result = await signUp.email({
        name: data.name,
        email: data.email,
        password: data.password,
      });

      if (result.error) {
        setError(result.error.message || "Failed to create account. Please try again.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      console.error("Signup error:", err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Effects */}
      <div className="pointer-events-none absolute inset-0">
        <div className="orb-gradient orb-cyan" />
        <div className="orb-gradient orb-magenta" />
      </div>
      <div className="pointer-events-none absolute inset-0 mesh-gradient opacity-30" />

      {/* Auth Card */}
      <div className="w-full max-w-md relative">
        {/* Logo/Brand */}
        <Link href="/" className="flex items-center justify-center gap-2 mb-8 group">
          <div className="p-2 rounded-xl bg-linear-to-br from-cyan-500/10 to-magenta-500/10 group-hover:scale-110 transition-transform">
            <Sparkles className="h-6 w-6 text-cyan-400" />
          </div>
          <span className="text-2xl font-bold gradient-text">Multimedia Generator</span>
        </Link>

        <div className="card-premium p-8 animate-fade-in-up">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Create Account</h1>
            <p className="text-foreground/60">Start creating with AI in seconds</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Error Alert */}
            {error && (
              <div className="glass-strong border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Name Field */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-semibold">
                Full Name
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-foreground/40 pointer-events-none" />
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  className="input-premium pl-11"
                  autoComplete="name"
                  disabled={isSubmitting}
                  aria-invalid={!!errors.name}
                  {...register("name")}
                />
              </div>
              {errors.name && <p className="text-sm text-red-400">{errors.name.message}</p>}
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-foreground/40 pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  className="input-premium pl-11"
                  autoComplete="email"
                  disabled={isSubmitting}
                  aria-invalid={!!errors.email}
                  {...register("email")}
                />
              </div>
              {errors.email && <p className="text-sm text-red-400">{errors.email.message}</p>}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-foreground/40 pointer-events-none" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a secure password"
                  className="input-premium pl-11"
                  autoComplete="new-password"
                  disabled={isSubmitting}
                  aria-invalid={!!errors.password}
                  {...register("password")}
                />
              </div>
              {/* Password Requirements */}
              <div className="glass rounded-lg p-3 space-y-1.5">
                {passwordRequirements.map((req) => (
                  <div
                    key={req.label}
                    className={`flex items-center gap-2 text-xs transition-colors ${
                      req.test(password) ? "text-cyan-400" : "text-foreground/40"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center ${
                        req.test(password) ? "bg-cyan-500/20" : "bg-foreground/5"
                      }`}
                    >
                      <Check className="h-2.5 w-2.5" />
                    </div>
                    {req.label}
                  </div>
                ))}
              </div>
              {errors.password && <p className="text-sm text-red-400">{errors.password.message}</p>}
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-semibold">
                Confirm Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-foreground/40 pointer-events-none" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter your password"
                  className="input-premium pl-11"
                  autoComplete="new-password"
                  disabled={isSubmitting}
                  aria-invalid={!!errors.confirmPassword}
                  {...register("confirmPassword")}
                />
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-red-400">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Terms */}
            <p className="text-xs text-foreground/50 leading-relaxed">
              By creating an account, you agree to our{" "}
              <Link href="/terms" className="text-cyan-400 hover:text-cyan-300 transition-colors">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-cyan-400 hover:text-cyan-300 transition-colors">
                Privacy Policy
              </Link>
            </p>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-premium w-full py-3! disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="flex items-center justify-center gap-2">
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </span>
            </button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-foreground/10" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-card px-4 text-foreground/60">Already have an account?</span>
              </div>
            </div>

            {/* Sign In Link */}
            <Link
              href="/login"
              className="block w-full text-center glass hover-glow border border-foreground/20 rounded-xl py-3 px-6 font-semibold transition-all"
            >
              Sign In
            </Link>
          </form>

          {/* Back to Home */}
          <div className="mt-8 text-center">
            <Link
              href="/"
              className="text-sm text-foreground/60 hover:text-cyan-400 transition-colors inline-flex items-center gap-1"
            >
              ← Back to home
            </Link>
          </div>
        </div>

        {/* Trust Indicator */}
        <p className="mt-6 text-center text-sm text-foreground/50 mono">
          10 free generations daily • No credit card required
        </p>
      </div>
    </div>
  );
}
