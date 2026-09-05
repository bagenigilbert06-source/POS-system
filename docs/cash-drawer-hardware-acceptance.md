# Cash drawer hardware acceptance

Use an ESC/POS receipt printer connected to the cashier PC through QZ Tray. Connect the drawer to the printer's `DK` / `CASH DRAWER` RJ11/RJ12 port; do not connect it to a phone or network socket.

Before testing, register the terminal, configure its exact direct-printer name, open a shift, and enable **Automatically open drawer after completed cash sales**.

- Complete one cash sale: one completed sale, one receipt, one drawer opening.
- Complete M-Pesa and card sales: receipts may print; drawer stays closed.
- Reprint the cash receipt, use browser print, and run a printer test: drawer stays closed.
- Process a refund: drawer stays closed automatically.
- Double-click a cash-sale completion: one sale, one receipt submission, one drawer pulse.
- Stop QZ Tray, then complete a cash sale: sale, inventory, payment, and shift totals remain correct; cashier sees a printer/drawer warning.
- As an authorized manager, use **Open cash drawer**, enter a meaningful reason, and confirm: drawer opens once, no receipt or sale is created, and audit events are present.
- Attempt manual opening as an unauthorized cashier and with a closed shift: both are rejected.
- Disconnect and reconnect QZ Tray/printer: no historical or stale sale opens the drawer.

The physical key is emergency hardware access and is not recorded by the POS. Normal software openings should use the manual POS control for auditability.
