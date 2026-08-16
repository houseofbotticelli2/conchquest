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
| My Beaches | list, add form, inline edit panel, filters, search, remove dialog |
| Log a find | create mode, edit mode, photo empty/filled, species search + results, condition chips, discard dialog |
| Log confirm | — |
| Profile | header, stats strip, finds list, beaches list, settings sheet, edit profile sheet, change password sheet, blocked users sheet, help sheet |
