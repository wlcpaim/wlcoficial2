import { createFileRoute, notFound } from "@tanstack/react-router";
import { getPublishedSite } from "@/lib/publish.functions";

export const Route = createFileRoute("/r/$slug")({
  loader: async ({ params }) => {
    const site = await getPublishedSite({ data: { slug: params.slug } });
    if (!site) throw notFound();
    return site;
  },
  head: ({ params }) => ({ meta: [{ title: `${params.slug} — publicado com WLC.IA` }, { name: "description", content: `Site ${params.slug} publicado pela WLC.IA.` }, { property: "og:title", content: `${params.slug} — WLC.IA` }, { property: "og:description", content: `Site ${params.slug} publicado pela WLC.IA.` }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  notFoundComponent: () => <div className="flex min-h-screen items-center justify-center bg-background p-6 text-center text-muted-foreground">Nenhum site publicado neste endereço.</div>,
  component: Published,
});

function Published() {
  const site = Route.useLoaderData();
  // Sandboxed without allow-same-origin: the published site can't read cookies e armazenamento da plataforma.
  return <iframe title="Site publicado" srcDoc={site.html} sandbox="allow-scripts allow-forms allow-modals allow-popups" className="fixed inset-0 h-screen w-screen border-0 bg-background" />;
}
