export type TransferLotBalance = { id: string; dispatched: number; received: number; rejected: number }

/** Deterministically distributes a partial transfer receipt over its immutable
 * source-batch trace. Received units are assigned first, then rejected units. */
export function planTransferLotReceipt(lots: TransferLotBalance[], receivedQuantity: number, rejectedQuantity: number) {
  if (![receivedQuantity, rejectedQuantity].every((value) => Number.isSafeInteger(value) && value >= 0) || receivedQuantity + rejectedQuantity <= 0) throw new Error('Transfer receipt quantities must be positive whole numbers')
  let receiveRemaining = receivedQuantity; let rejectRemaining = rejectedQuantity
  const updates: Array<{ id: string; received: number; rejected: number }> = []
  for (const lot of lots) {
    const available = lot.dispatched - lot.received - lot.rejected
    if (available < 0) throw new Error('Transfer batch trace is inconsistent')
    if (!available) continue
    const received = Math.min(receiveRemaining, available)
    const rejected = Math.min(rejectRemaining, available - received)
    if (received || rejected) updates.push({ id: lot.id, received, rejected })
    receiveRemaining -= received; rejectRemaining -= rejected
    if (!receiveRemaining && !rejectRemaining) break
  }
  if (receiveRemaining || rejectRemaining) throw new Error('Received quantities exceed the traced batches')
  return updates
}
