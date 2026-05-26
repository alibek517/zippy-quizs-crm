import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Zippy CRM — reliable service" },
      { name: "description", content: "Zippy — test va o'qitish CRM tizimi" },
      { property: "og:title", content: "Zippy CRM — reliable service" },
      { name: "twitter:title", content: "Zippy CRM — reliable service" },
      { property: "og:description", content: "Zippy — test va o'qitish CRM tizimi" },
      { name: "twitter:description", content: "Zippy — test va o'qitish CRM tizimi" },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/80a8bede-db7d-483d-9f98-dbdc3f1ddfe9/id-preview-6ff20194--1061790e-2962-4cb5-8c0d-6842dfc9c59d.lovable.app-1779770533775.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/80a8bede-db7d-483d-9f98-dbdc3f1ddfe9/id-preview-6ff20194--1061790e-2962-4cb5-8c0d-6842dfc9c59d.lovable.app-1779770533775.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold gold-text">404</h1>
        <p className="mt-2 text-muted-foreground">Sahifa topilmadi</p>
        <a href="/" className="mt-4 inline-block text-primary hover:underline">Bosh sahifaga</a>
      </div>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold text-destructive">Xatolik</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <a href="/" className="mt-4 inline-block text-primary hover:underline">Bosh sahifaga</a>
      </div>
    </div>
  ),
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      queryClient.invalidateQueries();
    });
    return () => subscription.unsubscribe();
  }, [queryClient]);
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster theme="dark" position="top-right" />
    </QueryClientProvider>
  );
}
