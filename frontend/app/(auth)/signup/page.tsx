import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/SignupForm";

export const metadata: Metadata = {
  title: "Create Account - AI Video Gen",
  description: "Create your AI Video Gen account and start generating amazing content",
};

export default function SignupPage() {
  return <SignupForm />;
}
