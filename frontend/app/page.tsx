import { Features } from "@/components/landing/Features";
import { Footer } from "@/components/landing/Footer";
import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { Pricing } from "@/components/landing/Pricing";

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="min-h-screen">
        <Hero />
        <Features />
        <Pricing />
        <Footer />
      </main>
    </>
  );
}
