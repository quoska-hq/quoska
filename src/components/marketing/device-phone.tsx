import Image from "next/image";
import { cn } from "@/lib/utils";

interface DevicePhoneProps {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
}

/** A photorealistic device frame for real, responsive Quoska product captures. */
export function DevicePhone({
  src,
  alt,
  className,
  priority = false,
  sizes = "280px",
}: DevicePhoneProps) {
  return (
    <div
      className={cn(
        "relative aspect-[1350/2760] drop-shadow-[0_32px_32px_rgba(15,23,42,0.22)]",
        className,
      )}
    >
      <div
        className="absolute left-[5.2%] top-[2.5%] h-[95%] w-[89.6%] bg-black"
        style={{ borderRadius: "9.8% / 4.55%" }}
        aria-hidden="true"
      />
      <div
        className="absolute left-[6.55%] top-[3.25%] h-[93.5%] w-[86.9%] overflow-hidden bg-[#f8f7f3] shadow-[inset_0_0_0_1px_rgba(15,23,42,0.35)]"
        style={{ borderRadius: "9.2% / 4.25%" }}
      >
        <Image
          src={src}
          alt={alt}
          fill
          unoptimized
          priority={priority}
          loading={priority ? "eager" : "lazy"}
          sizes={sizes}
          className="object-fill"
        />
      </div>
      <Image
        src="/product/device-frame-iphone-16-pro.png"
        alt=""
        fill
        unoptimized
        priority={priority}
        loading={priority ? "eager" : "lazy"}
        sizes={sizes}
        className="pointer-events-none object-fill"
        aria-hidden="true"
      />
    </div>
  );
}
