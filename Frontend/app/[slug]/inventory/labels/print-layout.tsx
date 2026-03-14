'use client';

import React from 'react';
import Barcode from 'react-barcode';

interface PrintLayoutProps {
    queue: any[];
    settings: any;
}

export function PrintLayout({ queue, settings }: PrintLayoutProps) {
    if (queue.length === 0) return null;

    // Default settings if undefined
    const labelWidth = settings?.labelWidth || 50;
    const labelHeight = settings?.labelHeight || 25;
    const format = settings?.defaultFormat || 'CODE128';
    const showText = settings?.showText !== undefined ? settings.showText : true;

    // Convert mm to pixels (approx 3.78 px per mm at 96 DPI, or adjust for print)
    // For print media, it's often better to use 'mm' directly in CSS, but inline styles need strings.
    const containerStyle = {
        width: `${labelWidth}mm`,
        height: `${labelHeight}mm`,
    };

    return (
        <div id="print-area" className="hidden print:flex print:flex-wrap print:content-start print:gap-1 bg-white">
            <style jsx global>{`
                @media print {
                    @page {
                        size: auto;
                        margin: 0mm;
                    }
                    body * {
                        visibility: hidden;
                    }
                    #print-area, #print-area * {
                        visibility: visible;
                    }
                    #print-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                }
            `}</style>

            {queue.map((item, idx) => (
                <div
                    key={`${item.product.id}-${idx}`}
                    className="break-inside-avoid flex flex-col items-center justify-center border border-gray-100 overflow-hidden text-center relative"
                    style={containerStyle}
                >
                    <p className="text-[8px] font-bold truncate w-full px-1 uppercase leading-tight mb-0.5">
                        {item.product.name.substring(0, 20)}
                        {item.variant && (
                            <span className="block text-[6px] text-gray-500">
                                {item.variant.size} {item.variant.color && `- ${item.variant.color}`}
                            </span>
                        )}
                    </p>

                    <div className="transform scale-90 origin-center -my-1">
                        <Barcode
                            value={item.variant?.barcode || item.product.barcode || item.product.sku}
                            format={format}
                            width={1.5}
                            height={labelHeight * 0.4} // Dynamic height based on label size
                            displayValue={showText}
                            fontSize={9}
                            margin={0}
                            background="transparent"
                        />
                    </div>

                    <div className="flex justify-between items-center w-full px-2 mt-0.5">
                        <span className="text-[6px] font-mono text-gray-400">
                            {item.product.sku}
                        </span>
                        <span className="text-[10px] font-black">
                            $ {item.product.price}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
}
