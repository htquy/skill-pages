import type { NewsCardViewModel } from "@/src/presentation/view-models/news";
import { NewsCard } from "@/src/presentation/components/news/news-card";

export function NewsGrid({ articles }: { articles: NewsCardViewModel[] }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {articles.map((article) => (
        <NewsCard key={article.slug} article={article} />
      ))}
    </div>
  );
}