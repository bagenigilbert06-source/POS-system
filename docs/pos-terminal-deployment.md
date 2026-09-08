# POS terminal deployment

For dedicated 4:3 POS hardware with a 1024×768 display, use the following
terminal configuration:

- Windows display scaling: 100%
- Chrome site zoom for the POS origin: 75%
- Chrome fullscreen or kiosk mode

This is an installation setting for that hardware class, not an application
wide scaling rule. Larger desktop monitors should remain at Chrome 100%.

The POS application does not force browser zoom and does not use CSS or
transform scaling. Browser zoom only changes the browser viewport; payment,
scanner, dialogs, receipts, QZ Tray, and thermal printing continue to use their
normal application/device APIs.

Before a physical pilot, verify the POS at 1024×768 with Chrome zoom 75% and
67%, then confirm standard 1366×768 and 1920×1080 displays at Chrome 100%.
