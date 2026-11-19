export type SectionId = 'about' | 'experience' | 'projects' | 'lab' | 'contact' | 'launch-rush'

// The Launch Rush arc exists only in builds that include the demo (VITE_LAUNCH_RUSH_API set, see vite.config.ts).
export const SECTIONS: { id: SectionId; title: string; color: string }[] = [
  { id: 'about', title: 'About', color: '#8fa2ff' },
  { id: 'experience', title: 'Experience', color: '#3ee6c4' },
  { id: 'projects', title: 'Projects', color: '#ffb547' },
  { id: 'lab', title: 'Pipeline Lab', color: '#ff6fae' },
  { id: 'contact', title: 'Contact', color: '#9be27a' },
  ...(import.meta.env.VITE_LAUNCH_RUSH_API
    ? [{ id: 'launch-rush' as const, title: 'Launch Rush', color: '#b48cff' }]
    : []),
]

export const TITLES = Object.fromEntries(SECTIONS.map((s) => [s.id, s.title])) as Record<SectionId, string>
