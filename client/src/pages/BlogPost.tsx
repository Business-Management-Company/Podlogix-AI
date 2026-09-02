import { useEffect } from "react";
import { Link, useRoute } from "wouter";
import { Navbar } from "@/components/Navbar";
import { getPost } from "@/content/blog/posts";
import NotFound from "@/pages/not-found";

/**
 * A single blog post. Posts are authored as self-contained HTML + CSS (see
 * content/blog/posts.ts) so a piece can be designed like an editorial page
 * rather than squeezed into app components; the stylesheet is scoped to
 * .blog-article so it can't leak into the navbar.
 */
export default function BlogPost() {
  const [, params] = useRoute("/blog/:slug");
  const post = params?.slug ? getPost(params.slug) : undefined;

  useEffect(() => {
    if (!post) return;
    const previous = document.title;
    document.title = `${post.title} — Podlogix`;
    const meta = document.querySelector('meta[name="description"]');
    const previousDescription = meta?.getAttribute("content");
    meta?.setAttribute("content", post.description);
    window.scrollTo({ top: 0 });
    return () => {
      document.title = previous;
      if (meta && previousDescription != null) meta.setAttribute("content", previousDescription);
    };
  }, [post]);

  if (!post) return <NotFound />;

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <Navbar />
      <style>{post.css}</style>
      <div className="pt-20">
        <div className="mx-auto max-w-[66ch] px-6 pt-6">
          <Link href="/blog" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← All perspectives
          </Link>
        </div>
        <div className="blog-article" dangerouslySetInnerHTML={{ __html: post.html }} />
      </div>
    </div>
  );
}
