# Install Photo Alarm On iPhone Or iPad

## Serve Over HTTPS

Open the app from `https://` or a local dev server. File URLs break camera access and service worker caching.

## Add To Home Screen

1. Open the app URL in Safari.
2. Tap Share → Add to Home Screen.
3. Name it `Photo Alarm` and tap Add.

## Overnight Bluetooth Setup

1. Connect your Bluetooth speaker before bed.
2. Open Photo Alarm from the Home Screen icon.
3. Arm at least one alarm.
4. In Settings, enable **Keep audio session active overnight**.
5. Tap **Test alarm** once to unlock audio through the speaker.
6. Leave the app open in the foreground (screen may dim).
7. Plug in the device and disable Low Power Mode.

## Debug If An Alarm Misses

1. Enable **Show debug log** in Settings.
2. Review watchdog, visibility, and keep-alive events after waking.
3. Export the log for troubleshooting.

## Limitation

iOS may suspend or kill web apps in the background. This app recovers on resume, but it cannot guarantee on-time ringing if the app is closed overnight. Keep the installed PWA open for best results.
