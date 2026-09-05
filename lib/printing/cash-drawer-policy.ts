export type AutomaticDrawerContext = {
  paymentMethod: string;
  saleStatus: string;
  printingMode: 'direct' | 'browser';
  cashDrawerPulseEnabled: boolean;
  isOfflineProvisional?: boolean;
  isReprint?: boolean;
  isRefund?: boolean;
  isTestPrint?: boolean;
  isSplitPayment?: boolean;
  hasActiveRegisteredTerminal?: boolean;
  hasOpenShift?: boolean;
};

/** Drawer pulses are deliberately deny-by-default. */
export function canAutomaticallyOpenCashDrawer(
  context: AutomaticDrawerContext
) {
  return (
    context.paymentMethod === 'cash' &&
    context.saleStatus === 'completed' &&
    context.printingMode === 'direct' &&
    context.cashDrawerPulseEnabled &&
    !context.isOfflineProvisional &&
    !context.isReprint &&
    !context.isRefund &&
    !context.isTestPrint &&
    !context.isSplitPayment &&
    context.hasActiveRegisteredTerminal !== false &&
    context.hasOpenShift !== false
  );
}
