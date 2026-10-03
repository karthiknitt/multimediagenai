import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Sign In - Multimedia Generator",
  description: "Sign in to your Multimedia Generator account",
};

export default function LoginPage() {
  return <LoginForm />;
}
