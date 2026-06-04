import { Controller, Get, Header } from '@nestjs/common'
import { ProjectsService } from './projects.service'

/**
 * SEO 발견 레이어. 공개 커뮤니티 전환에 맞춰 검색엔진이 프로젝트·메이커 페이지를 크롤링하도록
 * 사이트맵을 제공한다. Vercel rewrite로 `/sitemap.xml` → `/api/sitemap.xml` 프록시.
 */
@Controller('api')
export class SeoController {
  constructor(private readonly projects: ProjectsService) {}

  @Get('sitemap.xml')
  @Header('Content-Type', 'application/xml; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=3600')
  getSitemap(): string {
    const origin = (process.env.SITE_ORIGIN ?? 'https://proto-live.vercel.app').replace(/\/+$/, '')
    const { projects, makerIds } = this.projects.getSitemapData()

    const entries: Array<{ loc: string; lastmod?: string; priority: string }> = [
      { loc: `${origin}/`, priority: '1.0' },
      { loc: `${origin}/about`, priority: '0.6' },
      ...projects.map((project) => ({
        loc: `${origin}/projects/${project.id}`,
        lastmod: project.updatedAt,
        priority: '0.8',
      })),
      ...makerIds.map((id) => ({ loc: `${origin}/makers/${id}`, priority: '0.5' })),
    ]

    const urls = entries
      .map((entry) => {
        const lastmod = entry.lastmod ? `\n    <lastmod>${entry.lastmod}</lastmod>` : ''
        return `  <url>\n    <loc>${escapeXml(entry.loc)}</loc>${lastmod}\n    <priority>${entry.priority}</priority>\n  </url>`
      })
      .join('\n')

    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
  }
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
