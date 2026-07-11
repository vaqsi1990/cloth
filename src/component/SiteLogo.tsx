'use client'

import AppImage from '@/component/AppImage'

type SiteLogoProps = {
  size?: 'header' | 'footer'
  priority?: boolean
  className?: string
}

const sizeConfig = {
  header: {
    className: 'w-[50px] h-[50px] md:w-16 md:h-16',
    width: 64,
    height: 64,
  },
  footer: {
    className: 'w-16 h-16 md:w-20 md:h-20',
    width: 80,
    height: 80,
  },
} as const

export default function SiteLogo({
  size = 'header',
  priority = false,
  className = '',
}: SiteLogoProps) {
  const config = sizeConfig[size]

  return (
    <AppImage
      src="/logo-icon.jpg"
      alt="Dressla"
      width={config.width}
      height={config.height}
      priority={priority}
      className={`${config.className} rounded-full object-cover object-center ${className}`.trim()}
    />
  )
}
