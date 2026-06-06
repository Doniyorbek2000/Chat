# VOXO — Play Market Internal Testing Checklist

Version: 1.0  
Date: 2026-06-06  
Target: Google Play Internal Testing Track

---

## Pre-Upload Requirements

- [ ] APK/AAB built with `flutter build appbundle --release`
- [ ] `key.properties` NOT committed to git (local file only)
- [ ] `.jks` keystore NOT committed to git (local file only)
- [ ] `minSdkVersion` ≥ 21 in `android/app/build.gradle`
- [ ] `targetSdkVersion` ≥ 34 (current Play Market requirement)
- [ ] Version code incremented in `pubspec.yaml`
- [ ] Version name matches release (`1.0.0+1` format)
- [ ] No debug logs or `print()` statements in release build
- [ ] `flutter analyze` passes with 0 errors

---

## Authentication & Onboarding

- [ ] Phone OTP screen loads correctly
- [ ] OTP sent to real Uzbekistan number (+998XXXXXXXXX)
- [ ] OTP verified successfully → user created
- [ ] Profile setup screen shows on first login
- [ ] Display name, avatar upload works
- [ ] Returning user skips onboarding → goes to home
- [ ] Google Sign-In works (OAuth flow)
- [ ] Apple Sign-In works (if iOS build)
- [ ] Logout → returns to auth screen
- [ ] Token refresh works (stay logged in after 24h)

---

## Home / Discovery

- [ ] Home feed loads voice rooms
- [ ] Category filters work (All, Live, Popular, Near Me)
- [ ] Room cards show host name, listener count, cover image
- [ ] Discover page shows sections (trending, recommended)
- [ ] Pull-to-refresh works
- [ ] Infinite scroll / pagination works
- [ ] Search bar returns results for room names and users
- [ ] No rooms → empty state shown correctly

---

## Voice Rooms

- [ ] Create room works (title, topic, language, cover image)
- [ ] Join room as listener
- [ ] Host starts broadcasting (microphone permission requested)
- [ ] Microphone permission denial handled gracefully
- [ ] Seat request system works (listener → seat)
- [ ] Host accepts/rejects seat requests
- [ ] Room chat messages appear in real time
- [ ] Gift animations play on screen
- [ ] Room settings (slow mode, gift-only, keyword filters)
- [ ] Mod actions work (mute, kick, ban)
- [ ] Leave room works
- [ ] Host ends room → all users see "room ended" state
- [ ] Room reconnects after brief network interruption
- [ ] Background audio continues when app is minimized (if applicable)

---

## Gifts & Wallet

- [ ] Gift panel opens in room
- [ ] Gift categories load (Basic, Premium, Special)
- [ ] Sending gift deducts coins from sender wallet
- [ ] Recipient sees gift animation
- [ ] Gift converts to diamonds for recipient
- [ ] Wallet balance updates immediately after transaction
- [ ] Insufficient balance shows error (not crash)
- [ ] Transaction history shows all transactions
- [ ] Coin recharge products list loads
- [ ] Click payment flow works (test mode)
- [ ] Payme payment flow works (test mode)
- [ ] Withdrawal request form works
- [ ] Withdrawal amount validation (minimum, maximum)

---

## VIP & Noble System

- [ ] VIP plans list loads with prices
- [ ] Purchasing VIP updates user badge
- [ ] VIP benefits applied (special seat, room priority)
- [ ] VIP expiry date shown correctly
- [ ] Noble level display on profile
- [ ] Noble privileges active during VIP period

---

## Shop, Medals, Room Themes, Nameplates

- [ ] Shop items load with categories
- [ ] Purchasing item deducts correct currency
- [ ] Item appears in inventory after purchase
- [ ] Equipping item applies to profile/room
- [ ] Medals page shows earned and locked medals
- [ ] Unlocking medal condition shown
- [ ] Room theme preview works
- [ ] Applying theme changes room appearance
- [ ] Nameplate shows on profile and in room

---

## Social Features

- [ ] Family creation and management
- [ ] Family join request flow
- [ ] Couple pairing works (invite + accept)
- [ ] Couple status shown on profiles
- [ ] Friend requests (send, accept, reject)
- [ ] Following / followers list
- [ ] Private message (DM) works
- [ ] Message delivery and read receipts

---

## Profile & Settings

- [ ] Profile page loads with all stats
- [ ] Avatar upload / change works
- [ ] Cover image upload works
- [ ] Display name, bio editable
- [ ] Verification badge shown if applicable
- [ ] Privacy settings (visible to / who can DM)
- [ ] Block user works
- [ ] Notification settings (push on/off per category)
- [ ] Language settings (UZ / EN / RU)
- [ ] Account deletion request flow

---

## Missions & Gamification

- [ ] Daily missions list loads
- [ ] Weekly missions list loads
- [ ] Mission progress updates after completing action
- [ ] Claim reward button appears when mission complete
- [ ] Reward credited to wallet after claim
- [ ] Already-claimed missions show "Olindi" state
- [ ] Missions reset at midnight (daily) / Monday (weekly)

---

## Host Features

- [ ] Host level screen shows XP, tier, level
- [ ] Host XP increases after live session
- [ ] Host ranking loads (weekly / monthly / all)
- [ ] Creator analytics summary loads
- [ ] Gift analytics chart shows data
- [ ] Top supporters list correct
- [ ] Agency host earnings screen works
- [ ] Payout request works (min diamond threshold)

---

## PK Battle

- [ ] PK invite works between two hosts
- [ ] PK timer shows countdown
- [ ] Gift score updates in real time
- [ ] PK winner announced at end
- [ ] PK Season current season loads
- [ ] Season ranking shows correctly
- [ ] Claim season reward (after season ends)

---

## Leaderboard

- [ ] Diamond leaderboard loads (daily / weekly / monthly)
- [ ] Gift leaderboard loads
- [ ] Host XP leaderboard loads
- [ ] User's own rank shown
- [ ] Top 3 highlighted with medal emojis

---

## Notifications

- [ ] Push notification received when gift sent
- [ ] Push notification for room activity
- [ ] In-app notification list loads
- [ ] Mark all read works
- [ ] Deep link from push notification opens correct screen

---

## Admin Panel (Browser)

- [ ] Admin login with admin credentials
- [ ] Dashboard stats load (DAU, revenue, rooms)
- [ ] User management (search, ban, unban)
- [ ] Wallet adjust (SUPER_ADMIN only)
- [ ] Gift list and management
- [ ] VIP plan editing
- [ ] Mission create / edit / toggle
- [ ] Verification badge grant
- [ ] Host ranking view
- [ ] Payout approval / rejection
- [ ] Risk events dashboard
- [ ] Growth dashboard loads charts

---

## Performance Checks

- [ ] App starts in < 3 seconds (cold start)
- [ ] Room join < 2 seconds
- [ ] No frame drops (60fps) on home feed scroll
- [ ] Memory usage stable (no leak during 30-min session)
- [ ] APK/AAB size < 60 MB
- [ ] Images load from CDN with proper caching
- [ ] No ANR (Application Not Responding) during tests

---

## Device Compatibility

- [ ] Android 7.0 (API 24) — minimum supported
- [ ] Android 10 (API 29) — target
- [ ] Android 13 (API 33) — latest
- [ ] Screen sizes: 5.0" / 6.1" / 6.7" / tablet
- [ ] Portrait orientation lock enforced where needed
- [ ] Dark mode renders correctly (default theme)
- [ ] RTL layout (if Arabic locale supported)

---

## Error Handling & Edge Cases

- [ ] No internet connection shows offline banner
- [ ] Server error (500) shows user-friendly message
- [ ] Session expired → auto-redirect to login
- [ ] Permission denied (mic, camera, storage) handled
- [ ] Deep link to non-existent room shows error
- [ ] Payment failure shows retry option

---

## Security Checks

- [ ] API tokens not visible in plain text logs
- [ ] Payment receipts validated server-side
- [ ] Users cannot claim missions twice
- [ ] Gift send has idempotency (duplicate prevention)
- [ ] Admin endpoints return 401 for unauthenticated users
- [ ] Wallet adjust limited to SUPER_ADMIN

---

## Play Store Upload Checklist

- [ ] App bundle (AAB) signed with production keystore
- [ ] App title: "VOXO - Voice Chat & Live"
- [ ] Short description (80 chars max) ready
- [ ] Full description (4000 chars max) ready
- [ ] Feature graphic (1024×500) ready
- [ ] Icon (512×512) ready
- [ ] Screenshots: phone (min 2), 7-inch tablet (optional)
- [ ] Privacy policy URL set
- [ ] Content rating questionnaire completed
- [ ] Target audience set (18+)
- [ ] Data safety section filled

---

**Sign-off:** _________________________  
**Tester:** _________________________  
**Date:** _________________________
