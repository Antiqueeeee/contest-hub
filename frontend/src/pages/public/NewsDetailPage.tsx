import { useParams, Link } from 'react-router-dom'
import { newsList, getNewsCategoryName } from '@/mock/data'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft } from 'lucide-react'

export default function NewsDetailPage() {
  const { id } = useParams()
  const news = newsList.find(n => n.id === Number(id))

  if (!news) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">新闻不存在</p>
        <Link to="/"><Button variant="link">返回首页</Button></Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" />返回首页
      </Link>
      <article>
        <Badge variant="outline" className="mb-3">{getNewsCategoryName(news.categoryId)}</Badge>
        <h1 className="text-2xl font-bold mb-2">{news.title}</h1>
        <p className="text-sm text-muted-foreground mb-6">{news.publishedAt?.split(' ')[0]}</p>
        <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: news.content }} />
      </article>
    </div>
  )
}
