#!/usr/bin/env python3
"""
Download Gemma models in .task and .litertlm formats from HuggingFace.
These models are pre-converted and ready to use with MediaPipe LLM Inference.
"""

import os
import argparse
from pathlib import Path
from huggingface_hub import hf_hub_download, snapshot_download
from huggingface_hub.utils import get_token


# Available models with their HuggingFace repo info
MODELS = {
    # Task format models
    "gemma3-1b-task": {
        "repo_id": "litert-community/Gemma3-1B-IT",
        "filename": "Gemma3-1B-IT-int4.task",
        "format": "task",
        "description": "Gemma 3 1B - Lightweight text model in .task format",
    },
    # LiteRT-LM format models
    "gemma3n-e2b-litertlm": {
        "repo_id": "google/gemma-3n-E2B-it-litert-lm",
        "filename": "gemma-3n-E2B-it-int4.litertlm",
        "format": "litertlm",
        "description": "Gemma 3n E2B - Multimodal (text+image+audio) in .litertlm format",
    },
    "gemma3n-e2b-web": {
        "repo_id": "google/gemma-3n-E2B-it-litert-lm",
        "filename": "gemma-3n-E2B-it-int4-Web.litertlm",
        "format": "litertlm",
        "description": "Gemma 3n E2B WebGPU - Optimized .litertlm for web",
    },
    "gemma3n-e4b-litertlm": {
        "repo_id": "google/gemma-3n-E4B-it-litert-lm",
        "filename": "gemma-3n-E4B-it-int4.litertlm",
        "format": "litertlm",
        "description": "Gemma 3n E4B - Larger multimodal model in .litertlm format",
    },
    # Bin format (legacy)
    "gemma2-2b-bin": {
        "repo_id": "litert-community/Gemma2-2B-IT",
        "filename": "gemma2-2b-it-gpu-int4.bin",
        "format": "bin",
        "description": "Gemma 2 2B - Legacy .bin format for broader compatibility",
    },
    # FunctionGemma (custom) models
    "functiongemma-270m-litertlm": {
        "repo_id": "sasha-denisov/function-gemma-270M-it",
        "filename": "functiongemma-270M-it.litertlm",
        "format": "litertlm",
        "description": "FunctionGemma 270M - Instruction-tuned model in .litertlm format",
    },
    "functiongemma-270m-task": {
        "repo_id": "sasha-denisov/function-gemma-270M-it",
        "filename": "functiongemma-270M-it.task",
        "format": "task",
        "description": "FunctionGemma 270M - Instruction-tuned model in .task format",
    },
}


def list_models():
    """Print available models."""
    print("\n📦 Available Gemma Models for MediaPipe:\n")
    print(f"{'Model Key':<25} {'Format':<10} {'Description'}")
    print("-" * 80)
    for key, info in MODELS.items():
        print(f"{key:<25} {info['format']:<10} {info['description']}")
    print()


def download_model(model_key: str, output_dir: str = "models") -> str:
    """
    Download a specific model from HuggingFace.
    
    Args:
        model_key: Key from MODELS dict
        output_dir: Directory to save the model
        
    Returns:
        Path to the downloaded model file
    """
    if model_key not in MODELS:
        print(f"❌ Unknown model: {model_key}")
        print("Available models:")
        list_models()
        return None
    
    model_info = MODELS[model_key]
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    print(f"\n🔄 Downloading {model_key}...")
    print(f"   Repository: {model_info['repo_id']}")
    print(f"   File: {model_info['filename']}")
    print(f"   Format: {model_info['format']}")
    
    try:
        # If a token is available locally, pass it so private/gated repos work.
        token = True if get_token() else None

        # Download the specific model file
        local_path = hf_hub_download(
            repo_id=model_info["repo_id"],
            filename=model_info["filename"],
            local_dir=output_path,
            local_dir_use_symlinks=False,
            token=token,
        )
        
        print(f"✅ Downloaded to: {local_path}")
        return local_path
        
    except Exception as e:
        print(f"❌ Download failed: {e}")
        print("\n💡 Tips:")
        print("   - Make sure you have internet access")
        print("   - Some models require HuggingFace authentication:")
        print("     Run: huggingface-cli login")
        return None


def download_all(output_dir: str = "models", formats: list = None):
    """Download all models or models of specific formats."""
    downloaded = []
    
    for key, info in MODELS.items():
        if formats is None or info["format"] in formats:
            path = download_model(key, output_dir)
            if path:
                downloaded.append(path)
    
    print(f"\n✅ Downloaded {len(downloaded)} model(s)")
    return downloaded


def main():
    parser = argparse.ArgumentParser(
        description="Download Gemma models for MediaPipe LLM Inference"
    )
    parser.add_argument(
        "--model",
        type=str,
        help="Specific model to download (use --list to see options)",
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="List available models",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default="models",
        help="Output directory for models (default: models)",
    )
    parser.add_argument(
        "--format",
        type=str,
        choices=["task", "litertlm", "bin"],
        help="Download all models of a specific format",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Download all available models",
    )
    
    args = parser.parse_args()
    
    if args.list:
        list_models()
        return
    
    if args.all:
        download_all(args.output_dir)
        return
    
    if args.format:
        download_all(args.output_dir, formats=[args.format])
        return
    
    if args.model:
        download_model(args.model, args.output_dir)
        return
    
    # Default: download recommended models (one of each format)
    print("🚀 Downloading recommended models (task + litertlm formats)...")
    download_model("gemma3-1b-task", args.output_dir)
    download_model("gemma3n-e2b-litertlm", args.output_dir)


if __name__ == "__main__":
    main()
