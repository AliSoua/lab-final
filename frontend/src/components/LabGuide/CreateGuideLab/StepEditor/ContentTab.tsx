// src/components/LabGuide/CreateGuideLab/StepEditor/ContentTab.tsx

import { useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import {
    Plus,
    BookOpen,
    Terminal,
    CheckCircle,
    Trash2,
    Eye,
    Edit3,
    Type,
    Code2,
    FileText,
    AlertTriangle,
} from "lucide-react"
import type { LabGuideStepCreateRequest, GuideCommand, GuideTask } from "@/types/LabGuide"
import { CommandEditor } from "./CommandEditor"
import { ContentPreviewStyling } from "./ContentPreviewStyling"

// ── Markdown Renderer ──
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeSanitize from "rehype-sanitize"
import rehypeRaw from "rehype-raw"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"

// ── HTML Sanitizer ──
import DOMPurify from "dompurify"

interface ContentTabProps {
    data: LabGuideStepCreateRequest
    onChange: <K extends keyof LabGuideStepCreateRequest>(key: K, value: LabGuideStepCreateRequest[K]) => void
}

type PreviewMode = "edit" | "preview"
type ContentFormat = "markdown" | "html"

// ── Toolbar Configs ──

const MD_TOOLBAR = [
    { label: "H1", prefix: "# ", suffix: "", placeholder: "Heading" },
    { label: "H2", prefix: "## ", suffix: "", placeholder: "Subheading" },
    { label: "H3", prefix: "### ", suffix: "", placeholder: "Sub-subheading" },
    { label: "Bold", prefix: "**", suffix: "**", placeholder: "bold text" },
    { label: "Italic", prefix: "_", suffix: "_", placeholder: "italic" },
    { label: "Code", prefix: "`", suffix: "`", placeholder: "code" },
    { label: "Code Block", prefix: "```\n", suffix: "\n```", placeholder: "code block" },
    { label: "Link", prefix: "[", suffix: "](url)", placeholder: "link text" },
    { label: "List", prefix: "- ", suffix: "", placeholder: "item" },
    { label: "Quote", prefix: "> ", suffix: "", placeholder: "quote" },
    { label: "Table", prefix: "| Col1 | Col2 |\n|------|------|\n| ", suffix: " |  |", placeholder: "data" },
]

const HTML_TOOLBAR = [
    { label: "H1", prefix: "<h1>", suffix: "</h1>", placeholder: "Heading" },
    { label: "H2", prefix: "<h2>", suffix: "</h2>", placeholder: "Subheading" },
    { label: "H3", prefix: "<h3>", suffix: "</h3>", placeholder: "Sub-subheading" },
    { label: "Bold", prefix: "<strong>", suffix: "</strong>", placeholder: "bold text" },
    { label: "Italic", prefix: "<em>", suffix: "</em>", placeholder: "italic" },
    { label: "Code", prefix: "<code>", suffix: "</code>", placeholder: "code" },
    { label: "Pre", prefix: "<pre><code>\n", suffix: "\n</code></pre>", placeholder: "code block" },
    { label: "Link", prefix: '<a href="url">', suffix: "</a>", placeholder: "link text" },
    { label: "List", prefix: "<ul>\n  <li>", suffix: "</li>\n</ul>", placeholder: "item" },
    { label: "Quote", prefix: "<blockquote>", suffix: "</blockquote>", placeholder: "quote" },
    { label: "Break", prefix: "<br/>", suffix: "", placeholder: "" },
]

// ── DOMPurify Config: Strip EVERYTHING except structure ──
// No styles, no classes, no event handlers — just clean semantic HTML
const SANITIZE_CONFIG = {
    ALLOWED_TAGS: [
        "p", "br", "hr",
        "h1", "h2", "h3", "h4", "h5", "h6",
        "strong", "b", "em", "i", "u", "strike", "del", "s",
        "a", "img", "span", "div",
        "blockquote", "pre", "code",
        "ul", "ol", "li", "dl", "dt", "dd",
        "table", "thead", "tbody", "tr", "th", "td",
        "sup", "sub", "mark", "small", "abbr", "cite", "q",
    ],
    ALLOWED_ATTR: [
        "href", "src", "alt", "title",
        "width", "height",
    ],
    ALLOW_DATA_ATTR: false,
    // Strip all inline styles and classes
    KEEP_CONTENT: true,
}

export function ContentTab({ data, onChange }: ContentTabProps) {
    const [previewMode, setPreviewMode] = useState<PreviewMode>("edit")
    const [contentFormat, setContentFormat] = useState<ContentFormat>("markdown")
    const [textareaEl, setTextareaEl] = useState<HTMLTextAreaElement | null>(null)

    const updateCommands = (commands: GuideCommand[]) => onChange("commands", commands)
    const updateTasks = (tasks: GuideTask[]) => onChange("tasks", tasks)

    const insertAtCursor = useCallback((prefix: string, suffix: string, placeholder: string) => {
        const textarea = textareaEl
        if (!textarea) return

        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const current = data.theory_content || ""
        const selected = current.slice(start, end) || placeholder

        const before = current.slice(0, start)
        const after = current.slice(end)
        const inserted = prefix + selected + suffix

        onChange("theory_content", before + inserted + after)

        requestAnimationFrame(() => {
            textarea.focus()
            const cursorPos = start + prefix.length + selected.length
            textarea.setSelectionRange(cursorPos, cursorPos)
        })
    }, [textareaEl, data.theory_content, onChange])

    const addCommand = () => {
        updateCommands([
            ...data.commands,
            { label: "", command: "", timeout: 300, sudo: false, working_directory: "/home/user" },
        ])
    }

    const updateCommand = (i: number, patch: Partial<GuideCommand>) => {
        const next = data.commands.map((c, idx) => (idx === i ? { ...c, ...patch } : c))
        updateCommands(next)
    }

    const removeCommand = (i: number) => {
        updateCommands(data.commands.filter((_, idx) => idx !== i))
    }

    const addTask = () => {
        updateTasks([...data.tasks, { description: "", is_required: true }])
    }

    const updateTask = (i: number, patch: Partial<GuideTask>) => {
        const next = data.tasks.map((t, idx) => (idx === i ? { ...t, ...patch } : t))
        updateTasks(next)
    }

    const removeTask = (i: number) => {
        updateTasks(data.tasks.filter((_, idx) => idx !== i))
    }

    // ── Markdown Preview ──
    const renderMarkdownPreview = () => {
        const content = data.theory_content || ""
        if (!content.trim()) {
            return <ContentPreviewStyling html="" />
        }

        // Convert Markdown to HTML string first, then pipe through our styling
        // We use react-markdown to generate HTML, then pass to ContentPreviewStyling
        // Actually, better to render directly with react-markdown but wrap in our CSS container
        return (
            <div className="lab-content-preview">
                <style>{`
                    /* Same CSS as ContentPreviewStyling — injected here for markdown mode */
                    .lab-content-preview { font-size: 13px; line-height: 1.7; color: #3a3a3a; }
                    .lab-content-preview h1 { font-size: 20px; font-weight: 600; margin-top: 1.5em; margin-bottom: 0.75em; border-bottom: 1px solid #e8e8e8; padding-bottom: 0.4em; color: #3a3a3a; }
                    .lab-content-preview h2 { font-size: 17px; font-weight: 600; margin-top: 1.5em; margin-bottom: 0.75em; color: #1ca9b1; }
                    .lab-content-preview h3 { font-size: 15px; font-weight: 600; margin-top: 1.5em; margin-bottom: 0.75em; color: #3a3a3a; }
                    .lab-content-preview h4 { font-size: 14px; font-weight: 600; margin-top: 1.5em; margin-bottom: 0.75em; color: #727373; }
                    .lab-content-preview h5, .lab-content-preview h6 { font-size: 13px; font-weight: 600; margin-top: 1.5em; margin-bottom: 0.75em; color: #727373; text-transform: uppercase; letter-spacing: 0.03em; }
                    .lab-content-preview p { margin-bottom: 1em; }
                    .lab-content-preview p:last-child { margin-bottom: 0; }
                    .lab-content-preview strong, .lab-content-preview b { font-weight: 600; color: #3a3a3a; }
                    .lab-content-preview em, .lab-content-preview i { font-style: italic; color: #727373; }
                    .lab-content-preview a { color: #1ca9b1; text-decoration: none; border-bottom: 1px solid transparent; transition: border-color 0.15s ease; }
                    .lab-content-preview a:hover { border-bottom-color: #1ca9b1; }
                    .lab-content-preview code { font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace; font-size: 12px; background: #f0fafa; color: #1ca9b1; padding: 2px 6px; border-radius: 4px; border: 1px solid #d4f0f2; }
                    .lab-content-preview pre { background: #1a1a2e; color: #e2e8f0; padding: 16px; border-radius: 10px; overflow-x: auto; margin: 1em 0; font-size: 12px; line-height: 1.6; }
                    .lab-content-preview pre code { background: transparent; color: inherit; padding: 0; border: none; font-size: inherit; }
                    .lab-content-preview blockquote { margin: 1em 0; padding: 12px 16px; padding-left: 14px; background: #f0fafa; border-left: 3px solid #1ca9b1; border-radius: 0 8px 8px 0; color: #727373; font-style: italic; }
                    .lab-content-preview blockquote p { margin: 0; }
                    .lab-content-preview blockquote p + p { margin-top: 0.5em; }
                    .lab-content-preview ul, .lab-content-preview ol { margin: 1em 0; padding-left: 1.75em; }
                    .lab-content-preview ul { list-style-type: disc; }
                    .lab-content-preview ol { list-style-type: decimal; }
                    .lab-content-preview li { margin-bottom: 0.35em; }
                    .lab-content-preview li::marker { color: #1ca9b1; }
                    .lab-content-preview table { width: 100%; border-collapse: separate; border-spacing: 0; margin: 1em 0; font-size: 12px; border-radius: 8px; overflow: hidden; border: 1px solid #e8e8e8; }
                    .lab-content-preview thead { background: #fafafa; }
                    .lab-content-preview th { font-weight: 600; text-align: left; padding: 10px 12px; border-bottom: 1px solid #e8e8e8; color: #3a3a3a; font-size: 11px; text-transform: uppercase; letter-spacing: 0.03em; }
                    .lab-content-preview td { padding: 10px 12px; border-bottom: 1px solid #f5f5f5; color: #3a3a3a; }
                    .lab-content-preview tbody tr:last-child td { border-bottom: none; }
                    .lab-content-preview tbody tr:hover { background: #fafafa; }
                    .lab-content-preview hr { border: none; border-top: 1px solid #e8e8e8; margin: 1.5em 0; }
                    .lab-content-preview img { max-width: 100%; height: auto; border-radius: 8px; margin: 1em 0; border: 1px solid #e8e8e8; }
                    .lab-content-preview > *:first-child { margin-top: 0 !important; }
                    .lab-content-preview > *:last-child { margin-bottom: 0 !important; }
                `}</style>
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw, rehypeSanitize]}
                    components={{
                        code({ node, inline, className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || "")
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
                                <code className={className} {...props}>
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

    // ── HTML Preview ──
    const renderHtmlPreview = () => {
        const content = data.theory_content || ""
        if (!content.trim()) {
            return <ContentPreviewStyling html="" />
        }

        // Strip everything except structural tags — no styles, no classes
        const sanitized = DOMPurify.sanitize(content, SANITIZE_CONFIG)
        return <ContentPreviewStyling html={sanitized} />
    }

    const toolbarItems = contentFormat === "markdown" ? MD_TOOLBAR : HTML_TOOLBAR
    const isEmpty = !(data.theory_content || "").trim()

    return (
        <div className="p-6 space-y-8">
            {/* ── Theory Section ── */}
            <section className="space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-[#1ca9b1]" />
                        <h3 className="text-[13px] font-semibold text-[#3a3a3a] uppercase tracking-wider">
                            Theory & Explanation
                        </h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center bg-[#f5f5f5] rounded-lg p-0.5">
                            <button
                                type="button"
                                onClick={() => setContentFormat("markdown")}
                                className={cn(
                                    "flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all",
                                    contentFormat === "markdown"
                                        ? "bg-white text-[#1ca9b1] shadow-sm"
                                        : "text-[#727373] hover:text-[#3a3a3a]"
                                )}
                            >
                                <FileText className="h-3 w-3" />
                                Markdown
                            </button>
                            <button
                                type="button"
                                onClick={() => setContentFormat("html")}
                                className={cn(
                                    "flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all",
                                    contentFormat === "html"
                                        ? "bg-white text-[#1ca9b1] shadow-sm"
                                        : "text-[#727373] hover:text-[#3a3a3a]"
                                )}
                            >
                                <Code2 className="h-3 w-3" />
                                HTML
                            </button>
                        </div>
                    </div>
                </div>

                {/* Format Info Banner */}
                <div className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-[11px]",
                    contentFormat === "markdown"
                        ? "bg-[#e6f7f8] text-[#1ca9b1]"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                )}>
                    {contentFormat === "markdown" ? (
                        <>
                            <FileText className="h-3.5 w-3.5 shrink-0" />
                            <span>Markdown mode: Use **bold**, _italic_, `code`, # headings, and more.</span>
                        </>
                    ) : (
                        <>
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                            <span>HTML mode: Inline styles and classes are stripped. Platform styling is applied automatically.</span>
                        </>
                    )}
                </div>

                {/* Toolbar */}
                <div className="flex items-center gap-1 p-1.5 bg-[#fafafa] border border-[#e8e8e8] rounded-lg overflow-x-auto">
                    {toolbarItems.map((item) => (
                        <button
                            key={item.label}
                            type="button"
                            onClick={() => insertAtCursor(item.prefix, item.suffix, item.placeholder)}
                            className="px-2 py-1 text-[11px] font-medium text-[#727373] hover:text-[#1ca9b1] hover:bg-white rounded transition-colors whitespace-nowrap"
                            title={item.label}
                        >
                            {item.label}
                        </button>
                    ))}
                    <div className="w-px h-4 bg-[#e8e8e8] mx-1 shrink-0" />
                    <button
                        type="button"
                        onClick={() => setPreviewMode("edit")}
                        className={cn(
                            "flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors whitespace-nowrap",
                            previewMode === "edit" ? "bg-white text-[#1ca9b1] shadow-sm" : "text-[#727373] hover:text-[#3a3a3a]"
                        )}
                    >
                        <Edit3 className="h-3 w-3" />
                        Edit
                    </button>
                    <button
                        type="button"
                        onClick={() => setPreviewMode("preview")}
                        className={cn(
                            "flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors whitespace-nowrap",
                            previewMode === "preview" ? "bg-white text-[#1ca9b1] shadow-sm" : "text-[#727373] hover:text-[#3a3a3a]"
                        )}
                    >
                        <Eye className="h-3 w-3" />
                        Preview
                    </button>
                </div>

                {/* Editor / Preview Area */}
                <div className="border border-[#d4d4d4] rounded-xl overflow-hidden bg-white">
                    {previewMode === "edit" ? (
                        <textarea
                            ref={setTextareaEl}
                            value={data.theory_content || ""}
                            onChange={(e) => onChange("theory_content", e.target.value)}
                            placeholder={
                                contentFormat === "markdown"
                                    ? "Explain the concept or objective of this step...\n\nUse **bold**, _italic_, `code`, and # headings.\n\n## Example\nRun the following command to scan ports:\n```bash\nnmap -sV target\n```"
                                    : "<h2>Objective</h2>\n<p>Explain what the learner should achieve in this step.</p>\n\n<pre><code>nmap -sV target</code></pre>\n\n<p>Use <strong>bold</strong> and <em>italic</em> for emphasis.</p>"
                            }
                            rows={12}
                            spellCheck={false}
                            className={cn(
                                "w-full px-4 py-3",
                                "text-[13px] text-[#3a3a3a] placeholder:text-[#c4c4c4] leading-relaxed",
                                "outline-none focus:bg-[#fafafa] transition-all resize-none",
                                "font-mono",
                                contentFormat === "html" && "text-amber-900"
                            )}
                        />
                    ) : (
                        <div className="px-4 py-3 min-h-[300px] overflow-y-auto">
                            {contentFormat === "markdown"
                                ? renderMarkdownPreview()
                                : renderHtmlPreview()
                            }
                        </div>
                    )}
                </div>

                {/* Footer hint */}
                <div className="flex items-center justify-between">
                    <p className="text-[11px] text-[#c4c4c4]">
                        {contentFormat === "markdown"
                            ? "Supports GitHub-Flavored Markdown: headings, bold, italic, code blocks, tables, lists, links, and quotes."
                            : "Supports safe HTML tags. All inline styles and classes are removed. Platform styling is applied automatically for a consistent look."
                        }
                    </p>
                    <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full",
                        isEmpty ? "text-[#c4c4c4] bg-[#f5f5f5]" : "text-[#1ca9b1] bg-[#e6f7f8]"
                    )}>
                        {(data.theory_content || "").length.toLocaleString()} chars
                    </span>
                </div>
            </section>

            {/* ── Commands Section ── */}
            <section className="space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Terminal className="h-4 w-4 text-[#1ca9b1]" />
                        <h3 className="text-[13px] font-semibold text-[#3a3a3a] uppercase tracking-wider">
                            Commands
                        </h3>
                    </div>
                    <button
                        type="button"
                        onClick={addCommand}
                        className="flex items-center gap-1.5 text-xs font-semibold text-[#1ca9b1] hover:text-[#17959c] bg-[#e6f7f8] hover:bg-[#d4f0f2] px-3 py-1.5 rounded-lg transition-colors"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Add Command
                    </button>
                </div>

                {data.commands.length === 0 ? (
                    <div className="border border-dashed border-[#e8e8e8] rounded-xl p-8 text-center bg-[#fafafa]">
                        <Terminal className="h-6 w-6 text-[#c4c4c4] mx-auto mb-2" />
                        <p className="text-xs text-[#727373]">No commands yet. Add executable commands for this step.</p>
                        <p className="text-[11px] text-[#c4c4c4] mt-1">Each command can target a specific VM.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {data.commands.map((cmd, i) => (
                            <CommandEditor
                                key={i}
                                index={i}
                                command={cmd}
                                onChange={(patch) => updateCommand(i, patch)}
                                onRemove={() => removeCommand(i)}
                            />
                        ))}
                    </div>
                )}
            </section>

            {/* ── Tasks Section ── */}
            <section className="space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-[#1ca9b1]" />
                        <h3 className="text-[13px] font-semibold text-[#3a3a3a] uppercase tracking-wider">
                            Tasks / Objectives
                        </h3>
                    </div>
                    <button
                        type="button"
                        onClick={addTask}
                        className="flex items-center gap-1.5 text-xs font-semibold text-[#1ca9b1] hover:text-[#17959c] bg-[#e6f7f8] hover:bg-[#d4f0f2] px-3 py-1.5 rounded-lg transition-colors"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Add Task
                    </button>
                </div>

                {data.tasks.length === 0 ? (
                    <div className="border border-dashed border-[#e8e8e8] rounded-xl p-8 text-center bg-[#fafafa]">
                        <CheckCircle className="h-6 w-6 text-[#c4c4c4] mx-auto mb-2" />
                        <p className="text-xs text-[#727373]">No tasks defined yet.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {data.tasks.map((task, i) => (
                            <div
                                key={i}
                                className="flex items-center gap-3 bg-white border border-[#e8e8e8] rounded-lg px-4 py-3 group hover:border-[#1ca9b1]/30 transition-colors"
                            >
                                <CheckCircle className="h-4 w-4 text-[#1ca9b1] shrink-0" />
                                <input
                                    type="text"
                                    value={task.description}
                                    onChange={(e) => updateTask(i, { description: e.target.value })}
                                    placeholder="e.g., Identify open ports on the target"
                                    className={cn(
                                        "flex-1 bg-transparent text-[13px] text-[#3a3a3a] placeholder:text-[#c4c4c4]",
                                        "outline-none border-none focus:ring-0"
                                    )}
                                />
                                <label className="flex items-center gap-1.5 text-[11px] text-[#727373] shrink-0 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={task.is_required}
                                        onChange={(e) => updateTask(i, { is_required: e.target.checked })}
                                        className="rounded border-[#d4d4d4] text-[#1ca9b1] focus:ring-[#1ca9b1] h-3.5 w-3.5"
                                    />
                                    Required
                                </label>
                                <button
                                    type="button"
                                    onClick={() => removeTask(i)}
                                    className="p-1.5 text-[#c4c4c4] hover:text-red-500 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    )
}