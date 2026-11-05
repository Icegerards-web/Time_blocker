# Time Blocker

Expo (React Native) app for timed blocks of sites and apps, built unsigned with Codemagic and sideloaded with SideStore.

## Status
- [x] Expo scaffold, block list UI with locked countdown timers
- [x] Codemagic workflow producing an unsigned `TimeBlocker.ipa`
- [x] Save blocks to disk, permanent blocks
- [x] Website blocking via NextDNS denylist (needs free NextDNS account)
- [x] App blocking: custom "Is App Blocked" Shortcuts action (App Intent), driven by the app's timers
- [x] 72-hour unlock delay for permanent blocks
- [ ] Recurring schedules

## Limits
Without a paid Apple Developer account the Screen Time API is unavailable. App blocking instead uses a Shortcuts automation that calls our "Is App Blocked" action (the Swift file is added at prebuild by `plugins/withAppIntent.js`). The Swift code has not been compiled yet; if the Codemagic build fails, check that file first.

## Build
Connect this repo in Codemagic and run the `ios-unsigned` workflow, then open the `.ipa` in SideStore.
