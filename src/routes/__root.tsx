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
      { title: "Phidias Risk Bounded — Paper Shadow Journal" },
      {
        name: "description",
        content:
          "Paper-shadow journal for the Phidias Risk Bounded portfolio. Track 8 MNQ/GC/NG legs with ATR-based stops, Phidias evaluation rules, EOD trailing drawdown, and per-leg kill rules.",
      },
      { property: "og:title", content: "Phidias Risk Bounded — Paper Shadow Journal" },
      { name: "twitter:title", content: "Phidias Risk Bounded — Paper Shadow Journal" },
      { property: "og:description", content: "Paper-shadow journal for the Phidias Risk Bounded portfolio (MNQ, GC, NG)." },
      { name: "twitter:description", content: "Paper-shadow journal for the Phidias Risk Bounded portfolio (MNQ, GC, NG)." },
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
