package com.example.app

import com.getcapacitor.BridgeActivity
import com.getcapacitor.Plugin
import android.os.Bundle

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(BankNotificationListenerPlugin::class.java)
        super.onCreate(savedInstanceState)
    }
}
