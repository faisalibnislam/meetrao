# Meetrao for iOS

The host app: today's meetings, bookings (cancel and move), meeting links, availability, notifications and company workspaces. Guests keep using the web. SwiftUI, iOS 26 and later, iPhone and iPad, plus a "Next meeting" widget.

The app talks to the same Convex deployment as the website. Cancel and move go through the site (`/api/app/bookings/*`) because they send emails and update Google Calendar there.

## Build and run

You need Xcode 26 and [XcodeGen](https://github.com/yonaskolb/XcodeGen) (`brew install xcodegen`).

```bash
cd ios
xcodegen
open Meetrao.xcodeproj
```

`project.yml` is the source of truth. Run `xcodegen` again after adding or removing files, and commit the regenerated `Meetrao.xcodeproj`.

To put it on your own iPhone, pick your Apple ID team under Signing & Capabilities for the Meetrao and MeetraoWidget targets (or set `DEVELOPMENT_TEAM` in `project.yml`). A free account works. Builds signed that way expire after seven days, so reinstall from Xcode when the app stops opening.

The defaults point at production: `MEETRAO_CONVEX_URL` and `MEETRAO_SITE_URL` in `project.yml`.

## Turned off until there is a paid Apple Developer account

Sign in with Apple and push notifications are written and tested on the server, but both need capabilities a free account can't sign. They are switched off with `MEETRAO_APPLE_SIGN_IN = NO` and `MEETRAO_PUSH = NO`, so the app never shows the Apple button or asks for notification permission.

### Sign in with Apple

1. In the developer portal, turn on Sign in with Apple for the App ID `com.meetrao.app`.
2. Add the entitlement to `Meetrao/Meetrao.entitlements`:
   ```xml
   <key>com.apple.developer.applesignin</key>
   <array><string>Default</string></array>
   ```
3. Set `MEETRAO_APPLE_SIGN_IN: "YES"` in `project.yml` and run `xcodegen`.
4. On the Convex deployment, set `APPLE_BUNDLE_ID=com.meetrao.app`. The server checks the identity token against Apple's keys, that audience and the nonce.

For the website's Apple button as well: create a Services ID with `https://<convex-site-url>/api/auth/callback/apple` as the return URL, set `AUTH_APPLE_ID` (the Services ID) and `AUTH_APPLE_SECRET` (the client secret JWT, which Apple caps at six months) on Convex, then `NEXT_PUBLIC_APPLE_SIGN_IN=1` on Vercel.

### Push notifications

1. Turn on Push Notifications for the App ID and create an APNs auth key (.p8).
2. Add to `Meetrao/Meetrao.entitlements`:
   ```xml
   <key>aps-environment</key>
   <string>development</string>
   ```
   Xcode switches it to `production` for App Store and TestFlight builds.
3. Set `MEETRAO_PUSH: "YES"` in `project.yml` and run `xcodegen`.
4. On Convex, set `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_BUNDLE_ID=com.meetrao.app` and `APNS_PRIVATE_KEY` (the .p8 contents, newlines as `\n`).

Without the `APNS_*` variables the server skips delivery. Each device registers as sandbox or production, and the server drops tokens Apple reports as dead. A push goes out for the same events, and under the same notification settings, as the host emails.

## Tests

```bash
xcodebuild test -project Meetrao.xcodeproj -scheme Meetrao \
  -destination 'platform=iOS Simulator,name=iPhone 18 Pro'
```

The unit tests need nothing else. `BackendIntegrationTests` run only when `MEETRAO_IT_CONVEX_URL` is set; they sign in as a seeded host and exercise every query and mutation the app uses. Point them at a local or throwaway backend, never production:

```bash
TEST_RUNNER_MEETRAO_IT_CONVEX_URL=http://127.0.0.1:3210 \
TEST_RUNNER_MEETRAO_SITE_URL=http://localhost:3007 \
TEST_RUNNER_MEETRAO_IT_EMAIL=... TEST_RUNNER_MEETRAO_IT_PASSWORD=... \
xcodebuild test ...
```

`meetrao/src/lib/ios/sync.test.ts` (part of `npm test` in `meetrao/`) checks that every Convex function the Swift code names still exists, and that timezones, meeting choices, the redirect scheme and the Apple provider id match the web app.

## Running against a local backend

Debug builds read `MEETRAO_CONVEX_URL` and `MEETRAO_SITE_URL` from the environment, which overrides `project.yml`. In Xcode, set them under Edit Scheme > Run > Environment. From the command line:

```bash
SIMCTL_CHILD_MEETRAO_CONVEX_URL=http://127.0.0.1:3210 \
SIMCTL_CHILD_MEETRAO_SITE_URL=http://localhost:3007 \
xcrun simctl launch booted com.meetrao.app
```

Google sign-in returns to the app through `meetrao://auth`. The Convex deployment allows that one redirect besides its own site.
