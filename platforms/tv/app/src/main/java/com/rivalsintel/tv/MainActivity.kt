package com.rivalsintel.tv

import android.app.Activity
import android.graphics.Color
import android.graphics.Typeface
import android.os.Bundle
import android.view.Gravity
import android.view.KeyEvent
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

class MainActivity : Activity() {
    private lateinit var root: LinearLayout
    private var page = 0
    private val purple = Color.rgb(155, 107, 255)
    private fun text(value: String, size: Float, color: Int = Color.WHITE): TextView =
        TextView(this).apply { text = value; textSize = size; setTextColor(color); setPadding(12, 10, 12, 10) }
    private fun button(value: String, action: () -> Unit): Button =
        Button(this).apply { text = value; textSize = 18f; isFocusable = true; isFocusableInTouchMode = true; setOnClickListener { action() } }
    override fun onCreate(savedInstanceState: Bundle?) { super.onCreate(savedInstanceState); render() }
    private fun render() {
        root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL; setPadding(56, 34, 56, 34); setBackgroundColor(Color.rgb(9,11,18))
            gravity = Gravity.CENTER_VERTICAL
        }
        root.addView(text("RIVALS  INTEL", 18f, purple))
        root.addView(text(if (page == 0) "Your battlefield, on the big screen." else "Connect your Rivals Intel account", 34f))
        root.addView(text(if (page == 0) "TV EDITION  •  PLAYER INTELLIGENCE" else "Open Rivals Intel on your phone, choose Account → Devices → Scan TV QR Code, then approve this TV.", 18f, Color.LTGRAY))
        if (page == 0) {
            root.addView(text("PLAYER OVERVIEW", 22f, purple))
            root.addView(text("Sign in to view your player profile, hero performance and match history.", 20f, Color.LTGRAY))
            root.addView(button("SIGN IN WITH PHONE") { page = 1; render() })
            root.addView(button("EXPLORE DEMO") { page = 2; render() })
        } else if (page == 1) {
            root.addView(text("PAIRING READY", 26f, purple))
            root.addView(text("TV QR pairing requires the Rivals Intel account service to be deployed.\n\nFor now, this TV build is a navigation and remote-control prototype. No password is requested on the TV.", 20f, Color.LTGRAY))
            root.addView(button("BACK") { page = 0; render() })
        } else {
            root.addView(text("DEMO PLAYER", 24f, purple))
            root.addView(text("BUCKWELLBARNES     RANK: SILVER\n\nWIN RATE       54%\nK/D RATIO      2.14\nWINS              128\nMATCHES        236\n\nTOP HEROES\nBucky  •  Spider-Man  •  Captain America", 23f, Color.LTGRAY))
            root.addView(button("BACK") { page = 0; render() })
        }
        setContentView(root)
        root.findViewWithTag<View>("focus")?.requestFocus()
        root.getChildAt(if (page == 0) 4 else 3)?.requestFocus()
    }
    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_BACK && page != 0) { page = 0; render(); return true }
        return super.onKeyDown(keyCode, event)
    }
}
