import type { Metadata } from "next";
import Link from "next/link";
import { Image, Video, Music, Zap, HardDrive, TrendingUp, Sparkles, ArrowRight } from "lucide-react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { RecentGenerations } from "@/components/dashboard/RecentGenerations";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Dashboard - AI Video Gen",
  description: "Your AI generation dashboard",
};

async function getDashboardStats() {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/dashboard/stats`, {
      headers: await headers(),
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error("Failed to fetch stats");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    // Return default values on error
    return {
      totalGenerations: 0,
      imagesGenerated: 0,
      videosGenerated: 0,
      audioGenerated: 0,
      storageUsedMB: 0,
      remainingGenerations: 10,
    };
  }
}

export default async function DashboardPage() {
  // Check authentication
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  // Fetch real stats from API
  const stats = await getDashboardStats();

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-2">
            <span className="gradient-text">Dashboard</span>
          </h1>
          <p className="text-foreground/60 text-lg">
            Welcome back! Here's your AI creation overview.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/generate/image" className="btn-premium !py-2.5 !px-5">
            <span className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Create Now
            </span>
          </Link>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Generations"
          value={stats.totalGenerations}
          description="from last month"
          icon={TrendingUp}
          trend={{ value: 12, isPositive: true }}
          gradient="from-cyan-500/20 to-blue-500/20"
          iconColor="text-cyan-400"
        />
        <StatsCard
          title="Images Created"
          value={stats.imagesGenerated}
          description="this month"
          icon={Image}
          gradient="from-cyan-500/20 to-blue-500/20"
          iconColor="text-cyan-400"
        />
        <StatsCard
          title="Videos Created"
          value={stats.videosGenerated}
          description="this month"
          icon={Video}
          gradient="from-magenta-500/20 to-purple-500/20"
          iconColor="text-magenta-400"
        />
        <StatsCard
          title="Audio Created"
          value={stats.audioGenerated}
          description="this month"
          icon={Music}
          gradient="from-blue-500/20 to-cyan-500/20"
          iconColor="text-blue-400"
        />
      </div>

      {/* Secondary stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatsCard
          title="Storage Used"
          value={`${(stats.storageUsedMB / 1024).toFixed(1)} GB`}
          description="of 10 GB free tier"
          icon={HardDrive}
          iconColor="text-foreground/60"
        />
        <StatsCard
          title="Remaining Today"
          value={stats.remainingGenerations}
          description="free generations left"
          icon={Zap}
          iconColor="text-yellow-400"
        />
        <div className="card-premium hover-lift flex items-center justify-center p-6">
          <div className="text-center">
            <Sparkles className="h-8 w-8 text-cyan-400 mx-auto mb-2" />
            <p className="text-sm text-foreground/70 mb-2">Need more generations?</p>
            <Link href="/pricing" className="text-cyan-400 hover:text-cyan-300 font-semibold text-sm inline-flex items-center gap-1 transition-colors">
              Upgrade to Pro
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Link
            href="/generate/image"
            className="card-premium hover-lift group flex flex-col items-center justify-center gap-3 p-8 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-linear-to-br from-cyan-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10 group-hover:bg-cyan-500/20 transition-all group-hover:scale-110">
                <Image className="h-8 w-8 text-cyan-400" />
              </div>
            </div>
            <div className="relative text-center">
              <span className="font-bold text-lg block mb-1">Generate Image</span>
              <span className="text-sm text-foreground/60 mono">Z-Image Turbo</span>
            </div>
          </Link>

          <Link
            href="/generate/video"
            className="card-premium hover-lift group flex flex-col items-center justify-center gap-3 p-8 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-linear-to-br from-magenta-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-magenta-500/10 group-hover:bg-magenta-500/20 transition-all group-hover:scale-110">
                <Video className="h-8 w-8 text-magenta-400" />
              </div>
            </div>
            <div className="relative text-center">
              <span className="font-bold text-lg block mb-1">Generate Video</span>
              <span className="text-sm text-foreground/60 mono">Wan2.2 T2V · I2V</span>
            </div>
          </Link>

          <Link
            href="/generate/audio"
            className="card-premium hover-lift group flex flex-col items-center justify-center gap-3 p-8 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-linear-to-br from-blue-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 group-hover:bg-blue-500/20 transition-all group-hover:scale-110">
                <Music className="h-8 w-8 text-blue-400" />
              </div>
            </div>
            <div className="relative text-center">
              <span className="font-bold text-lg block mb-1">Generate Audio</span>
              <span className="text-sm text-foreground/60 mono">ACE-Step 1.5 · Qwen3-TTS</span>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent generations */}
      <RecentGenerations />
    </div>
  );
}
