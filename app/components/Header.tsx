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
      <header className="bg-background/80 sticky top-0 z-50 mt-4 mb-4 w-full backdrop-blur-md md:mt-6 md:mb-7">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            {/* Left side - Logo & Nav */}
            <div className="flex items-center gap-6">
              <Link href="/" className="group flex items-center gap-0">
                <Image
                  src="/logo.png"
                  alt="Epoch"
                  width={48}
                  height={48}
                  className="shrink-0 invert dark:invert-0"
                />
                <span className="text-foreground group-hover:text-muted-foreground text-lg font-semibold tracking-tight transition-colors">
                  Epoch
                </span>
              </Link>

              {/* Desktop Nav */}
              <nav className="hidden items-center gap-1 md:flex">
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
            <div className="mr-3 flex items-center gap-3">
              <ModeToggle />

              {showLive && (
                <div className="hidden items-center gap-2 bg-emerald-500/10 px-2 py-1 sm:flex">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 bg-emerald-400" />
                  </span>
                  <span className="text-xs font-medium text-emerald-400">
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
                className="text-muted-foreground hover:text-foreground p-2 transition-colors md:hidden"
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
        className={`bg-card border-border fixed inset-y-0 left-0 z-50 w-72 transform border-r transition-transform duration-300 ease-out md:hidden ${
          mobileMenuOpen
            ? "translate-x-0"
            : "pointer-events-none -translate-x-full"
        }`}
      >
        {/* Sheet Header */}
        <div className="flex h-14 items-center justify-between px-4">
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
            <span className="text-foreground text-lg font-semibold tracking-tight">
              Epoch
            </span>
          </Link>

          <button
            onClick={() => setMobileMenuOpen(false)}
            className="text-muted-foreground hover:text-foreground p-1.5 transition-colors"
            aria-label="Close menu"
          >
            <IconX size={20} stroke={1.5} />
          </button>
        </div>

        {/* Sheet Content */}
        <nav className="space-y-1 p-4">
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
        <div className="border-border absolute right-0 bottom-0 left-0 space-y-4 border-t p-4">
          <div className="[&_.wallet-adapter-button]:w-full [&_.wallet-adapter-dropdown]:w-full">
            <WalletButton />
          </div>
          <p className="text-muted-foreground text-center text-xs">
            Powered by Arcium MPC
          </p>
        </div>
      </div>
    </>
  );
}
