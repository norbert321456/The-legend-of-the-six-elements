# Android verzió

A játék teljes egésze a repo gyökerében lévő `game.html`-ben fut. Ez a mappa csak
egy vékony natív burkolat: egy teljes képernyős WebView, ami betölti a játékot.

**Nincs külön kód, amit karban kell tartani.** Ha a `game.html`-t módosítod, az
Android verzió is automatikusan frissül a következő buildnél.

## Hogyan készül az APK?

Nem kell semmit telepítened a gépedre. A GitHub Actions építi:

1. Töltsd fel a változásokat (`git push`).
2. GitHub → **Actions** fül → *Android APK keszitese* workflow.
3. Amikor lefutott (kb. 3–5 perc), az oldal alján az **Artifacts** résznél
   töltsd le a `The-Legend-of-the-Six-Elements-APK` fájlt.
4. Csomagold ki, másold a telefonra, és nyisd meg a fájlkezelőből.
   Az Android rá fog kérdezni, hogy engedélyezed-e az ismeretlen forrásból
   való telepítést – ez normális sideload esetén.

Ha `v`-vel kezdődő taget nyomsz fel (pl. `git tag v2.3.0 && git push --tags`),
az APK automatikusan felkerül a GitHub Releases oldalra is.

## Mit csinál a natív réteg?

| Feladat | Megoldás |
|---|---|
| Mentés (`localStorage`) | A `WebViewAssetLoader` egy rendes `https://appassets.androidplatform.net` origin alatt szolgálja ki a fájlokat. `file://`-ról a localStorage egyes eszközökön törlődhet. |
| Fekvő tájolás | `android:screenOrientation="sensorLandscape"` a manifestben. |
| Teljes képernyő | Immersive mód: a státusz- és navigációs sáv rejtve, lehúzásra előjön. |
| Vissza gomb | A natív réteg meghívja a `window.__androidBack()`-et a `game.html`-ben. Ez bezárja a legfelső ablakot/jelenetet; ha nincs mit bezárni, a rendszer rákérdez a kilépésre. |
| Kilépés gomb a menüben | `AndroidHost.exitApp()` hídon keresztül zárja be az appot. |
| Zene azonnali indulása | `setMediaPlaybackRequiresUserGesture(false)`. |
| Kijelző ne aludjon el | `FLAG_KEEP_SCREEN_ON`. |

## Méretezés telefonon

A játék 1400×860-as asztali ablakra készült. Telefonon nem méretezzük át az
elemeket egyesével – a `game.html` fejlécében egy rövid script a viewport
logikai szélességét állítja be úgy, hogy a képernyő magassága kb. **640 logikai
képpont** legyen. Így minden pontosan úgy néz ki, mint gépen, csak kisebben.

Ha a felirat túl kicsi a telefonodon, keresd meg a `game.html`-ben ezt a sort,
és csökkentsd az értéket (pl. 560-ra – ettől minden nagyobb lesz):

```js
var TARGET_H = 640;
```

Ezen felül a főmenü és a párbaj oldalsávja automatikusan beskálázódik, ha nem
férne el függőlegesen (`fitLayout()` a `game.html`-ben).

## Helyi build (opcionális)

Ha mégis a saját gépeden fordítanál, kell hozzá **JDK 17**, **Android SDK 34**
és **Gradle 8.7+**. Utána:

```bash
cd android
gradle assembleDebug
```

Az elkészült fájl: `android/app/build/outputs/apk/debug/app-debug.apk`

A `game.html` és az `assets/` mappa másolása automatikus (`copyWebAssets` task),
nem kell kézzel semmit áthelyezni.
