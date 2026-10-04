import { useState } from 'react'

interface ProductImageProps {
  src: string
  alt: string
  className?: string
}

export function ProductImage({ src, alt, className = '' }: ProductImageProps) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) return <div className={`grid place-items-center bg-sand text-center text-xs text-gray-500 ${className}`}>No image available</div>
  return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} />
}
