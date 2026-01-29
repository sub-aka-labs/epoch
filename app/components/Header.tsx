"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconMenu2,
  IconX,
  IconChartBar,
  IconWallet,
} from "@tabler/icons-react";
import Image from "next/image";
import { WalletButton } from "./WalletButton";
import { ModeToggle } from "./toggle";

interface HeaderProps {
  showLive?: boolean;
}

export function Header({ showLive }: HeaderProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === "/markets") {
      return (
        pathname === "/markets" ||
        (pathname?.startsWith("/markets/") && !pathname?.includes("/positions"))
      );
    }
    return pathname === path || pathname?.startsWith(path);
  };

  const navLinks = [
    {
      href: "/markets",
      label: "Markets",
      icon: IconChartBar,
      isActive: isActive("/markets") && !pathname?.includes("/positions"),
    },
    {
      href: "/markets/positions",
      label: "Portfolio",
      icon: IconWallet,
      isActive: isActive("/markets/positions"),
    },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md mt-4 md:mt-6 mb-4 md:mb-7">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            {/* Left side - Logo & Nav */}
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-0 group">
                <Image
                  src="/logo.png"
                  alt="Epoch"
                  width={48}
                  height={48}
                  className="shrink-0 invert dark:invert-0"
                />
                <span className="text-lg font-semibold tracking-tight text-foreground group-hover:text-muted-foreground transition-colors">
                  Epoch
                </span>
              </Link>

              {/* Desktop Nav */}
              <nav className="hidden md:flex items-center gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                      link.isActive
                        ? "text-foreground bg-muted"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3 mr-3">
              <ModeToggle />

              {showLive && (
                <div className="hidden sm:flex items-center gap-2 px-2 py-1 bg-emerald-500/10">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 bg-emerald-400" />
                  </span>
                  <span className="text-xs text-emerald-400 font-medium">
                    Live
                  </span>
                </div>
              )}

              <div className="hidden md:block">
                <WalletButton />
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden p-2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Open menu"
              >
                <IconMenu2 size={22} stroke={1.5} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Menu Sheet */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border
        transform transition-transform duration-300 ease-out md:hidden
        ${
          mobileMenuOpen
            ? "translate-x-0"
            : "-translate-x-full pointer-events-none"
        }`}
      >
        {/* Sheet Header */}
        <div className="flex items-center justify-between h-14 px-4">
          <Link
            href="/"
            className="flex items-center gap-0"
            onClick={() => setMobileMenuOpen(false)}
          >
            <Image
              src="/logo.png"
              alt="Epoch"
              width={48}
              height={48}
              className="invert dark:invert-0"
            />
            <span className="text-lg font-semibold tracking-tight text-foreground">
              Epoch
            </span>
          </Link>

          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close menu"
          >
            <IconX size={20} stroke={1.5} />
          </button>
        </div>

        {/* Sheet Content */}
        <nav className="p-4 space-y-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors ${
                  link.isActive
                    ? "text-foreground bg-muted"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <Icon size={18} stroke={1.5} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Sheet Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border space-y-4">
          <div className="[&_.wallet-adapter-button]:w-full [&_.wallet-adapter-dropdown]:w-full">
            <WalletButton />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Powered by Arcium MPC
          </p>
        </div>
      </div>
    </>
  );
}
