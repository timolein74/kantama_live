$files = Get-ChildItem -Path src -Recurse -Include *.tsx,*.ts
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    if ($content -match 'Kantama') {
        $content = $content -replace 'text-Kantama-', 'text-juuri-'
        $content = $content -replace 'bg-Kantama-', 'bg-juuri-'
        $content = $content -replace 'border-Kantama-', 'border-juuri-'
        $content = $content -replace 'from-Kantama-', 'from-juuri-'
        $content = $content -replace 'to-Kantama-', 'to-juuri-'
        $content = $content -replace 'hover:text-Kantama-', 'hover:text-juuri-'
        $content = $content -replace 'hover:border-Kantama-', 'hover:border-juuri-'
        $content = $content -replace 'hover:bg-Kantama-', 'hover:bg-juuri-'
        $content = $content -replace 'focus:ring-Kantama-', 'focus:ring-juuri-'
        $content = $content -replace '@Kantama\.fi', '@juurirahoitus.fi'
        $content = $content -replace 'myynti@Kantama', 'myynti@juurirahoitus'
        $content = $content -replace 'www\.Kantama\.fi', 'www.juurirahoitus.fi'
        $content = $content -replace 'Kantama Rahoitus', 'Juuri Rahoitus'
        $content = $content -replace 'Kantama-palvelussa', 'Juuri Rahoitus -palvelussa'
        $content = $content -replace 'Kantama-palvelua', 'Juuri Rahoitus -palvelua'
        $content = $content -replace 'Kantama-palveluun', 'Juuri Rahoitus -palveluun'
        $content = $content -replace 'Kantamaiin', 'Juuri Rahoitukseen'
        $content = $content -replace 'Kantamaille', 'Juuri Rahoitukselle'
        $content = $content -replace 'Kantamaia', 'Juuri Rahoitusta'
        $content = $content -replace 'Kantamain', 'Juuri Rahoituksen'
        $content = $content -replace 'Kantamaillä', 'Juuri Rahoituksella'
        $content = $content -replace "lastName: 'Kantama'", "lastName: 'Juuri'"
        $content = $content -replace '>Kantama<', '>Juuri Rahoitus<'
        $content = $content -replace 'Kantama •', 'Juuri Rahoitus •'
        $content = $content -replace 'Kantama adminiin', 'Juuri Rahoitus adminiin'
        $content = $content -replace '"Kantama"', '"Juuri Rahoitus"'
        $content = $content -replace 'Kantama on', 'Juuri Rahoitus on'
        $content = $content -replace 'Kantama ei', 'Juuri Rahoitus ei'
        $content = $content -replace 'Kantama voi', 'Juuri Rahoitus voi'
        Set-Content $file.FullName $content -Encoding UTF8
        Write-Host "Updated: $($file.Name)"
    }
}


