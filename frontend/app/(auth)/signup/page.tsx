import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/SignupForm";

export const metadata: Metadata = {
  title: "Create Account - Multimedia Generator",
  description: "Create your Multimedia Generator account and start generating amazing content",
};

export default function SignupPage() {
  return <SignupForm />;
}
