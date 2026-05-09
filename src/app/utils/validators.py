from src.app.config import SUPPORTED_CONVERSIONS

def is_valid_conversion(input_fmt: str, output_fmt: str) -> bool:
    return output_fmt in SUPPORTED_CONVERSIONS.get(input_fmt, [])

def get_supported_outputs(input_fmt: str) -> list:
    return SUPPORTED_CONVERSIONS.get(input_fmt, [])
