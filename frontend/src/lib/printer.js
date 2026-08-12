// Receipt printing over ESC/POS thermal printers.
// - Mobile: Web Bluetooth (Chrome/Edge on Android; NOT supported on
//   iOS Safari — a real hardware constraint, not a bug, worth knowing
//   before buying printers for iPhone-carrying staff).
// - Desktop: Web Serial (Chrome/Edge desktop, USB/cable connection).
//
// Both are real browser APIs requiring a user gesture (a button click)
// to open the device picker — can't be triggered automatically.

const ESC = 0x1b
const GS = 0x1d

function textEncoder() {
  return new TextEncoder()
}

// Builds a basic ESC/POS byte sequence for a receipt.
export function buildReceiptBytes({ businessName, branchName, tableLabel, lines, subtotal, vat, total, naira }) {
  const enc = textEncoder()
  const chunks = []

  const push = (str) => chunks.push(enc.encode(str))
  const raw = (...bytes) => chunks.push(new Uint8Array(bytes))

  raw(ESC, 0x40) // initialize printer
  raw(ESC, 0x61, 0x01) // center align
  push(`${businessName}\n`)
  push(`${branchName}\n`)
  push('--------------------------------\n')
  raw(ESC, 0x61, 0x00) // left align
  push(`${tableLabel}\n\n`)

  for (const line of lines) {
    push(`${line.name} x${line.qty}\n`)
    push(`  ${naira(line.lineTotal)}\n`)
  }

  push('--------------------------------\n')
  push(`Subtotal: ${naira(subtotal)}\n`)
  push(`VAT: ${naira(vat)}\n`)
  raw(ESC, 0x21, 0x10) // double height for total
  push(`TOTAL: ${naira(total)}\n`)
  raw(ESC, 0x21, 0x00) // reset text size
  push('\n')
  raw(ESC, 0x61, 0x01) // center
  push('Thank you!\n')
  push('Powered by Sellaris\n\n\n')
  raw(GS, 0x56, 0x00) // cut paper

  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0)
  const merged = new Uint8Array(totalLength)
  let offset = 0
  for (const c of chunks) {
    merged.set(c, offset)
    offset += c.length
  }
  return merged
}

// Standard printer service UUIDs vary by manufacturer; this is a
// commonly used generic serial service UUID pattern for ESC/POS
// Bluetooth printers. Real hardware may need its UUID substituted here.
const PRINTER_SERVICE_UUID = '000018f0-0000-1000-8000-00805f9b34fb'
const PRINTER_CHARACTERISTIC_UUID = '00002af1-0000-1000-8000-00805f9b34fb'

export async function printViaBluetooth(bytes) {
  if (!navigator.bluetooth) {
    throw new Error('Web Bluetooth is not supported on this browser/device. Try Chrome on Android, or use a cable connection instead.')
  }
  const device = await navigator.bluetooth.requestDevice({
    filters: [{ services: [PRINTER_SERVICE_UUID] }],
  })
  const server = await device.gatt.connect()
  const service = await server.getPrimaryService(PRINTER_SERVICE_UUID)
  const characteristic = await service.getCharacteristic(PRINTER_CHARACTERISTIC_UUID)

  // Bluetooth characteristics have a small MTU — chunk the payload.
  const CHUNK_SIZE = 180
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    await characteristic.writeValue(bytes.slice(i, i + CHUNK_SIZE))
  }
}

export async function printViaSerial(bytes) {
  if (!navigator.serial) {
    throw new Error('Web Serial is not supported on this browser. Use Chrome or Edge on desktop.')
  }
  const port = await navigator.serial.requestPort()
  await port.open({ baudRate: 9600 })
  const writer = port.writable.getWriter()
  await writer.write(bytes)
  writer.releaseLock()
  await port.close()
}
