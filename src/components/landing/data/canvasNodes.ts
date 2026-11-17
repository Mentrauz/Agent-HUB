import {
  Bot, Users, GitBranch, CheckSquare, Repeat, GitFork, Boxes,
  Search, Sparkles, FileText, Rss, FileCheck, HardDrive, Code2,
  BrainCircuit, FileSpreadsheet, Database, Mic, Volume2,
  Clock, Radio, Webhook, Network,
} from "lucide-react";

interface CanvasNodeCategory {
  category: string;
  nodes: Array<{
    name: string;
    icon: React.ComponentType<{ className?: string }>;
    desc: string;
  }>;
}

export const canvasNodeCategories: CanvasNodeCategory[] = [
  {
    category: "Logic and multi-agent control",
    nodes: [
      { name: "Agent", icon: Bot, desc: "Specialist agent with a prompt and tool access" },
      { name: "Supervisor", icon: Users, desc: "Coordinates specialist agents and delegation loops" },
      { name: "Router", icon: GitBranch, desc: "Branches on deterministic rules or an AI judgement" },
      { name: "Approval", icon: CheckSquare, desc: "Human approval gate with a single-use token" },
      { name: "Loop", icon: Repeat, desc: "Bounded loop with a maximum cycle budget" },
      { name: "Parallel", icon: GitFork, desc: "Runs branches concurrently and fans out over arrays" },
      { name: "Subgraph", icon: Boxes, desc: "Reusable graph nested up to 8 levels deep" },
    ],
  },
  {
    category: "Search and web scraping",
    nodes: [
      { name: "SearXNG search", icon: Search, desc: "Metasearch across Google, Bing, Reddit and DuckDuckGo" },
      { name: "Crawl4AI scraper", icon: Sparkles, desc: "Clean markdown scraping with boilerplate removed" },
      { name: "Jina web reader", icon: FileText, desc: "Turns any URL into markdown for the model" },
      { name: "RSS and Atom feed", icon: Rss, desc: "Polls feeds and extracts items as a stream" },
    ],
  },
  {
    category: "Documents and PDF output",
    nodes: [
      { name: "IBM Docling", icon: FileCheck, desc: "Parses PDFs, tables and DOCX into markdown" },
      { name: "Gotenberg PDF", icon: HardDrive, desc: "Renders HTML and markdown to PDF reports" },
      { name: "Data mapper", icon: Code2, desc: "Visual JSON transformation with jq field mapping" },
    ],
  },
  {
    category: "Databases, memory and speech",
    nodes: [
      { name: "Qdrant vector memory", icon: BrainCircuit, desc: "Similarity search and long-term memory" },
      { name: "NocoDB records", icon: FileSpreadsheet, desc: "Relational CRUD on NocoDB tables" },
      { name: "PocketBase store", icon: Database, desc: "SQLite state, auth and checkpoint persistence" },
      { name: "Faster-Whisper", icon: Mic, desc: "Local speech-to-text transcription" },
      { name: "Piper TTS", icon: Volume2, desc: "Local text-to-speech for agent replies" },
    ],
  },
  {
    category: "Triggers and integrations",
    nodes: [
      { name: "Cron trigger", icon: Clock, desc: "Scheduled runs, for example 0 9 * * *" },
      { name: "Inbound webhook", icon: Radio, desc: "Starts a graph from an external HTTP POST" },
      { name: "Dispatch notifier", icon: Webhook, desc: "Sends output to Discord, Slack and Telegram" },
      { name: "HTTP or MCP tool", icon: Network, desc: "Calls any OpenAPI endpoint or MCP tool" },
    ],
  },
];
