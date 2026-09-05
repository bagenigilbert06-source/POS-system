# Barcode scanner setup

Use a retail barcode scanner in USB HID keyboard mode, a wireless USB-dongle HID mode, or Bluetooth HID keyboard mode. Configure the scanner to append an **Enter/CR suffix** after each scan.

```text
Barcode scanner -> HID keyboard input -> Browser POS
```

No camera permission, phone pairing, browser device API, driver integration, or QZ Tray is required for barcode scanning. QZ Tray is only used for direct receipt-printer and cash-drawer printing.

## Product registration

Focus the **Barcode** field, scan the item, then complete the remaining fields and save normally. The scan never submits the product form. Barcodes remain strings, preserving leading zeroes.

## POS checkout

With no text field or checkout dialog active, scan an item from anywhere in POS. The scanner's Enter suffix completes the scan and adds the exact matching active product or package to the basket. Repeated scans follow the normal basket quantity rules.

Manual product search, SKU search, barcode typing, and product-card selection continue to work if the scanner is unavailable.

## Hardware acceptance

1. Plug in the scanner and verify in Notepad that it types a barcode followed by Enter.
2. Scan a product in POS, repeat it, then scan several different products quickly.
3. Scan an unknown barcode and confirm a useful error appears.
4. Focus the product Barcode field, scan, and verify it fills without saving the form.
5. Unplug the scanner and verify manual POS search still works.
