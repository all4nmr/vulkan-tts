use std::io::{Read, Write};
use std::process::{Command, Stdio};
use std::time::Duration;
use tauri::{command, AppHandle, Emitter};

// ── Estimate how many BPE tokens a text needs ──
fn estimate_tokens(text: &str) -> usize {
    let char_len = text.chars().count();
    (char_len as f64 * 1.3).ceil() as usize + 30 // 30 tokens overhead for chat template
}

// ── Split text at sentence boundaries into chunks ──
fn split_text(text: &str, max_tokens: usize) -> Vec<String> {
    let estimated = estimate_tokens(text);
    if estimated <= max_tokens {
        return vec![text.to_string()];
    }

    // Split by sentence boundaries
    let mut chunks: Vec<String> = Vec::new();
    let mut current = String::new();
    let mut current_tokens = 0usize;

    // First try splitting by newlines (paragraphs)
    for paragraph in text.split('\n') {
        let para_tokens = estimate_tokens(paragraph);
        if current_tokens + para_tokens > max_tokens && !current.is_empty() {
            chunks.push(current.clone());
            current.clear();
            current_tokens = 0;
        }

        // If a single paragraph is too long, split by sentences
        if para_tokens > max_tokens {
            if !current.is_empty() {
                chunks.push(current.clone());
                current.clear();
                current_tokens = 0;
            }
            for sentence in split_paragraph(paragraph, max_tokens) {
                chunks.push(sentence);
            }
            continue;
        }

        if !current.is_empty() {
            current.push('\n');
            current_tokens += 1;
        }
        current.push_str(paragraph);
        current_tokens += para_tokens;
    }

    if !current.is_empty() {
        chunks.push(current);
    }

    if chunks.is_empty() {
        chunks.push(text.to_string());
    }

    chunks
}

fn split_paragraph(text: &str, max_tokens: usize) -> Vec<String> {
    let mut chunks: Vec<String> = Vec::new();
    let mut current = String::new();
    let mut current_tokens = 0usize;

    // Split by sentence endings AND force-split every 1200 chars for Korean
    let mut sentence_buf = String::new();
    for ch in text.chars() {
        sentence_buf.push(ch);
        // Split on punctuation OR when sentence_buf exceeds 1200 chars (Korean fallback)
        let force_split = sentence_buf.chars().count() >= 1200;
        if matches!(ch, '.' | '!' | '?' | '\n' | '~' | '…') || force_split {
            let st_tokens = estimate_tokens(&sentence_buf);
            if current_tokens + st_tokens > max_tokens && !current.is_empty() {
                chunks.push(current.clone());
                current.clear();
                current_tokens = 0;
            }
            current.push_str(&sentence_buf);
            current_tokens += st_tokens;
            sentence_buf.clear();
        }
    }

    // Remaining text after last split
    if !sentence_buf.is_empty() {
        let rem_tokens = estimate_tokens(&sentence_buf);
        if current_tokens + rem_tokens > max_tokens && !current.is_empty() {
            chunks.push(current);
            current = sentence_buf;
        } else {
            current.push_str(&sentence_buf);
        }
    }

    if !current.is_empty() {
        chunks.push(current);
    }

    if chunks.is_empty() {
        chunks.push(text.to_string());
    }

    chunks
}

// ── Normalize 16-bit PCM audio to consistent peak level ──
fn normalize_pcm(data: &[u8], target_peak: f64) -> Vec<u8> {
    if data.len() < 2 { return data.to_vec(); }
    // Find current peak
    let samples: Vec<i16> = data.chunks(2)
        .filter(|c| c.len() == 2)
        .map(|c| i16::from_le_bytes([c[0], c[1]]))
        .collect();
    let peak = samples.iter().map(|s| s.abs()).max().unwrap_or(1).max(1) as f64;
    let gain = target_peak / peak;
    if (gain - 1.0).abs() < 0.05 { return data.to_vec(); } // within 5%, skip
    let mut out = Vec::with_capacity(data.len());
    for s in &samples {
        let scaled = (*s as f64 * gain).round().clamp(-32768.0, 32767.0) as i16;
        out.extend_from_slice(&scaled.to_le_bytes());
    }
    out
}

// ── WAV concatenation ──
fn read_wav_data(path: &str) -> Result<(Vec<u8>, u32, u16, u16), String> {
    let mut file = std::fs::File::open(path)
        .map_err(|e| format!("Cannot open WAV: {}", e))?;
    
    let mut buf = Vec::new();
    file.read_to_end(&mut buf)
        .map_err(|e| format!("Cannot read WAV: {}", e))?;

    if buf.len() < 44 {
        return Err("Not a valid WAV file (too short)".to_string());
    }

    let _chunk_id = &buf[0..4];     // "RIFF"
    let _file_size = u32::from_le_bytes([buf[4], buf[5], buf[6], buf[7]]);
    let _format = &buf[8..12];       // "WAVE"

    // Scan all chunks starting from offset 12 (after RIFF + file_size + WAVE)
    let mut sample_rate: u32 = 24000;
    let mut num_channels: u16 = 1;
    let mut bits_per_sample: u16 = 16;
    let mut audio_data: Option<Vec<u8>> = None;

    let mut offset = 12;
    while offset + 8 <= buf.len() {
        let chunk_id = &buf[offset..offset+4];
        let chunk_size = u32::from_le_bytes([buf[offset+4], buf[offset+5], buf[offset+6], buf[offset+7]]) as usize;
        
        // Guard against malformed chunk sizes
        if chunk_size > buf.len().saturating_sub(offset + 8) {
            break;
        }

        match chunk_id {
            b"fmt " => {
                if chunk_size >= 16 {
                    let audio_fmt = u16::from_le_bytes([buf[offset+8], buf[offset+9]]);
                    if audio_fmt != 1 {
                        return Err(format!("Unsupported WAV format: {} (only PCM=1 supported)", audio_fmt));
                    }
                    num_channels = u16::from_le_bytes([buf[offset+10], buf[offset+11]]);
                    sample_rate = u32::from_le_bytes([buf[offset+12], buf[offset+13], buf[offset+14], buf[offset+15]]);
                    bits_per_sample = u16::from_le_bytes([buf[offset+22], buf[offset+23]]);
                }
            }
            b"data" => {
                let data = buf[offset+8..offset+8+chunk_size].to_vec();
                audio_data = Some(data);
                break; // data should be the last chunk
            }
            _ => {}
        }
        offset += 8 + chunk_size;
        // Pad to word boundary (some writers add padding byte)
        if offset % 2 != 0 {
            offset += 1;
        }
    }

    match audio_data {
        Some(data) => Ok((data, sample_rate, num_channels, bits_per_sample)),
        None => Err("No data chunk found in WAV".to_string()),
    }
}

fn write_wav(path: &str, data_chunks: &[Vec<u8>], sample_rate: u32, num_channels: u16, bits_per_sample: u16) -> Result<(), String> {
    let mut total_data_size: usize = 0;
    for chunk in data_chunks {
        total_data_size += chunk.len();
    }

    let block_align = num_channels * (bits_per_sample / 8);
    let byte_rate = sample_rate * block_align as u32;
    let file_size = 36 + total_data_size;

    let mut wav = Vec::new();
    wav.extend_from_slice(b"RIFF");
    wav.extend_from_slice(&(file_size as u32).to_le_bytes());
    wav.extend_from_slice(b"WAVE");
    wav.extend_from_slice(b"fmt ");
    wav.extend_from_slice(&16u32.to_le_bytes()); // subchunk1 size (PCM)
    wav.extend_from_slice(&1u16.to_le_bytes()); // PCM format
    wav.extend_from_slice(&num_channels.to_le_bytes());
    wav.extend_from_slice(&sample_rate.to_le_bytes());
    wav.extend_from_slice(&byte_rate.to_le_bytes());
    wav.extend_from_slice(&block_align.to_le_bytes());
    wav.extend_from_slice(&bits_per_sample.to_le_bytes());
    wav.extend_from_slice(b"data");
    wav.extend_from_slice(&(total_data_size as u32).to_le_bytes());

    for chunk in data_chunks {
        wav.extend_from_slice(chunk);
    }

    std::fs::write(path, &wav)
        .map_err(|e| format!("Cannot write WAV: {}", e))
}

// ── Main TTS command with auto-split + progress ──
#[command]
async fn run_tts(
    app_handle: AppHandle,
    model_path: String,
    codec_path: String,
    ref_wav: String,
    text: String,
    lang: String,
    speaker: String,
    output_path: String,
    temp: f64,
    qwen_tts_path: String,
) -> Result<String, String> {
    // Max tokens per chunk: leave room for max_new_tokens=2048 + 100 overhead
    let max_tokens_per_chunk = 1800usize;
    let chunks = split_text(&text, max_tokens_per_chunk);
    let total_chunks = chunks.len();

    // Emit initial progress
    let _ = app_handle.emit("tts-progress", serde_json::json!({
        "phase": "preparing",
        "chunk": 0,
        "total_chunks": total_chunks,
        "percent": 0,
        "text": format!("{} 청크로 분할", total_chunks)
    }));

    // Temp directory for chunk WAVs
    let temp_dir = std::env::temp_dir().join("scrappyvox-chunks");
    let _ = std::fs::create_dir_all(&temp_dir);

    let mut chunk_wavs: Vec<String> = Vec::new();
    let mut sample_rate: u32 = 24000;
    let mut num_channels: u16 = 1;
    let mut bits_per_sample: u16 = 16;

    // Resolve qwen-tts binary path relative to our own executable location
    let qwen_path = if qwen_tts_path.is_empty() {
        // Default: look for ../bin/qwen-tts(.exe) relative to our own exe
        let exe_dir = std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|d| d.to_path_buf()))
            .unwrap_or_else(|| std::env::current_dir().unwrap_or_default());
        let bin_path = exe_dir.join("..").join("bin");
        let exe_name = if cfg!(target_os = "windows") { "qwen-tts.exe" } else { "qwen-tts" };
        // Canonicalize to resolve any ".." components
        let full_path = std::fs::canonicalize(bin_path.join(exe_name))
            .unwrap_or_else(|_| bin_path.join(exe_name));
        full_path.to_string_lossy().to_string()
    } else {
        qwen_tts_path
    };

    for (i, chunk_text) in chunks.iter().enumerate() {
        let chunk_idx = i + 1;
        let chunk_out = temp_dir.join(format!("chunk_{:04}.wav", chunk_idx));
        let chunk_out_str = chunk_out.to_string_lossy().to_string();

        // Calculate progress: 0-85% for synthesis, 5% per chunk
        let progress_base = if total_chunks > 1 {
            ((chunk_idx as f64 - 1.0) / total_chunks as f64 * 85.0).round() as i32
        } else {
            0
        };

        // Emit chunk progress with small delay for frontend to catch up
        let _ = app_handle.emit("tts-progress", serde_json::json!({
            "phase": "synthesizing",
            "chunk": chunk_idx,
            "total_chunks": total_chunks,
            "percent": progress_base,
            "chunk_percent": 0,
            "text": format!("청크 {}/{} 변환 중...", chunk_idx, total_chunks)
        }));
        std::thread::sleep(Duration::from_millis(50));

        // Auto-retry once on first chunk failure (GPU init race condition)
        let mut last_error: Option<String> = None;
        for attempt in 0..2 {
            if attempt > 0 && last_error.is_some() {
                let _ = app_handle.emit("tts-progress", serde_json::json!({
                    "phase": "synthesizing",
                    "chunk": chunk_idx,
                    "total_chunks": total_chunks,
                    "percent": progress_base,
                    "chunk_percent": 0,
                    "text": format!("재시도 {}/2...", attempt + 1)
                }));
                std::thread::sleep(Duration::from_millis(300));
            }

            // Spawn qwen-tts for this chunk
            let mut cmd = Command::new(&qwen_path);
            cmd.arg("--model")
                .arg(&model_path)
                .arg("--codec")
                .arg(&codec_path)
                .arg("--lang")
                .arg(&lang)
                .arg("--temp")
                .arg(temp.to_string())
                .arg("-o")
                .arg(&chunk_out_str)
                .stdin(Stdio::piped())
                .stderr(Stdio::piped());

            if !ref_wav.is_empty() {
                cmd.arg("--ref-wav").arg(&ref_wav);
            }
            if !speaker.is_empty() {
                cmd.arg("--speaker").arg(&speaker);
            }

            let child = match cmd.spawn() {
                Ok(c) => c,
                Err(e) => {
                    if attempt == 0 && chunk_idx == 1 {
                        last_error = Some(format!("{}", e));
                        continue;
                    }
                    return Err(format!("Failed to start qwen-tts for chunk {}: {}", chunk_idx, e));
                }
            };

            // Write text to stdin
            let mut child = child;
            if let Some(mut stdin) = child.stdin.take() {
                if let Err(e) = stdin.write_all(chunk_text.as_bytes()) {
                    if attempt == 0 && chunk_idx == 1 {
                        last_error = Some(format!("{}", e));
                        continue;
                    }
                    return Err(format!("Failed to write chunk {} to stdin: {}", chunk_idx, e));
                }
            }

            let output = match child.wait_with_output() {
                Ok(o) => o,
                Err(e) => {
                    if attempt == 0 && chunk_idx == 1 {
                        last_error = Some(format!("{}", e));
                        continue;
                    }
                    return Err(format!("Failed to wait for chunk {}: {}", chunk_idx, e));
                }
            };

            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr);
                if attempt == 0 && chunk_idx == 1 {
                    last_error = Some(format!("exit {}: {}", output.status.code().unwrap_or(-1), stderr));
                    continue;
                }
                return Err(format!(
                    "Chunk {} failed (exit {}): {}",
                    chunk_idx,
                    output.status.code().unwrap_or(-1),
                    stderr
                ));
            }

            // Success - clear error and proceed
            last_error = None;
            break;
        }

        if let Some(e) = last_error {
            return Err(format!("Chunk {} failed after retry: {}", chunk_idx, e));
        }

        // Read WAV data for concatenation
        match read_wav_data(&chunk_out_str) {
            Ok((_data, sr, ch, bps)) => {
                sample_rate = sr;
                num_channels = ch;
                bits_per_sample = bps;
                chunk_wavs.push(chunk_out_str.clone());
            }
            Err(e) => {
                return Err(format!("Failed to read chunk {} WAV: {}", chunk_idx, e));
            }
        }

        // Emit chunk complete - progress goes to end of this chunk's range
        let chunk_end = if total_chunks > 1 {
            ((chunk_idx as f64 / total_chunks as f64) * 85.0).round() as i32
        } else {
            85
        };
        let _ = app_handle.emit("tts-progress", serde_json::json!({
            "phase": "synthesizing",
            "chunk": chunk_idx,
            "total_chunks": total_chunks,
            "percent": chunk_end,
            "chunk_percent": 100,
            "text": format!("청크 {}/{} 완료", chunk_idx, total_chunks)
        }));
    }

    // Emit concatenating phase (85-95%)
    let _ = app_handle.emit("tts-progress", serde_json::json!({
        "phase": "concatenating",
        "chunk": total_chunks,
        "total_chunks": total_chunks,
        "percent": 90,
        "text": "오디오 파일 병합 중..."
    }));

    // Concatenate all WAV chunks into final output (with normalization)
    let mut all_data: Vec<Vec<u8>> = Vec::new();
    for wav_path in &chunk_wavs {
        match read_wav_data(wav_path) {
            Ok((raw_data, _, _, _)) => {
                // Normalize to 85% of max to keep consistent volume
                let normalized = normalize_pcm(&raw_data, 28000.0);
                all_data.push(normalized);
            }
            Err(e) => return Err(format!("Failed to read {}: {}", wav_path, e)),
        }
    }

    write_wav(&output_path, &all_data, sample_rate, num_channels, bits_per_sample)?;

    // Cleanup temp files
    for wav_path in &chunk_wavs {
        let _ = std::fs::remove_file(wav_path);
    }
    let _ = std::fs::remove_dir(&temp_dir);

    // Emit complete
    let _ = app_handle.emit("tts-progress", serde_json::json!({
        "phase": "complete",
        "chunk": total_chunks,
        "total_chunks": total_chunks,
        "percent": 100,
        "text": "변환 완료!",
        "output_path": &output_path
    }));

    Ok(format!("ScrappyVox: {} chunk(s) synthesized → {}", total_chunks, output_path))
}

#[command]
async fn open_file(path: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }
    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .args(["/C", "start", "", &path])
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }
    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![run_tts, open_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
