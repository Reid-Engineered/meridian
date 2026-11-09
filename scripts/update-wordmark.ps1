# Preserve the book mark and theme colors while outlining the approved Palatino wordmark.
Add-Type -AssemblyName System.Drawing
$brandDirectory = Join-Path $PSScriptRoot '../public/brand'
$fontFamily = [System.Drawing.FontFamily]::new('Palatino Linotype')
$outline = [System.Drawing.Drawing2D.GraphicsPath]::new()
try {
    $outline.AddString('Meridian', $fontFamily, 0, 76, [System.Drawing.PointF]::new(0, 0), [System.Drawing.StringFormat]::GenericTypographic)
    $bounds = $outline.GetBounds()
    $placement = [System.Drawing.Drawing2D.Matrix]::new()
    $placement.Translate(145 - $bounds.Left, 64 - ($bounds.Top + $bounds.Height / 2))
    $outline.Transform($placement)
    $placement.Dispose()
    $points = $outline.PathPoints
    $types = $outline.PathTypes
    $commands = [System.Collections.Generic.List[string]]::new()
    $culture = [System.Globalization.CultureInfo]::InvariantCulture
    function Format-Point($point) {
        return $point.X.ToString('0.###', $culture) + ' ' + $point.Y.ToString('0.###', $culture)
    }
    for ($index = 0; $index -lt $points.Length; $index++) {
        switch ($types[$index] -band 7) {
            0 { $commands.Add('M' + (Format-Point $points[$index])) }
            1 { $commands.Add('L' + (Format-Point $points[$index])) }
            3 {
                $commands.Add('C' + (Format-Point $points[$index]) + ' ' + (Format-Point $points[$index + 1]) + ' ' + (Format-Point $points[$index + 2]))
                $index += 2
            }
            default { throw 'Unexpected outline segment.' }
        }
        if ($types[$index] -band 128) { $commands.Add('Z') }
    }
    foreach ($name in @('meridian-logo.svg', 'meridian-logo-dark.svg')) {
        $targetPath = Join-Path $brandDirectory $name
        [xml]$svg = Get-Content -LiteralPath $targetPath -Raw
        $wordmark = $svg.DocumentElement.ChildNodes | Where-Object { $_.LocalName -eq 'path' }
        if (@($wordmark).Count -ne 1) { throw 'Expected one wordmark path.' }
        $wordmark.RemoveAttribute('transform')
        $wordmark.SetAttribute('d', ($commands -join ''))
        $svg.Save($targetPath)
    }
} finally {
    $outline.Dispose()
    $fontFamily.Dispose()
}
