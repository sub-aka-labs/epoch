"use client";

import { MarketDisplay, MarketStatus } from "@/types/market";
import { MarketCard } from "./MarketCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface MarketListProps {
  markets: MarketDisplay[];
  loading?: boolean;
}

export function MarketListSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-6 border rounded-lg space-y-4">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  );
}

export function MarketList({ markets, loading }: MarketListProps) {
  if (loading) {
    return <MarketListSkeleton />;
  }

  const activeMarkets = markets.filter(
    (m) => m.status === MarketStatus.Open || m.status === MarketStatus.Created
  );
  const resolvedMarkets = markets.filter(
    (m) => m.status === MarketStatus.Resolved || m.status === MarketStatus.Settled
  );
  const cancelledMarkets = markets.filter(
    (m) => m.status === MarketStatus.Cancelled
  );

  return (
    <Tabs defaultValue="active" className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="active">
          Active ({activeMarkets.length})
        </TabsTrigger>
        <TabsTrigger value="resolved">
          Resolved ({resolvedMarkets.length})
        </TabsTrigger>
        <TabsTrigger value="cancelled">
          Cancelled ({cancelledMarkets.length})
        </TabsTrigger>
        <TabsTrigger value="all">All ({markets.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="active">
        {activeMarkets.length === 0 ? (
          <EmptyState message="No active markets" />
        ) : (
          <MarketGrid markets={activeMarkets} />
        )}
      </TabsContent>

      <TabsContent value="resolved">
        {resolvedMarkets.length === 0 ? (
          <EmptyState message="No resolved markets" />
        ) : (
          <MarketGrid markets={resolvedMarkets} />
        )}
      </TabsContent>

      <TabsContent value="cancelled">
        {cancelledMarkets.length === 0 ? (
          <EmptyState message="No cancelled markets" />
        ) : (
          <MarketGrid markets={cancelledMarkets} />
        )}
      </TabsContent>

      <TabsContent value="all">
        {markets.length === 0 ? (
          <EmptyState message="No markets found" />
        ) : (
          <MarketGrid markets={markets} />
        )}
      </TabsContent>
    </Tabs>
  );
}

function MarketGrid({ markets }: { markets: MarketDisplay[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {markets.map((market) => (
        <MarketCard key={market.marketId} market={market} />
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}
