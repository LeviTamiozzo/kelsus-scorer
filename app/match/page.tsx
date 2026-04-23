"use client";

import { Suspense } from "react";
import MatchBoard from "@/components/MatchBoard";

export default function MatchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading...</div>}>
      <MatchBoard />
    </Suspense>
  );
}
