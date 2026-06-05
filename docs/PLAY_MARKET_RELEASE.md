# VOXO — Play Market Release Guide

## Prerequisites
- Android Studio or JDK 17+
- Flutter 3.x
- Google Play Console access
- Upload keystore

## 1. Generate Upload Keystore

```bash
keytool -genkey -v -keystore upload-keystore.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias upload
```

Place `upload-keystore.jks` in `mobile/android/` directory.
Create `mobile/android/key.properties` from `key.properties.example`.

**NEVER commit keystore or key.properties to git.**

## 2. Build Release AAB

```bash
cd mobile
flutter clean
flutter pub get
flutter build appbundle --release \
  --dart-define=API_BASE_URL=https://api.voxo.uz/api/v1 \
  --dart-define=SOCKET_URL=wss://api.voxo.uz \
  --dart-define=ENVIRONMENT=production
```

Output: `build/app/outputs/bundle/release/app-release.aab`

## 3. Version Bump

In `pubspec.yaml`:
```yaml
version: 1.0.0+1
# Format: versionName+versionCode
# versionCode must increment with each Play Store upload
```

## 4. App Configuration

| Field | Value |
|---|---|
| App name | VOXO |
| Package name | com.voxo.app |
| Min SDK | 21 (Android 5.0) |
| Target SDK | 34 |
| Supports 64-bit | Yes (Dart compiles to arm64) |

## 5. Required Permissions

| Permission | Reason |
|---|---|
| INTERNET | API communication |
| RECORD_AUDIO | Voice rooms |
| MODIFY_AUDIO_SETTINGS | Audio quality control |
| POST_NOTIFICATIONS | Messages, gifts, events |
| CAMERA | Profile photo upload |
| READ/WRITE_EXTERNAL_STORAGE | Media access (Android < 13) |
| VIBRATE | Notification feedback |
| BLUETOOTH_CONNECT | Bluetooth headset support |

## 6. In-App Products (Google Play)

Set up these products in Play Console → Monetize → In-app products:

| Product ID | Type | Price | Description |
|---|---|---|---|
| coins_100 | One-time | $0.99 | 100 coins |
| coins_500 | One-time | $4.99 | 500 coins |
| coins_1000 | One-time | $9.99 | 1000 coins |
| coins_5000 | One-time | $49.99 | 5000 coins |
| vip_1month | Subscription | $9.99/mo | VIP Level 1 |

## 7. Privacy Policy URL

Required for Play Store: `https://voxo.uz/privacy-policy`

## 8. Data Safety (Play Console)

Data collected:
- **Name**: User's display name (required, shared)
- **Email**: Login (optional, encrypted)
- **Phone**: Login/OTP (optional, encrypted)
- **Audio**: Voice rooms (optional, not collected/stored after session)
- **Photos**: Profile avatar (optional, encrypted in transit)
- **User IDs**: Account ID
- **Purchase history**: In-app purchases

Data NOT collected: precise location, contacts, messages content (E2E encrypted)

## 9. Internal Testing Checklist

- [ ] App installs and opens
- [ ] Login/Register works
- [ ] Voice room join/leave works
- [ ] Gift sending works
- [ ] Coin purchase completes
- [ ] Notifications arrive
- [ ] Profile edit saves
- [ ] Settings save
- [ ] Logout clears session

## 10. Production Release Checklist

- [ ] Version code incremented
- [ ] AAB built with release signing
- [ ] ProGuard enabled (minifyEnabled true)
- [ ] API_BASE_URL points to production
- [ ] Crash reporting configured
- [ ] All secrets removed from code
- [ ] Privacy policy URL live
- [ ] Play Console content rating completed
- [ ] Target audience set (18+)
- [ ] App bundle tested on physical device
