import DOMPurify from 'dompurify'

/** 公开页面渲染后台富文本前的 HTML 消毒（纵深防御：后端已做权限校验，这里兜底防存储型 XSS）。 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } })
}
