"use client";

import { useState, useEffect } from "react";
import { IconChartBar } from "@tabler/icons-react";
import { MarketDisplay, MarketStatus } from "@/types/market";
import { MarketCard } from "./MarketCard";

interface MarketListProps {
  markets: MarketDisplay[];
  loading?: boolean;
  onBetPlaced?: () => void;
}

// Encrypted number effect component
function ScrambleNumber() {
  const [display, setDisplay] = useState("0");
  const chars = "0123456789";

  useEffect(() => {
    const interval = setInterval(() => {
      setDisplay(chars[Math.floor(Math.random() * chars.length)]);
    }, 50);

    return () => clearInterval(interval);
  }, []);

  return <span className="font-mono text-emerald-400/70">{display}</span>;
}

function MarketCardSkeleton() {
  return (
    <div className="bg-card p-5 border border-border space-y-4">
      <div className="flex justify-between items-start">
        <div className="h-6 w-3/4 bg-muted animate-pulse" />
        <div className="h-5 w-16 bg-muted animate-pulse" />
      </div>
      <div className="h-4 w-1/2 bg-muted animate-pulse" />
      <div className="grid grid-cols-2 gap-2">
        <div className="h-10 bg-muted animate-pulse" />
        <div className="h-10 bg-muted animate-pulse" />
      </div>
      <div className="flex justify-between">
        <div className="h-4 w-24 bg-muted animate-pulse" />
        <div className="h-4 w-16 bg-muted animate-pulse" />
      </div>
    </div>
  );
}

export function MarketListSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <MarketCardSkeleton key={i} />
      ))}
    </div>
  );
}

type TabType = "active" | "resolved" | "cancelled" | "all";

export function MarketList({ markets, loading, onBetPlaced }: MarketListProps) {
  const [activeTab, setActiveTab] = useState<TabType>("active");

  const activeMarkets = markets.filter(
    (m) =>
      m.status === MarketStatus.Open ||
      m.status === MarketStatus.Created ||
      m.status === MarketStatus.BettingClosed,
  );
  const resolvedMarkets = markets.filter(
    (m) =>
      m.status === MarketStatus.Resolved || m.status === MarketStatus.Settled,
  );
  const cancelledMarkets = markets.filter(
    (m) => m.status === MarketStatus.Cancelled,
  );

  const tabs: { id: TabType; label: string; count: number }[] = [
    { id: "active", label: "Active", count: activeMarkets.length },
    { id: "resolved", label: "Resolved", count: resolvedMarkets.length },
    { id: "cancelled", label: "Cancelled", count: cancelledMarkets.length },
    { id: "all", label: "All", count: markets.length },
  ];

  const getMarketsForTab = (tab: TabType): MarketDisplay[] => {
    switch (tab) {
      case "active":
        return activeMarkets;
      case "resolved":
        return resolvedMarkets;
      case "cancelled":
        return cancelledMarkets;
      case "all":
        return markets;
    }
  };

  const currentMarkets = getMarketsForTab(activeTab);

  return (
    <div>
      {/* Tabs - Always visible */}
      <div className="flex items-center gap-0 mb-6 border-b border-border ">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            disabled={loading}
            className={`px-4 py-3 cursor-pointer text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            } ${loading ? "cursor-wait" : ""}`}
          >
            {tab.label}
            <span
              className={`ml-2 ${activeTab === tab.id ? "text-muted-foreground" : "text-muted-foreground/60"}`}
            >
              {loading ? <ScrambleNumber /> : tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <MarketCardSkeleton key={i} />
          ))}
        </div>
      ) : currentMarkets.length === 0 ? (
        <EmptyState tab={activeTab} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {currentMarkets.map((market) => (
            <MarketCard
              key={market.marketId}
              market={market}
              onBetPlaced={onBetPlaced}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ tab }: { tab: TabType }) {
  const messages: Record<TabType, { title: string; subtitle: string }> = {
    active: {
      title: "No Active Markets",
      subtitle: "Create a market to get started",
    },
    resolved: {
      title: "No Resolved Markets",
      subtitle: "Markets will appear here once resolved",
    },
    cancelled: {
      title: "No Cancelled Markets",
      subtitle: "Cancelled markets will appear here",
    },
    all: {
      title: "No Markets Found",
      subtitle: "Create a market to get started",
    },
  };

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 mb-5 border border-border flex items-center justify-center">
        <IconChartBar
          size={24}
          className="text-muted-foreground"
          stroke={1.5}
        />
      </div>
      <p className="text-foreground font-medium mb-1">{messages[tab].title}</p>
      <p className="text-muted-foreground text-sm">{messages[tab].subtitle}</p>
    </div>
  );
}
