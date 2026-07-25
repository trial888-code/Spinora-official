"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { getChatAttachmentSignedUrl } from "@/lib/chat/attachments";
import { isDepositProofStoragePath } from "@/lib/deposits/proof-upload";

interface DepositProofImageProps {
  path: string;
  alt?: string;
  className?: string;
}

export function DepositProofImage({
  path,
  alt = "Deposit proof screenshot",
  className,
}: DepositProofImageProps) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (path.startsWith("http://") || path.startsWith("https://")) {
        setSrc(path);
        return;
      }

      if (!isDepositProofStoragePath(path)) {
        setSrc(null);
        return;
      }

      const supabase = createClient();
      if (!supabase) return;

      const signed = await getChatAttachmentSignedUrl(supabase, path, 3600);
      if (!cancelled) setSrc(signed);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (!src) {
    const cleanPath = path.startsWith("chat-attachments/") ? path.replace("chat-attachments/", "") : path;
    const fallbackUrl = `https://muetgtzcbecsqigtpfyn.supabase.co/storage/v1/object/public/chat-attachments/${cleanPath}`;

    return (
      <a href={fallbackUrl} target="_blank" rel="noopener noreferrer" className={`block max-w-sm ${className ?? ""}`}>
        <div className="h-32 w-full rounded-lg bg-white/5 border border-white/10 hover:border-amber-400/50 flex flex-col items-center justify-center p-3 text-center transition-colors">
          <span className="text-xs font-bold text-amber-300">📷 View Screenshot Proof</span>
          <span className="text-[10px] text-purple-300/70 mt-1">Click to open full payment attachment</span>
        </div>
      </a>
    );
  }

  return (
    <a href={src} target="_blank" rel="noopener noreferrer" className={`block max-w-sm ${className ?? ""}`}>
      <div className="relative h-40 w-full rounded-lg overflow-hidden border border-white/10 hover:border-orange-500/40 transition-colors">
        <Image src={src} alt={alt} fill className="object-contain bg-black/40" unoptimized />
      </div>
      <span className="text-[10px] text-orange-400 mt-1 inline-block hover:underline">
        Open full screenshot
      </span>
    </a>
  );
}
