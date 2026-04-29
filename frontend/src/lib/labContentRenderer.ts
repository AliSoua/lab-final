// src/lib/labContentRenderer.ts

import DOMPurify from "dompurify"

// ── Content Format Detection ──

export type ContentFormat = "markdown" | "html" | "plain"

export function detectContentFormat(content: string | null | undefined): ContentFormat {
    if (!content?.trim()) return "plain"

    const trimmed = content.trim()

    if (trimmed.startsWith("<") && /<(div|p|h[1-6]|ul|ol|table|blockquote|pre|span|section|article)/i.test(trimmed)) {
        return "html"
    }

    if (/^(#{1,6}\s|>\s|\*\s|-\s|\d+\.\s|!\[|\[.+\]\(.+\)|\*\*.+\*\*|__.+__|`{1,3}.+`{1,3})/m.test(trimmed)) {
        return "markdown"
    }

    return "plain"
}

// ── DOMPurify Config ──
// No 'as const' — DOMPurify expects mutable string arrays

const SANITIZE_CONFIG = {
    ALLOWED_TAGS: [
        "p", "br", "hr", "h1", "h2", "h3", "h4", "h5", "h6",
        "strong", "b", "em", "i", "u", "strike", "del", "s",
        "a", "img", "span", "div", "blockquote", "pre", "code",
        "ul", "ol", "li", "dl", "dt", "dd",
        "table", "thead", "tbody", "tr", "th", "td",
        "sup", "sub", "mark", "small", "abbr", "cite", "q",
    ] as string[],
    ALLOWED_ATTR: [
        "href", "src", "alt", "title", "width", "height",
    ] as string[],
    ALLOW_DATA_ATTR: false,
    KEEP_CONTENT: true,
    RETURN_TRUSTED_TYPE: false,
}

export function sanitizeHtmlContent(dirtyHtml: string): string {
    return DOMPurify.sanitize(dirtyHtml, SANITIZE_CONFIG) as string
}

// ── Platform CSS Injection ──

export const PLATFORM_PREVIEW_CSS = `
.lab-content-preview {
    font-size: 13px;
    line-height: 1.7;
    color: #3a3a3a;
}

/* Headings */
.lab-content-preview h1,
.lab-content-preview h2,
.lab-content-preview h3,
.lab-content-preview h4,
.lab-content-preview h5,
.lab-content-preview h6 {
    font-weight: 600;
    color: #3a3a3a;
    margin-top: 1.5em;
    margin-bottom: 0.75em;
    line-height: 1.3;
}
.lab-content-preview h1 {
    font-size: 20px;
    border-bottom: 1px solid #e8e8e8;
    padding-bottom: 0.4em;
}
.lab-content-preview h2 {
    font-size: 17px;
    color: #1ca9b1;
}
.lab-content-preview h3 {
    font-size: 15px;
}
.lab-content-preview h4 {
    font-size: 14px;
    color: #727373;
}
.lab-content-preview h5,
.lab-content-preview h6 {
    font-size: 13px;
    color: #727373;
    text-transform: uppercase;
    letter-spacing: 0.03em;
}

/* Paragraphs & Text */
.lab-content-preview p {
    margin-bottom: 1em;
}
.lab-content-preview p:last-child {
    margin-bottom: 0;
}
.lab-content-preview strong,
.lab-content-preview b {
    font-weight: 600;
    color: #3a3a3a;
}
.lab-content-preview em,
.lab-content-preview i {
    font-style: italic;
    color: #727373;
}
.lab-content-preview u {
    text-decoration: underline;
    text-decoration-color: #1ca9b1;
    text-underline-offset: 2px;
}
.lab-content-preview s,
.lab-content-preview strike,
.lab-content-preview del {
    text-decoration: line-through;
    color: #c4c4c4;
}
.lab-content-preview mark {
    background: #fef3c7;
    padding: 0 2px;
    border-radius: 2px;
}
.lab-content-preview small {
    font-size: 11px;
    color: #727373;
}
.lab-content-preview sub,
.lab-content-preview sup {
    font-size: 10px;
}
.lab-content-preview abbr {
    border-bottom: 1px dotted #c4c4c4;
    cursor: help;
}
.lab-content-preview cite,
.lab-content-preview q {
    font-style: italic;
    color: #727373;
}
.lab-content-preview q::before {
    content: "\\201C";
}
.lab-content-preview q::after {
    content: "\\201D";
}

/* Links */
.lab-content-preview a {
    color: #1ca9b1;
    text-decoration: none;
    border-bottom: 1px solid transparent;
    transition: border-color 0.15s ease;
}
.lab-content-preview a:hover {
    border-bottom-color: #1ca9b1;
}

/* Code */
.lab-content-preview code {
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
    font-size: 12px;
    background: #f0fafa;
    color: #1ca9b1;
    padding: 2px 6px;
    border-radius: 4px;
    border: 1px solid #d4f0f2;
}
.lab-content-preview pre {
    background: #1a1a2e;
    color: #e2e8f0;
    padding: 16px;
    border-radius: 10px;
    overflow-x: auto;
    margin: 1em 0;
    font-size: 12px;
    line-height: 1.6;
}
.lab-content-preview pre code {
    background: transparent;
    color: inherit;
    padding: 0;
    border: none;
    font-size: inherit;
}

/* Blockquotes */
.lab-content-preview blockquote {
    margin: 1em 0;
    padding: 12px 16px;
    padding-left: 14px;
    background: #f0fafa;
    border-left: 3px solid #1ca9b1;
    border-radius: 0 8px 8px 0;
    color: #727373;
    font-style: italic;
}
.lab-content-preview blockquote p {
    margin: 0;
}
.lab-content-preview blockquote p + p {
    margin-top: 0.5em;
}

/* Lists */
.lab-content-preview ul,
.lab-content-preview ol {
    margin: 1em 0;
    padding-left: 1.75em;
}
.lab-content-preview ul {
    list-style-type: disc;
}
.lab-content-preview ol {
    list-style-type: decimal;
}
.lab-content-preview li {
    margin-bottom: 0.35em;
}
.lab-content-preview li::marker {
    color: #1ca9b1;
}
.lab-content-preview dl {
    margin: 1em 0;
}
.lab-content-preview dt {
    font-weight: 600;
    color: #3a3a3a;
    margin-top: 0.75em;
}
.lab-content-preview dd {
    margin-left: 1.5em;
    color: #727373;
}

/* Tables */
.lab-content-preview table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    margin: 1em 0;
    font-size: 12px;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid #e8e8e8;
}
.lab-content-preview thead {
    background: #fafafa;
}
.lab-content-preview th {
    font-weight: 600;
    text-align: left;
    padding: 10px 12px;
    border-bottom: 1px solid #e8e8e8;
    color: #3a3a3a;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.03em;
}
.lab-content-preview td {
    padding: 10px 12px;
    border-bottom: 1px solid #f5f5f5;
    color: #3a3a3a;
}
.lab-content-preview tbody tr:last-child td {
    border-bottom: none;
}
.lab-content-preview tbody tr:hover {
    background: #fafafa;
}

/* Horizontal Rule */
.lab-content-preview hr {
    border: none;
    border-top: 1px solid #e8e8e8;
    margin: 1.5em 0;
}

/* Images */
.lab-content-preview img {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
    margin: 1em 0;
    border: 1px solid #e8e8e8;
}

/* Structural */
.lab-content-preview div {
    margin: 0;
}

/* Spacing utilities */
.lab-content-preview > *:first-child {
    margin-top: 0 !important;
}
.lab-content-preview > *:last-child {
    margin-bottom: 0 !important;
}
`