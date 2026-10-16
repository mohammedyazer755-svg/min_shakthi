# Design system and screen specification
Direction: premium industrial clarity. Use the supplied newer-site screenshots for palette only, not as evidence of supported telemetry. All live values come through the shared store; all historical values come from authenticated persisted queries.

## Tokens
| Token | Value / behavior |
|---|---|
| Canvas / surface | #F7F6F2 / #FFFFFF; no noise or grain overlay |
| Primary text / secondary | #202321 / #5D625D |
| Border | #DDDCD5, 1px; stronger #777B72 for essential input boundaries |
| Accent | #A38445 decoration; #725719 for small text on ivory; test actual combinations |
| Primary button | #202321 with white text; restrained gold focus/brand accent |
| Positive / warning / critical | #176344 / #805300 / #A52E2E with text and icon, never color alone |
| Type | Self-hosted Inter variable or system sans fallback; tabular numerals for readings; no serif body/table text |
| Scale | 12px minor metadata minimum, 14px labels/table, 16px body, 24–28px page title, 28–36px metrics; 1.4–1.5 line-height |
| Spacing | 4,8,12,16,24,32,48px; card padding 20–24px desktop and 16px mobile |
| Radius / shadow | 10–12px cards, 8px controls; single subtle shadow, no glow |
| Controls | 44px touch height, 16–20px icons, visible focus ring with offset |
| Motion | 120–180ms opacity/color; no number tweening, chart entrance animation or permanent pulse; reduced-motion support |

Contrast acceptance: text ≥4.5:1 (large ≥3:1), essential controls/graph lines ≥3:1. These are targets; measure actual token combinations in Phase 4. Gold is not the default data text color. Chart colors include dark gold #80601E, teal #176B65, blue #3C5D91, plum #78547A and charcoal #454B49, with labels/dashes for distinction.

## Layout and density
Desktop ≥1280: 232px sidebar, 64px header, content max-width 1600px centered, 24–32px gutters. 768–1279: collapsible drawer or 72px rail only if labels remain accessible; 16–24px gutters. <768: 56px header with menu and selected device, drawer navigation, 16px gutters. Main container min-width:0; no fixed desktop left margin on mobile. Avoid nested page scrollbars. Tables may scroll within a labelled region; the entire page must not overflow.

Overview desktop: compact heading/device control → four KPI cards in one row → real power trend (8 columns) and concise alerts (4 columns) → five-channel table. Mobile: status, two-column KPIs when labels fit (otherwise one), chart, channel cards, alerts. One primary chart per viewport section; 280–320px desktop and 220–260px mobile height. Long labels wrap or open a full-name detail; essential information must not depend on hover.

No screen needs a marketing paragraph. One title, optional one-line context, one primary action. Put broker port, QoS, raw packet and detailed freshness thresholds on Diagnostics. Healthy status is small; errors get one actionable banner, not several contradictory ones. Hide absent advanced features instead of filling ornamental cards with zeros.

## Ten screens
| Screen / route | Primary content and actions | Required empty/error behavior |
|---|---|---|
| Secure Sign In /login | Brand, email/password, show password, sign in, recovery/invitation guidance. 400px form; compact optional brand panel desktop only. | Generic auth failure, rate-limit retry time, expired session. No “hardware authenticated” badge. |
| Overview /overview | Selected device, reporting count, live power subtotal, voltage range, frequency range, active alerts; real recent trend and five mapped rows. | Awaiting first reading; partial total; last known values with age; no all-zero fake dashboard. |
| Overall /analytics | Device/time filters; power trend and verified energy usage when available; channel contribution table. | Gaps visible; unknown units suppress usage and cost; per-channel coverage. |
| Channel /channels/:slot | CH01–CH05 tabs/select; channel name, five supplied metrics, real trend, last receipt and related alerts. | Unconfigured slot distinct from configured but never seen. |
| Real-Time /live | Compact virtualized receipt table, device/channel filters, pause-view control, timestamp/quality; optional packet details for admin. | Pausing view does not pause ingest; banner shows catch-up action; bounded 200-row display. |
| Past History /history | Date range, metric/channel filters, chart + paginated table, CSV action, timezone. | No records vs DB unavailable vs out-of-retention are different states. |
| Daily/Monthly Reports /reports | Period selector, coverage, verified usage or known-interval usage, cost eligibility, export. | No fabricated comparison percentages; no prior period means comparison unavailable. |
| Alerts /alerts | Severity/status filters, open/resolved timeline and acknowledge action. | “No active alerts” only when rule engine healthy; delayed evaluation separately shown. |
| Devices & Diagnostics /devices | Board list, map editor, health layers, last valid packet, broker subscription, DB/spool counters. | Unknown physical state clearly identified; unknown IDs quarantined, admin enrolls explicitly. |
| Profile & Settings /settings | Own name/timezone/preferences; admin rule/tariff/user configuration linked sections. | Server validation, save pending/error, optimistic version conflict; no false saved toast. |

## Components and interaction rules
AppShell, DeviceSelector, StatusSummary, FreshnessLabel, MetricCard, ChannelRow, TimeRangePicker, MeasurementChart, DataTable, EmptyState, ErrorBanner, AlertBadge, ConfirmDialog, SettingsForm and PermissionBoundary. Define loading skeletons with stable dimensions but no simulated values. Device selection invalidates scoped history keys; keep previous values only under explicit previous-device loading mask, never under new device label.

Tooltip shows exact receipt time, value/unit, channel, quality and aggregate count. Do not smooth raw data into sine waves. Missing intervals use null/broken segments and accessible explanation. Downsample with min/max-preserving buckets; label resolution. Screen-reader summary/table accompanies each chart. Announce connection changes politely, not every packet. Keyboard tab order follows visual order; accessible drawer focus trap and return focus. CSV button describes selected range.

## Visual acceptance checklist
At 360,390,768,1024,1440,1920px capture all ten screens with controlled TEST ONLY fixtures; also capture empty, partial, zero and offline states. No horizontal page scroll, cut buttons, clipped units or overlapping headings. Check DPR1/DPR2 and 100/125/200% zoom for crisp native text. Do not scale a whole dashboard using CSS transform. Check font load failure fallback. Align numeric columns right and units consistently. Verify contrast, keyboard, reduced motion and touch targets. Final hardware screenshots must use real readings and redact private user information before external handover.
