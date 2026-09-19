# Start the JasmineGPT RAG sidecar using the isolated virtual environment
# Usage: .\start_rag.ps1

$venvPython = Join-Path $PSScriptRoot ".venv\Scripts\python.exe"

if (-not (Test-Path $venvPython)) {
    Write-Error "Virtual environment not found. Run setup first:"
    Write-Host "  py -3.12 -m venv .venv"
    Write-Host "  .\.venv\Scripts\python.exe -m pip install -r requirements.txt"
    exit 1
}

Write-Host "Starting JasmineGPT RAG sidecar on http://localhost:8000 ..."
Write-Host "Using: $venvPython"
& $venvPython (Join-Path $PSScriptRoot "app.py")
