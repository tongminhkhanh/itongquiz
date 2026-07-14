$path = 'src\routes\teachers.ts'
$lines = Get-Content $path
$out = [System.Collections.Generic.List[string]]::new()
$found = $false
foreach ($line in $lines) {
    if (-not $found -and $line -match '^\s+username: teacher\.username,$') {
        $indent = '                '
        $out.Add($indent + 'id: teacher.username,')
        $found = $true
    }
    $out.Add($line)
}
if ($found) {
    Set-Content $path $out
    Write-Host 'OK: id added successfully'
} else {
    Write-Host 'ERROR: pattern not found!'
}
