# RIMPILOT Design System

## Visual language

Una aplicación financiera moderna vista bajo la luz de un puesto de mercado al amanecer: limpia, rápida y tranquila. Fondo blanco real; el verde olivo comunica orden y avance, mientras el coral reserva atención para deudas y pendientes.

## Tokens

```css
:root {
  --rp-bg: oklch(1 0 0);
  --rp-surface: oklch(0.975 0.006 120);
  --rp-surface-strong: oklch(0.94 0.014 120);
  --rp-ink: oklch(0.22 0.035 120);
  --rp-muted: oklch(0.48 0.028 120);
  --rp-line: oklch(0.88 0.018 120);
  --rp-primary: oklch(0.36 0.09 120);
  --rp-primary-hover: oklch(0.30 0.085 120);
  --rp-coral: oklch(0.61 0.17 32);
  --rp-coral-soft: oklch(0.95 0.035 32);
  --rp-success: oklch(0.58 0.13 145);
}
```

## Typography

System sans stack, fixed product scale: 0.75rem, 0.875rem, 1rem, 1.125rem, 1.375rem and 2rem. Data uses tabular numerals.

## Components

Slim olive navigation rail on desktop; compact header on mobile. Surfaces are separated with 1 px borders and controlled shadows. Motion is limited to 180 ms state feedback; loading uses skeletons and every state works without hover.
