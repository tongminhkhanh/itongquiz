# Upload avatars to Cloudinary
$cloudName = "dwv7hot9x"
$apiKey = "481519793223636"
$apiSecret = "UBU2BJPKOSIh9RcUE3UjotKtt-o"
$uploadUrl = "https://api.cloudinary.com/v1_1/$cloudName/image/upload"

$avatarDir = "$env:USERPROFILE\.gemini\antigravity\brain\630d20b7-09e2-40de-a3e8-eda04f7d0eb3"

$files = @(
    @{ file = "avatar_girl_01_1771986504441.png"; publicId = "itongquiz/avatars/girl_01" },
    @{ file = "avatar_girl_02_1771986875595.png"; publicId = "itongquiz/avatars/girl_02" },
    @{ file = "avatar_girl_03_1771987118905.png"; publicId = "itongquiz/avatars/girl_03" },
    @{ file = "avatar_girl_04_1771987189202.png"; publicId = "itongquiz/avatars/girl_04" },
    @{ file = "avatar_girl_05_1771987526398.png"; publicId = "itongquiz/avatars/girl_05" },
    @{ file = "avatar_girl_06_1771987672997.png"; publicId = "itongquiz/avatars/girl_06" },
    @{ file = "avatar_girl_07_1771988422076.png"; publicId = "itongquiz/avatars/girl_07" },
    @{ file = "avatar_girl_08_1771988543939.png"; publicId = "itongquiz/avatars/girl_08" },
    @{ file = "avatar_boy_01_1771986996836.png"; publicId = "itongquiz/avatars/boy_01" },
    @{ file = "avatar_boy_02_1771987053961.png"; publicId = "itongquiz/avatars/boy_02" },
    @{ file = "avatar_boy_03_1771987282638.png"; publicId = "itongquiz/avatars/boy_03" },
    @{ file = "avatar_boy_04_1771987407538.png"; publicId = "itongquiz/avatars/boy_04" },
    @{ file = "avatar_boy_05_1771987907391.png"; publicId = "itongquiz/avatars/boy_05" },
    @{ file = "avatar_boy_06_1771988290400.png"; publicId = "itongquiz/avatars/boy_06" }
)

$results = @()

foreach ($item in $files) {
    $filePath = Join-Path $avatarDir $item.file
    if (-not (Test-Path $filePath)) {
        Write-Host "SKIP: $($item.file) not found"
        continue
    }

    $timestamp = [int][double]::Parse((Get-Date -UFormat %s))
    $paramsToSign = "public_id=$($item.publicId)&timestamp=$timestamp"

    # Generate SHA1 signature
    $sha1 = [System.Security.Cryptography.SHA1]::Create()
    $bytes = [System.Text.Encoding]::UTF8.GetBytes("$paramsToSign$apiSecret")
    $hash = $sha1.ComputeHash($bytes)
    $signature = [BitConverter]::ToString($hash).Replace("-", "").ToLower()

    # Build multipart form
    $boundary = [System.Guid]::NewGuid().ToString()
    $LF = "`r`n"

    $bodyLines = @()
    # file field
    $bodyLines += "--$boundary"
    $bodyLines += "Content-Disposition: form-data; name=`"file`"; filename=`"$($item.file)`""
    $bodyLines += "Content-Type: image/png"
    $bodyLines += ""

    $headerBytes = [System.Text.Encoding]::UTF8.GetBytes(($bodyLines -join $LF) + $LF)
    $fileBytes = [System.IO.File]::ReadAllBytes($filePath)

    $footerLines = @()
    $footerLines += ""
    $footerLines += "--$boundary"
    $footerLines += "Content-Disposition: form-data; name=`"api_key`""
    $footerLines += ""
    $footerLines += $apiKey
    $footerLines += "--$boundary"
    $footerLines += "Content-Disposition: form-data; name=`"timestamp`""
    $footerLines += ""
    $footerLines += "$timestamp"
    $footerLines += "--$boundary"
    $footerLines += "Content-Disposition: form-data; name=`"signature`""
    $footerLines += ""
    $footerLines += $signature
    $footerLines += "--$boundary"
    $footerLines += "Content-Disposition: form-data; name=`"public_id`""
    $footerLines += ""
    $footerLines += $item.publicId
    $footerLines += "--$boundary--"
    $footerLines += ""

    $footerBytes = [System.Text.Encoding]::UTF8.GetBytes(($footerLines -join $LF))

    $bodyBytes = New-Object byte[] ($headerBytes.Length + $fileBytes.Length + $footerBytes.Length)
    [System.Buffer]::BlockCopy($headerBytes, 0, $bodyBytes, 0, $headerBytes.Length)
    [System.Buffer]::BlockCopy($fileBytes, 0, $bodyBytes, $headerBytes.Length, $fileBytes.Length)
    [System.Buffer]::BlockCopy($footerBytes, 0, $bodyBytes, $headerBytes.Length + $fileBytes.Length, $footerBytes.Length)

    try {
        $response = Invoke-RestMethod -Uri $uploadUrl -Method Post -ContentType "multipart/form-data; boundary=$boundary" -Body $bodyBytes
        $secureUrl = $response.secure_url
        Write-Host "OK: $($item.publicId) -> $secureUrl"
        $results += @{ id = $item.publicId.Split("/")[-1]; url = $secureUrl }
    } catch {
        Write-Host "FAIL: $($item.file) -> $($_.Exception.Message)"
    }
}

Write-Host ""
Write-Host "=== RESULTS JSON ==="
$results | ConvertTo-Json
