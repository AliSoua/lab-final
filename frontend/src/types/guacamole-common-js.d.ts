declare module "guacamole-common-js" {
    // Guacamole Client
    export class Client {
        constructor(tunnel: Tunnel)
        getDisplay(): Display
        connect(data: string): void
        disconnect(): void
        sendMouseState(mouseState: MouseState): void
        sendKeyEvent(pressed: number, keysym: number): void
        sendSize(width: number, height: number): void
        onstatechange: ((state: number) => void) | null
        onerror: ((error: any) => void) | null
        onclipboard: ((stream: any, mimetype: string) => void) | null
        onfile: ((stream: any, mimetype: string, filename: string) => void) | null
    }

    // WebSocket Tunnel
    export class WebSocketTunnel {
        constructor(url: string)
        connect(data: string): void
        disconnect(): void
        onerror: ((error: any) => void) | null
        onstatechange: ((state: number) => void) | null
    }

    // Display
    export class Display {
        getElement(): HTMLDivElement
        getWidth(): number
        getHeight(): number
    }

    // Mouse
    export class Mouse {
        constructor(element: Element)
        onmousedown: ((state: MouseState) => void) | null
        onmouseup: ((state: MouseState) => void) | null
        onmousemove: ((state: MouseState) => void) | null
    }

    export interface MouseState {
        x: number
        y: number
        left: boolean
        middle: boolean
        right: boolean
        up: boolean
        down: boolean
    }

    // Keyboard
    export class Keyboard {
        constructor(element: Element | Document)
        onkeydown: ((keysym: number) => void) | null
        onkeyup: ((keysym: number) => void) | null
    }
}