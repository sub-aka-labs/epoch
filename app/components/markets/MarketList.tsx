"use client";

import { useState } from "react";
import { MarketDisplay, MarketStatus } from "@/types/market";
import { MarketCard } from "./MarketCard";

interface MarketListProps {
  markets: MarketDisplay[];
  loading?: boolean;
  onBetPlaced?: () => void;
}

export function MarketListSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 space-y-4">
          <div className="h-6 w-3/4 bg-zinc-800 rounded animate-pulse" />
          <div className="h-4 w-1/2 bg-zinc-800 rounded animate-pulse" />
          <div className="grid grid-cols-2 gap-2">
            <div className="h-10 bg-zinc-800 rounded-xl animate-pulse" />
            <div className="h-10 bg-zinc-800 rounded-xl animate-pulse" />
          </div>
          <div className="flex justify-between">
            <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" />
            <div className="h-4 w-16 bg-zinc-800 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

type TabType = "active" | "resolved" | "cancelled" | "all";

export function MarketList({ markets, loading, onBetPlaced }: MarketListProps) {
  const [activeTab, setActiveTab] = useState<TabType>("active");

  if (loading) {
    return <MarketListSkeleton />;
  }

  const activeMarkets = markets.filter(
    (m) => m.status === MarketStatus.Open || m.status === MarketStatus.Created || m.status === MarketStatus.BettingClosed
  );
  const resolvedMarkets = markets.filter(
    (m) => m.status === MarketStatus.Resolved || m.status === MarketStatus.Settled
  );
  const cancelledMarkets = markets.filter(
    (m) => m.status === MarketStatus.Cancelled
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
      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-zinc-900 rounded-xl mb-6 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            {tab.label}
            <span className={`ml-2 ${activeTab === tab.id ? "text-blue-400" : "text-zinc-500"}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      {currentMarkets.length === 0 ? (
        <EmptyState tab={activeTab} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {currentMarkets.map((market) => (
            <MarketCard key={market.marketId} market={market} onBetPlaced={onBetPlaced} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ tab }: { tab: TabType }) {
  const messages: Record<TabType, string> = {
    active: "No active markets yet",
    resolved: "No resolved markets yet",
    cancelled: "No cancelled markets",
    all: "No markets found",
  };

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 mb-4 rounded-full bg-zinc-800 flex items-center justify-center">
        <svg className="w-8 h-8 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </div>
      <p className="text-zinc-400 text-lg">{messages[tab]}</p>
      <p className="text-zinc-500 text-sm mt-1">Create a market to get started</p>
    </div>
  );
}
