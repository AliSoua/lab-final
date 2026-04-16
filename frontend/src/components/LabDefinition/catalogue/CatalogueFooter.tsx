// src/components/LabDefinition/catalogue/CatalogueFooter.tsx
import { FlaskConical, Mail, X, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useEffect, useRef, useCallback } from "react"

export function CatalogueFooter() {
    const currentYear = new Date().getFullYear()
    const [isVisible, setIsVisible] = useState(false)
    const [scrollContainer, setScrollContainer] = useState<HTMLElement | Window | null>(null)

    // Detect the actual scrollable container
    useEffect(() => {
        const findScrollContainer = (): HTMLElement | Window => {
            // Check if window is scrollable
            if (document.documentElement.scrollHeight > window.innerHeight) {
                return window
            }

            // Look for common scrollable containers
            const selectors = ['#root', '#app', 'main', '[data-scrollable]']
            for (const selector of selectors) {
                const el = document.querySelector(selector) as HTMLElement
                if (el && (el.scrollHeight > el.clientHeight)) {
                    return el
                }
            }

            // Default to window
            return window
        }

        const container = findScrollContainer()
        setScrollContainer(container)
    }, [])

    const checkScrollPosition = useCallback(() => {
        if (!scrollContainer) return

        let scrollTop = 0
        let scrollHeight = 0
        let clientHeight = 0

        if (scrollContainer === window) {
            scrollTop = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0
            scrollHeight = document.documentElement.scrollHeight
            clientHeight = window.innerHeight
        } else {
            const el = scrollContainer as HTMLElement
            scrollTop = el.scrollTop
            scrollHeight = el.scrollHeight
            clientHeight = el.clientHeight
        }

        // Show button if scrolled more than 300px OR if near bottom
        const isScrolled = scrollTop > 300
        const isNearBottom = scrollHeight > clientHeight && scrollTop > 100

        setIsVisible(isScrolled || isNearBottom)
    }, [scrollContainer])

    useEffect(() => {
        if (!scrollContainer) return

        // Check initial position
        checkScrollPosition()

        // Add scroll listener
        const container = scrollContainer
        container.addEventListener("scroll", checkScrollPosition, { passive: true })

        // Also listen to window scroll as fallback
        if (container !== window) {
            window.addEventListener("scroll", checkScrollPosition, { passive: true })
        }

        return () => {
            container.removeEventListener("scroll", checkScrollPosition)
            if (container !== window) {
                window.removeEventListener("scroll", checkScrollPosition)
            }
        }
    }, [scrollContainer, checkScrollPosition])

    const scrollToTop = () => {
        if (!scrollContainer) return

        if (scrollContainer === window) {
            window.scrollTo({
                top: 0,
                left: 0,
                behavior: "smooth",
            })
        } else {
            ; (scrollContainer as HTMLElement).scrollTo({
                top: 0,
                left: 0,
                behavior: "smooth",
            })
        }
    }

    const footerLinks = {
        platform: [
            { label: "Browse Labs", href: "/" },
            { label: "My Progress", href: "/profile" },
            { label: "Certificates", href: "/certificates" },
            { label: "Leaderboard", href: "/leaderboard" },
        ],
        resources: [
            { label: "Documentation", href: "/docs" },
            { label: "API Reference", href: "/api" },
            { label: "Status", href: "/status" },
            { label: "Changelog", href: "/changelog" },
        ],
        support: [
            { label: "Help Center", href: "/help" },
            { label: "Contact Us", href: "/contact" },
            { label: "Report Issue", href: "/report" },
            { label: "Feature Request", href: "/feedback" },
        ],
        legal: [
            { label: "Privacy Policy", href: "/privacy" },
            { label: "Terms of Service", href: "/terms" },
            { label: "Cookie Policy", href: "/cookies" },
        ],
    }

    const socialLinks = [
        { icon: X, href: "https://github.com", label: "GitHub" },
        { icon: X, href: "https://twitter.com", label: "Twitter" },
        { icon: X, href: "https://linkedin.com", label: "LinkedIn" },
        { icon: Mail, href: "mailto:support@labplatform.com", label: "Email" },
    ]

    return (
        <footer className="bg-white border-t border-[#e8e8e8] relative">
            {/* Main Footer Content */}
            <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
                <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
                    {/* Brand Column */}
                    <div className="col-span-2 md:col-span-4 lg:col-span-1">
                        <div className="flex items-center gap-2.5 mb-4">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1ca9b1]">
                                <FlaskConical className="h-4 w-4 text-white" />
                            </div>
                            <div className="flex flex-col leading-none">
                                <span className="text-[14px] font-semibold tracking-tight text-[#3a3a3a]">
                                    Lab Orchestration
                                </span>
                                <span className="text-[10.5px] font-medium tracking-wide text-[#727373] uppercase">
                                    Training Platform
                                </span>
                            </div>
                        </div>
                        <p className="text-[13px] text-[#727373] leading-relaxed max-w-xs mb-6">
                            Hands-on learning platform for modern infrastructure, security, and cloud technologies.
                        </p>
                        <div className="flex items-center gap-3">
                            {socialLinks.map((social) => {
                                const Icon = social.icon
                                return (
                                    <a
                                        key={social.label}
                                        href={social.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={cn(
                                            "flex h-9 w-9 items-center justify-center rounded-lg",
                                            "bg-[#f8f8f8] text-[#727373]",
                                            "transition-all duration-200",
                                            "hover:bg-[#1ca9b1] hover:text-white hover:shadow-md hover:shadow-[#1ca9b1]/20"
                                        )}
                                        aria-label={social.label}
                                    >
                                        <Icon className="h-4 w-4" />
                                    </a>
                                )
                            })}
                        </div>
                    </div>

                    {/* Platform Links */}
                    <div>
                        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#3a3a3a] mb-4">
                            Platform
                        </h3>
                        <ul className="space-y-3">
                            {footerLinks.platform.map((link) => (
                                <li key={link.label}>
                                    <a href={link.href} className="text-[13px] text-[#727373] hover:text-[#1ca9b1] transition-colors">
                                        {link.label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Resources Links */}
                    <div>
                        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#3a3a3a] mb-4">
                            Resources
                        </h3>
                        <ul className="space-y-3">
                            {footerLinks.resources.map((link) => (
                                <li key={link.label}>
                                    <a href={link.href} className="text-[13px] text-[#727373] hover:text-[#1ca9b1] transition-colors">
                                        {link.label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Support Links */}
                    <div>
                        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#3a3a3a] mb-4">
                            Support
                        </h3>
                        <ul className="space-y-3">
                            {footerLinks.support.map((link) => (
                                <li key={link.label}>
                                    <a href={link.href} className="text-[13px] text-[#727373] hover:text-[#1ca9b1] transition-colors">
                                        {link.label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Legal Links */}
                    <div>
                        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#3a3a3a] mb-4">
                            Legal
                        </h3>
                        <ul className="space-y-3">
                            {footerLinks.legal.map((link) => (
                                <li key={link.label}>
                                    <a href={link.href} className="text-[13px] text-[#727373] hover:text-[#1ca9b1] transition-colors">
                                        {link.label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="border-t border-[#f0f0f0]">
                <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-[12px] text-[#727373]">
                        © {currentYear} Lab Orchestration Platform. All rights reserved.
                    </p>
                    <div className="flex items-center gap-6">
                        <span className="flex items-center gap-2 text-[12px] text-[#727373]">
                            <span className="h-2 w-2 rounded-full bg-[#1ca9b1] animate-pulse" />
                            All systems operational
                        </span>
                    </div>
                </div>
            </div>

            {/* Scroll to Top Button */}
            <button
                onClick={scrollToTop}
                className={cn(
                    "fixed bottom-6 right-6 flex h-12 w-12 items-center justify-center rounded-full",
                    "bg-[#1ca9b1] text-white shadow-lg shadow-[#1ca9b1]/30",
                    "transition-all duration-300 hover:bg-[#17959c] hover:scale-110",
                    "focus:outline-none focus:ring-2 focus:ring-[#1ca9b1] focus:ring-offset-2",
                    "z-50",
                    isVisible
                        ? "opacity-100 translate-y-0 pointer-events-auto"
                        : "opacity-0 translate-y-4 pointer-events-none"
                )}
                aria-label="Scroll to top"
            >
                <ChevronUp className="h-6 w-6" />
            </button>
        </footer>
    )
}