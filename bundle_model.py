#!/usr/bin/env python3
"""
Bundle a TFLite model with tokenizer into MediaPipe .task format.

This script converts raw TFLite models into the .task format required by
MediaPipe LLM Inference. Use this if you have a custom-converted TFLite model.

For pre-bundled models, use download_models.py instead.

Usage:
    python bundle_model.py \
        --tflite model.tflite \
        --tokenizer tokenizer.model \
        --output gemma_custom.task
"""

import argparse
import sys
from pathlib import Path

try:
    import mediapipe as mp
    from mediapipe.tasks.python.genai import bundler
except ImportError:
    print("❌ MediaPipe not installed. Run: pip install mediapipe>=0.10.14")
    sys.exit(1)


# Default token configurations for different Gemma variants
GEMMA_CONFIGS = {
    "gemma": {
        "start_token": "<bos>",
        "stop_tokens": ["<eos>"],
        "enable_bytes_to_unicode_mapping": False,
    },
    "gemma2": {
        "start_token": "<bos>",
        "stop_tokens": ["<eos>", "<end_of_turn>"],
        "enable_bytes_to_unicode_mapping": False,
    },
    "gemma3": {
        "start_token": "<bos>",
        "stop_tokens": ["<eos>", "<end_of_turn>"],
        "enable_bytes_to_unicode_mapping": False,
    },
}


def create_bundle(
    tflite_path: str,
    tokenizer_path: str,
    output_path: str,
    model_type: str = "gemma3",
    start_token: str = None,
    stop_tokens: list = None,
) -> bool:
    """
    Create a .task bundle from TFLite model and tokenizer.
    
    Args:
        tflite_path: Path to .tflite model file
        tokenizer_path: Path to tokenizer.model file (SentencePiece)
        output_path: Output path for .task file
        model_type: Model type for default token config (gemma, gemma2, gemma3)
        start_token: Override start token
        stop_tokens: Override stop tokens
        
    Returns:
        True if successful, False otherwise
    """
    tflite_file = Path(tflite_path)
    tokenizer_file = Path(tokenizer_path)
    output_file = Path(output_path)
    
    # Validate inputs
    if not tflite_file.exists():
        print(f"❌ TFLite model not found: {tflite_path}")
        return False
    
    if not tokenizer_file.exists():
        print(f"❌ Tokenizer not found: {tokenizer_path}")
        return False
    
    # Get default config for model type
    config_defaults = GEMMA_CONFIGS.get(model_type, GEMMA_CONFIGS["gemma3"])
    
    # Use overrides or defaults
    final_start_token = start_token or config_defaults["start_token"]
    final_stop_tokens = stop_tokens or config_defaults["stop_tokens"]
    
    print(f"\n🔧 Creating .task bundle...")
    print(f"   TFLite model: {tflite_file}")
    print(f"   Tokenizer: {tokenizer_file}")
    print(f"   Output: {output_file}")
    print(f"   Model type: {model_type}")
    print(f"   Start token: {final_start_token}")
    print(f"   Stop tokens: {final_stop_tokens}")
    
    try:
        # Create bundle configuration
        config = bundler.BundleConfig(
            tflite_model=str(tflite_file),
            tokenizer_model=str(tokenizer_file),
            start_token=final_start_token,
            stop_tokens=final_stop_tokens,
            output_filename=str(output_file),
            enable_bytes_to_unicode_mapping=config_defaults["enable_bytes_to_unicode_mapping"],
        )
        
        # Create the bundle
        bundler.create_bundle(config)
        
        print(f"\n✅ Bundle created successfully: {output_file}")
        print(f"   Size: {output_file.stat().st_size / (1024*1024):.2f} MB")
        return True
        
    except Exception as e:
        print(f"\n❌ Bundle creation failed: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(
        description="Bundle TFLite model with tokenizer into .task format"
    )
    parser.add_argument(
        "--tflite",
        type=str,
        required=True,
        help="Path to TFLite model file",
    )
    parser.add_argument(
        "--tokenizer",
        type=str,
        required=True,
        help="Path to tokenizer.model file (SentencePiece format)",
    )
    parser.add_argument(
        "--output",
        type=str,
        required=True,
        help="Output path for .task bundle",
    )
    parser.add_argument(
        "--model-type",
        type=str,
        choices=["gemma", "gemma2", "gemma3"],
        default="gemma3",
        help="Model type for default token configuration (default: gemma3)",
    )
    parser.add_argument(
        "--start-token",
        type=str,
        help="Override start token (default: <bos>)",
    )
    parser.add_argument(
        "--stop-tokens",
        type=str,
        nargs="+",
        help="Override stop tokens (default: <eos> <end_of_turn>)",
    )
    
    args = parser.parse_args()
    
    success = create_bundle(
        tflite_path=args.tflite,
        tokenizer_path=args.tokenizer,
        output_path=args.output,
        model_type=args.model_type,
        start_token=args.start_token,
        stop_tokens=args.stop_tokens,
    )
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
