$srcDirs = @('apps/api/src','apps/api/*.ts','apps/web/src','apps/web/*.ts','packages/contracts/src','packages/db/src','packages/db/*.ts','packages/ui/src','packages/ui/*.ts')
$imports = New-Object System.Collections.Generic.HashSet[string]
foreach ($dir in $srcDirs) {
    if (Test-Path $dir) {
        $files = Get-ChildItem -Path $dir -File -Recurse -Include *.ts,*.tsx,*.js,*.jsx 2>$null
        foreach ($file in $files) {
            $content = Get-Content $file.FullName -Raw
            $pattern = 'from\s+["''`]([^"''`./][^"''`]*)["''`]|import\s+["''`]([^"''`./][^"''`]*)["''`]|require\(["''`]([^"''`./][^"''`]*)["''`]\)'
            $ms = [regex]::Matches($content, $pattern)
            foreach ($m in $ms) {
                $pkg = ""
                for ($i=1; $i -le 3; $i++) {
                    if ($m.Groups[$i].Success -and $m.Groups[$i].Value) {
                        $pkg = $m.Groups[$i].Value
                        break
                    }
                }
                if ($pkg) {
                    $parts = $pkg -split '/'
                    if ($parts[0] -match '^@') {
                        $pkgName = $parts[0] + '/' + $parts[1]
                    } else {
                        $pkgName = $parts[0]
                    }
                    [void]$imports.Add($pkgName)
                }
            }
        }
    }
}
$imports | Sort-Object
