"use client";

import Image from "next/image";

import logoIcon from "@/lib/logo/kaha-logo-icon.png";
import logoHorizontal from "@/lib/logo/kaha-logo-horizontal.png";
import logoDark from "@/lib/logo/kaha-logo-dark.png";
import logoMain from "@/lib/logo/kaha-logo-main.png";

type LogoVariant = "icon" | "horizontal" | "dark" | "main";

interface LogoProps {
  variant?: LogoVariant;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
}

const logos = {
  icon: logoIcon,
  horizontal: logoHorizontal,
  dark: logoDark,
  main: logoMain,
};

const defaultSizes: Record<LogoVariant, { width: number; height: number }> = {
  icon: { width: 32, height: 32 },
  horizontal: { width: 140, height: 32 },
  dark: { width: 140, height: 32 },
  main: { width: 140, height: 32 },
};

export function Logo({
  variant = "icon",
  className = "",
  width,
  height,
  priority = false,
}: LogoProps) {
  const size = defaultSizes[variant];
  const w = width ?? size.width;
  const h = height ?? size.height;

  return (
    <Image
      src={logos[variant]}
      alt="KaHa Enterprise Cloud"
      width={w}
      height={h}
      className={className}
      priority={priority}
      unoptimized={false}
    />
  );
}
