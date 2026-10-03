import { useState } from 'react'
import { apiFetch } from '../../../lib/api'

type SubscriptionState = 'idle' | 'requesting' | 'subscribed' | 'denied' | 'error'

export function usePushSubscription({ token }: { token?: string }) {
  const [state, setState] = useState<SubscriptionState>('idle')

  async function subscribe() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState('error')
      return
    }

    setState('requesting')

    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setState('denied')
        return
      }

      const registration = await navigator.serviceWorker.ready
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey).buffer as ArrayBuffer,
      })

      const subscriptionJson = subscription.toJSON()

      await apiFetch('/api/v1/push-subscriptions', {
        method: 'POST',
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: subscriptionJson.keys,
        }),
        token,
      })

      setState('subscribed')
    } catch {
      setState('error')
    }
  }

  return { state, subscribe }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}
