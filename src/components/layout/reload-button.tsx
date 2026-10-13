"use client";

import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ReloadButton() {
  return (
    <Button className="mt-8" onClick={() => window.location.reload()}>
      <RotateCw /> Tentar novamente
    </Button>
  );
}
