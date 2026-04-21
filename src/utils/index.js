import { format, isValid } from 'date-fns'

export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return 'KES 0.00'
  return `KES ${Number(amount).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// export const formatDateTime = (date) => {
//   if (!date) return ''
//   const d = new Date(typeof date === 'string' && !date.includes('Z') && date.includes('T') ? date + 'Z' : date)
//   return isValid(d) ? format(d, 'dd MMM yyyy, HH:mm') : '—'
// }
export const formatDateTime = (date) => {
  if (!date) return '—'
  try {
    return new Date(date).toLocaleString()
  } catch {
    return '—'
  }
}

export const formatTime = (date) => {
  if (!date) return ''
  const d = new Date(typeof date === 'string' && !date.includes('Z') && date.includes('T') ? date + 'Z' : date)
  return isValid(d) ? format(d, 'HH:mm') : '—'
}

export const statusLabel = (status) => {
  const map = {
    pending: 'Pending', confirmed: 'Confirmed', preparing: 'Preparing',
    ready: 'Ready', assigned: 'Assigned', picked_up: 'Picked Up',
    in_transit: 'In Transit', delivered: 'Delivered', cancelled: 'Cancelled'
  }
  return map[status] || status
}

export const haversineDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

export const generateOrderNumber = () => 'POA-' + Date.now().toString().slice(-6)

// Distance is always Haversine (no API key needed)
// For production, swap with OSRM free routing API
export const getRoadDistance = async (origin, destination) => {
  // Try OSRM free routing API (no key required)
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=false`
    const res = await fetch(url)
    const data = await res.json()
    if (data.code === 'Ok' && data.routes?.[0]) {
      return {
        distance_km:   data.routes[0].distance / 1000,
        duration_mins: data.routes[0].duration / 60,
        source: 'osrm',
      }
    }
  } catch (_) { /* fall through to Haversine */ }

  // Fallback: Haversine straight-line
  return {
    distance_km:   haversineDistance(origin.lat, origin.lng, destination.lat, destination.lng),
    duration_mins: null,
    source: 'haversine',
  }
}
