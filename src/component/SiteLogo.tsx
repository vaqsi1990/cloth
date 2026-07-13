'use client'

import AppImage from '@/component/AppImage'

type SiteLogoProps = {
  size?: 'header' | 'footer'
  priority?: boolean
  className?: string
}

const sizeConfig = {
  header: {
    className: 'w-[68px] h-[68px] md:w-[88px] md:h-[88px]',
    width: 88,
    height: 88,
  },
  footer: {
    className: 'w-20 h-20 md:w-24 md:h-24',
    width: 96,
    height: 96,
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
