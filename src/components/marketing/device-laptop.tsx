import Image from "next/image";
import { cn } from "@/lib/utils";

interface DeviceLaptopProps {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
}

/** A lightweight, code-native laptop frame that keeps the product capture crisp. */
export function DeviceLaptop({
  src,
  alt,
  className,
  priority = false,
  sizes = "720px",
}: DeviceLaptopProps) {
  return (
    <div
      className={cn(
        "relative aspect-[1.56] drop-shadow-[0_34px_34px_rgba(15,23,42,0.2)]",
        className,
      )}
    >
      <div className="absolute inset-x-[2.5%] bottom-[8.5%] top-0 overflow-hidden rounded-[2.6%] bg-[#17191d] p-[1.25%] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.24)]">
        <div className="relative size-full overflow-hidden rounded-[1.5%] bg-[#f8f7f3]">
          <Image
            src={src}
            alt={alt}
            fill
            unoptimized
            priority={priority}
            loading={priority ? "eager" : "lazy"}
            sizes={sizes}
            className="object-cover object-top"
          />
          <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.18)]" />
        </div>
        <div className="absolute left-1/2 top-[0.48%] h-[0.7%] w-[7%] -translate-x-1/2 rounded-full bg-black/70" />
      </div>

      <div className="absolute inset-x-0 bottom-[4.2%] h-[5.3%] rounded-b-[42%] bg-gradient-to-b from-[#f8f8f8] via-[#d8d8d8] to-[#9b9b9b] shadow-[inset_0_1px_0_white]">
        <div className="mx-auto h-[46%] w-[13%] rounded-b-[45%] bg-gradient-to-b from-[#a9a9a9] to-[#e7e7e7]" />
      </div>
      <div className="absolute bottom-[3.4%] left-1/2 h-[1.2%] w-[94%] -translate-x-1/2 rounded-b-full bg-[#8d8d8d] opacity-75" />
    </div>
  );
}
