import sqlglot
from sqlglot import exp
from app.models.pydantic_schemas import ValidationResult

# Stable blocked operations for safety
# We use base expressions that are consistent across sqlglot versions
BLOCKED_EXPRESSIONS = (
    exp.Drop,
    exp.Alter,
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
        parsed = sqlglot.parse_one(sql, read=dialect)
        
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
