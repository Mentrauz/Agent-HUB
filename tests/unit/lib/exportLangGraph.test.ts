import { describe, it, expect } from "vitest";
import { graphToLangGraphPython, graphToLangGraphTS } from "@/components/canvas/exportUtils";
import { AgentGraphDefinition } from "@/types/graph";

describe("Phase 6: 1-Click Eject to LangGraph Standalone Code Tests", () => {
  const sampleGraph: AgentGraphDefinition = {
    version: 1,
    nodes: [
      { id: "start_1", type: "start", position: { x: 0, y: 0 }, data: { label: "Start" } },
      {
        id: "agent_1",
        type: "agent",
        position: { x: 200, y: 0 },
        data: { label: "Researcher", prompt: "Research the user request" },
      },
      {
        id: "sandbox_1",
        type: "code_sandbox",
        position: { x: 400, y: 0 },
        data: { label: "Data Cleaner", codeLanguage: "python", codeSnippet: "return {'cleaned': True}" },
      },
      {
        id: "consensus_1",
        type: "consensus",
        position: { x: 600, y: 0 },
        data: { label: "Multi-Model Review", consensusStrategy: "judge_synthesis" },
      },
      {
        id: "critic_1",
        type: "critic",
        position: { x: 800, y: 0 },
        data: { label: "Red-Team Critic", criticPassScore: 90 },
      },
      { id: "end_1", type: "end", position: { x: 1000, y: 0 }, data: { label: "End" } },
    ],
    edges: [
      { id: "e1", source: "start_1", target: "agent_1" },
      { id: "e2", source: "agent_1", target: "sandbox_1" },
      { id: "e3", source: "sandbox_1", target: "consensus_1" },
      { id: "e4", source: "consensus_1", target: "critic_1" },
      { id: "e5", source: "critic_1", target: "end_1" },
    ],
  };

  it("exports valid LangGraph Python StateGraph code", () => {
    const pythonCode = graphToLangGraphPython(sampleGraph);

    expect(pythonCode).toContain("from langgraph.graph import StateGraph, END");
    expect(pythonCode).toContain("class AgentState(TypedDict):");
    expect(pythonCode).toContain("async def agent_1(state: AgentState) -> dict:");
    expect(pythonCode).toContain("async def sandbox_1(state: AgentState) -> dict:");
    expect(pythonCode).toContain("async def consensus_1(state: AgentState) -> dict:");
    expect(pythonCode).toContain("async def critic_1(state: AgentState) -> dict:");
    expect(pythonCode).toContain('graph.set_entry_point("agent_1")');
    expect(pythonCode).toContain("app = graph.compile()");
  });

  it("exports valid LangGraph TypeScript StateGraph code", () => {
    const tsCode = graphToLangGraphTS(sampleGraph);

    expect(tsCode).toContain('import { StateGraph, Annotation, END } from "@langchain/langgraph";');
    expect(tsCode).toContain("const AgentState = Annotation.Root({");
    expect(tsCode).toContain("async function agent_1(state: typeof AgentState.State)");
    expect(tsCode).toContain("async function sandbox_1(state: typeof AgentState.State)");
    expect(tsCode).toContain("async function consensus_1(state: typeof AgentState.State)");
    expect(tsCode).toContain("async function critic_1(state: typeof AgentState.State)");
    expect(tsCode).toContain(".compile();");
  });

  it("exports skill nodes with dynamic AGENT_STUDIO_API_URL instead of hardcoded strings", () => {
    const skillGraph: AgentGraphDefinition = {
      version: 1,
      nodes: [
        { id: "start_1", type: "start", position: { x: 0, y: 0 }, data: { label: "Start" } },
        { id: "skill_1", type: "skill", position: { x: 200, y: 0 }, data: { label: "Sub-Skill", skillId: "sk_123" } },
        { id: "end_1", type: "end", position: { x: 400, y: 0 }, data: { label: "End" } },
      ],
      edges: [
        { id: "e1", source: "start_1", target: "skill_1" },
        { id: "e2", source: "skill_1", target: "end_1" },
      ],
    };

    const py = graphToLangGraphPython(skillGraph);
    expect(py).toContain("AGENT_STUDIO_API_URL");
    expect(py).not.toContain("YOUR_API_URL");

    const ts = graphToLangGraphTS(skillGraph);
    expect(ts).toContain("AGENT_STUDIO_API_URL");
    expect(ts).not.toContain("YOUR_API_URL");
  });
});
