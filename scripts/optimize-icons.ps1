function ConvertTo-KebabCase {
    param([string]$name)
    $result = $name -creplace '(?<=[a-z])(?=[A-Z])', '-'
    $result = $result -creplace '(?<=[A-Z])(?=[A-Z][a-z])', '-'
    $result = $result -creplace '(?<=[a-zA-Z])(?=\d)', '-'
    $result = $result -creplace '(?<=\d)(?=[a-zA-Z])', '-'
    return $result.ToLower()
}

$files = Get-ChildItem -Path "src" -Recurse -Include "*.tsx","*.ts" | Select-String -Pattern "from 'lucide-react'" | Select-Object -ExpandProperty Path -Unique

foreach ($file in $files) {
    $content = [System.IO.File]::ReadAllText($file)
    $original = $content

    $pattern = [regex]::new("import\s*\{([^}]+)\}\s*from\s*'lucide-react'")
    $match = $pattern.Match($content)

    if ($match.Success) {
        $importBlock = $match.Groups[0].Value
        $iconNames = $match.Groups[1].Value -split ',' | ForEach-Object { $_.Trim() }

        $newImports = @()

        foreach ($icon in $iconNames) {
            if ($icon -eq '') { continue }
            if ($icon -match '^(\w+)\s+as\s+(\w+)$') {
                $originalName = $matches[1]
                $alias = $matches[2]
                $kebabName = ConvertTo-KebabCase $originalName
                $newImports += "import $alias from 'lucide-react/dist/esm/icons/$kebabName'"
            } else {
                $kebabName = ConvertTo-KebabCase $icon
                $newImports += "import $icon from 'lucide-react/dist/esm/icons/$kebabName'"
            }
        }

        if ($newImports.Count -gt 0) {
            $newImportBlock = $newImports -join "`n"
            $content = $content -replace [regex]::Escape($importBlock), $newImportBlock
        }

        if ($content -ne $original) {
            [System.IO.File]::WriteAllText($file, $content)
            Write-Host "OK: $($file | Split-Path -Leaf) ($($iconNames.Count) icons)"
        }
    }
}

Write-Host "Done."
