package com.rivalsintel.tv

import android.app.Activity
import android.os.Bundle
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.Bitmap
import android.util.Base64
import android.view.Gravity
import android.view.KeyEvent
import android.view.View
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.EditText
import android.widget.Button
import android.widget.ImageView
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import android.widget.ScrollView
import android.widget.Toast
import org.json.JSONObject
import com.google.zxing.BarcodeFormat
import com.google.zxing.MultiFormatWriter
import com.google.zxing.common.BitMatrix
import java.net.HttpURLConnection
import java.net.URL
import java.io.OutputStreamWriter
import java.util.concurrent.Executors

class MainActivity : Activity() {
    private val bg = Color.rgb(9,11,18)
    private val purple = Color.rgb(168,117,255)
    private val white = Color.rgb(244,245,250)
    private val muted = Color.rgb(145,151,170)
    private val io = Executors.newSingleThreadExecutor()
    private lateinit var root: LinearLayout
    private var pairingCode = ""
    private var deviceCode = ""
    private var pollDelay = 5000L
    private var stopped = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_FULLSCREEN or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        renderWelcome()
        startPairing()
    }

    private fun baseLayout(): LinearLayout {
        return LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(56, 28, 56, 28)
            setBackgroundColor(bg)
            isFocusable = true
            isFocusableInTouchMode = true
        }
    }

    private fun label(value: String, size: Float, color: Int = white, bold: Boolean = false): TextView =
        TextView(this).apply {
            text = value; textSize = size; setTextColor(color)
            if (bold) setTypeface(typeface, Typeface.BOLD)
            gravity = Gravity.CENTER
            setPadding(8, 8, 8, 8)
        }

    private fun renderWelcome() {
        root = baseLayout()
        root.addView(label("RIVALS INTEL", 18f, purple, true))
        root.addView(label("YOUR MARVEL RIVALS COMPANION", 34f, white, true))
        root.addView(label("Sign in with your phone to bring your player dashboard to the big screen.", 18f, muted))
        root.addView(label("Connecting securely…", 16f, purple), LinearLayout.LayoutParams(-1, -2).apply { topMargin = 24 })
        setContentView(root)
    }

    private fun startPairing() {
        if (BuildConfig.API_BASE_URL.contains("YOUR-RIVALS-INTEL")) {
            runOnUiThread { showMessage("TV app built successfully. Add your Rivals Intel API URL in apps/tv/app/build.gradle.kts to enable account pairing.") }
            return
        }
        io.execute {
            try {
                val data = request("/api/device/authorise", JSONObject().put("deviceName", "Rivals Intel TV"))
                deviceCode = data.getString("deviceCode")
                pairingCode = data.getString("userCode")
                pollDelay = data.optInt("interval", 5).coerceAtLeast(2) * 1000L
                val qrData = data.getString("qrCodeDataUrl").substringAfter("base64,")
                val bytes = Base64.decode(qrData, Base64.DEFAULT)
                val bitmap = android.graphics.BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
                runOnUiThread { showPairing(bitmap) }
                poll()
            } catch (e: Exception) {
                runOnUiThread { showMessage("Couldn't start sign-in. Check the API address and server.\n\n" + e.message) }
            }
        }
    }

    private fun showPairing(bitmap: Bitmap) {
        root.removeAllViews()
        root.addView(label("RIVALS INTEL TV", 18f, purple, true))
        root.addView(label("LINK YOUR TV", 32f, white, true))
        val row = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER; setPadding(0, 18, 0, 18) }
        row.addView(ImageView(this).apply { setImageBitmap(bitmap); layoutParams = LinearLayout.LayoutParams(260, 260) })
        val info = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; gravity = Gravity.CENTER; setPadding(34, 0, 0, 0) }
        info.addView(label("SCAN WITH YOUR PHONE", 17f, muted, true))
        info.addView(label(pairingCode, 38f, white, true))
        info.addView(label("Or open your Rivals Intel account and enter this code.\nThe code expires after 10 minutes.", 15f, muted))
        row.addView(info)
        root.addView(row)
        root.addView(label("Your password is never entered on this TV.", 14f, purple))
        root.requestFocus()
    }

    private fun showMessage(message: String) {
        root.removeAllViews()
        root.addView(label("RIVALS INTEL", 20f, purple, true))
        root.addView(label(message, 18f, white))
        val retry = label("RETRY", 18f, white, true).apply {
            isFocusable = true
            setBackgroundColor(Color.rgb(45,35,65))
            setPadding(36, 18, 36, 18)
            setOnClickListener { renderWelcome(); startPairing() }
        }
        root.addView(retry)
        retry.requestFocus()
    }

    private fun poll() {
        while (!stopped && deviceCode.isNotEmpty()) {
            try {
                val result = request("/api/device/poll", JSONObject().put("deviceCode", deviceCode))
                if (result.optString("status") == "complete") {
                    val token = result.optString("token")
                    val masterKey = MasterKey.Builder(this).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build()
                    val securePrefs = EncryptedSharedPreferences.create(
                        this,
                        "rivals-intel-secure",
                        masterKey,
                        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
                    )
                    securePrefs.edit().putString("session_token", token).apply()
                    runOnUiThread { showDashboard() }
                    return
                }
            } catch (_: Exception) { }
            try { Thread.sleep(pollDelay) } catch (_: InterruptedException) { return }
        }
    }

    private lateinit var playerInput: EditText
    private lateinit var resultPanel: TextView

    private fun showDashboard() {
        root = baseLayout()
        root.gravity = Gravity.TOP
        root.addView(label("RIVALS INTEL", 18f, purple, true))
        root.addView(label("PLAYER INTELLIGENCE", 30f, white, true))
        root.addView(label("Your TV is securely linked. Search a Marvel Rivals player to view their available profile data and completed match history.", 15f, muted))
        playerInput = EditText(this).apply {
            hint = "Enter in-game player name or UID"
            setHintTextColor(muted)
            setTextColor(white)
            textSize = 18f
            singleLine = true
            setPadding(18, 14, 18, 14)
            isFocusable = true
            isFocusableInTouchMode = true
        }
        root.addView(playerInput, LinearLayout.LayoutParams(-1, -2).apply { topMargin = 22 })
        val actions = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER; setPadding(0, 10, 0, 10) }
        val search = Button(this).apply {
            text = "SEARCH PLAYER"
            isFocusable = true
            setOnClickListener { loadPlayer(false) }
        }
        val history = Button(this).apply {
            text = "MATCH HISTORY"
            isFocusable = true
            setOnClickListener { loadPlayer(true) }
        }
        actions.addView(search)
        actions.addView(history)
        root.addView(actions)
        resultPanel = label("Enter a player name above to get started.", 15f, muted)
        resultPanel.gravity = Gravity.TOP or Gravity.START
        root.addView(ScrollView(this).apply {
            isFillViewport = true
            addView(resultPanel)
        }, LinearLayout.LayoutParams(-1, 0, 1f))
        root.addView(label("Only public profile data and completed match history are requested. No live match telemetry or game-process access.", 11f, muted))
        setContentView(root)
        playerInput.requestFocus()
    }

    private fun loadPlayer(history: Boolean) {
        val query = playerInput.text.toString().trim()
        if (query.isEmpty()) {
            Toast.makeText(this, "Enter a player name or UID first.", Toast.LENGTH_SHORT).show()
            playerInput.requestFocus()
            return
        }
        resultPanel.text = if (history) "Loading completed match history…" else "Loading player profile…"
        io.execute {
            try {
                val encoded = java.net.URLEncoder.encode(query, "UTF-8")
                val path = if (history) "/api/player/$encoded/match-history" else "/api/player/$encoded"
                val result = requestGet(path)
                val pretty = result.toString(2)
                runOnUiThread { resultPanel.text = pretty.take(6500) }
            } catch (e: Exception) {
                runOnUiThread { resultPanel.text = "Couldn't load this data. Check the API connection and player name.\n\n" + (e.message ?: "Unknown error") }
            }
        }
    }

    private fun requestGet(path: String): JSONObject {
        val prefs = getSharedPreferences("rivals-intel-secure", MODE_PRIVATE)
        val connection = (URL(BuildConfig.API_BASE_URL.trimEnd('/') + path).openConnection() as HttpURLConnection)
        connection.requestMethod = "GET"
        connection.connectTimeout = 12000
        connection.readTimeout = 15000
        connection.setRequestProperty("Accept", "application/json")
        connection.setRequestProperty("Authorization", "Bearer " + (prefs.getString("session_token", "") ?: ""))
        val code = connection.responseCode
        val stream = if (code in 200..299) connection.inputStream else connection.errorStream
        val response = stream.bufferedReader().use { it.readText() }
        connection.disconnect()
        if (code !in 200..299) throw IllegalStateException(response)
        return JSONObject(response)
    }

    private fun request(path: String, body: JSONObject): JSONObject {
        val connection = (URL(BuildConfig.API_BASE_URL.trimEnd('/') + path).openConnection() as HttpURLConnection)
        connection.requestMethod = "POST"
        connection.connectTimeout = 12000
        connection.readTimeout = 12000
        connection.doOutput = true
        connection.setRequestProperty("Content-Type", "application/json")
        connection.setRequestProperty("Accept", "application/json")
        connection.setRequestProperty("X-RI-Client", "native")
        OutputStreamWriter(connection.outputStream).use { it.write(body.toString()) }
        val stream = if (connection.responseCode in 200..299) connection.inputStream else connection.errorStream
        val response = stream.bufferedReader().use { it.readText() }
        if (connection.responseCode !in 200..299) throw IllegalStateException(response)
        connection.disconnect()
        return JSONObject(response)
    }

    override fun onDestroy() { stopped = true; io.shutdownNow(); super.onDestroy() }
    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_BACK) { finish(); return true }
        return super.onKeyDown(keyCode, event)
    }
}
