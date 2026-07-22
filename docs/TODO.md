# Conchquest TODO

Shared task list, kept in sync with the task tracker used during development.
Task numbers are stable references, not priority order.

## Pending

- [ ] #44 Build social feed (PRD MVP item)
- [ ] #46 Build premium subscriptions via RevenueCat (PRD MVP item)
- [ ] #47 Build admin/moderation console (PRD MVP item)
- [ ] #60 Build password reset flow + fix Supabase redirect URL
- [ ] #62 Build multi-day forecast (not just today's snapshot)
- [ ] #64 Harden Railway build: keep secrets out of Nixpacks build stage
- [ ] #65 Add Google Maps API key for Android map rendering
- [ ] #66 Fix Profile avatar "change photo" not working on iOS

## Completed

- [x] #1 Scaffold package.json, tsconfig, env config
- [x] #2 Write PostGIS migrations
- [x] #3 Build environmental aggregation service
- [x] #4 Build deterministic scoring engine /api/score
- [x] #5 Supabase JWT auth middleware
- [x] #6 Build /api/finds endpoint
- [x] #7 Wire up app.ts/server.ts and verify build
- [x] #8 Scaffold Expo/TypeScript project in mobile/
- [x] #9 Build theme system with both palettes
- [x] #10 Port design-system primitives to RN
- [x] #11 Set up navigation skeleton
- [x] #12 Build all 14 screens with prototype sample data
- [x] #13 Add graceful degradation for NOAA tide API flakiness
- [x] #14 Add app_config table + fuzz radius seed values
- [x] #15 Build config service with short-TTL cache
- [x] #16 Build deterministic location fuzzing utility
- [x] #17 Build GET /api/finds/nearby community endpoint
- [x] #18 Convert nearby-finds radius/distance from meters to feet
- [x] #19 Build real interactive map (ShellingMap + react-native-maps)
- [x] #20 Set up Supabase client with session persistence
- [x] #21 Build AuthProvider/useAuth context
- [x] #22 Wire Signup screen to real Supabase auth + login toggle
- [x] #23 Gate navigation on real auth state + add sign out
- [x] #24 Capture display_name from signup on backend
- [x] #25 Build mobile API client with auth token attachment
- [x] #26 Wire Score screen to real /api/score
- [x] #27 Wire Detail screen to real factor breakdown
- [x] #28 Add rarity field to nearby-finds API response
- [x] #29 Add finds API functions to mobile client
- [x] #30 Wire Log screen to real POST /api/finds
- [x] #31 Wire Profile recent finds to GET /api/finds
- [x] #32 Wire Map recent finds nearby to GET /api/finds/nearby
- [x] #33 Use real safe-area insets for tab bar bottom padding
- [x] #34 Seed shell_species catalog with real species data
- [x] #35 Build GET /api/species and /api/species/:id routes
- [x] #36 Add alert_threshold/is_home columns to saved_locations + CRUD routes
- [x] #37 Wire Library screen to GET /api/species
- [x] #38 Wire Species detail screen to GET /api/species/:id
- [x] #39 Wire Saved beaches screen to real saved-locations API
- [x] #40 Add swipe-to-dismiss gesture to SlideUpSheet
- [x] #41 Set up EAS dev client for on-device testing
- [x] #42 Add home-beach checkbox to Saved beaches add form
- [x] #45 Build push notifications (PRD MVP item)
- [x] #48 Wire up photo upload for finds (Cloudflare R2)
- [x] #49 Add /api/config endpoint for recent-finds/beaches limits
- [x] #50 Add PATCH /api/finds/:id endpoint
- [x] #51 Make GET /api/finds/:id support community (non-owner) view
- [x] #52 Wire mobile api.ts for config, getFind, updateFind
- [x] #53 Add Recent Beaches section to Profile (read-only)
- [x] #54 Move Saved beaches management behind the gear/Settings sheet
- [x] #55 Remove wind/conditionSummary line from beach cards
- [x] #56 Wire FindDetail screen to real data (own + community finds)
- [x] #57 Build Edit a Find flow from My Shells
- [x] #59 Make Profile editable (display name, shelling-since year)
- [x] #63 Build push notifications for beach alert thresholds
