# Thermal receipt-printer hardware acceptance

Recommended hardware: an ESC/POS-compatible 80 mm thermal printer with Windows support, USB (and preferably Ethernet), an automatic cutter, and a `DK` / `CASH DRAWER` RJ11/RJ12 port. The drawer connects to the printer, not the browser or PC.

Primary architecture:

```text
POS browser -> QZ Tray -> configured Windows thermal printer -> receipt / cash-drawer port
```

Raw TCP is only suitable when the deployed backend can safely reach the shop-local approved printer endpoint. It is not the normal cloud-hosted setup.

## Acceptance checklist

1. Install the printer in Windows and run its Windows/self-test page.
2. Install and start QZ Tray on the cashier PC.
3. In **Admin → POS devices**, configure the exact Windows/QZ printer name, 80 mm paper, and auto-print.
4. Run **Test printer**; it must not create a sale or open the drawer.
5. Complete a cash sale: one saved sale, one receipt, one drawer open.
6. Complete M-Pesa and card sales: receipts print; drawer remains closed.
7. Reprint the cash receipt: it prints with the original receipt number; drawer remains closed.
8. Stop QZ Tray and complete a sale: the sale remains valid, a useful error appears, and no later automatic job is replayed.
9. Restart QZ Tray and use **Retry receipt**: the original receipt prints once.
10. Test double-clicking sale completion, unplugged printer, paper-out, long names, large baskets, cutter behavior, and a browser/PC restart.

Do not mark thermal printing production-ready until this checklist passes on the actual cashier hardware.
