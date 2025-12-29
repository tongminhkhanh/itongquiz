# ============================================
# Script: Khởi động OCR & LLM-Mux Servers
# Dự án: iTongQuiz
# ============================================

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  iTongQuiz - Server Startup Script  " -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# ============ LLM-MUX SERVER ============
Write-Host "[1/2] Kiểm tra LLM-Mux..." -ForegroundColor Yellow

$llmMuxPath = Get-Command llm-mux -ErrorAction SilentlyContinue

if (-not $llmMuxPath) {
    Write-Host "  → LLM-Mux chưa được cài đặt. Đang cài đặt..." -ForegroundColor Red
    Write-Host "  → Chạy lệnh: irm https://raw.githubusercontent.com/nghyane/llm-mux/main/install.ps1 | iex" -ForegroundColor Gray
    
    try {
        irm https://raw.githubusercontent.com/nghyane/llm-mux/main/install.ps1 | iex
        Write-Host "  ✓ Đã cài đặt LLM-Mux thành công!" -ForegroundColor Green
    } catch {
        Write-Host "  ✗ Lỗi cài đặt LLM-Mux: $_" -ForegroundColor Red
        Write-Host "  → Hãy cài thủ công: irm https://raw.githubusercontent.com/nghyane/llm-mux/main/install.ps1 | iex" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ✓ LLM-Mux đã được cài đặt: $($llmMuxPath.Source)" -ForegroundColor Green
}

# Khởi tạo config nếu chưa có
$configPath = "$env:USERPROFILE\.config\llm-mux\config.yaml"
if (-not (Test-Path $configPath)) {
    Write-Host "  → Khởi tạo cấu hình LLM-Mux..." -ForegroundColor Yellow
    Start-Process -FilePath "llm-mux" -ArgumentList "--init" -NoNewWindow -Wait
}

Write-Host ""
Write-Host "[LLM-Mux] Đang khởi động server tại http://localhost:8317..." -ForegroundColor Cyan

# Chạy LLM-Mux trong background
$llmMuxJob = Start-Job -ScriptBlock {
    llm-mux
}

Write-Host "  ✓ LLM-Mux đang chạy (Job ID: $($llmMuxJob.Id))" -ForegroundColor Green
Write-Host ""

# ============ OCR SERVER ============
Write-Host "[2/2] Kiểm tra OCR Backend..." -ForegroundColor Yellow

$ocrBackendPath = Join-Path $PSScriptRoot "ocr-backend"
$ocrMainFile = Join-Path $ocrBackendPath "main.py"

if (-not (Test-Path $ocrMainFile)) {
    Write-Host "  ⚠ OCR Backend chưa được tạo!" -ForegroundColor Red
    Write-Host "  → Cần tạo thư mục ocr-backend với FastAPI server" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Để tạo OCR backend, bạn cần:" -ForegroundColor Gray
    Write-Host "    1. Tạo thư mục ocr-backend/" -ForegroundColor Gray
    Write-Host "    2. Cài đặt: pip install fastapi uvicorn python-multipart pdfplumber pytesseract" -ForegroundColor Gray
    Write-Host "    3. Tạo file main.py với FastAPI server" -ForegroundColor Gray
} else {
    Write-Host "  ✓ OCR Backend tìm thấy tại: $ocrBackendPath" -ForegroundColor Green
    
    # Kiểm tra Python
    $pythonPath = Get-Command python -ErrorAction SilentlyContinue
    if (-not $pythonPath) {
        Write-Host "  ✗ Python chưa được cài đặt!" -ForegroundColor Red
    } else {
        Write-Host ""
        Write-Host "[OCR] Đang khởi động server tại http://localhost:8000..." -ForegroundColor Cyan
        
        Set-Location $ocrBackendPath
        
        # Cài đặt dependencies nếu cần
        if (Test-Path "requirements.txt") {
            pip install -r requirements.txt -q
        }
        
        # Chạy OCR server trong background
        $ocrJob = Start-Job -ScriptBlock {
            param($path)
            Set-Location $path
            python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
        } -ArgumentList $ocrBackendPath
        
        Write-Host "  ✓ OCR Server đang chạy (Job ID: $($ocrJob.Id))" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  SERVERS STATUS" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  LLM-Mux:  http://localhost:8317/v1" -ForegroundColor White
Write-Host "  OCR API:  http://localhost:8000" -ForegroundColor White
Write-Host ""
Write-Host "  Nhấn Ctrl+C để dừng tất cả servers" -ForegroundColor Gray
Write-Host ""

# Giữ script chạy và hiển thị logs
try {
    while ($true) {
        Start-Sleep -Seconds 5
        
        # Kiểm tra trạng thái jobs
        if ($llmMuxJob -and $llmMuxJob.State -eq "Failed") {
            Write-Host "[LLM-Mux] Server đã dừng đột ngột!" -ForegroundColor Red
            Receive-Job $llmMuxJob
        }
        
        if ($ocrJob -and $ocrJob.State -eq "Failed") {
            Write-Host "[OCR] Server đã dừng đột ngột!" -ForegroundColor Red
            Receive-Job $ocrJob
        }
    }
} finally {
    # Dọn dẹp khi thoát
    Write-Host ""
    Write-Host "Đang dừng servers..." -ForegroundColor Yellow
    
    if ($llmMuxJob) {
        Stop-Job $llmMuxJob -ErrorAction SilentlyContinue
        Remove-Job $llmMuxJob -ErrorAction SilentlyContinue
    }
    
    if ($ocrJob) {
        Stop-Job $ocrJob -ErrorAction SilentlyContinue
        Remove-Job $ocrJob -ErrorAction SilentlyContinue
    }
    
    Write-Host "✓ Đã dừng tất cả servers" -ForegroundColor Green
}
