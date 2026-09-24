import { ArrowUpRight, Info } from 'lucide-react'
import { useI18n } from '@/i18n/useI18n'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'

const PAPER_URL = 'https://arxiv.org/abs/2304.03271'

export function AboutSection({ className }: { readonly className?: string }) {
  const { t } = useI18n()
  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2" id="about-heading">
          <Info aria-hidden className="size-4 text-primary" />
          {t('about.heading')}
        </CardTitle>
      </CardHeader>
      <CardContent className="mt-3 grid gap-4 text-sm leading-relaxed text-muted-foreground text-pretty md:grid-cols-3">
        <p>{t('about.p1')}</p>
        <p>{t('about.p2')}</p>
        <p>{t('about.p3')}</p>
        <a
          href={PAPER_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-10 w-fit items-center gap-1 rounded font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 md:col-span-3 pointer-coarse:min-h-11"
        >
          {t('about.source')}
          <ArrowUpRight aria-hidden className="size-3.5" />
        </a>
      </CardContent>
    </Card>
  )
}
