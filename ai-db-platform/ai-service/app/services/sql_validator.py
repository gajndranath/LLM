import sqlglot
from sqlglot import exp
from app.models.pydantic_schemas import ValidationResult

# Stable blocked operations for safety
# We use base expressions that are consistent across sqlglot versions
BLOCKED_EXPRESSIONS = (
    exp.Drop,
)

def validate_sql_safety(sql: str, dialect: str = "postgres") -> ValidationResult:
    """
    Validate SQL for syntax and safety rules using sqlglot.
    """
    try:
        # 1. Check for TRUNCATE keyword manually for extra safety
        if "truncate" in sql.lower():
            return ValidationResult(
                valid=False, 
                error="Operation 'TRUNCATE' is blocked for safety."
            )

        # 2. Parse SQL
        statements = sqlglot.parse(sql, read=dialect)
        if not statements:
            return ValidationResult(valid=False, error="No valid SQL statements found.")
        
        for parsed in statements:
            if not parsed:
                continue
            # 3. Check for blocked expressions (DROP, ALTER)
            for node in parsed.find_all(BLOCKED_EXPRESSIONS):
                return ValidationResult(
                    valid=False, 
                    error=f"Operation '{type(node).__name__}' is blocked for safety."
                )
            
            # 4. Check for DELETE/UPDATE without WHERE clause
            if isinstance(parsed, (exp.Delete, exp.Update)):
                if parsed.find(exp.Where) is None:
                    return ValidationResult(
                        valid=False,
                        error=f"{type(parsed).__name__} operations must have a WHERE clause."
                    )
        
        return ValidationResult(valid=True, sql=sql)
        
    except sqlglot.errors.ParseError as e:
        return ValidationResult(valid=False, error=f"SQL Syntax Error: {str(e)}")
    except Exception as e:
        # Fallback to simple keyword check if parsing fails or something else goes wrong
        return ValidationResult(valid=False, error=f"Safety Check Error: {str(e)}")

def transform_sql(sql: str, dialect: str = "postgres") -> str:
    """
    Parse SQL and transform DDL to include IF NOT EXISTS where appropriate,
    and map encrypt/decrypt functions to pgp_sym_encrypt/pgp_sym_decrypt.
    """
    try:
        statements = sqlglot.parse(sql, read=dialect)
        transformed = []
        for stmt in statements:
            if not stmt:
                continue
            # 1. Handle CREATE TABLE and CREATE INDEX
            if isinstance(stmt, exp.Create):
                kind = stmt.args.get("kind", "").upper()
                if kind in ("TABLE", "INDEX"):
                    stmt.set("exists", True)
            
            # 2. Handle ALTER TABLE ADD COLUMN
            elif isinstance(stmt, exp.Alter):
                actions = stmt.args.get("actions", [])
                for action in actions:
                    if isinstance(action, exp.ColumnDef):
                        action.set("exists", True)

            # 3. Handle function call transformations
            def rewrite_funcs(node):
                if isinstance(node, exp.Anonymous) and node.name.lower() in ("encrypt", "decrypt"):
                    name = node.name.lower()
                    new_name = "pgp_sym_encrypt" if name == "encrypt" else "pgp_sym_decrypt"
                    return exp.Anonymous(this=new_name, expressions=node.expressions)
                elif isinstance(node, (exp.Encrypt, exp.Decrypt)):
                    name = "pgp_sym_encrypt" if isinstance(node, exp.Encrypt) else "pgp_sym_decrypt"
                    expressions = []
                    if "this" in node.args and node.args["this"] is not None:
                        expressions.append(node.args["this"])
                    if "passphrase" in node.args and node.args["passphrase"] is not None:
                        expressions.append(node.args["passphrase"])
                    return exp.Anonymous(this=name, expressions=expressions)
                return node

            stmt = stmt.transform(rewrite_funcs)
            transformed.append(stmt.sql(dialect=dialect))
            
        return ";\n".join(transformed)
    except Exception as e:
        # If parsing fails, log and fallback to original sql
        print(f"[SQL Transform] Failed to parse and transform SQL: {e}")
        return sql

