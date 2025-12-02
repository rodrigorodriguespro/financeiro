package com.example.app

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import com.getcapacitor.Plugin
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "BankNotificationListener")
class BankNotificationListenerPlugin : Plugin() {
    companion object {
        var instance: BankNotificationListenerPlugin? = null
    }

    override fun load() {
        super.load()
        instance = this
    }

    override fun handleOnDestroy() {
        super.handleOnDestroy()
        instance = null
    }

    fun emitNotification(pkg: String, title: String?, text: String?, amount: Double?, merchant: String?) {
        val data = mapOf(
            "package" to pkg,
            "title" to (title ?: ""),
            "text" to (text ?: ""),
            "amount" to amount,
            "merchant" to merchant,
        )
        notifyListeners("bankNotification", data)
    }
}

class BankNotificationListenerService : NotificationListenerService() {
    private val bankPackages = setOf(
        "com.nu.production", // Nubank
        "com.nu.bank",       // Nubank alternate
        "com.picpay",        // PicPay
        "br.com.bb.android", // Banco do Brasil
        "com.itau",          // Itaú
        "br.com.bradesco",   // Bradesco
        "com.santander.app", // Santander
        "com.mercadopago.wallet",
        "com.mercadopago.android"
    )

    override fun onListenerConnected() {
        super.onListenerConnected()
        Log.d("BankNL", "Notification listener connected")
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        super.onNotificationPosted(sbn)
        val n = sbn ?: return
        val pkg = n.packageName ?: return
        if (!bankPackages.contains(pkg)) return

        val extras = n.notification.extras
        val title = extras?.getString(Notification.EXTRA_TITLE) ?: ""
        val text = extras?.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""

        val body = "$title $text"
        val amount = extractAmount(body)
        val merchant = extractMerchant(text)

        BankNotificationListenerPlugin.instance?.emitNotification(pkg, title, text, amount, merchant)
    }

    private fun extractAmount(body: String): Double? {
        val regex = Regex("R\\$\\s?([0-9\\.]+,\\d{2})")
        val match = regex.find(body) ?: return null
        val value = match.groupValues.getOrNull(1)?.replace(".", "")?.replace(",", ".")
        return value?.toDoubleOrNull()
    }

    private fun extractMerchant(text: String): String? {
        // Heurística simples: parte do texto após o valor
        val parts = text.split(" ")
        val idx = parts.indexOfFirst { it.contains("R$") }
        if (idx != -1 && idx + 1 < parts.size) {
            return parts.drop(idx + 1).joinToString(" ").trim()
        }
        return null
    }
}
