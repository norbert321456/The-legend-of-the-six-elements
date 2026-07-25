package hu.legendofthesixelements.game;

import android.annotation.SuppressLint;
import android.app.AlertDialog;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.activity.OnBackPressedCallback;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import androidx.webkit.WebViewAssetLoader;

/**
 * Legend of the Six Elements – Android indito.
 *
 * A teljes jatek a game.html-ben fut. Azert nem file:// URL-rol toltjuk be,
 * mert azon a localStorage (a mentesek helye) egyes WebView-verziokban
 * megbizhatatlan. Helyette a WebViewAssetLoader egy rendes https origin
 * alatt szolgalja ki az assets/www mappat -> stabil, allando mentes.
 */
public class MainActivity extends AppCompatActivity {

    private static final String DOMAIN = "appassets.androidplatform.net";
    private static final String START_URL = "https://" + DOMAIN + "/www/game.html";

    private WebView web;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // vagott kijelzo (notch) alatt is rajzoljunk, a CSS env(safe-area-*) kezeli
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            getWindow().getAttributes().layoutInDisplayCutoutMode =
                    WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        }
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
                .setDomain(DOMAIN)
                .addPathHandler("/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);                    // localStorage = a jatek mentese
        s.setMediaPlaybackRequiresUserGesture(false);    // a menuzene azonnal indulhat
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setTextZoom(100);                              // a rendszer betumeret ne torzitsa a layoutot

        web.setBackgroundColor(0xFF0D0716);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setLongClickable(false);
        web.setOnLongClickListener(v -> true);           // ne jojjon elo a masolas-menu

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return loader.shouldInterceptRequest(request.getUrl());
            }
        });
        // kell a JS alert() / confirm() mukodesehez (pl. haladas torlese)
        web.setWebChromeClient(new WebChromeClient());
        web.addJavascriptInterface(new Bridge(this), "AndroidHost");

        setContentView(web);
        if (savedInstanceState == null) web.loadUrl(START_URL);
        else web.restoreState(savedInstanceState);

        immersive();

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                // a jatek maga dontse el, van-e mit bezarni (modal, nagyitas, kepernyo)
                web.evaluateJavascript(
                        "(window.__androidBack && window.__androidBack()) || 'exit'",
                        value -> {
                            if (value != null && value.contains("exit")) askExit();
                        });
            }
        });
    }

    private void askExit() {
        new AlertDialog.Builder(this)
                .setTitle(R.string.exit_title)
                .setMessage(R.string.exit_msg)
                .setNegativeButton(R.string.exit_no, null)
                .setPositiveButton(R.string.exit_yes, (d, w) -> finish())
                .show();
    }

    /** Teljes kepernyo: statusz- es navigacios sav elrejtese, huzasra elohozhato. */
    private void immersive() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat c =
                WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        c.hide(WindowInsetsCompat.Type.systemBars());
        c.setSystemBarsBehavior(
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) immersive();
    }

    @Override
    protected void onPause() {
        super.onPause();
        web.onPause();
        web.pauseTimers();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.resumeTimers();
        web.onResume();
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    protected void onDestroy() {
        if (web != null) {
            web.removeJavascriptInterface("AndroidHost");
            web.destroy();
        }
        super.onDestroy();
    }

    /** A game.html ezen keresztul szol a natv retegnek (publikusnak kell lennie). */
    public static class Bridge {
        private final MainActivity act;

        Bridge(MainActivity act) { this.act = act; }

        @JavascriptInterface
        public void exitApp() {
            act.runOnUiThread(act::finish);
        }

        @JavascriptInterface
        public boolean isAndroidApp() {
            return true;
        }
    }
}
