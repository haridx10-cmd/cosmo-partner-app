## Packages
leaflet | Maps for order location
react-leaflet | React wrapper for Leaflet maps
date-fns | Date formatting and manipulation
framer-motion | Smooth transitions and animations
clsx | Utility for constructing className strings conditionally (often needed with tailwind-merge)

## Notes
Tailwind Config - extend fontFamily:
fontFamily: {
  display: ["var(--font-display)"],
  body: ["var(--font-body)"],
}
Leaflet CSS must be imported in index.css
Mobile-first design requires careful attention to touch targets and bottom navigation spacing
