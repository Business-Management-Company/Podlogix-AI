import { useEffect } from "react";
import { Link } from "wouter";
import { Navbar } from "@/components/Navbar";
import { posts } from "@/content/blog/posts";

/** Blog index — every published perspective, newest first. */
export default function Blog() {
  useEffect(() => {
    const previous = document.title;
    document.title = "Perspectives — Podlogix";
    return () => { document.title = previous; };
  }, []);

  const sorted = [...posts].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 pt-32 pb-24">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary mb-3">Podlogix · Perspectives</p>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Notes on the business of podcasting</h1>
        <p className="text-lg text-muted-foreground max-w-[60ch] mb-14">
          What the numbers say, what the people running shows are saying, and what it means for creators who treat their voice as an asset.
        </p>

        <ul className="divide-y divide-border">
          {sorted.map((post) => (
            <li key={post.slug} className="py-8 first:pt-0">
              <Link href={`/blog/${post.slug}`} className="group block">
                <p className="text-xs text-muted-foreground mb-2">
                  {new Date(post.date + "T12:00:00").toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })} · {post.readingTime}
                </p>
                <h2 className="text-2xl font-semibold tracking-tight group-hover:text-primary transition-colors">{post.title}</h2>
                <p className="mt-2 text-muted-foreground max-w-[62ch]">{post.description}</p>
                <span className="mt-3 inline-block text-sm font-medium text-primary">Read the piece →</span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
