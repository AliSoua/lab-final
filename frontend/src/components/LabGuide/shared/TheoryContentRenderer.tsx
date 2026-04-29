// src/components/LabGuide/shared/TheoryContentRenderer.tsx

import { useMemo } from "react"
import { cn } from "@/lib/utils"
import {
    detectContentFormat,
    sanitizeHtmlContent,
    PLATFORM_PREVIEW_CSS,
    type ContentFormat,
} from "@/lib/labContentRenderer"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeSanitize from "rehype-sanitize"
import rehypeRaw from "rehype-raw"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"

interface TheoryContentRendererProps {
    content: string | null | undefined
    className?: string
    /** Force a specific format instead of auto-detecting */
    forceFormat?: ContentFormat
    /** Show empty state or return null when content is empty */
    showEmptyState?: boolean
}

/**
 * Unified theory content renderer.
 * Auto-detects format (HTML/Markdown/Plain) and renders with platform styling.
 */
export function TheoryContentRenderer({
    content,
    className,
    forceFormat,
    showEmptyState = true,
}: TheoryContentRendererProps) {
    const format = forceFormat ?? detectContentFormat(content)

    const sanitizedHtml = useMemo(() => {
        if (format !== "html" || !content) return ""
        return sanitizeHtmlContent(content)
    }, [content, format])

    if (!content?.trim()) {
        if (!showEmptyState) return null
        return (
            <div className={cn("flex items-center justify-center py-8 text-[#c4c4c4]", className)}>
                <div className="text-center">
                    <p className="text-sm">No theory content provided</p>
                </div>
            </div>
        )
    }

    // ── HTML Mode ──
    if (format === "html") {
        return (
            <div className={cn("lab-content-preview", className)}>
                <style>{PLATFORM_PREVIEW_CSS}</style>
                <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
            </div>
        )
    }

    // ── Markdown Mode ──
    if (format === "markdown") {
        return (
            <div className={cn("lab-content-preview", className)}>
                <style>{PLATFORM_PREVIEW_CSS}</style>
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw, rehypeSanitize]}
                    components={{
                        code({ node, inline, className: codeClassName, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(codeClassName || "")
                            return !inline && match ? (
                                <SyntaxHighlighter
                                    style={oneDark}
                                    language={match[1]}
                                    PreTag="div"
                                    {...props}
                                >
                                    {String(children).replace(/\n$/, "")}
                                </SyntaxHighlighter>
                            ) : (
                                <code className={codeClassName} {...props}>
                                    {children}
                                </code>
                            )
                        },
                    }}
                >
                    {content}
                </ReactMarkdown>
            </div>
        )
    }

    // ── Plain Text Mode ──
    return (
        <div className={cn("lab-content-preview", className)}>
            <style>{PLATFORM_PREVIEW_CSS}</style>
            <p className="whitespace-pre-wrap">{content}</p>
        </div>
    )
}