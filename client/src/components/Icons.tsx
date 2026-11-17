import type { SVGProps } from 'react';

const base: SVGProps<SVGSVGElement> = { viewBox: '0 0 20 20', width: 18, height: 18, fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };

export const SearchIcon = () => (<svg {...base}><circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4.5 4.5" /></svg>);
export const CloseIcon = () => (<svg {...base}><path d="M5 5l10 10M15 5L5 15" /></svg>);
export const EditIcon = () => (<svg {...base}><path d="M12.5 4.5l3 3L7 16H4v-3z" /><path d="M11 6l3 3" /></svg>);
export const TrashIcon = () => (<svg {...base}><path d="M4 6h12M8 6V4h4v2M6 6l.8 10h6.4L14 6" /></svg>);
export const SunIcon = () => (<svg {...base}><circle cx="10" cy="10" r="3.5" /><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.3 4.3l1.4 1.4M14.3 14.3l1.4 1.4M4.3 15.7l1.4-1.4M14.3 5.7l1.4-1.4" /></svg>);
export const MoonIcon = () => (<svg {...base}><path d="M16 12.5A6.5 6.5 0 0 1 7.5 4 6.5 6.5 0 1 0 16 12.5z" /></svg>);
export const ListIcon = () => (<svg {...base}><path d="M7 5h9M7 10h9M7 15h9M4 5h.01M4 10h.01M4 15h.01" /></svg>);
export const WeekIcon = () => (<svg {...base}><rect x="3" y="4" width="14" height="13" rx="2" /><path d="M3 8h14M7 2v3M13 2v3" /></svg>);
export const ChevronLeft = () => (<svg {...base}><path d="M12 5l-5 5 5 5" /></svg>);
export const ChevronRight = () => (<svg {...base}><path d="M8 5l5 5-5 5" /></svg>);
