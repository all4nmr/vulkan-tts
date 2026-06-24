use std::io::{Read, Write};
use std::process::{Command, Stdio};
use std::sync::Mutex;
use tauri::{command, AppHandle, Emitter, Manager};

// ── Estimate how many BPE tokens a text needs ──
fn estimate_tokens(text: &str) -> usize {
    // Korean: ~1.5 tokens/char, English/others: ~0.8 tokens/char
    // Count bytes vs chars to guess language density
    let byte_len = text.len();
    let char_len = text.chars().count();
    let hangul_ratio = text.chars().filter(|c| matches!(c, '\u{AC00}'..='\u{D7A3}' | 'a'..='z' | 'A'..='Z')).count() as f64 / char_len.max(1) as f64;
    
    // Rough BPE estimate based on character count
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

    // Split by sentence endings
    let mut sentence_buf = String::new();
    for ch in text.chars() {
        sentence_buf.push(ch);
        if matches!(ch, '.' | '!' | '?' | '\n') {
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

    // Remaining text after last sentence
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

    chunks
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

    // Read WAV header
    let _chunk_id = &buf[0..4];     // "RIFF"
    let _file_size = u32::from_le_bytes([buf[4], buf[5], buf[6], buf[7]]);
    let _format = &buf[8..12];       // "WAVE"
    let _subchunk1_id = &buf[12..16]; // "fmt "
    let _subchunk1_size = u32::from_le_bytes([buf[16], buf[17], buf[18], buf[19]]);
    let audio_format = u16::from_le_bytes([buf[20], buf[21]]);
    let num_channels = u16::from_le_bytes([buf[22], buf[23]]);
    let sample_rate = u32::from_le_bytes([buf[24], buf[25], buf[26], buf[27]]);
    let _byte_rate = u32::from_le_bytes([buf[28], buf[29], buf[30], buf[31]]);
    let _block_align = u16::from_le_bytes([buf[32], buf[33]]);
    let _bits_per_sample = u16::from_le_bytes([buf[34], buf[35]]);

    // Find data chunk
    let mut offset = 36 + _subchunk1_size as usize;
    while offset + 8 <= buf.len() {
        let chunk_id = &buf[offset..offset+4];
        let chunk_size = u32::from_le_bytes([buf[offset+4], buf[offset+5], buf[offset+6], buf[offset+7]]) as usize;
        if chunk_id == b"data" {
            let data = buf[offset+8..offset+8+chunk_size].to_vec();
            return Ok((data, sample_rate, num_channels, audio_format));
        }
        offset += 8 + chunk_size;
    }

    Err("No data chunk found in WAV".to_string())
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
        if cfg!(target_os = "windows") {
            bin_path.join("qwen-tts.exe").to_string_lossy().to_string()
        } else {
            bin_path.join("qwen-tts").to_string_lossy().to_string()
        }
    } else {
        qwen_tts_path
    };

    for (i, chunk_text) in chunks.iter().enumerate() {
        let chunk_idx = i + 1;
        let chunk_out = temp_dir.join(format!("chunk_{:04}.wav", chunk_idx));
        let chunk_out_str = chunk_out.to_string_lossy().to_string();

        // Emit chunk progress
        let _ = app_handle.emit("tts-progress", serde_json::json!({
            "phase": "synthesizing",
            "chunk": chunk_idx,
            "total_chunks": total_chunks,
            "percent": ((chunk_idx as f64 / total_chunks as f64) * 100.0).round() as i32,
            "chunk_percent": 0,
            "text": format!("청크 {}/{} 변환 중...", chunk_idx, total_chunks)
        }));

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

        let mut child = cmd.spawn()
            .map_err(|e| format!("Failed to start qwen-tts for chunk {}: {}", chunk_idx, e))?;

        // Write text to stdin
        if let Some(mut stdin) = child.stdin.take() {
            stdin.write_all(chunk_text.as_bytes())
                .map_err(|e| format!("Failed to write chunk {} to stdin: {}", chunk_idx, e))?;
        }

        let output = child.wait_with_output()
            .map_err(|e| format!("Failed to wait for chunk {}: {}", chunk_idx, e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!(
                "Chunk {} failed (exit {}): {}",
                chunk_idx,
                output.status.code().unwrap_or(-1),
                stderr
            ));
        }

        // Read WAV data for concatenation
        match read_wav_data(&chunk_out_str) {
            Ok((data, sr, ch, bps)) => {
                sample_rate = sr;
                num_channels = ch;
                bits_per_sample = bps;
                chunk_wavs.push(chunk_out_str.clone());
            }
            Err(e) => {
                return Err(format!("Failed to read chunk {} WAV: {}", chunk_idx, e));
            }
        }

        // Emit chunk complete
        let _ = app_handle.emit("tts-progress", serde_json::json!({
            "phase": "synthesizing",
            "chunk": chunk_idx,
            "total_chunks": total_chunks,
            "percent": ((chunk_idx as f64 / total_chunks as f64) * 100.0).round() as i32,
            "chunk_percent": 100,
            "text": format!("청크 {}/{} 완료", chunk_idx, total_chunks)
        }));
    }

    // Emit concatenating phase
    let _ = app_handle.emit("tts-progress", serde_json::json!({
        "phase": "concatenating",
        "chunk": total_chunks,
        "total_chunks": total_chunks,
        "percent": 100,
        "text": "오디오 파일 병합 중..."
    }));

    // Concatenate all WAV chunks into final output
    let mut all_data: Vec<Vec<u8>> = Vec::new();
    for wav_path in &chunk_wavs {
        match read_wav_data(wav_path) {
            Ok((data, _, _, _)) => all_data.push(data),
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
