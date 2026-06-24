@echo off
REM Download voice cloning models for Vulkan-TTS
REM Requires Python 3 + huggingface-hub

pip install huggingface-hub -q

echo Downloading voice cloning model (1.9 GB)... 
huggingface-cli download Serveurperso/Qwen3-TTS-GGUF ^
    qwen-talker-1.7b-base-Q8_0.gguf ^
    --local-dir models

echo Downloading codec model (278 MB)...
huggingface-cli download Serveurperso/Qwen3-TTS-GGUF ^
    qwen-tokenizer-12hz-Q8_0.gguf ^
    --local-dir models

echo Done! Models saved to models/
