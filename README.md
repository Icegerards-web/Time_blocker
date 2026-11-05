# Time Blocker

Expo (React Native) app for timed blocks of sites and apps, built unsigned with Codemagic and sideloaded with SideStore.

## Status
- [x] Expo scaffold, block list UI with locked countdown timers
- [x] Codemagic workflow producing an unsigned `TimeBlocker.ipa`
- [x] Save blocks to disk, permanent blocks
- [x] Website blocking via NextDNS denylist (needs free NextDNS account)
- [x] App blocking: in-app Shortcuts instructions (manual setup)
- [ ] Recurring schedules

## Limits
Without a paid Apple Developer account the Screen Time API is unavailable, so this app cannot truly block other apps. The timer is enforced inside this app only for now.

## Build
Connect this repo in Codemagic and run the `ios-unsigned` workflow, then open the `.ipa` in SideStore.
