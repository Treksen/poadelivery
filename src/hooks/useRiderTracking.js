import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const PING_INTERVAL = 20000  // 20 seconds

export function useRiderTracking(orderId, autoStart = false) {
  const [isTracking, setIsTracking] = useState(false)
  const [polyline, setPolyline]     = useState([])
  const [currentPos, setCurrentPos] = useState(null)
  const [pingCount, setPingCount]   = useState(0)
  const [error, setError]           = useState(null)
  const intervalRef = useRef(null)
  const watchRef    = useRef(null)
  const posRef      = useRef(null)
  const startedRef  = useRef(false)

  const sendPing = useCallback(async () => {
    if (!posRef.current || !orderId) return
    const { lat, lng, speed, heading } = posRef.current
    try {
      await supabase.rpc('record_rider_ping', {
        p_order_id: orderId,
        p_lat:      lat,
        p_lng:      lng,
        p_speed:    speed ? speed * 3.6 : null,
        p_heading:  heading,
      })
      const point = { lat, lng, timestamp: new Date().toISOString() }
      setPolyline(p => [...p, point])
      setPingCount(p => p + 1)
    } catch (e) {
      console.warn('Ping failed:', e.message)
    }
  }, [orderId])

  const startTracking = useCallback(() => {
    if (startedRef.current || !orderId) return
    if (!navigator.geolocation) {
      setError('Geolocation not supported on this device')
      return
    }
    startedRef.current = true
    setIsTracking(true)
    setError(null)

    // Watch GPS continuously — update posRef on every fix
    watchRef.current = navigator.geolocation.watchPosition(
      pos => {
        const p = {
          lat:     pos.coords.latitude,
          lng:     pos.coords.longitude,
          speed:   pos.coords.speed,
          heading: pos.coords.heading,
        }
        posRef.current = p
        setCurrentPos(p)
      },
      err => {
        console.warn('GPS error:', err.message)
        setError(err.message)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 3000 }
    )

    // Send first ping after 2 seconds (let GPS warm up)
    setTimeout(() => sendPing(), 2000)

    // Then every 20 seconds
    intervalRef.current = setInterval(sendPing, PING_INTERVAL)
  }, [orderId, sendPing])

  const stopTracking = useCallback(() => {
    startedRef.current = false
    setIsTracking(false)
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    if (watchRef.current !== null) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null }
  }, [])

  // Auto-start if requested
  useEffect(() => {
    if (autoStart && orderId) startTracking()
    return () => stopTracking()
  }, [autoStart, orderId])

  return { isTracking, polyline, currentPos, pingCount, error, startTracking, stopTracking }
}

export function useOrderTracking(orderId) {
  const [riderPos, setRiderPos] = useState(null)
  const [polyline, setPolyline] = useState([])
  const [status, setStatus]     = useState(null)
  const [lastPing, setLastPing] = useState(null)

  useEffect(() => {
    if (!orderId) return

    // Fetch existing state
    supabase.from('orders')
      .select('rider_polyline,last_known_lat,last_known_lng,last_ping_at,status')
      .eq('id', orderId).single()
      .then(({ data }) => {
        if (!data) return
        setPolyline(data.rider_polyline || [])
        setStatus(data.status)
        setLastPing(data.last_ping_at)
        if (data.last_known_lat) setRiderPos({ lat: Number(data.last_known_lat), lng: Number(data.last_known_lng) })
      })

    // Live updates
    const ch = supabase.channel(`track-${orderId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'orders',
        filter: `id=eq.${orderId}`,
      }, ({ new: n }) => {
        if (n.last_known_lat) setRiderPos({ lat: Number(n.last_known_lat), lng: Number(n.last_known_lng) })
        if (n.rider_polyline)  setPolyline(n.rider_polyline)
        if (n.status)          setStatus(n.status)
        if (n.last_ping_at)    setLastPing(n.last_ping_at)
      })
      .subscribe()

    return () => supabase.removeChannel(ch)
  }, [orderId])

  const secsSince = lastPing
    ? Math.floor((Date.now() - new Date(lastPing).getTime()) / 1000)
    : null

  return {
    riderPos, polyline, status, lastPing,
    riderIsOnline: secsSince !== null && secsSince < 60,
  }
}
