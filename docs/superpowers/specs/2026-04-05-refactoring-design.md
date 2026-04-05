# Polycool Frontend Refactoring Spec

## Goal
Extract shared components, design tokens, and remove duplication across the Next.js codebase. No files deleted, no functionality changed.

## Layer 1: Design Tokens (globals.css)
CSS custom properties for all repeated values:
- `--color-primary`: #0F0F0F
- `--color-secondary`: #6B7280
- `--color-muted`: #9CA3AF
- `--color-positive`: #10B981
- `--color-negative`: #EF4444
- `--color-bg`: #FAFAFA
- `--color-card`: #FFFFFF
- `--color-surface`: #F5F5F5
- `--color-border`: rgba(0,0,0,0.04)

## Layer 2: UI Primitives (src/components/ui/)

### Button
Variants: primary (black bg), outline (border), ghost (no border), danger (red)
Sizes: sm (h-9), md (h-11), lg (h-14)
Props: variant, size, loading, disabled, fullWidth, children, onClick, href (renders Link if provided)

### Card
Props: children, className, padding ('sm'|'md'|'lg'), noBorder
Default: bg-white rounded-2xl border border-black/[0.04]

### Input
Props: label, type, placeholder, value, onChange, prefix ($), suffix (%), error
Renders: label above, bg-[#F5F5F5] rounded-xl h-11

### Badge
Variants: success (green), danger (red), neutral (gray), active (green dot + text)
Props: variant, children

### Spinner
Props: size ('sm'|'md'|'lg')
Renders: border spinner with primary color

### Icons (src/components/ui/icons.tsx)
Single file exporting all 16 named icon components:
IconArrowLeft, IconCheck, IconClose, IconChevronRight, IconWallet, IconCopy, IconHome, IconSettings, IconChart, IconUsers, IconShield, IconDocument, IconEnvelope, IconQuestion, IconShare, IconBell
Each accepts: size (default 18), className

## Layer 3: Composite Components (src/components/)

### PageHeader
Props: title, action (ReactNode), backHref
Renders: flex row with optional back arrow, title, and right-side action

### StatCard
Props: label, value, color ('positive'|'negative'|'default'), mono (boolean)
Renders: label in muted uppercase + value in specified style

### TraderRow
Props: name, image, subtitle, returnPct, status ('following'|'available'), onClick, href
Renders: horizontal row with avatar, text, return %, and status indicator

### EquityChart
Props: data, height, period, onPeriodChange, positive (boolean)
Renders: Recharts AreaChart with time filter pills

### EmptyState
Props: icon (ReactNode), title, subtitle, action (ReactNode)
Renders: centered card with icon, text, and optional CTA button

## Layer 4: Page Cleanup
For each page, replace inline patterns with components. Target: 30-40% line reduction per page. No logic changes — only template extraction.

## Constraints
- No files deleted
- No functionality changes
- No API changes
- All existing routes continue to work
- Build must pass after each layer
