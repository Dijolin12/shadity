# CodePilot AI IDE 🚀
### Google Antigravity + Gemini AI Inspired Autonomous Coding IDE

A full-fledged, next-generation AI coding environment combining a professional Monaco code editor with an autonomous tool-calling agent engine.

---

## 🌟 Key Features

1. **Autonomous Tool-Calling Agent Loop:**
   - `list_dir`, `read_file`, `write_file`, `edit_file`, and `run_terminal_command`.
   - Autonomous multi-step planning, file editing, dependency installation, and self-repairing debug loops.
2. **Monaco Code Editor:**
   - Multi-tab file management.
   - Code diff review (Accept/Reject proposed AI changes).
   - Syntax highlighting, minimap, bracket pair colorization, line numbers.
3. **Unlimited Lifetime AI Support (No Token Limits):**
   - **Local AI (Ollama):** 100% free, runs completely on your machine with DeepSeek-R1, Qwen 2.5 Coder, Llama 3.3. Zero cost, zero token limits.
   - **Cloud AI (Gemini):** Native Google GenAI SDK support for Gemini 2.5 Pro, 2.0 Flash, 1.5 Pro.
4. **Interactive Terminal Panel:**
   - Built-in terminal emulator (`xterm.js`).
   - Problems viewer, agent tool execution logs, and build output.

---

## 📁 Project Architecture

```
Shadity/
├── frontend/             # React + Vite + TypeScript + Tailwind + Monaco + XTerm
│   ├── src/
│   │   ├── components/   # Header, Sidebar, FileTree, EditorArea, AgentPanel, TerminalPanel
│   │   ├── stores/       # Zustand IDE state management
│   │   └── types/        # TypeScript interfaces for files, tools, and agent plans
│   ├── package.json
│   └── vite.config.ts
│
├── backend/              # Node.js + Express + WebSockets + Agent Engine
│   ├── src/
│   │   ├── agent/        # Autonomous loop (engine.ts) & tools (tools.ts)
│   │   ├── providers/    # Gemini SDK & Ollama client
│   │   └── server.ts     # REST & WebSocket endpoints
│   ├── package.json
│   └── tsconfig.json
│
└── .env.example
```

---

## ⚡ Quick Start

### 1. Start the Backend (Agent Engine & File System APIs)
```bash
cd backend
npm install
npm run dev
```

### 2. Start the Frontend (Antigravity IDE UI)
```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🔒 Security Sandbox
All agent file modifications and terminal operations are restricted to the selected workspace directory to guarantee system safety.

