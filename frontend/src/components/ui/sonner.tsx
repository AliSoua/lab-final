"use client"

import { Toaster as Sonner, ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
    return (
        <Sonner
            theme="light"
            richColors
            position="bottom-right"
            expand
            visibleToasts={3}
            className="toaster group"
            style={
                {
                    // Base (loading/default) toast
                    "--normal-bg": "#ffffff",
                    "--normal-border": "#e8e8e8",
                    "--normal-text": "#3a3a3a",

                    // Success toast — teal brand
                    "--success-bg": "#f0fafa",
                    "--success-border": "#1ca9b1",
                    "--success-text": "#0d7a80",

                    // Error toast — soft red, not aggressive
                    "--error-bg": "#fff5f5",
                    "--error-border": "#f87171",
                    "--error-text": "#b91c1c",

                    // Shared
                    "--border-radius": "8px",
                    "--font-family": "'Inter', 'Helvetica Neue', Arial, sans-serif",
                } as React.CSSProperties
            }
            {...props}
        />
    )
}

export { Toaster }