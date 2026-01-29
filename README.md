# Gemma on Edge with MediaPipe

Run Google's Gemma language models locally on your device using MediaPipe's LLM Inference API. Supports both `.task` and `.litertlm` model formats.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Download a Model

```bash
# Download recommended models (Gemma 3 1B .task + Gemma 3n E2B .litertlm)
python download_models.py

# Or download a specific model
python download_models.py --model gemma3-1b-task
python download_models.py --model gemma3n-e2b-litertlm
python download_models.py --model functiongemma-270m-task
python download_models.py --model functiongemma-270m-litertlm

# List all available models
python download_models.py --list
```

### 3. Run Inference (LiteRT-LM CLI)

```bash
# Put a prompt in a file
echo "What is machine learning?" > prompt.txt

# Run a local .litertlm model
lit run models/functiongemma-270M-it.litertlm -f prompt.txt --backend cpu

# Or pull a model from Hugging Face via the LiteRT-LM registry
export HUGGING_FACE_HUB_TOKEN="your_huggingface_token"
lit list --show_all
lit pull gemma3-1b
lit run gemma3-1b --backend cpu
```

### 4. Install the LiteRT-LM CLI (fresh setup)

```bash
# Option A: Use the bundled CLI binary from this repo
mkdir -p ~/.local/bin
cp ./lit ~/.local/bin/lit
chmod +x ~/.local/bin/lit

# Option B: Download a prebuilt LiteRT-LM CLI (macOS ARM64, Linux x86_64/ARM64, Windows x86_64)
# then make it executable and place it on PATH
# (macOS/Linux) chmod +x ./lit

# macOS may require approving the binary in System Settings > Privacy & Security

# Add ~/.local/bin to PATH for zsh
printf '\n# Add ~/.local/bin to PATH for lit\nexport PATH="$HOME/.local/bin:$PATH"\n' >> ~/.zshrc

# Restart terminal (or run: source ~/.zshrc)

#test if it works with
lit --help
```

## 📦 Supported Model Formats

| Format | Extension | Description | Best For |
|--------|-----------|-------------|----------|
| **Task** | `.task` | Bundled TFLite + tokenizer | Python, prototyping |
| **LiteRT-LM** | `.litertlm` | Optimized for edge | Web, Android, production |
| **Bin** | `.bin` | Legacy format | iOS, older systems |

## 🔧 Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `--max-tokens` | 1024 | Maximum tokens (input + output) |
| `--temperature` | 0.8 | Randomness (0.0 = deterministic) |
| `--top-k` | 40 | Top-K sampling parameter |

## 📁 Project Structure

```
gemma_on_edge/
├── requirements.txt      # Python dependencies
├── download_models.py    # Download models from HuggingFace
├── lit                  # LiteRT-LM CLI binary
├── bundle_model.py       # Bundle custom TFLite models
├── web/
│   └── index.html        # Web-based demo
└── models/               # Downloaded models (created after download)
```

## 🔄 Custom Model Bundling

If you have a custom-converted TFLite model, bundle it into `.task` format:

```bash
python bundle_model.py \
    --tflite path/to/model.tflite \
    --tokenizer path/to/tokenizer.model \
    --output my_custom_model.task \
    --model-type gemma3
```

## 📚 Available Models

| Model | Format | Size | Description |
|-------|--------|------|-------------|
| `gemma3-1b-task` | .task | ~1GB | Gemma 3 1B - Lightweight text model |
| `gemma3n-e2b-litertlm` | .litertlm | ~2GB | Gemma 3n E2B - Multimodal (text+image+audio) |
| `gemma3n-e4b-litertlm` | .litertlm | ~4GB | Gemma 3n E4B - Larger multimodal model |
| `gemma2-2b-bin` | .bin | ~2GB | Gemma 2 2B - Legacy format |

## 🔗 Resources

- [MediaPipe LLM Inference Guide](https://ai.google.dev/edge/mediapipe/solutions/genai/llm_inference)
- [LiteRT Community Models](https://huggingface.co/litert-community)
- [FunctionGemma 270M Model Source](https://huggingface.co/sasha-denisov/function-gemma-270M-it/tree/main)
- [Gemma 3n Models](https://huggingface.co/google/gemma-3n-E4B-it-litert-lm)
- [MediaPipe Studio Demo](https://mediapipe-studio.webapps.google.com/demo/llm_inference)

## ⚠️ Requirements

- **Python**: 3.9 - 3.12
- **MediaPipe**: 0.10.14+
- **RAM**: 8GB+ recommended for larger models

## 📄 License

This project uses Gemma models which are subject to [Google's Gemma Terms of Use](https://ai.google.dev/gemma/terms).
