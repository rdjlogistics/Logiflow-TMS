import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { cn } from '@/lib/utils';
import React from 'react';

interface PrintButtonProps {
  /** Selector for the element to print. Defaults to entire page. */
  targetSelector?: string;
  /** Title to set in print window */
  title?: string;
  label?: string;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'outline' | 'ghost' | 'default';
  className?: string;
  /** Additional CSS injected into the print window */
  printStyles?: string;
}

const DEFAULT_PRINT_STYLES = `
  @page { margin: 15mm; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 12px; color: #000; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
  th { background: #f5f5f5; font-weight: 600; }
  .no-print, button, [data-no-print] { display: none !important; }
  a { color: inherit; text-decoration: none; }
`;

export function PrintButton({
  targetSelector,
  title,
  label = 'Afdrukken',
  size = 'sm',
  variant = 'outline',
  className,
  printStyles = '',
}: PrintButtonProps) {
  const handlePrint = () => {
    if (!targetSelector) {
      window.print();
      return;
    }

    const el = document.querySelector(targetSelector);
    if (!el) {
      console.warn(`[PrintButton] Element not found: ${targetSelector}`);
      window.print();
      return;
    }

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${title ?? document.title}</title>
          <style>${DEFAULT_PRINT_STYLES}${printStyles}</style>
        </head>
        <body>${el.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handlePrint}
      className={cn('gap-2', className)}
    >
      <Printer className="h-4 w-4" />
      {label}
    </Button>
  );
}
