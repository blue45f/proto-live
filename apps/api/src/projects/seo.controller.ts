import { Controller, Get, Header, Param, Res } from '@nestjs/common'

import { Project } from './project.models'
import { ProjectsService } from './projects.service'
import { buildFallbackOgHtml, buildProjectOgHtml, resolveSiteOrigin } from './seo-og'

import type { Response } from 'express'

/**
 * SEO 발견 레이어. 공개 커뮤니티 전환에 맞춰 검색엔진이 프로젝트·메이커 페이지를 크롤링하도록
 * 사이트맵을 제공한다. Vercel rewrite로 `/sitemap.xml` → `/api/sitemap.xml` 프록시.
 * 크롤러 UA의 `/projects/:id` 요청은 `/api/seo/projects/:id/og` 로 라우팅되어(#34)
 * 프로젝트별 동적 OG 카드를 받는다.
 */
@Controller('api')
export class SeoController {
  constructor(private readonly projects: ProjectsService) {}

  @Get('sitemap.xml')
  @Header('Content-Type', 'application/xml; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=3600')
  getSitemap(): string {
    const origin = resolveSiteOrigin()
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

  /**
   * GET /api/seo/projects/:id/og — 크롤러 전용 프로젝트 OG 페이지(#34).
   * JSON 에러 대신 항상 HTML을 반환한다: 없는/잘못된 id 는 기본 OG 폴백(404),
   * 보호(screened) 프로젝트는 제목/요약만 노출(라이브 URL·썸네일 비공개).
   */
  @Get('seo/projects/:id/og')
  async getProjectOgPage(@Param('id') id: string, @Res() response: Response): Promise<void> {
    const origin = resolveSiteOrigin()
    const projectId = Number.parseInt(id, 10)

    let project: Project | null = null
    if (Number.isInteger(projectId) && projectId > 0) {
      try {
        project = await this.projects.getProjectById(projectId)
      } catch {
        // 크롤러 대상 페이지라 조회 실패(404 포함)는 폴백 HTML로 강등한다.
        project = null
      }
    }

    response.status(project ? 200 : 404)
    response.setHeader('Content-Type', 'text/html; charset=utf-8')
    response.setHeader(
      'Cache-Control',
      project ? 'public, max-age=60, s-maxage=300' : 'public, max-age=0, s-maxage=60'
    )
    if (project && project.accessMode !== 'screened') {
      // 전역 미들웨어의 X-Robots-Tag(noindex)가 크롤러 라우팅된 공개 프로젝트 페이지를
      // 디인덱싱하지 않도록 이 응답에서만 해제한다(보호/404는 noindex 유지).
      response.removeHeader('X-Robots-Tag')
    }
    response.send(project ? buildProjectOgHtml(project, origin) : buildFallbackOgHtml(origin))
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
