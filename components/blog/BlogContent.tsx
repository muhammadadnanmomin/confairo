/**
 * BlogContent — Renders rich HTML blog content with styled prose typography.
 * Uses @tailwindcss/typography for heading, paragraph, list, blockquote styling.
 * Heading IDs are set in the data for anchor linking from the ToC.
 */

interface BlogContentProps {
  content: string;
}

export function BlogContent({ content }: BlogContentProps) {
  return (
    <article
      className="prose prose-gray max-w-none
        prose-headings:font-semibold prose-headings:tracking-tight
        prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4 prose-h2:scroll-mt-24
        prose-h3:text-lg prose-h3:mt-8 prose-h3:mb-3 prose-h3:scroll-mt-24
        prose-p:leading-relaxed prose-p:text-muted-foreground
        prose-a:text-primary prose-a:no-underline hover:prose-a:underline
        prose-strong:text-foreground
        prose-ul:text-muted-foreground
        prose-blockquote:border-accent prose-blockquote:text-muted-foreground prose-blockquote:not-italic
        prose-li:marker:text-primary"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
