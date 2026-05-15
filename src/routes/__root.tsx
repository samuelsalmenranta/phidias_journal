import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "LucidDirect V2 — Paper Forward Journal" },
      {
        name: "description",
        content:
          "Paper-forward trading journal for LucidDirect V2 strategies. Track Current V2 vs Optimized V2.",
      },
      { property: "og:title", content: "LucidDirect V2 — Paper Forward Journal" },
      { name: "twitter:title", content: "LucidDirect V2 — Paper Forward Journal" },
      { name: "description", content: "Trading Journal Pro tracks trading strategies, validates paper execution against backtests, and compares portfolio performance." },
      { property: "og:description", content: "Trading Journal Pro tracks trading strategies, validates paper execution against backtests, and compares portfolio performance." },
      { name: "twitter:description", content: "Trading Journal Pro tracks trading strategies, validates paper execution against backtests, and compares portfolio performance." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f0db4cff-727a-4945-ad1d-35bde061d659/id-preview-f46a5500--49e03ae4-d7a3-4e0a-95a2-1fb4beea94d8.lovable.app-1778855870497.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f0db4cff-727a-4945-ad1d-35bde061d659/id-preview-f46a5500--49e03ae4-d7a3-4e0a-95a2-1fb4beea94d8.lovable.app-1778855870497.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster richColors position="top-center" />
    </QueryClientProvider>
  );
}
