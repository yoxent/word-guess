# marquee-background
updated: 2026-07-11
status: **replaced** — see [home-background.md](home-background.md)

This doc is kept for historical context (Fabric crash investigation).

The animated icon-rain approach (`MarqueeBackground.tsx`) was removed in favor of
`HomeBackground.tsx` after startup SIGSEGV in Fabric
`MountingCoordinator::pullTransaction`. Current implementation: UV-scroll tiled
PNG textures (see `home-background.md`).
