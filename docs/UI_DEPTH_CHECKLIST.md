# UI depth & hierarchy checklist

Derived from real mistakes made during the depth retrofit (see the
"Conchquest Depth & Hierarchy Audit"). Each item below is something that was
actually missed or done wrong, not a hypothetical. Run this against any
screen, sheet, or sub-state when adding or reviewing UI.

## The trap that caused most of the misses

**"This screen uses `<Card>`, so it's covered."** It isn't. Shared
components only cover what they wrap. Screen-specific heroes, chips,
frames, and composite rows are all still yours to treat. The Shellcast
screen used `Card` and still had an uncontained hero score ring, flat day
pills, and a Best Window card indistinguishable from the card below it.

---

## C1 — Does the screen have BOTH raised and recessed elements?

Uniform treatment reads flat regardless of which tone you picked. A screen
that is entirely recessed looks just as flat as one that is entirely
borderless. Depth comes from contrast, not from applying a token.

- Form-only screens (auth, reset password) have no cards to contrast
  against, so their inputs should be **raised**.
- Screens with cards should have inputs **recessed** *inside* those cards.

## C2 — Is every recessed element actually an input?

Recessed means "you can type here." Read-only value rows are not inputs.
Species name, condition, location-sharing status, and dates are values —
they belong on the surface, not cut into it.

The rule the app had already settled on without writing down, found while
aligning the two edit screens — it holds on every screen, so keep it:

| Treatment | Means | Examples |
|---|---|---|
| `surfaceInset` (tan, cut in) | **type here** | beach name, find notes, search boxes |
| `surfaceCardHi` (white, raised) | **pick a value** | alert stepper, species row, location sharing, favourite toggle |

Things that are neither — they only *look* like inputs because they're
boxed — must be raised. The 2026-08-20 audit found six: notice and error
blocks on Signup, Reset password and Log a find, Profile's deletion banner,
and the hourly tiles on Conditions detail. A box around read-only text is
not a reason to recess it.

**Inside a sheet the table inverts, and C3 wins.** A `SlideUpSheet` already
paints `surfaceCardHi`, so a raised control on it disappears — everything
inside a sheet is recessed regardless of whether it's typeable. The date
buttons in `DateRangeSheet` are "pick a value" controls and are correctly
`surfaceInset`; they read as a C2 violation until you notice what they sit
on. Judge the element against its container, not against the table.

## C3 — Does any element share its container's tone?

An inset field inside an inset panel disappears. Check parent/child pairs:
if a container is `surfaceInset`, its children must be `surfaceCardHi` (or
vice versa). Same applies to a `Field` nested in a wrapper `View` that
already paints the field surface — only one of the two should.

## C4 — Every container in the file, not just the obvious ones

Enumerate them: map frames, photo squares, results/autocomplete dropdowns,
chips, badges, stat strips, icon wells, empty states, error/notice blocks.
The first Log a find pass did inputs and the photo dropzone and left the
map frame, species photo, results dropdown, and condition chips flat.

## C5 — Every state of the screen, not just the default

- edit mode vs view mode
- empty / loading / error states
- owner vs non-owner views
- expanded panels, sheets, and dialogs launched from the screen
- add forms that only appear after a tap

Beaches' add-beach form and its filter chips were skipped entirely because
they only render after pressing "+".

## C6 — Is the same element treated the same everywhere?

The find thumbnail in `FindRow` and the row icon in `Library` are the same
element and were treated differently. Map frames were raised in Log and
Find Detail but flat in Beaches. Grep for the element across screens before
declaring it done.

**Geometry counts, not just tone.** The 2026-08-20 audit found map frames
correctly raised on all five screens but with three different
`borderRadius` values (8, 10, 12). Same for the beach-picker ring, which was
sized from the neighbouring glyph's *font size* rather than its drawn circle
and came out 27% too wide. Radius, size and stroke drift as easily as colour
and are harder to notice one screen at a time.

**A shared component can invite the drift it was meant to end.** `ListRow`
took a `bg` prop for its leading slot, and all three find call sites passed
`surfaceInset` while beaches used the raised default — so the same slot had
two tones, which is exactly the `FindRow`/`Library` mistake above,
reintroduced by the component built to fix it. If a visual property should
be consistent, the component must own it and expose no prop for it.

## C7 — Does exactly one thing stand out?

If every chip has a shadow, none of them reads as selected. If every card
is `surfaceCardHi`, the home beach's elevation signals nothing. Selected
and hero elements need siblings that are *quieter*, not equal.

## C8 — Any legacy tokens left?

Grep for these; they predate the depth system and read wrong next to it:

```
backgroundColor: t.surface[,}]      → surfaceCard / surfaceCardHi
borderColor: t.border[,}]           → borderSoftAlpha (when paired with a shadow)
backgroundColor: t.surfaceAlt       → surfaceInset (wells) or surfaceCardHi (chips)
```

The chips half of that last line is the one that gets missed — it cost five
findings in the 2026-08-20 audit (`alertChip` on Beaches and Profile,
`homeBadge` on Shellcast and Map, `factorPts` on Score breakdown). Chips sit
*on* the page; only wells and tracks are cut into it:

```
grep -rn 'Chip\|Badge\|Pill' src/ | grep surfaceInset     # should be empty
```

And a contradiction worth its own grep — recessed and lifted at once, which
Library's species icon was doing:

```
grep -rn 'surfaceInset.*shadowRaised' src/               # should be empty
```

## C9 — Does inline styling fight a component that now owns it?

When a shared component takes ownership of a visual property, call sites
must stop passing it. After `Field` began owning background/border/shadow,
19 call sites were still passing their own — which would have overridden
the focus state. Same class of bug as `fontWeight` overrides fighting the
new font weights across 15 files.

## C10 — Interactive elements need a visible response

- Text inputs: focus state (handled by `Field`)
- Cards and buttons: pressed state — shadow drops, surface darkens slightly
- Anything tappable that looks like a static row is a bug in the other
  direction: read-only content must not look editable

`TouchableOpacity` fades the whole element, which is not the same thing and
reads as the content vanishing rather than the surface being pushed. For
anything card- or row-sized, use `Pressable` and darken the surface —
`Btn`, `ListRow`, `CircleIconButton` and `DestructiveLink` all do.

Icon-only taps in headers and sheet rows are still `TouchableOpacity`. That
is a deliberate stopping point, not a clean bill of health: a fade is
tolerable on a 22pt glyph and wrong on a row.

---

## Screen inventory

Every screen and sub-state to run this against. Sub-states are listed
because C5 misses live there.

| Screen | Sub-states to check |
|---|---|
| Welcome | — |
| Signup | signup mode, login mode, notice/error blocks |
| Reset password | form, done state, error |
| Perms | — |
| Beach (onboarding) | list, selected |
| Shellcast (Score) | day strip, ring, best window, conditions, no-window state, beach picker sheet |
| Score breakdown (Detail) | factor cards, total |
| Strategy detail | window card, strategy card, loading |
| Conditions detail | header, stat pair, hourly strip |
| Map | map frame, filter chips, date sheet, find list, clustered vs individual |
| Find detail | owner view, non-owner view, report sheet, block dialog, photo viewer |
| My Shells | list, filters, date sheet, empty |
| Library | list, search, filters |
| Species detail | hero icon, facts card, about card |
| My Beaches | list, expanded row, filters, search, add form |
| Edit beach | form, favourite toggle on/off, remove dialog, save error |
| Log a find | create mode, edit mode, photo empty/filled, species search + results, condition chips, discard dialog, delete dialog |
| Log confirm | — |
| Profile | header, stats strip, finds list, beaches list, deletion banner, settings sheet, edit profile sheet, change password sheet, blocked users sheet, help sheet |

Shared components carry their own treatment, so a change here lands on every
screen above — check them directly rather than through a screen:

| Component | Owns |
|---|---|
| `Card` | resting vs `hi` hero card |
| `Field` | recessed by default, `raised` for form-only screens, focus state |
| `ListRow` | leading slot tone, pressed state, expansion, action slot |
| `ScreenHeader` | header height, title size, action alignment and right inset |
| `SlideUpSheet` | sheet surface, height cap, scrolling |
| `SheetRow` | sheet-row divider, padding, pressed state |
| `Btn` / `CircleIconButton` / `DestructiveLink` | pressed states, action weight |

## Audit log

Running this end to end is worth dating, since "we checked" decays.

- **2026-08-20** — full pass, 10 criteria. C8 and C9 clean; C1 clean. Seven
  findings, all fixed: recessed chips (5 sites), `ListRow`'s two-tone leading
  slot, Library's inset-plus-raised icon, three map-frame radii, six recessed
  read-only blocks, four equal cards on Conditions detail, and `ListRow`
  lacking a pressed state. **C5 was not audited** — sheets, empty, loading,
  error and non-owner states were skipped, and the checklist says that is
  exactly where misses live. Start there next time.

- **2026-08-20, C5 pass** — every state of every screen. Four findings, all
  fixed, and all four lived in sheets:

  - Profile passed `borderTopColor` in **eleven** places while its `sheetRow`
    style never set `borderTopWidth`. All six of its sheets rendered with no
    dividers — Settings was ten undifferentiated rows with "Log out" flush
    against "Delete my account". A dead style survives both review and
    typecheck; only rendering it catches it.
  - Sheet rows had no pressed state (C10).
  - `pickerRow` was duplicated byte-for-byte in Shellcast and Map, at
    `paddingVertical: 12` against the sheet-row standard of 14 (C6).
  - `sheetRow` was 16 in Find detail and 14 in Profile (C6).

  All now come from `SheetRow`. Verified as passing: 15 empty states (all
  plain muted text, no container, consistent), 25 loading states (all bare
  `ActivityIndicator` in `t.accent`), Beaches' add form (raised card, recessed
  field inside — correct per C1), Log's species results (raised + floating,
  correct for a dropdown), onboarding's beach selection, and every
  `ConfirmDialog`, which is shared and therefore uniform.

  Not a depth issue but noted while reading: **Find detail has no owner
  action.** A non-owner gets the ellipsis and the report/block sheet; an owner
  gets nothing, and reaches Edit only from a list. That may be intended, but
  it is the one state where owner and non-owner differ in what's reachable
  rather than how it looks.
