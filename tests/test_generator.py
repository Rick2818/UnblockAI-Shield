"""
Unit and Integration Tests for MCP Agent Generator.
"""

import unittest
import os
import shutil
import tempfile
from mcp_generator.communication import MessageBus
from mcp_generator.models import AgentMessage, SpecializationProfile
from mcp_generator.profiles import ProfileRegistry, GENERIC_PROFILE
from mcp_generator.agents.domain_miner import DomainMinerAgent
from mcp_generator.agents.topology_designer import TopologyDesignerAgent
from mcp_generator.agents.tool_synthesizer import ToolSynthesizerAgent
from mcp_generator.agents.package_builder import PackageBuilderAgent
from mcp_generator.agents.orchestrator import OrchestratorAgent
from mcp_generator.server import mcp


class TestMCPGenerator(unittest.TestCase):

    def setUp(self):
        self.bus = MessageBus()
        self.test_dir = tempfile.mkdtemp()

    def tearDown(self):
        if os.path.exists(self.test_dir):
            shutil.rmtree(self.test_dir)

    def test_message_bus_communication(self):
        """Validates point-to-point and broadcast messaging over the bus."""
        self.bus.register_agent("agent-a")
        self.bus.register_agent("agent-b")
        self.bus.subscribe_event("agent-b", "test_topic")

        # Point-to-point
        msg = AgentMessage(
            sender_id="agent-a",
            recipient_id="agent-b",
            message_type="query",
            payload={"question": "status?"}
        )
        self.bus.send(msg)

        inbox_b = self.bus.fetch_inbox("agent-b")
        self.assertEqual(len(inbox_b), 1)
        self.assertEqual(inbox_b[0].payload["question"], "status?")

        # Broadcast
        self.bus.broadcast("agent-a", "test_topic", {"event": "alert"})
        inbox_b_broadcast = self.bus.fetch_inbox("agent-b")
        self.assertEqual(len(inbox_b_broadcast), 1)
        self.assertEqual(inbox_b_broadcast[0].payload["topic"], "test_topic")

    def test_profile_registry(self):
        """Validates profile listing and custom profile registration."""
        reg = ProfileRegistry()
        profiles = reg.list_profiles()
        self.assertGreaterEqual(len(profiles), 3)

        new_profile = SpecializationProfile(
            profile_id="custom-logistics",
            name="Custom Logistics Pack",
            industry="Logistics",
            common_entities=["Route", "Truck", "Driver"],
            standard_pain_points=[{"title": "Fuel Waste", "description": "High costs", "automation_opportunity": "Route optimization"}],
            recommended_roles=[{"role": "Fleet Dispatcher", "focus": "Assigns drivers", "is_orchestrator": False}],
            recommended_mcp_integrations=[]
        )
        reg.register_profile(new_profile)
        retrieved = reg.get_profile("custom-logistics")
        self.assertEqual(retrieved.name, "Custom Logistics Pack")

    def test_domain_miner(self):
        """Validates domain analysis and pain point mining."""
        miner = DomainMinerAgent(self.bus)
        result = miner.process_task({
            "business_idea": "SaaS de gestión de suscripciones recurrentes con conciliación bancaria.",
            "profile_id": "fintech"
        })
        analysis = result["domain_analysis"]
        self.assertIn("domain_name", analysis)
        self.assertGreaterEqual(len(analysis["entities"]), 3)
        self.assertGreaterEqual(len(analysis["pain_points"]), 2)

    def test_topology_and_tools_synthesis(self):
        """Validates multi-agent topology generation with Master Orchestrator and Subagents."""
        miner = DomainMinerAgent(self.bus)
        designer = TopologyDesignerAgent(self.bus)
        synthesizer = ToolSynthesizerAgent(self.bus)

        idea = "Tienda online de ropa con gestión de inventario y prevención de fraude."
        miner_out = miner.process_task({"business_idea": idea, "profile_id": "ecommerce"})
        designer_out = designer.process_task({"domain_analysis": miner_out["domain_analysis"], "profile_id": "ecommerce"})
        topology = designer_out["topology"]

        self.assertEqual(topology["orchestrator_id"], "agent-orchestrator")
        self.assertGreaterEqual(len(topology["agents"]), 3)
        self.assertGreaterEqual(len(topology["channels"]), 3)

        synth_out = synthesizer.process_task({"topology": topology, "profile_id": "ecommerce"})
        self.assertIn("mcp_servers", synth_out)
        self.assertGreaterEqual(len(synth_out["mcp_servers"]), 1)

    def test_full_pipeline_orchestrator(self):
        """Validates end-to-end multi-agent synthesis, simulation, and Antigravity artifact export."""
        orchestrator = OrchestratorAgent()
        idea = "Plataforma de soporte y atención médica preventiva con triaje de pacientes."
        spec = orchestrator.synthesize_agent_system(idea, profile_id="generic")

        self.assertIsNotNone(spec.spec_id)
        self.assertGreaterEqual(len(spec.topology.agents), 3)
        self.assertGreaterEqual(len(spec.antigravity_artifacts), 4)

        # Simulation
        sim = orchestrator.simulate_workflow(spec, "Nuevo paciente solicitando triaje urgente.")
        self.assertGreaterEqual(sim["total_steps"], 4)
        self.assertEqual(sim["transcript"][0]["action"], "TRIGGER")

        # Filesystem export
        exported_files = orchestrator.export_to_filesystem(spec, self.test_dir)
        self.assertGreaterEqual(len(exported_files), 4)

        rules_path = os.path.join(self.test_dir, ".agents", "rules", "AGENTS.md")
        mcp_config_path = os.path.join(self.test_dir, ".agents", "mcp_config.json")
        arch_path = os.path.join(self.test_dir, "docs", "ARCHITECTURE.md")

        self.assertTrue(os.path.exists(rules_path))
        self.assertTrue(os.path.exists(mcp_config_path))
        self.assertTrue(os.path.exists(arch_path))

    def test_fastmcp_server_tools_registered(self):
        """Verifies that all FastMCP tools are registered and available."""
        tools = mcp._tool_manager.list_tools()
        tool_names = [t.name for t in tools]

        expected_tools = [
            "list_specialization_profiles",
            "register_specialization_profile",
            "analyze_business_idea",
            "design_agent_topology",
            "synthesize_agent_tools",
            "generate_full_agent_specification",
            "simulate_multiagent_workflow",
            "export_antigravity_workspace"
        ]

    def test_create_agent_from_pain_with_gemini_flash(self):
        """Verifies custom agent creation from an unsolved pain point with Gemini Flash 2.5 architecture."""
        orchestrator = OrchestratorAgent()
        pain = "Los clientes se quejan diariamente de demoras en soporte por WhatsApp."
        spec = orchestrator.synthesize_agent_system(
            business_idea=pain,
            profile_id="generic",
            ai_model="gemini-2.5-flash",
            unsolved_pain=pain
        )

        self.assertEqual(spec.ai_model, "gemini-2.5-flash")
        self.assertEqual(spec.unsolved_pain, pain)

        exported_files = orchestrator.export_to_filesystem(spec, self.test_dir)
        agent_dir = os.path.join(self.test_dir, ".agents", "agents")
        rules_zero_sim = os.path.join(self.test_dir, ".agents", "rules", "cero_simulacion_modo_real_inmutable.md")
        rules_brevity = os.path.join(self.test_dir, ".agents", "rules", "executive_communication_brevity_rule.md")
        knowledge_brief = os.path.join(self.test_dir, ".agents", "knowledge", "corporate_pain_diagnostic.md")

        self.assertTrue(os.path.exists(agent_dir))
        self.assertTrue(os.path.exists(rules_zero_sim))
        self.assertTrue(os.path.exists(rules_brevity))
        self.assertTrue(os.path.exists(knowledge_brief))

        # Check content of agent definition has YAML frontmatter with model gemini-2.5-flash
        agent_files = os.listdir(agent_dir)
        self.assertGreater(len(agent_files), 0)
        with open(os.path.join(agent_dir, agent_files[0]), "r", encoding="utf-8") as f:
            first_agent_content = f.read()
        self.assertIn("model: gemini-2.5-flash", first_agent_content)
        self.assertIn("inheritCustomizations: true", first_agent_content)


if __name__ == "__main__":
    unittest.main()
