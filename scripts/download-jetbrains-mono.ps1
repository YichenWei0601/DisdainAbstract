Param(
    [string]$Version = "latest",
    [string]$OutDir = "assets/fonts/JetBrainsMono"
)

# This script downloads JetBrains Mono release zip from GitHub and extracts TTF files.
# It tries multiple strategies: direct URL (with/without v prefix) and GitHub API lookup.
# Usage: .\download-jetbrains-mono.ps1 -Version latest

$ErrorActionPreference = 'Stop'

function Ensure-Dir($p) {
    if (-Not (Test-Path $p)) { New-Item -ItemType Directory -Path $p -Force | Out-Null }
}

$pwd = Get-Location
$absOut = Join-Path $pwd.Path $OutDir
Ensure-Dir $absOut

Add-Type -AssemblyName System.IO.Compression.FileSystem

function Download-FromUrl($url, $zipPath) {
    try {
        Write-Host "Trying download: $url"
        Invoke-WebRequest -Uri $url -OutFile $zipPath -UseBasicParsing -ErrorAction Stop
        return $true
    } catch {
        Write-Host "Download failed: $url"
        return $false
    }
}

function Find-AssetViaApi([string]$tag) {
    $headers = @{ 'User-Agent' = 'powershell-script' }
    try {
        if ($tag -eq 'latest') {
            $api = 'https://api.github.com/repos/JetBrains/JetBrainsMono/releases/latest'
        } else {
            $api = "https://api.github.com/repos/JetBrains/JetBrainsMono/releases/tags/$tag"
        }
        Write-Host "Querying GitHub API: $api"
        $rel = Invoke-RestMethod -Uri $api -Headers $headers -ErrorAction Stop
        foreach ($a in $rel.assets) {
            if ($a.name -match '\.zip$') { return $a.browser_download_url }
        }
        return $null
    } catch {
        Write-Host "GitHub API lookup failed for tag $tag"
        return $null
    }
}

$zipPath = Join-Path $absOut "jetbrainsmono.zip"

$downloaded = $false

if ($Version -ne 'latest') {
    $candidates = @(
        "https://github.com/JetBrains/JetBrainsMono/releases/download/$Version/JetBrainsMono-$Version.zip",
        "https://github.com/JetBrains/JetBrainsMono/releases/download/v$Version/JetBrainsMono-$Version.zip"
    )
    foreach ($u in $candidates) {
        if (Download-FromUrl $u $zipPath) { $downloaded = $true; break }
    }
    if (-not $downloaded) {
        $asset = Find-AssetViaApi $Version
        if ($asset) { $downloaded = Download-FromUrl $asset $zipPath }
    }
} else {
    $asset = Find-AssetViaApi 'latest'
    if ($asset) { $downloaded = Download-FromUrl $asset $zipPath }
}

if (-not $downloaded) {
    Write-Error "Failed to obtain JetBrains Mono zip. Try a different version or check network/GitHub availability."
    exit 1
}

Write-Host "Extracting zip to $absOut"
[System.IO.Compression.ZipFile]::ExtractToDirectory($zipPath, $absOut)

# Move ttf files into a ttf/ subfolder for the CSS path
$ttfDir = Join-Path $absOut "ttf"
Ensure-Dir $ttfDir
Get-ChildItem -Path $absOut -Recurse -Filter *.ttf | ForEach-Object {
    $dest = Join-Path $ttfDir $_.Name
    Move-Item -Path $_.FullName -Destination $dest -Force
}

Write-Host "Cleaning up zip file"
Remove-Item $zipPath -Force

Write-Host "Done. Fonts are in $ttfDir"
