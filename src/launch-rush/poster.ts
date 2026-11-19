import { tileHue } from './state'

// Own artwork only (plan §3.5): a gradient from the title and its initials, never a cover or a logo.
export const posterBackground = (title: string) => {
  const hue = tileHue(title)
  return `linear-gradient(150deg, hsl(${hue} 55% 30%), hsl(${(hue + 50) % 360} 60% 14%))`
}
