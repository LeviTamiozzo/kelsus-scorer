"use client";

import { Suspense } from "react";
import MatchBoard from "@/components/MatchBoard";

export default function MatchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a1628]" />}>
      <MatchBoard />
    </Suspense>
  );
}
