"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AnalyticsIndexPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/analytics/revenue");
  }, [router]);
  return null;
}
