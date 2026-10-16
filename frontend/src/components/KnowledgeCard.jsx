import { BookOpen } from 'lucide-react';

export default function KnowledgeCard({ article }) { return <article className="article-card"><div className="article-icon"><BookOpen size={20} /></div><h3>{article.title}</h3><p>{article.content}</p></article>; }
