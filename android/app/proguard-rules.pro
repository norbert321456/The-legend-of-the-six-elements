# A jatek logikaja JavaScriptben fut, a natv reteg csak a WebView-t inditja.
# A JS-bol hivott hidat meg kell tartani.
-keepclassmembers class hu.legendofthesixelements.game.** {
    @android.webkit.JavascriptInterface <methods>;
}
