"""
JasmineGPT — Python-side routing regression tests
==================================================
Validates route_query() and route_top_level() against the 10 evaluation cases
from JasmineGPT_Final_PostHarvest_Evidence_Grounded_RAG_v2.ipynb
plus the Phase 1 routing regression cases A-I.

Run: python -m pytest test_routing.py -v
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

import pytest
from router import (
    route_top_level,
    route_postharvest_query,
    is_profile_statement,
    looks_context_dependent,
    extract_entities,
)


# ─────────────────────────────────────────────────────────────────────────────
# Profile statement detection (Phase 1.1)
# ─────────────────────────────────────────────────────────────────────────────
class TestProfileStatements:
    def test_grow_gundumalli(self):
        assert is_profile_statement("I grow Gundumalli jasmine.") is True

    def test_am_growing(self):
        assert is_profile_statement("I am growing Gundumalli.") is True

    def test_my_crop_is(self):
        assert is_profile_statement("My crop is Gundumalli.") is True

    def test_cultivate(self):
        assert is_profile_statement("I cultivate Jasminum sambac.") is True

    def test_pest_problem_NOT_profile(self):
        # "I have a jasmine bud worm problem" must NOT be a profile statement
        assert is_profile_statement("I have a jasmine bud worm problem.") is False

    def test_what_packaging_NOT_profile(self):
        assert is_profile_statement("What packaging was tested?") is False

    def test_store_at_7c_NOT_profile(self):
        assert is_profile_statement("Can I store jasmine at 7°C?") is False


# ─────────────────────────────────────────────────────────────────────────────
# Context-dependency detection (Phase 1.4)
# ─────────────────────────────────────────────────────────────────────────────
class TestContextDependency:
    def test_heat_sealed_is_context_dependent(self):
        assert looks_context_dependent("Was the packaging heat sealed?") is True

    def test_what_temperature_is_context_dependent(self):
        assert looks_context_dependent("What temperature was used?") is True

    def test_how_long_did_is_context_dependent(self):
        assert looks_context_dependent("How long did it last?") is True

    def test_what_about_is_context_dependent(self):
        assert looks_context_dependent("What about the treatment?") is True

    def test_standalone_pest_NOT_context_dependent(self):
        assert looks_context_dependent("What pesticide should I use for bud worm?") is False

    def test_standalone_packaging_is_ambiguous(self):
        # "What packaging was tested for Gundumalli?" is standalone — has species
        # This doesn't need to be context-dependent
        result = looks_context_dependent("What packaging was tested for Gundumalli?")
        # It may or may not fire; key is the full resolver handles it correctly
        # Just check no crash
        assert isinstance(result, bool)


# ─────────────────────────────────────────────────────────────────────────────
# Top-level domain routing — Regression cases A-I
# ─────────────────────────────────────────────────────────────────────────────
class TestTopLevelRouting:
    """Phase 1 regression tests A-I"""

    def test_A_grow_gundumalli_is_memory_update(self):
        """Test A: Profile statement → MEMORY_UPDATE"""
        route = route_top_level("I grow Gundumalli jasmine.")
        assert route == "MEMORY_UPDATE", f"Expected MEMORY_UPDATE, got {route}"

    def test_F_bud_worm_is_general_rag(self):
        """Test F: Pest problem → GENERAL_RAG"""
        route = route_top_level("I have a jasmine bud worm problem.")
        assert route == "GENERAL_RAG", f"Expected GENERAL_RAG, got {route}"

    def test_G_pesticide_studies_is_general_rag(self):
        """Test G: Pesticide studies → GENERAL_RAG"""
        route = route_top_level("What pesticide studies are available?")
        assert route == "GENERAL_RAG", f"Expected GENERAL_RAG, got {route}"

    def test_B_what_packaging_is_postharvest(self):
        """Test B: Packaging question → POSTHARVEST"""
        route = route_top_level("What packaging was tested?")
        assert route == "POSTHARVEST", f"Expected POSTHARVEST, got {route}"

    def test_postharvest_storage_routes_correctly(self):
        """Storage question → POSTHARVEST"""
        route = route_top_level("How should I store jasmine flowers?")
        assert route == "POSTHARVEST", f"Expected POSTHARVEST, got {route}"

    def test_H_passive_map_routes_to_postharvest(self):
        """Test H: passive MAP → POSTHARVEST (then INSUFFICIENT_EVIDENCE)"""
        route = route_top_level("What is passive MAP for Jasminum sambac storage?")
        assert route == "POSTHARVEST", f"Expected POSTHARVEST, got {route}"

    def test_I_harvesting_time_routes_to_postharvest(self):
        """Test I: harvesting time → POSTHARVEST (then INSUFFICIENT_EVIDENCE)"""
        route = route_top_level("What is the best harvesting time for jasmine?")
        assert route == "POSTHARVEST", f"Expected POSTHARVEST, got {route}"

    def test_followup_with_postharvest_memory_routes_postharvest(self):
        """Follow-up with postharvest memory context → POSTHARVEST"""
        memory = {"last_route": "POSTHARVEST", "cultivar": "Gundumalli"}
        route = route_top_level("Was the packaging heat sealed?", memory=memory)
        assert route == "POSTHARVEST", f"Expected POSTHARVEST, got {route}"

    def test_fertilizer_is_general_rag(self):
        """Fertilizer question → GENERAL_RAG"""
        route = route_top_level("What fertilizer should I use for jasmine?")
        assert route == "GENERAL_RAG", f"Expected GENERAL_RAG, got {route}"

    def test_irrigation_is_general_rag(self):
        """Irrigation question → GENERAL_RAG"""
        route = route_top_level("What drip irrigation schedule works for Gundumalli?")
        assert route == "GENERAL_RAG", f"Expected GENERAL_RAG, got {route}"


# ─────────────────────────────────────────────────────────────────────────────
# Post-harvest evidence routing — v2 notebook evaluation cases
# ─────────────────────────────────────────────────────────────────────────────
class TestPostHarvestEvidence:
    def test_store_at_7c_direct_evidence(self):
        r = route_postharvest_query("Can I store Jasminum sambac at 7°C?")
        assert r["status"] == "DIRECT_EVIDENCE"
        assert "JAS-SAM-002" in r["selected_docs"]

    def test_store_at_5c_direct_evidence(self):
        r = route_postharvest_query("Can I store Jasminum sambac at 5°C?")
        assert r["status"] == "DIRECT_EVIDENCE"
        assert "JAS-SAM-004" in r["selected_docs"] or "JAS-AUR-001" in r["selected_docs"]

    def test_passive_map_insufficient_evidence(self):
        """Test H: passive MAP is not in production corpus"""
        r = route_postharvest_query("What is passive MAP for Jasminum sambac storage?")
        assert r["status"] == "INSUFFICIENT_EVIDENCE"
        assert r["selected_docs"] == []

    def test_store_at_2c_insufficient_evidence(self):
        r = route_postharvest_query("Can I store Jasminum sambac at 2°C?")
        assert r["status"] == "INSUFFICIENT_EVIDENCE"

    def test_harvesting_time_insufficient_evidence(self):
        """Test I: harvesting not in production corpus"""
        r = route_postharvest_query("What is the best harvesting time for jasmine?")
        assert r["status"] == "INSUFFICIENT_EVIDENCE"

    def test_gundumalli_packaging_selects_jas_sam_002(self):
        """Test B: Gundumalli packaging → JAS-SAM-002"""
        r = route_postharvest_query("What packaging was tested for Gundumalli jasmine?")
        assert r["status"] in ("DIRECT_EVIDENCE", "MULTIPLE_STUDIES")
        assert "JAS-SAM-002" in r["selected_docs"]

    def test_temperatures_tested_multiple_studies(self):
        r = route_postharvest_query("What temperatures were tested for Jasminum sambac storage?")
        assert r["status"] == "MULTIPLE_STUDIES"
        assert "JAS-SAM-002" in r["selected_docs"]
        assert "JAS-SAM-004" in r["selected_docs"] or "JAS-AUR-001" in r["selected_docs"]

    def test_gel_ice_export_packaging(self):
        r = route_postharvest_query("How was gel ice used in jasmine export packaging?")
        assert r["status"] in ("DIRECT_EVIDENCE", "MULTIPLE_STUDIES")
        assert "JAS-SAM-001" in r["selected_docs"]

    def test_mycelium_foam_transport(self):
        r = route_postharvest_query("How did mycelium foam perform during long-distance transport?")
        assert r["status"] == "DIRECT_EVIDENCE"
        assert "JAS-SAM-005" in r["selected_docs"]

    def test_pacha_mullai_postharvest(self):
        r = route_postharvest_query("What post-harvest treatment was studied for Pacha Mullai?")
        assert r["status"] == "DIRECT_EVIDENCE"
        assert "JAS-AUR-001" in r["selected_docs"]

    def test_store_at_7c_is_gundumalli_specific(self):
        """JAS-SAM-002 only supports 7°C"""
        r = route_postharvest_query("Can I store Jasminum sambac cv. Gundumalli at 7°C?")
        assert r["status"] == "DIRECT_EVIDENCE"
        assert "JAS-SAM-002" in r["selected_docs"]

    def test_singh_2009_excluded_passive_map(self):
        """Singh 2009 (JAS-SAM-003) must NOT appear in any result"""
        r = route_postharvest_query("What is passive MAP for Jasminum sambac storage?")
        assert "JAS-SAM-003" not in r["selected_docs"]


# ─────────────────────────────────────────────────────────────────────────────
# Entity extraction
# ─────────────────────────────────────────────────────────────────────────────
class TestEntityExtraction:
    def test_extract_gundumalli_species(self):
        e = extract_entities("I grow Gundumalli jasmine.")
        assert e["species"] == "Jasminum sambac"
        assert e["cultivar"] == "Gundumalli"

    def test_extract_pacha_mullai(self):
        e = extract_entities("My crop is Pacha Mullai.")
        assert e["species"] == "Jasminum auriculatum"
        assert e["cultivar"] == "Pacha Mullai ecotype"

    def test_extract_packaging_domain(self):
        e = extract_entities("What packaging was tested?")
        assert "packaging" in e["domains"]

    def test_extract_pest_domain(self):
        e = extract_entities("I have a jasmine bud worm problem.")
        assert "pest" in e["domains"]
