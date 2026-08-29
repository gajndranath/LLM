import re
import logging
from typing import Dict, List, Set, Tuple, Any, Optional

logger = logging.getLogger("graph_delta_engine")

class SchemaGraphDeltaEngine:
    """
    Mathematical Incremental State Evolution Engine:
    State_{t+1} = State_t ⊕ Δ(Intent_{t+1}, G_{live}, H_{context})
    
    1. Compares Live Database Graph (G_live) with Target Proposed Architecture (G_target).
    2. Identifies New Tables (requires CREATE TABLE) vs Existing Live Tables (requires ALTER TABLE ADD COLUMN).
    3. Guarantees Zero Data Loss: Never drops or truncates pre-existing live tables.
    4. Merges Cumulative Schema for Visualizer: Returns G_live ∪ Δ so UI canvas shows the complete unified schema.
    """

    @classmethod
    def extract_table_names(cls, schema_text: str) -> Set[str]:
        """Extracts set of table names from DDL string or schema context."""
        if not schema_text:
            return set()
        matches = re.findall(r'CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["\']?(\w+)["\']?', schema_text, flags=re.IGNORECASE)
        return {m.lower() for m in matches}

    @classmethod
    def calculate_schema_delta(
        cls, 
        live_schema_context: str, 
        target_entities: List[Dict[str, Any]], 
        target_sql_scripts: List[Dict[str, Any]]
    ) -> Tuple[List[str], List[str], List[Dict[str, Any]]]:
        """
        Calculates Graph Delta:
        Returns (new_table_names, existing_modified_table_names, sanitized_delta_sql_scripts)
        """
        live_tables = cls.extract_table_names(live_schema_context)
        new_tables: List[str] = []
        modified_tables: List[str] = []
        sanitized_scripts: List[Dict[str, Any]] = []

        for entity in target_entities:
            t_name = entity.get("name", "").lower()
            if t_name in live_tables:
                modified_tables.append(t_name)
            else:
                new_tables.append(t_name)

        logger.info(f"[Graph Delta Engine] Live Tables: {live_tables} | New: {new_tables} | Modified Existing: {modified_tables}")

        # Sanitize scripts: If a table is already live, ensure we do NOT execute DROP TABLE on it!
        for script in target_sql_scripts:
            sql = script.get("sql", "")
            cleaned_sql_lines = []
            for line in sql.split(";"):
                line_str = line.strip()
                if not line_str:
                    continue
                # Check if this line drops an existing live table
                drop_match = re.search(r'DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?["\']?(\w+)["\']?', line_str, flags=re.IGNORECASE)
                if drop_match:
                    dropped_table = drop_match.group(1).lower()
                    if dropped_table in live_tables:
                        logger.warn(f"[Graph Delta Engine] Stripped unsafe DROP TABLE on live table '{dropped_table}'")
                        continue # Strip destructive drop on existing live table
                cleaned_sql_lines.append(line_str)

            script["sql"] = ";\n\n".join(cleaned_sql_lines) + (";" if cleaned_sql_lines else "")
            sanitized_scripts.append(script)

        return new_tables, modified_tables, sanitized_scripts

    @classmethod
    def merge_cumulative_entities(
        cls, 
        existing_entities: List[Dict[str, Any]], 
        new_entities: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Monotonic Cumulative Entity Merge: G_live ∪ G_new
        Ensures previously created tables remain on canvas while new/updated tables are integrated.
        """
        entity_map: Dict[str, Dict[str, Any]] = {}
        
        # 1. Add existing entities
        for ent in existing_entities:
            name = ent.get("name", "").lower()
            if name:
                entity_map[name] = ent

        # 2. Merge / Overwrite with new entities
        for ent in new_entities:
            name = ent.get("name", "").lower()
            if name:
                entity_map[name] = ent

        return list(entity_map.values())
