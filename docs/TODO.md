# Conchquest TODO

Shared task list, kept in sync with the task tracker used during development.
Task numbers are stable references, not priority order.

## Pending

- [ ] #44 Build social feed (PRD MVP item)
- [ ] #46 Build premium subscriptions via RevenueCat (PRD MVP item)
- [ ] #60 Build password reset flow + fix Supabase redirect URL
- [ ] #64 Harden Railway build: keep secrets out of Nixpacks build stage
- [ ] #71 Add social login (Google, Apple, Facebook) via Supabase Auth -- Sign in with Apple is mandatory once any other social login is offered and the app is on the App Store (guideline 4.8), not optional; needs provider setup in Apple Developer (Services ID), Google Cloud Console (OAuth client), and Facebook for Developers, wired into Supabase Auth's dashboard, plus expo-apple-authentication + an OAuth flow (expo-auth-session or similar) on the mobile side
- [ ] #75 Draft Privacy Policy, Terms of Service, and Community Guidelines -- required before App Store/Play Store submission (privacy policy is both legally required under GDPR/CCPA and mandated by both stores; ToS needed for account terms + subscription disclosure once #46 ships; Community Guidelines needed to satisfy Apple guideline 1.2's UGC requirement -- a report/block mechanism, tied to #47's admin console); also need Apple's App Privacy "nutrition label" and Google Play's Data Safety section filled out to match, plus a children's-privacy (COPPA) statement -- have a lawyer review before publishing, not just Claude Code
- [ ] #77 Explore Gemini API image understanding for shell species detection -- feed a find's photo through Gemini's vision capability to suggest/auto-fill the species instead of the user picking manually from the Library; needs a spike to check real-world accuracy against the actual shell_species catalog before committing to it as a real feature
- [ ] #78 Consider bringing the community Leaderboard to the mobile app -- prototyped for fun in the admin console mockup first (ranked by total shells logged, with rare-find and species-diversity as secondary stats); if it's added to the app, needs a real ranking query (or a materialized/cached leaderboard table, since ranking all users live on every request doesn't scale) and a decision on whether it's opt-in/opt-out per user
- [ ] #79 Stop keeping the Railway Postgres public URL sitting in local `.env` files -- disable public networking on the Postgres service and use `railway connect` (Railway CLI) to tunnel in instead for one-off local dev/admin/debugging work; more setup than a static `DATABASE_URL`, but nothing sits exposed between sessions. In the meantime: never paste the public URL anywhere outside this session's chat (no public gists, tickets, etc.), and if it's ever suspected leaked, rotate it immediately from Railway's dashboard (Postgres service -> Variables -> regenerate)
- [ ] #80 Add `SUPABASE_SERVICE_ROLE_KEY` to the deployed API's environment -- the admin console's member-delete flow (DELETE /api/admin/users/:id) needs it to remove the actual Supabase Auth account via the Admin API, not just the mirrored `users` row; without it, deleting a member throws "SUPABASE_SERVICE_ROLE_KEY is not configured." Get it from Supabase dashboard -> Settings -> API -> service_role key (secret, never expose client-side) and set it on Railway's API service, not just local `.env`

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
- [x] #62 Build multi-day forecast (not just today's snapshot)
- [x] #63 Build push notifications for beach alert thresholds
- [x] #66 Fix Profile avatar "change photo" not working on iOS
- [x] #67 Generate Shelling Strategy card via GPT-4o-mini (OpenAI) -- new POST /api/score/strategy endpoint, cached in its own dedicated shelling_strategy_cache table (keyed by location + day offset, ~24h TTL -- switched from piggybacking on conditions_cache after discovering the Score screen's multi-day forecast never populates that table), falls back to the concatenated factor explanation on error/timeout; verified live end-to-end
- [x] #69 Add caching to the multi-day forecast (/api/score/multi-day) -- new multi_day_forecast_cache table (whole 5-day array per location bucket, reuses conditionsCacheTtlMinutes); verified locally that a repeat request hits the cache instead of re-fetching from NOAA/OpenWeather/NDBC
- [x] #70 Day-strip label: use weekday for all future days, not "Tmrw"; also made beach city read-only in add/edit flows since it's derived from lat/lon (not independently changeable)
- [x] #65 Add Google Maps API key for Android map rendering -- restricted by package name + SHA-1 fingerprint; key must be passed via the react-native-maps plugin's `androidGoogleMapsApiKey` option in app.json's plugins array, NOT the generic `android.config.googleMaps.apiKey` field (that field is only a fallback for packages with no config plugin of their own -- react-native-maps ships its own, which silently strips any existing manifest meta-data when its own option is unset); verified by pulling the built APK and inspecting AndroidManifest.xml directly
- [x] #72 Limit Recent Beaches query to what Profile actually displays -- GET /api/saved-locations now accepts ?limit, avoiding a live conditions/score computation for every saved beach when only a few are ever shown; also joined Profile's remaining sequential requests into its existing Promise.all batch
- [x] #73 Fix Shelling Strategy always saying "tomorrow" regardless of which day was selected -- the dayLabel field was already passed correctly, but neither the DB-seeded app_config system prompt nor the code fallback told the model to anchor its wording to it; migration updates the seeded prompt (which overrides the code fallback) and clears the existing shelling_strategy_cache so stale wrong-wording text isn't served out its remaining TTL
- [x] #74 Add draggable-pin location picker to add/edit beach flows -- ShellingMap gained a draggable center marker (onCenterMarkerDragEnd) and a recenter-to-pin button; add flow starts the pin at current device location, edit flow starts it at the beach's saved location, both re-run reverse geocode on drop to refresh the read-only city field; PATCH /api/saved-locations/:id extended to accept lat/lon/city; web shows an explanatory fallback message since react-native-maps has no web implementation
- [x] #76 Move beach alert cooldown to app_config + add weekly cache cleanup cron -- beach_alert_cooldown_hours (was a hardcoded constant) now matches the existing beach_alert_lead_time_hours pattern; new weekly cron (Sunday 3 AM) removes already-expired rows from conditions_cache/shelling_strategy_cache/multi_day_forecast_cache (never touches live entries -- reads already skip expired rows via expires_at > now(), this just stops them accumulating forever), recording each run's counts in a new cache_cleanup_runs table exposed via GET /api/cache-cleanup-runs; verified locally against the real shared DB
- [x] #47 Build admin console (PRD MVP item) -- new standalone admin/ Vite+React+TS app (Supabase Auth + users.role/requireAdmin gating), covering Dashboard, Members (with per-member finds/beaches detail view + cascading delete incl. Supabase Auth account + R2 photos), Species Library, Prompt Testing (live GPT-4o-mini prompt/temperature/max_tokens editing against canned scenarios), System Config, Service Health (NOAA/NDBC failure chart + failing-stations + cache-cleanup-run panels), Audit Log, and Leaderboard; every mutation is recorded to a new admin_audit_log table. Content Moderation screen deliberately deferred -- there's nothing to moderate until the social feed (#44) exists, and should also add OpenAI usage/spend monitoring for #67 once needed
