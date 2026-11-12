"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

type NewOrder = {
  id: string;
  order_number: number;
  customer_name: string;
  customer_phone: string;
  total: number;
  fulfillment: string;
  created_at: string;
};

export default function AdminOrderNotifications() {
  const router = useRouter();
  const [orders, setOrders] = useState<NewOrder[]>([]);
  const [unread, setUnread] = useState(0);
  const [toasts, setToasts] = useState<NewOrder[]>([]);
  const [open, setOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [connection, setConnection] = useState<"connecting" | "live" | "offline">("connecting");
  const soundRef = useRef(false);
  const audioRef = useRef<AudioContext | null>(null);
  const seenRef = useRef(new Set<string>());

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) {
      setConnection("offline");
      return;
    }

    const supabase = createBrowserClient(url, key);
    const channel = supabase
      .channel("admin-live-order-alerts")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (payload) => {
        const order = payload.new as NewOrder;
        if (!order?.id || seenRef.current.has(order.id)) return;
        seenRef.current.add(order.id);
        setOrders((current) => [order, ...current].slice(0, 30));
        setUnread((current) => current + 1);
        setToasts((current) => [order, ...current].slice(0, 2));
        window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== order.id)), 7000);
        router.refresh();

        if (soundRef.current) {
          try {
            const AudioContextClass = window.AudioContext;
            const audio = audioRef.current ?? new AudioContextClass();
            audioRef.current = audio;
            void audio.resume().then(() => {
              const start = audio.currentTime;
              [0, 0.19, 0.38].forEach((offset, index) => {
                const oscillator = audio.createOscillator();
                const gain = audio.createGain();
                oscillator.type = "sine";
                oscillator.frequency.value = [880, 1174, 988][index];
                gain.gain.setValueAtTime(0.0001, start + offset);
                gain.gain.exponentialRampToValueAtTime(0.16, start + offset + 0.025);
                gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.15);
                oscillator.connect(gain);
                gain.connect(audio.destination);
                oscillator.start(start + offset);
                oscillator.stop(start + offset + 0.16);
              });
            });
          } catch (error) {
            console.warn("[admin notifications] Audio alert unavailable", error);
          }
        }

        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("طلب جديد | Chicken Factor", {
            body: `طلب #${order.order_number} من ${order.customer_name || order.customer_phone} — ${Number(order.total || 0).toLocaleString("ar-EG")} جنيه`,
            tag: order.id,
          });
        }
      })
      .subscribe((status) => {
        setConnection(status === "SUBSCRIBED" ? "live" : status === "CHANNEL_ERROR" || status === "TIMED_OUT" ? "offline" : "connecting");
      });

    return () => {
      void supabase.removeChannel(channel);
      if (audioRef.current && audioRef.current.state !== "closed") void audioRef.current.close();
    };
  }, [router]);

  async function toggleSound() {
    if (!soundEnabled) {
      try {
        const audio = audioRef.current ?? new window.AudioContext();
        audioRef.current = audio;
        await audio.resume();
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        oscillator.frequency.value = 880;
        gain.gain.value = 0.08;
        oscillator.connect(gain);
        gain.connect(audio.destination);
        oscillator.start();
        oscillator.stop(audio.currentTime + 0.12);
        soundRef.current = true;
        setSoundEnabled(true);
        if ("Notification" in window && Notification.permission === "default") {
          void Notification.requestPermission();
        }
      } catch {
        setSoundEnabled(false);
        soundRef.current = false;
      }
    } else {
      soundRef.current = false;
      setSoundEnabled(false);
    }
  }

  const money = (value: number) => new Intl.NumberFormat("ar-EG", { style: "currency", currency: "EGP", maximumFractionDigits: 0 }).format(Number(value || 0));

  return (
    <div className="admin-order-alerts">
      <span className={`admin-live-status ${connection}`} title={connection === "live" ? "الاتصال المباشر يعمل" : connection === "connecting" ? "جاري الاتصال" : "الاتصال المباشر غير متاح"}>
        <i />{connection === "live" ? "مباشر" : connection === "connecting" ? "اتصال..." : "غير متصل"}
      </span>
      <button type="button" className={`admin-sound-toggle ${soundEnabled ? "enabled" : ""}`} onClick={toggleSound} aria-pressed={soundEnabled} title={soundEnabled ? "إيقاف صوت التنبيه" : "تفعيل صوت التنبيه"}>
        <span aria-hidden="true">{soundEnabled ? "♫" : "♪"}</span><small>{soundEnabled ? "الصوت يعمل" : "تفعيل الصوت"}</small>
      </button>
      <button type="button" className="admin-notification-trigger" aria-label={`الإشعارات، ${unread} طلب جديد`} aria-expanded={open} onClick={() => { setOpen((value) => !value); setUnread(0); }}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
        {unread > 0 ? <b>{unread > 99 ? "99+" : unread}</b> : null}
      </button>
      {open ? (
        <>
          <button className="admin-notification-scrim" aria-label="إغلاق الإشعارات" onClick={() => setOpen(false)} />
          <section className="admin-notification-popover" dir="rtl">
            <header><div><strong>الطلبات الجديدة</strong><small>{orders.length ? `${orders.length} طلب وصل أثناء فتح اللوحة` : "ستظهر الطلبات الجديدة هنا فور وصولها"}</small></div><button type="button" onClick={() => setOpen(false)} aria-label="إغلاق">×</button></header>
            <div className="admin-notification-list">
              {orders.length ? orders.map((order) => (
                <a href="/admin/orders" className="admin-notification-item" key={order.id} onClick={() => setOpen(false)}>
                  <span className="admin-notification-icon">🍗</span>
                  <span className="admin-notification-copy"><strong>طلب جديد #{order.order_number}</strong><small>{order.customer_name || order.customer_phone} · {order.fulfillment === "delivery" ? "توصيل" : "استلام من الفرع"}</small><small>{new Date(order.created_at).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}</small></span>
                  <b>{money(order.total)}</b>
                </a>
              )) : <div className="admin-notification-empty"><span>🔔</span><strong>مفيش طلبات جديدة لسه</strong><small>سيب لوحة الإدارة مفتوحة وهيوصلك تنبيه لحظي عند وصول أي طلب.</small></div>}
            </div>
            <footer><a href="/admin/orders" onClick={() => setOpen(false)}>عرض كل الطلبات <span>←</span></a></footer>
          </section>
        </>
      ) : null}
      {toasts.map((order) => (
        <a href="/admin/orders" className="admin-order-toast" key={order.id}>
          <span>🍗</span><div><strong>طلب جديد #{order.order_number}</strong><small>{order.customer_name || order.customer_phone} · {money(order.total)}</small></div>
        </a>
      ))}
    </div>
  );
}
